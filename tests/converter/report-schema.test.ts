// @vitest-environment node

import { createRequire } from "node:module";

import { describe, expect, test } from "vitest";

import {
  loadCorpusFixtures,
  loadInvalidReports,
  loadSchema,
} from "./report-contract";

type ValidationError = {
  dataPath?: string;
  instancePath?: string;
  message?: string;
};

type ValidateFunction = ((data: unknown) => boolean) & {
  errors?: ValidationError[];
};

type AjvLike = new (options?: Record<string, unknown>) => {
  compile: (schema: unknown) => ValidateFunction;
};

const require = createRequire(import.meta.url);
const Ajv = require("ajv") as AjvLike;

function buildValidator(): ValidateFunction {
  const ajv = new Ajv({ allErrors: true, jsonPointers: true });
  return ajv.compile(loadSchema());
}

function formatErrors(errors: ValidationError[] | undefined): string {
  if (!errors || errors.length === 0) {
    return "unknown schema validation failure";
  }

  return errors
    .map((error) =>
      `${error.instancePath ?? error.dataPath ?? "<root>"} ${error.message ?? ""}`.trim(),
    )
    .join("; ");
}

function getCorpusReport(filePathId: string) {
  const [fixtureId, fileName = "report.json"] = filePathId.split("/");

  for (const fixture of loadCorpusFixtures()) {
    if (fixture.input.fixtureId !== fixtureId) {
      continue;
    }

    const report = fixture.reports.find(
      (candidate) => candidate.fileName === fileName,
    );
    if (report) {
      return report.report;
    }
  }

  throw new Error(`Unable to find corpus report ${filePathId}`);
}

function getInvalidSchemaReport(fileName: string) {
  const report = loadInvalidReports("schema").find(
    (candidate) => candidate.fileName === fileName,
  );

  if (!report) {
    throw new Error(`Unable to find invalid schema report ${fileName}`);
  }

  return report.report;
}

describe("converter failure report JSON Schema", () => {
  test("accepts every valid corpus report", () => {
    const validate = buildValidator();

    for (const fixture of loadCorpusFixtures()) {
      for (const reportFile of fixture.reports) {
        expect(validate(reportFile.report), reportFile.fileName).toBe(true);
      }
    }
  });

  test("rejects malformed reports", () => {
    for (const invalidReport of loadInvalidReports("schema")) {
      const validate = buildValidator();
      const isValid = validate(invalidReport.report);

      expect(
        isValid,
        `${invalidReport.fileName} unexpectedly passed schema validation: ${formatErrors(validate.errors)}`,
      ).toBe(false);
    }
  });

  test("accepts manual-review and datatable-html fallbacks without fake asset metadata", () => {
    const validate = buildValidator();

    expect(
      validate(getCorpusReport("topic-06-placeholder-sample/report.json")),
    ).toBe(true);
  });

  test("rejects asset metadata misuse by fallback strategy", () => {
    const validate = buildValidator();
    const invalidFileNames = [
      "chemfigure-missing-alt-text.report.json",
      "rasterized-inline-missing-asset-path.report.json",
      "manual-review-with-asset-path.report.json",
      "datatable-html-with-alt-text.report.json",
    ];

    for (const fileName of invalidFileNames) {
      expect(
        validate(getInvalidSchemaReport(fileName)),
        `${fileName} unexpectedly passed schema validation: ${formatErrors(validate.errors)}`,
      ).toBe(false);
    }
  });
});
