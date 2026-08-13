import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  classifyExistingPlan,
  createLessonPlan,
  sha256Bytes,
  stableJson,
} from "../../scripts/generate-pdf/pipeline";

const temporaryRoots: string[] = [];

async function fixture(options?: {
  body?: string;
  status?: string;
  generatorVersion?: string;
}) {
  const root = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(path.join(os.tmpdir(), "xuyenlab-pdf-")),
  );
  temporaryRoots.push(root);
  const canonicalPath = "content/topics/chuyen-de-06/lesson.mdx";
  await mkdir(path.join(root, "content/topics/chuyen-de-06"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, canonicalPath),
    `---\ntopic: chuyen-de-06\nslug: lesson\nversion: 1\nstatus: ${options?.status ?? "in_review"}\n---\n${options?.body ?? "# Lesson"}\n`,
  );
  return createLessonPlan({
    repositoryRoot: root,
    canonicalPath,
    expectedSlug: "lesson",
    topic: "chuyen-de-06",
    outputRoot: "generated-pdf",
    generatorVersion: options?.generatorVersion,
  });
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("PDF identity pipeline", () => {
  it("derives the contract key from exact canonical MDX bytes", async () => {
    const plan = await fixture();
    const expectedHash = sha256Bytes(
      await readFile(plan.canonicalAbsolutePath),
    );
    expect(plan.identity.canonical.sha256).toBe(expectedHash);
    expect(plan.identity.output.objectKey).toBe(
      `pdf/lesson/v1/${expectedHash}.pdf`,
    );
    expect(plan.identity.output.manifestObjectKey).toBe(
      `pdf/lesson/v1/${expectedHash}.manifest.json`,
    );
  });

  it("changes identity when canonical MDX bytes change", async () => {
    const first = await fixture({ body: "# First" });
    const second = await fixture({ body: "# Second" });
    expect(first.identity.canonical.sha256).not.toBe(
      second.identity.canonical.sha256,
    );
    expect(first.identity.output.objectKey).not.toBe(
      second.identity.output.objectKey,
    );
  });

  it("reports an identical existing artifact set as unchanged", async () => {
    const plan = await fixture();
    await mkdir(path.dirname(plan.pdfAbsolutePath), { recursive: true });
    await writeFile(plan.pdfAbsolutePath, "%PDF fixture");
    await writeFile(plan.manifestAbsolutePath, stableJson(plan.identity));
    await expect(classifyExistingPlan(plan)).resolves.toBe("unchanged");
  });

  it("stops when a generator change would reuse a content key", async () => {
    const plan = await fixture({ generatorVersion: "new-generator" });
    await mkdir(path.dirname(plan.pdfAbsolutePath), { recursive: true });
    await writeFile(plan.pdfAbsolutePath, "%PDF fixture");
    const oldIdentity = structuredClone(plan.identity);
    oldIdentity.generator.version = "old-generator";
    await writeFile(plan.manifestAbsolutePath, stableJson(oldIdentity));
    await expect(classifyExistingPlan(plan)).rejects.toThrow(
      "generator-changed",
    );
  });

  it("fails closed when a referenced asset is missing", async () => {
    const hash = "a".repeat(64);
    await expect(
      fixture({
        body: `<ChemFigure src="/staging-assets/lessons/aa/${hash}.png" alt="x" />`,
      }),
    ).rejects.toThrow("Referenced asset is missing");
  });

  it("rejects content outside the owner-approved in_review lifecycle", async () => {
    await expect(fixture({ status: "draft" })).rejects.toThrow(
      "must be in_review",
    );
  });
});
