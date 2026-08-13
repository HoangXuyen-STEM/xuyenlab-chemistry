// @vitest-environment node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
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

test("imports real Topic 6/8 DOCX, validates output and protects manual edits", () => {
  const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p4-pilot-"));
  const backup = path.join(target, "explicit-backup");
  try {
    expect(run(importer, ["--target-root", target]).status).toBe(0);
    expect(run(importer, ["--target-root", target]).stdout).toContain(
      '"result": "unchanged"',
    );
    expect(validate(target)).toEqual([]);

    const manifest = readJson(
      path.join(target, "content/pilot-staging-manifest.json"),
    ) as PilotManifest;
    expect(manifest.lessons.map((lesson) => lesson.sourceId)).toEqual([
      "T06-S01",
      "T08-S01",
    ]);
    expect(manifest.lessons.every((lesson) => lesson.blockingCount > 0)).toBe(
      true,
    );
    expect(manifest.assets).toHaveLength(19);
    expect(
      manifest.assets.every((asset) =>
        new RegExp(
          `^staging-assets/lessons/${asset.sha256.slice(0, 2)}/${asset.sha256}\\.[a-z0-9]+$`,
        ).test(asset.path),
      ),
    ).toBe(true);
    const schema = readJson(
      path.join(repoRoot, "scripts/import-docx/failure-report.schema.json"),
    ) as object;
    const validateReport = new Ajv({
      allErrors: true,
      jsonPointers: true,
    }).compile(schema);
    for (const lesson of manifest.lessons) {
      expect(
        validateReport(readJson(path.join(target, lesson.failureReportPath))),
        JSON.stringify(validateReport.errors),
      ).toBe(true);
    }

    const lessonPath = path.join(target, manifest.lessons[0].mdxPath);
    writeFileSync(
      lessonPath,
      `${readFileSync(lessonPath, "utf8")}\nmanual edit\n`,
    );
    const refused = run(importer, ["--target-root", target]);
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toContain("Manual edits detected");
    expect(run(importer, ["--target-root", target, "--force"]).status).not.toBe(
      0,
    );

    const replaced = run(importer, [
      "--target-root",
      target,
      "--force",
      "--backup-dir",
      backup,
    ]);
    expect(replaced.status).toBe(0);
    expect(
      readFileSync(path.join(backup, manifest.lessons[0].mdxPath), "utf8"),
    ).toContain("manual edit");
    expect(validate(target)).toEqual([]);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}, 30_000);

test("validator exposes every required pilot failure class", () => {
  const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p4-validator-"));
  try {
    expect(run(importer, ["--target-root", target]).status).toBe(0);
    const manifestPath = path.join(
      target,
      "content/pilot-staging-manifest.json",
    );
    const manifest = readJson(manifestPath) as PilotManifest;
    const lesson = manifest.lessons[0];
    const mdxPath = path.join(target, lesson.mdxPath);
    const reportPath = path.join(target, lesson.failureReportPath);
    const mdx = readFileSync(mdxPath, "utf8");
    const report = readJson(reportPath) as FailureReport;
    const blockingId = report.blocks.find(
      (block) => block.severity === "blocking",
    )?.id;
    expect(blockingId).toBeTruthy();

    writeFileSync(mdxPath, mdx.replace(/^summary:.*\n/mu, ""));
    expect(validate(target).join("\n")).toContain("missing metadata summary");

    writeFileSync(mdxPath, mdx.replace("status: draft", "status: published"));
    expect(validate(target).join("\n")).toContain(
      "P4 validator rejects published content",
    );

    writeFileSync(mdxPath, mdx.replace("status: draft", "status: in_review"));
    expect(validate(target).join("\n")).toContain(
      "differs from pilot manifest 'draft'",
    );

    writeFileSync(mdxPath, mdx.replace(blockingId!, "REMOVED-BLOCKING-ID"));
    expect(validate(target).join("\n")).toContain(
      "hidden unresolved blocking issue",
    );

    writeFileSync(mdxPath, `${mdx}\n[broken](./missing.mdx)\n`);
    expect(validate(target).join("\n")).toContain(
      "broken or unsafe local link",
    );

    writeFileSync(reportPath, `${readFileSync(reportPath, "utf8")} `);
    expect(validate(target).join("\n")).toContain(
      "missing or drifted failure report",
    );
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

    const assetPath = path.join(target, "public", manifest.assets[0].path);
    unlinkSync(assetPath);
    expect(validate(target).join("\n")).toContain("broken asset");

    const duplicatePath = path.join(
      target,
      "content/topics/chuyen-de-06/duplicate.mdx",
    );
    mkdirSync(path.dirname(duplicatePath), { recursive: true });
    copyFileSync(mdxPath, duplicatePath);
    expect(validate(target).join("\n")).toContain("duplicate slug");
    expect(validate(target).join("\n")).toContain("duplicate topic/order");
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}, 30_000);

test("validator accepts a consistently signed in_review pilot with visible blockers", () => {
  const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p4-in-review-"));
  try {
    expect(run(importer, ["--target-root", target]).status).toBe(0);
    const manifestPath = path.join(
      target,
      "content/pilot-staging-manifest.json",
    );
    const manifest = readJson(manifestPath) as PilotManifest;
    manifest.publicationStatus = "in_review";

    for (const lesson of manifest.lessons) {
      const mdxPath = path.join(target, lesson.mdxPath);
      writeFileSync(
        mdxPath,
        readFileSync(mdxPath, "utf8").replace(
          "status: draft",
          "status: in_review",
        ),
      );
      lesson.mdxSha256 = sha256(mdxPath);

      const qaPath = path.join(target, lesson.qaPath);
      const qa = readJson(qaPath) as QaRecord;
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
}, 30_000);

test("validator rejects unsigned or incomplete in_review QA", () => {
  const target = mkdtempSync(
    path.join(tmpdir(), "xuyenlab-p4-unsigned-review-"),
  );
  try {
    expect(run(importer, ["--target-root", target]).status).toBe(0);
    const manifestPath = path.join(
      target,
      "content/pilot-staging-manifest.json",
    );
    const manifest = readJson(manifestPath) as PilotManifest;
    manifest.publicationStatus = "in_review";

    for (const lesson of manifest.lessons) {
      const mdxPath = path.join(target, lesson.mdxPath);
      writeFileSync(
        mdxPath,
        readFileSync(mdxPath, "utf8").replace(
          "status: draft",
          "status: in_review",
        ),
      );
      lesson.mdxSha256 = sha256(mdxPath);
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const errors = validate(target).join("\n");
    expect(errors).toContain("in_review QA requires a reviewer");
    expect(errors).toContain("in_review QA requires an ISO 8601 reviewedAt");
    expect(errors).toContain("in_review QA requires every check to be true");
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}, 30_000);

test("validator permits approvedForPublish:true only for the P6 owner-approved pilot slugs", () => {
  const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p6-approval-"));
  try {
    expect(run(importer, ["--target-root", target]).status).toBe(0);
    const manifestPath = path.join(
      target,
      "content/pilot-staging-manifest.json",
    );
    const manifest = readJson(manifestPath) as PilotManifest;
    manifest.publicationStatus = "in_review";

    for (const lesson of manifest.lessons) {
      const mdxPath = path.join(target, lesson.mdxPath);
      writeFileSync(
        mdxPath,
        readFileSync(mdxPath, "utf8").replace(
          "status: draft",
          "status: in_review",
        ),
      );
      lesson.mdxSha256 = sha256(mdxPath);

      const qaPath = path.join(target, lesson.qaPath);
      const qa = readJson(qaPath) as QaRecord;
      qa.reviewer = "Project owner";
      qa.reviewedAt = "2026-08-13T12:00:00+07:00";
      for (const check of Object.keys(qa.checks)) qa.checks[check] = true;
      writeFileSync(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
      lesson.qaSha256 = sha256(qaPath);
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    // Every non-approved lesson (both, at this point) must still keep
    // approvedForPublish: false — this baseline must already validate clean.
    expect(validate(target)).toEqual([]);

    const approvedLesson = manifest.lessons[0];
    const approvedQaPath = path.join(target, approvedLesson.qaPath);
    const approvedQa = readJson(approvedQaPath) as QaRecord;
    const originalLessonSlug = approvedQa.lessonSlug;

    const writeApprovedQa = () => {
      writeFileSync(approvedQaPath, `${JSON.stringify(approvedQa, null, 2)}\n`);
      approvedLesson.qaSha256 = sha256(approvedQaPath);
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    };

    // Positive: the real pilot lesson slugs (dong-hoa-hoc,
    // dung-dich-va-can-bang-hoa-hoc) are the P6.2 owner-approved allowlist, and
    // this lesson still has unresolved blocking items, matching production.
    approvedQa.approvedForPublish = true;
    writeApprovedQa();
    expect(validate(target)).toEqual([]);

    // Negative: an otherwise identical, fully-signed QA record is still rejected
    // for any lesson slug outside the owner-approved allowlist.
    approvedQa.lessonSlug = "not-an-approved-pilot";
    writeApprovedQa();
    expect(validate(target).join("\n")).toContain(
      "approvedForPublish is only permitted for the P6 owner-approved pilot lessons",
    );

    // Negative: a non-boolean approvedForPublish is always rejected, even for an
    // approved slug.
    approvedQa.lessonSlug = originalLessonSlug;
    (
      approvedQa as unknown as { approvedForPublish: unknown }
    ).approvedForPublish = "yes";
    writeApprovedQa();
    expect(validate(target).join("\n")).toContain(
      "approvedForPublish must be true or false",
    );
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}, 30_000);

function run(script: string, args: string[]) {
  return spawnSync("python3", [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
}

function validate(target: string): string[] {
  const result = run(validator, ["--root", target, "--json"]);
  const payload = JSON.parse(result.stdout) as {
    valid: boolean;
    errors: string[];
  };
  return payload.errors;
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

interface PilotManifest {
  publicationStatus: "draft" | "in_review";
  lessons: Array<{
    sourceId: string;
    mdxPath: string;
    failureReportPath: string;
    blockingCount: number;
    mdxSha256: string;
    qaPath: string;
    qaSha256: string;
  }>;
  assets: Array<{ path: string; sha256: string }>;
}

interface QaRecord {
  reviewer: string | null;
  reviewedAt: string | null;
  checks: Record<string, boolean>;
  approvedForPublish: boolean;
  lessonSlug: string;
}

interface FailureReport {
  blocks: Array<{ id: string; severity?: string }>;
}

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}
