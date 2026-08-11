// @vitest-environment node

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import { expect, test } from "vitest";

import { loadManifestSourcePaths, type FailureReport } from "./report-contract";

type ConverterOutput = {
  result: "created" | "unchanged";
  target: string;
};

type ValidationError = {
  dataPath?: string;
  instancePath?: string;
  message?: string;
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const sourceId = "T06-S02";
const manifestSourcePath = loadManifestSourcePaths().get(sourceId);

if (!manifestSourcePath) {
  throw new Error(`Missing ${sourceId} in docs/source-manifest.csv`);
}

const sourcePath = path.join(repoRoot, manifestSourcePath);
const schemaPath = path.join(
  repoRoot,
  "scripts/import-docx/failure-report.schema.json",
);
const slug = "t06-s02-prototype-black-box";
const title = "T06-S02 Prototype Black Box";
const outputDirectoryName = "t06-s02-html";

test("runs prototype.py against the manifest-backed T06-S02 HTML pilot", () => {
  const tempRoot = mkdtempSync(
    path.join(tmpdir(), "xuyenlab-prototype-black-box-"),
  );

  try {
    const firstRun = runPrototype(tempRoot);
    const targetDirectory = path.join(tempRoot, outputDirectoryName);
    const reportPath = path.join(targetDirectory, "failure-report.json");
    const mdxPath = path.join(targetDirectory, `${slug}.mdx`);

    expect(firstRun).toEqual({
      result: "created",
      target: targetDirectory,
    });

    const reportText = readFileSync(reportPath, "utf8");
    const report = JSON.parse(reportText) as FailureReport;
    const mdx = readFileSync(mdxPath, "utf8");

    validateReport(readJson(schemaPath), report);

    expect(report.source.sourceId).toBe(sourceId);
    expect(report.source.sourcePath).toBe(manifestSourcePath);

    const listBlocks = report.blocks.filter((block) => block.kind === "list");
    const semanticListBlocks = listBlocks.filter(
      (block) => block.outcome === "semantic" && block.semanticKind === "list",
    );

    expect(listBlocks).toHaveLength(26);
    expect(semanticListBlocks).toHaveLength(26);
    expect(mdx).toContain("H<sub>2</sub>O<sub>2</sub>");

    const secondRun = runPrototype(tempRoot);

    expect(secondRun).toEqual({
      result: "unchanged",
      target: targetDirectory,
    });
    expect(readFileSync(reportPath, "utf8")).toBe(reportText);
    expect(readFileSync(mdxPath, "utf8")).toBe(mdx);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

function runPrototype(outputDir: string): ConverterOutput {
  const result = spawnSync(
    "python3",
    [
      path.join(repoRoot, "scripts/import-docx/prototype.py"),
      "--source",
      sourcePath,
      "--source-id",
      sourceId,
      "--topic",
      "6",
      "--slug",
      slug,
      "--title",
      title,
      "--output-dir",
      outputDir,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PYTHONDONTWRITEBYTECODE: "1",
      },
    },
  );

  expect(result.status, result.stderr || result.stdout).toBe(0);
  return JSON.parse(result.stdout.trim()) as ConverterOutput;
}

function validateReport(schema: unknown, report: FailureReport): void {
  if (!isAjvSchema(schema)) {
    throw new TypeError(
      "failure-report.schema.json must parse to an Ajv-compatible schema",
    );
  }

  const validate = new Ajv({ allErrors: true, jsonPointers: true }).compile(
    schema,
  );

  expect(
    validate(report),
    formatValidationErrors(validate.errors as ValidationError[] | undefined),
  ).toBe(true);
}

function formatValidationErrors(errors: ValidationError[] | undefined): string {
  if (!errors || errors.length === 0) {
    return "unknown schema validation failure";
  }

  return errors
    .map((error) =>
      `${error.instancePath ?? error.dataPath ?? "<root>"} ${error.message ?? ""}`.trim(),
    )
    .join("; ");
}

function isAjvSchema(value: unknown): value is object | boolean {
  return (
    (typeof value === "object" && value !== null) || typeof value === "boolean"
  );
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}
