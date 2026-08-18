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

test.skipIf(!hasPilotDocx)("imports real Topic 6/8 DOCX, validates output and protects manual edits", () => {
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
