// @vitest-environment node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const importer = path.join(repoRoot, "scripts/import-docx/pilot_import.py");
const validator = path.join(repoRoot, "scripts/validate-content/validate.py");

function wordSourceExists(filename: string): boolean {
  const extra = process.env.XUYENLAB_SOURCE_ROOT;
  return [
    path.join(repoRoot, "_workspace", filename),
    path.join(repoRoot, filename),
    extra ? path.join(extra, filename) : "",
  ].some((candidate) => candidate !== "" && existsSync(candidate));
}

const hasPilotDocx = [
  "6. Chuyen de 6. Dong hoa hoc.ok.docx",
  "8.1. Chuyen de 8-  Dung dich can bang hoa hoc- phan I & II OK (1).docx",
].every(wordSourceExists);

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

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

interface PilotManifest {
  lessons: Array<{
    mdxPath: string;
    qaPath: string;
    mdxSha256: string;
    qaSha256: string;
    status: "draft" | "in_review";
  }>;
}

interface QaRecord {
  reviewer: string | null;
  reviewedAt: string | null;
  checks: Record<string, boolean>;
  approvedForPublish: boolean;
  lessonSlug: string;
  unresolved: Array<{ id: string; severity: string }>;
  publishWaiver?: unknown;
}

function signLesson(target: string, lesson: PilotManifest["lessons"][number]) {
  const mdxPath = path.join(target, lesson.mdxPath);
  writeFileSync(
    mdxPath,
    readFileSync(mdxPath, "utf8").replace("status: draft", "status: in_review"),
  );
  lesson.status = "in_review";
  lesson.mdxSha256 = sha256(mdxPath);
}

test.skipIf(!hasPilotDocx)(
  "validator accepts a consistently signed in_review pilot with visible blockers",
  () => {
    const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p4-in-review-"));
    try {
      expect(run(importer, ["--target-root", target]).status).toBe(0);
      const manifestPath = path.join(
        target,
        "content/pilot-staging-manifest.json",
      );
      const manifest = readJson<PilotManifest>(manifestPath);
      for (const lesson of manifest.lessons) {
        signLesson(target, lesson);
        const qaPath = path.join(target, lesson.qaPath);
        const qa = readJson<QaRecord>(qaPath);
        qa.reviewer = "Project owner";
        qa.reviewedAt = "2026-08-13T12:00:00+07:00";
        for (const check of Object.keys(qa.checks)) qa.checks[check] = true;
        writeFileSync(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
        lesson.qaSha256 = sha256(qaPath);
      }
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      expect(validate(target)).toEqual([]);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  },
  30_000,
);

test.skipIf(!hasPilotDocx)(
  "validator rejects unsigned or incomplete in_review QA",
  () => {
    const target = mkdtempSync(
      path.join(tmpdir(), "xuyenlab-p4-unsigned-review-"),
    );
    try {
      expect(run(importer, ["--target-root", target]).status).toBe(0);
      const manifestPath = path.join(
        target,
        "content/pilot-staging-manifest.json",
      );
      const manifest = readJson<PilotManifest>(manifestPath);
      for (const lesson of manifest.lessons) {
        signLesson(target, lesson);
      }
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      const errors = validate(target).join("\n");
      expect(errors).toContain("in_review QA requires a reviewer");
      expect(errors).toContain("in_review QA requires an ISO 8601 reviewedAt");
      expect(errors).toContain("in_review QA requires every check to be true");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  },
  30_000,
);

test.skipIf(!hasPilotDocx)(
  "P6-B1.0 safeguard: importer refuses to run against an in_review baseline, writing nothing",
  () => {
    const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p6-b1-0-guard-"));
    try {
      expect(run(importer, ["--target-root", target]).status).toBe(0);
      const manifestPath = path.join(
        target,
        "content/pilot-staging-manifest.json",
      );
      const manifest = readJson<PilotManifest>(manifestPath);
      for (const lesson of manifest.lessons) {
        signLesson(target, lesson);
        const qaPath = path.join(target, lesson.qaPath);
        const qa = readJson<QaRecord>(qaPath);
        qa.reviewer = "Project owner";
        qa.reviewedAt = "2026-08-13T12:00:00+07:00";
        for (const check of Object.keys(qa.checks)) qa.checks[check] = true;
        writeFileSync(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
        lesson.qaSha256 = sha256(qaPath);
      }
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      expect(validate(target)).toEqual([]);
      const managedPaths = [
        manifestPath,
        ...manifest.lessons.flatMap((lesson) => [
          path.join(target, lesson.mdxPath),
          path.join(target, lesson.qaPath),
        ]),
      ];
      const before = managedPaths.map((filePath) => sha256(filePath));
      const refused = run(importer, ["--target-root", target]);
      expect(refused.status).not.toBe(0);
      expect(refused.stderr).toContain("in_review");
      expect(managedPaths.map((filePath) => sha256(filePath))).toEqual(before);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  },
  30_000,
);
