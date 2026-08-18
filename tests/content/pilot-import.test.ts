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
  const payload = JSON.parse(result.stdout) as {
    valid: boolean;
    errors: string[];
  };
  return payload.errors;
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

interface PilotManifest {
  lessons: Array<{
    sourceId: string;
    mdxPath: string;
    failureReportPath: string;
    blockingCount: number;
    mdxSha256: string;
    qaPath: string;
    qaSha256: string;
    status: "draft" | "in_review";
  }>;
  assets: Array<{ path: string; sha256: string }>;
}

interface QaRecord {
  reviewer: string | null;
  reviewedAt: string | null;
  checks: Record<string, boolean>;
  approvedForPublish: boolean;
  lessonSlug: string;
  unresolved: Array<{ id: string; severity: string }>;
  publishWaiver?: PublishWaiver;
}

interface PublishWaiver {
  type: string;
  scope: string;
  authorizedBy: string;
  authorizedDate: string;
  doesNotAuthorize: string[];
  remediationDebtRetained: boolean;
  unresolvedBlockingCount: number;
  acknowledgedBlockedItems: string[];
  reference: { contractAmendment: string; handoff: string };
}

interface FailureReport {
  blocks: Array<{ id: string; severity?: string }>;
}

test.skipIf(!hasPilotDocx)(
  "imports real Topic 6/8 DOCX, validates output and protects manual edits",
  () => {
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
  },
  30_000,
);

test.skipIf(!hasPilotDocx)(
  "validator exposes every required pilot failure class",
  () => {
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
        "differs from its manifest lesson status 'draft'",
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
  },
  30_000,
);
