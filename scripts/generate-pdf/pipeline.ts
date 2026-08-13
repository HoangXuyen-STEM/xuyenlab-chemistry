import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { privatePdfKey } from "../../src/lib/r2/private-pdf";

export const PDF_GENERATOR_VERSION = "playwright-chromium-p5-v1";

export interface ReferencedAsset {
  key: string;
  sha256: string;
}

export interface PdfIdentityManifest {
  schemaVersion: 1;
  lesson: {
    slug: string;
    version: number;
    status: "in_review";
  };
  canonical: {
    path: string;
    sha256: string;
  };
  assets: ReferencedAsset[];
  generator: {
    name: "playwright-chromium";
    version: string;
  };
  output: {
    localPath: string;
    objectKey: string;
    manifestObjectKey: string;
  };
}

export interface LessonPlan {
  identity: PdfIdentityManifest;
  canonicalAbsolutePath: string;
  fixturePath: string;
  pdfAbsolutePath: string;
  manifestAbsolutePath: string;
  metricsAbsolutePath: string;
}

const HASHED_ASSET =
  /\/staging-assets\/lessons\/([0-9a-f]{2})\/([0-9a-f]{64})(\.[a-z0-9]+)(?:[?#][^"')\s]*)?/g;

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseScalarFrontmatter(source: string): Record<string, string> {
  if (!source.startsWith("---\n"))
    throw new Error("Canonical MDX is missing frontmatter.");
  const end = source.indexOf("\n---\n", 4);
  if (end === -1)
    throw new Error("Canonical MDX frontmatter is not delimited.");
  const values: Record<string, string> = {};
  for (const line of source.slice(4, end).split("\n")) {
    if (/^\S[^:]*:/.test(line)) {
      const separator = line.indexOf(":");
      values[line.slice(0, separator)] = line
        .slice(separator + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");
    }
  }
  return values;
}

export async function referencedAssets(
  repositoryRoot: string,
  canonicalMdx: string,
): Promise<ReferencedAsset[]> {
  const unique = new Map<string, ReferencedAsset>();
  for (const match of canonicalMdx.matchAll(HASHED_ASSET)) {
    const [, prefix, expectedHash, extension] = match;
    if (prefix !== expectedHash.slice(0, 2)) {
      throw new Error(`Asset prefix/hash mismatch: ${match[0]}`);
    }
    const key = `staging-assets/lessons/${prefix}/${expectedHash}${extension}`;
    const absolutePath = path.join(repositoryRoot, "public", key);
    let bytes: Uint8Array;
    try {
      bytes = await readFile(absolutePath);
    } catch {
      throw new Error(`Referenced asset is missing: ${key}`);
    }
    const actualHash = sha256Bytes(bytes);
    if (actualHash !== expectedHash)
      throw new Error(`Referenced asset hash mismatch: ${key}`);
    unique.set(key, { key, sha256: expectedHash });
  }
  return [...unique.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function createLessonPlan(input: {
  repositoryRoot: string;
  canonicalPath: string;
  topic: string;
  expectedSlug?: string;
  outputRoot?: string;
  generatorVersion?: string;
}): Promise<LessonPlan> {
  const canonicalAbsolutePath = path.resolve(
    input.repositoryRoot,
    input.canonicalPath,
  );
  const bytes = await readFile(canonicalAbsolutePath);
  const source = bytes.toString("utf8");
  const frontmatter = parseScalarFrontmatter(source);
  const slug = frontmatter.slug;
  const version = Number(frontmatter.version);
  if (!slug || slug !== input.expectedSlug)
    throw new Error(`Lesson slug mismatch: ${input.canonicalPath}`);
  if (!Number.isInteger(version) || version < 1)
    throw new Error(`Invalid lesson version: ${input.canonicalPath}`);
  if (frontmatter.status !== "in_review")
    throw new Error(`P5 PDF input must be in_review: ${input.canonicalPath}`);

  const contentHash = sha256Bytes(bytes);
  const outputRoot = path.resolve(
    input.repositoryRoot,
    input.outputRoot ?? "generated-pdf",
  );
  const outputDirectory = path.join(outputRoot, slug);
  const relativePdfPath = path.posix.join(
    "generated-pdf",
    slug,
    `${contentHash}.pdf`,
  );
  const objectKey = privatePdfKey(slug, version, contentHash);
  const manifestObjectKey = objectKey.replace(/\.pdf$/, ".manifest.json");
  const identity: PdfIdentityManifest = {
    schemaVersion: 1,
    lesson: { slug, version, status: "in_review" },
    canonical: { path: input.canonicalPath, sha256: contentHash },
    assets: await referencedAssets(input.repositoryRoot, source),
    generator: {
      name: "playwright-chromium",
      version: input.generatorVersion ?? PDF_GENERATOR_VERSION,
    },
    output: {
      localPath: relativePdfPath,
      objectKey,
      manifestObjectKey,
    },
  };
  return {
    identity,
    canonicalAbsolutePath,
    fixturePath: `/fixtures/pilot/${input.topic}/${slug}`,
    pdfAbsolutePath: path.join(outputDirectory, `${contentHash}.pdf`),
    manifestAbsolutePath: path.join(
      outputDirectory,
      `${contentHash}.manifest.json`,
    ),
    metricsAbsolutePath: path.join(
      outputRoot,
      "run-metrics",
      `${slug}-${contentHash}.json`,
    ),
  };
}

export async function classifyExistingPlan(
  plan: LessonPlan,
): Promise<"generate" | "unchanged"> {
  const pdfExists = await stat(plan.pdfAbsolutePath).then(
    () => true,
    () => false,
  );
  const manifestExists = await stat(plan.manifestAbsolutePath).then(
    () => true,
    () => false,
  );
  if (!pdfExists && !manifestExists) return "generate";
  if (pdfExists !== manifestExists)
    throw new Error(
      `Incomplete existing PDF artifact set for ${plan.identity.lesson.slug}.`,
    );

  const existing = JSON.parse(
    await readFile(plan.manifestAbsolutePath, "utf8"),
  ) as PdfIdentityManifest;
  if (existing.canonical.sha256 !== plan.identity.canonical.sha256) {
    throw new Error(
      `Existing manifest content hash mismatch for ${plan.identity.lesson.slug}.`,
    );
  }
  if (existing.generator.version !== plan.identity.generator.version) {
    throw new Error(
      `generator-changed: ${existing.generator.version} -> ${plan.identity.generator.version}; use the explicit backup/replacement flow.`,
    );
  }
  if (stableJson(existing) !== stableJson(plan.identity)) {
    throw new Error(
      `Existing identity manifest drift for ${plan.identity.lesson.slug}.`,
    );
  }
  return "unchanged";
}
