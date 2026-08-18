// @vitest-environment node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import { expect, test } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const importer = path.join(repoRoot, "scripts/import-docx/pilot_import.py");
const validator = path.join(repoRoot, "scripts/validate-content/validate.py");
const manifestPath = "content/pilot-staging-manifest.json";
const topic24Name = "24. Chuyen de 24_ Phan bon hoa hoc_OK.docx";

function resolveWordSource(filename: string): string | undefined {
  const extra = process.env.XUYENLAB_SOURCE_ROOT;
  return [
    path.join(repoRoot, "_workspace", filename),
    path.join(repoRoot, filename),
    extra ? path.join(extra, filename) : "",
  ].find((candidate) => candidate !== "" && existsSync(candidate));
}

const topic24Path = resolveWordSource(topic24Name);
const itDocx = topic24Path ? test : test.skip;
const topic24Args = [
  "--source",
  topic24Path ?? path.join(repoRoot, topic24Name),
  "--source-id",
  "T24-S01",
  "--topic",
  "24",
  "--slug",
  "phan-bon-hoa-hoc",
  "--title",
  "Phân bón hóa học",
];

itDocx("P6-B1.1 imports Topic 24 incrementally and preserves both pilots byte-for-byte", () => {
  const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p6-b1-1-"));
  try {
    copyBaseline(target);
    const before = readJson<Manifest>(path.join(target, manifestPath));
    const pilotPaths = managedPilotPaths(before);
    const pilotHashes = hashPaths(target, pilotPaths);
    const pilotLessons = structuredClone(before.lessons);
    const pilotAssets = structuredClone(before.assets);

    const first = run(importer, ["--target-root", target, ...topic24Args]);
    expect(first.status, first.stderr).toBe(0);
    expect(first.stdout).toContain('"result": "updated"');

    const after = readJson<Manifest>(path.join(target, manifestPath));
    expect(after.lessons.slice(0, 2)).toEqual(pilotLessons);
    expect(
      after.assets.filter((asset) =>
        asset.sourceIds.some((sourceId) =>
          ["T06-S01", "T08-S01"].includes(sourceId),
        ),
      ),
    ).toEqual(pilotAssets);
    expect(hashPaths(target, pilotPaths)).toEqual(pilotHashes);

    const topic24 = after.lessons.find(
      (lesson) => lesson.sourceId === "T24-S01",
    );
    expect(topic24).toMatchObject({
      slug: "phan-bon-hoa-hoc",
      topic: "chuyen-de-24",
      sourcePath: "24. Chuyen de 24_ Phan bon hoa hoc_OK.docx",
      status: "draft",
      blockingCount: 0,
      warningCount: 3,
    });
    const mdx = readFileSync(path.join(target, topic24!.mdxPath), "utf8");
    expect(mdx).toContain('section: "Phần I"');
    expect(mdx).toContain("status: draft");
    expect(mdx).not.toContain("Phần II:");

    const report = readJson<FailureReport>(
      path.join(target, topic24!.failureReportPath),
    );
    const schema = readJson<object>(
      path.join(repoRoot, "scripts/import-docx/failure-report.schema.json"),
    );
    const validateReport = new Ajv({
      allErrors: true,
      jsonPointers: true,
    }).compile(schema);
    expect(validateReport(report), JSON.stringify(validateReport.errors)).toBe(
      true,
    );
    expect(report.source).toEqual({
      sourceId: "T24-S01",
      sourcePath: "24. Chuyen de 24_ Phan bon hoa hoc_OK.docx",
      section: "Phần I",
    });
    expect(report.summary).toMatchObject({ blockingCount: 0, warningCount: 3 });

    const qa = readJson<QaRecord>(path.join(target, topic24!.qaPath));
    expect(qa).toMatchObject({
      approvedForPublish: false,
      reviewStatus: "pending",
      reviewer: null,
      reviewedAt: null,
    });
    expect(Object.values(qa.checks).every((value) => value === false)).toBe(
      true,
    );
    expect(qa.publishWaiver).toBeUndefined();

    const queue = readJson<Array<{ status: string; remediationChoice: null }>>(
      path.join(
        target,
        "content/qa/pending/phan-bon-hoa-hoc.remediation-queue.json",
      ),
    );
    expect(queue).toHaveLength(3);
    expect(queue.every((item) => item.status === "pending-owner-review")).toBe(
      true,
    );
    expect(queue.every((item) => item.remediationChoice === null)).toBe(true);
    expect(validate(target)).toEqual([]);

    const rerun = run(importer, ["--target-root", target, ...topic24Args]);
    expect(rerun.status, rerun.stderr).toBe(0);
    expect(rerun.stdout).toContain('"result": "unchanged"');
    expect(hashPaths(target, pilotPaths)).toEqual(pilotHashes);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}, 30_000);

itDocx("P6-B1.1 detects Topic 24 manual drift before changing managed content", () => {
  const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p6-b1-1-drift-"));
  try {
    copyBaseline(target);
    expect(
      run(importer, ["--target-root", target, ...topic24Args]).status,
    ).toBe(0);
    const manifest = readJson<Manifest>(path.join(target, manifestPath));
    const topic24 = manifest.lessons.find(
      (lesson) => lesson.sourceId === "T24-S01",
    )!;
    const mdxPath = path.join(target, topic24.mdxPath);
    writeFileSync(mdxPath, `${readFileSync(mdxPath, "utf8")}\nmanual drift\n`);
    const protectedPaths = [
      ...managedPilotPaths(manifest),
      topic24.mdxPath,
      topic24.failureReportPath,
      topic24.qaPath,
      "content/qa/pending/phan-bon-hoa-hoc.remediation-queue.json",
      manifestPath,
    ];
    const before = hashPaths(target, protectedPaths);

    const refused = run(importer, ["--target-root", target, ...topic24Args]);
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toContain("Manual edits detected");
    expect(hashPaths(target, protectedPaths)).toEqual(before);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}, 30_000);

function copyBaseline(target: string) {
  const current = readJson<Manifest>(path.join(repoRoot, manifestPath));
  const manifest = {
    ...current,
    lessons: current.lessons.filter((lesson) =>
      ["T06-S01", "T08-S01"].includes(lesson.sourceId),
    ),
    assets: current.assets.filter((asset) =>
      asset.sourceIds.some((sourceId) =>
        ["T06-S01", "T08-S01"].includes(sourceId),
      ),
    ),
  };
  const paths = ["content/topics.ts", ...managedPilotPaths(manifest)];
  for (const relative of paths) {
    const source = path.join(repoRoot, relative);
    const destination = path.join(target, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
  const destination = path.join(target, manifestPath);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(manifest, null, 2)}\n`);
}

function managedPilotPaths(manifest: Manifest): string[] {
  const pilots = manifest.lessons.filter((lesson) =>
    ["T06-S01", "T08-S01"].includes(lesson.sourceId),
  );
  return [
    ...pilots.flatMap((lesson) => [
      lesson.mdxPath,
      lesson.failureReportPath,
      lesson.qaPath,
      `content/qa/pending/${lesson.slug}.remediation-queue.json`,
    ]),
    ...manifest.assets
      .filter((asset) =>
        asset.sourceIds.some((sourceId) =>
          ["T06-S01", "T08-S01"].includes(sourceId),
        ),
      )
      .map((asset) => `public/${asset.path}`),
  ];
}

function hashPaths(root: string, paths: string[]): Record<string, string> {
  return Object.fromEntries(
    paths.map((relative) => [
      relative,
      createHash("sha256")
        .update(readFileSync(path.join(root, relative)))
        .digest("hex"),
    ]),
  );
}

function run(script: string, args: string[]) {
  return spawnSync("python3", [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
}

function validate(target: string): string[] {
  const result = run(validator, ["--root", target, "--json"]);
  return (JSON.parse(result.stdout) as { errors: string[] }).errors;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

interface ManifestLesson {
  slug: string;
  sourceId: string;
  sourcePath: string;
  topic: string;
  status: "draft" | "in_review";
  mdxPath: string;
  failureReportPath: string;
  qaPath: string;
  blockingCount: number;
  warningCount: number;
}

interface Manifest {
  lessons: ManifestLesson[];
  assets: Array<{ path: string; sourceIds: string[] }>;
}

interface QaRecord {
  approvedForPublish: boolean;
  reviewStatus: string;
  reviewer: string | null;
  reviewedAt: string | null;
  checks: Record<string, boolean>;
  publishWaiver?: unknown;
}

interface FailureReport {
  source: { sourceId: string; sourcePath: string; section: string };
  summary: { blockingCount: number; warningCount: number };
}
