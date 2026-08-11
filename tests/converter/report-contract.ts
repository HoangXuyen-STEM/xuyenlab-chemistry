import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Outcome = "semantic" | "fallback" | "omitted";
export type Severity = "warning" | "blocking";
export type BlockKind =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "formula"
  | "image"
  | "drawing"
  | "chart"
  | "embeddedObject"
  | "smartArt"
  | "shape";
export type SemanticKind =
  "heading" | "paragraph" | "list" | "datatable" | "math" | "chemfigure";
export type FallbackStrategy =
  | "none"
  | "chemfigure"
  | "rasterized-inline"
  | "datatable-html"
  | "manual-review";

export interface SourceReference {
  sourceId: string;
  sourcePath: string;
  section: string;
}

export interface SourceLocator {
  sectionPath: string;
  blockOrder: number;
  pathHint: string;
  pageHint?: number;
  textAnchor?: string;
}

export interface FallbackMetadata {
  strategy: FallbackStrategy;
  reason: string;
  assetPath?: string;
  altText?: string;
  caption?: string;
}

export interface SyntheticExpectation {
  outcome: Outcome;
  semanticKind?: SemanticKind;
  severity?: Severity;
  issueCode?: string;
  message?: string;
  fallback?: FallbackMetadata;
}

export interface SyntheticBlock {
  id: string;
  kind: BlockKind;
  sourceLocator: SourceLocator;
  expected: SyntheticExpectation;
}

export interface SyntheticFixture {
  fixtureId: string;
  source: SourceReference;
  blocks: SyntheticBlock[];
}

export interface FailureReportBlock {
  id: string;
  kind: BlockKind;
  sourceLocator: SourceLocator;
  outcome: Outcome;
  semanticKind?: SemanticKind;
  severity?: Severity;
  issueCode?: string;
  message?: string;
  fallback?: FallbackMetadata;
}

export interface FailureReport {
  $schema?: string;
  reportVersion: string;
  fixtureId: string;
  source: SourceReference;
  generator: {
    name: string;
    version: string;
    strategy: "semantic" | "hybrid" | "image-first";
  };
  run: {
    runId: string;
    runOrdinal: number;
    generatedAt: string;
    sourceDigest: string;
    rerunOf: string | null;
  };
  summary: {
    totalBlocks: number;
    semanticBlockCount: number;
    fallbackBlockCount: number;
    omittedBlockCount: number;
    issueCount: number;
    warningCount: number;
    blockingCount: number;
  };
  blocks: FailureReportBlock[];
}

export interface CorpusFixture {
  directoryName: string;
  input: SyntheticFixture;
  reports: Array<{
    fileName: string;
    report: FailureReport;
  }>;
}

interface InvalidReportFixture {
  fileName: string;
  report: FailureReport;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const fixturesRoot = path.join(repoRoot, "tests/fixtures/converter");
const corpusRoot = path.join(fixturesRoot, "corpus");
const manifestPath = path.join(repoRoot, "docs/source-manifest.csv");
const schemaPath = path.join(
  repoRoot,
  "scripts/import-docx/failure-report.schema.json",
);

export function getSchemaPath(): string {
  return schemaPath;
}

export function loadSchema(): unknown {
  return readJson(schemaPath);
}

export function loadCorpusFixtures(): CorpusFixture[] {
  return readdirSync(corpusRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const directoryPath = path.join(corpusRoot, entry.name);
      const input = readJson<SyntheticFixture>(
        path.join(directoryPath, "input.json"),
      );
      const reports = readdirSync(directoryPath)
        .filter(
          (fileName) =>
            fileName === "report.json" || fileName.endsWith(".report.json"),
        )
        .sort()
        .map((fileName) => ({
          fileName,
          report: readJson<FailureReport>(path.join(directoryPath, fileName)),
        }));

      return {
        directoryName: entry.name,
        input,
        reports,
      };
    })
    .sort((left, right) =>
      left.directoryName.localeCompare(right.directoryName),
    );
}

export function loadInvalidReports(
  kind: "schema" | "contract",
): InvalidReportFixture[] {
  const invalidRoot = path.join(fixturesRoot, "invalid", kind);

  return readdirSync(invalidRoot)
    .filter((fileName) => fileName.endsWith(".report.json"))
    .sort()
    .map((fileName) => ({
      fileName,
      report: readJson<FailureReport>(path.join(invalidRoot, fileName)),
    }));
}

export function loadManifestSourcePaths(): Map<string, string> {
  const lines = readFileSync(manifestPath, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.length > 0);

  return new Map(
    lines.slice(1).map((line) => {
      const [sourceId, , sourcePath] = splitCsvLine(line);
      return [sourceId, sourcePath];
    }),
  );
}

export function normalizeRerunReport(report: FailureReport): FailureReport {
  return {
    ...report,
    run: {
      ...report.run,
      generatedAt: "<stable-generated-at>",
      runId: "<stable-run-id>",
      runOrdinal: 0,
      rerunOf: "<stable-rerun-of>",
    },
  };
}

export function validateReportAgainstFixture(
  input: SyntheticFixture,
  report: FailureReport,
  manifestSourcePaths: Map<string, string>,
): string[] {
  const errors: string[] = [];

  if (report.fixtureId !== input.fixtureId) {
    errors.push(
      `fixtureId mismatch: expected ${input.fixtureId}, received ${report.fixtureId}`,
    );
  }

  if (report.source.sourceId !== input.source.sourceId) {
    errors.push(
      `sourceId mismatch: expected ${input.source.sourceId}, received ${report.source.sourceId}`,
    );
  }

  if (report.source.sourcePath !== input.source.sourcePath) {
    errors.push(
      `sourcePath mismatch: expected ${input.source.sourcePath}, received ${report.source.sourcePath}`,
    );
  }

  if (report.source.section !== input.source.section) {
    errors.push(
      `section mismatch: expected ${input.source.section}, received ${report.source.section}`,
    );
  }

  const manifestPathForSource = manifestSourcePaths.get(report.source.sourceId);
  if (!manifestPathForSource) {
    errors.push(
      `sourceId ${report.source.sourceId} is not present in docs/source-manifest.csv`,
    );
  } else if (manifestPathForSource !== report.source.sourcePath) {
    errors.push(
      `sourcePath ${report.source.sourcePath} does not match manifest path ${manifestPathForSource}`,
    );
  }

  if (report.blocks.length !== input.blocks.length) {
    errors.push(
      `block count mismatch: expected ${input.blocks.length}, received ${report.blocks.length}`,
    );
  }

  const expectedIdsInOrder = input.blocks.map((block) => block.id);
  const actualIdsInOrder = report.blocks.map((block) => block.id);
  if (new Set(actualIdsInOrder).size !== actualIdsInOrder.length) {
    errors.push("duplicate block ids detected in report.blocks");
  }

  if (JSON.stringify(actualIdsInOrder) !== JSON.stringify(expectedIdsInOrder)) {
    errors.push(
      "report.blocks ids/order do not match the synthetic fixture input",
    );
  }

  const actualBlocksById = new Map(
    report.blocks.map((block) => [block.id, block]),
  );

  for (const expectedBlock of input.blocks) {
    const actualBlock = actualBlocksById.get(expectedBlock.id);
    if (!actualBlock) {
      errors.push(`missing block ${expectedBlock.id} in report.blocks`);
      continue;
    }

    if (actualBlock.kind !== expectedBlock.kind) {
      errors.push(
        `kind mismatch for ${expectedBlock.id}: expected ${expectedBlock.kind}, received ${actualBlock.kind}`,
      );
    }

    if (
      JSON.stringify(actualBlock.sourceLocator) !==
      JSON.stringify(expectedBlock.sourceLocator)
    ) {
      errors.push(`sourceLocator mismatch for ${expectedBlock.id}`);
    }

    if (actualBlock.outcome !== expectedBlock.expected.outcome) {
      errors.push(
        `outcome mismatch for ${expectedBlock.id}: expected ${expectedBlock.expected.outcome}, received ${actualBlock.outcome}`,
      );
    }

    if (
      actualBlock.semanticKind !== expectedBlock.expected.semanticKind ||
      actualBlock.severity !== expectedBlock.expected.severity ||
      actualBlock.issueCode !== expectedBlock.expected.issueCode ||
      actualBlock.message !== expectedBlock.expected.message ||
      JSON.stringify(actualBlock.fallback) !==
        JSON.stringify(expectedBlock.expected.fallback)
    ) {
      errors.push(`expected metadata mismatch for ${expectedBlock.id}`);
    }
  }

  const derivedSummary = {
    totalBlocks: report.blocks.length,
    semanticBlockCount: report.blocks.filter(
      (block) => block.outcome === "semantic",
    ).length,
    fallbackBlockCount: report.blocks.filter(
      (block) => block.outcome === "fallback",
    ).length,
    omittedBlockCount: report.blocks.filter(
      (block) => block.outcome === "omitted",
    ).length,
    issueCount: report.blocks.filter((block) => block.outcome !== "semantic")
      .length,
    warningCount: report.blocks.filter((block) => block.severity === "warning")
      .length,
    blockingCount: report.blocks.filter(
      (block) => block.severity === "blocking",
    ).length,
  };

  for (const [key, expectedValue] of Object.entries(derivedSummary)) {
    const actualValue = report.summary[key as keyof typeof derivedSummary];
    if (actualValue !== expectedValue) {
      errors.push(
        `summary.${key} mismatch: expected ${expectedValue}, received ${actualValue}`,
      );
    }
  }

  for (const block of report.blocks) {
    if (block.outcome === "semantic") {
      if (!block.semanticKind) {
        errors.push(`semantic block ${block.id} is missing semanticKind`);
      }

      if (
        block.severity ||
        block.issueCode ||
        block.message ||
        block.fallback
      ) {
        errors.push(`semantic block ${block.id} contains failure metadata`);
      }
    } else {
      if (
        !block.severity ||
        !block.issueCode ||
        !block.message ||
        !block.fallback
      ) {
        errors.push(`non-semantic block ${block.id} is missing issue metadata`);
      }
    }
  }

  return errors;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
}
