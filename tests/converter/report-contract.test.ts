// @vitest-environment node

import { describe, expect, test } from "vitest";

import {
  loadCorpusFixtures,
  loadInvalidReports,
  loadManifestSourcePaths,
  normalizeRerunReport,
  validateReportAgainstFixture,
} from "./report-contract";

describe("converter failure report corpus contract", () => {
  const manifestSourcePaths = loadManifestSourcePaths();
  const corpusFixtures = loadCorpusFixtures();
  const corpusByFixtureId = new Map(
    corpusFixtures.map((fixture) => [fixture.input.fixtureId, fixture.input]),
  );

  test("keeps every valid corpus report aligned with its synthetic fixture and manifest", () => {
    for (const fixture of corpusFixtures) {
      for (const reportFile of fixture.reports) {
        expect(
          validateReportAgainstFixture(
            fixture.input,
            reportFile.report,
            manifestSourcePaths,
          ),
        ).toEqual([]);
      }
    }
  });

  test("treats reruns as idempotent except for run metadata", () => {
    const rerunFixture = corpusFixtures.find(
      (fixture) => fixture.input.fixtureId === "topic-08-rerun-sample",
    );

    expect(rerunFixture).toBeDefined();
    expect(rerunFixture?.reports).toHaveLength(2);

    const [firstRun, rerun] = rerunFixture!.reports.map(
      (entry) => entry.report,
    );

    expect(rerun.run.rerunOf).toBe(firstRun.run.runId);
    expect(rerun.run.runOrdinal).toBe(firstRun.run.runOrdinal + 1);
    expect(rerun.run.sourceDigest).toBe(firstRun.run.sourceDigest);
    expect(normalizeRerunReport(firstRun)).toEqual(normalizeRerunReport(rerun));
  });

  test("rejects contract-invalid reports with unstable ids, summary drift, or manifest mismatches", () => {
    for (const invalidReport of loadInvalidReports("contract")) {
      const input = corpusByFixtureId.get(invalidReport.report.fixtureId);

      expect(
        input,
        `missing matching input fixture for ${invalidReport.fileName}`,
      ).toBeDefined();
      expect(
        validateReportAgainstFixture(
          input!,
          invalidReport.report,
          manifestSourcePaths,
        ).length,
      ).toBeGreaterThan(0);
    }
  });
});
