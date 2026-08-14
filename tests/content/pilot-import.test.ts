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
    for (const lesson of manifest.lessons) {
      lesson.status = "in_review";
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
    for (const lesson of manifest.lessons) {
      lesson.status = "in_review";
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
    for (const lesson of manifest.lessons) {
      lesson.status = "in_review";
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
    // this lesson still has unresolved blocking items, matching production. A
    // well-formed publishWaiver is required alongside approvedForPublish: true.
    const blockingCount = approvedQa.unresolved.filter(
      (item) => item.severity === "blocking",
    ).length;
    approvedQa.approvedForPublish = true;
    approvedQa.publishWaiver = {
      type: "P6.2-owner-exception",
      scope: "in_review",
      authorizedBy: "Thầy Xuyên (Project Owner)",
      authorizedDate: "2026-08-13",
      doesNotAuthorize: [
        "published",
        "productionDeployment",
        "publicBucketAccess",
        "automaticPublication",
      ],
      remediationDebtRetained: true,
      unresolvedBlockingCount: blockingCount,
      acknowledgedBlockedItems: [],
      reference: {
        contractAmendment: "docs/contracts/content.md#amendments",
        handoff: "docs/handoffs/P6/P6.2-claude.md",
      },
    };
    writeApprovedQa();
    expect(validate(target)).toEqual([]);

    // Negative: an otherwise identical, fully-signed QA record (waiver included)
    // is still rejected for any lesson slug outside the owner-approved allowlist.
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

test("validator enforces a well-formed publishWaiver whenever approvedForPublish is true", () => {
  const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p6-waiver-"));
  try {
    expect(run(importer, ["--target-root", target]).status).toBe(0);
    const manifestPath = path.join(
      target,
      "content/pilot-staging-manifest.json",
    );
    const manifest = readJson(manifestPath) as PilotManifest;
    for (const lesson of manifest.lessons) {
      lesson.status = "in_review";
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

    const dongHoaHoc = manifest.lessons[0];
    const dongHoaHocQaPath = path.join(target, dongHoaHoc.qaPath);
    const dongHoaHocQa = readJson(dongHoaHocQaPath) as QaRecord;
    expect(dongHoaHocQa.lessonSlug).toBe("dong-hoa-hoc");
    const blockingCount = dongHoaHocQa.unresolved.filter(
      (item) => item.severity === "blocking",
    ).length;
    expect(blockingCount).toBeGreaterThan(0);

    const writeDongHoaHocQa = () => {
      writeFileSync(
        dongHoaHocQaPath,
        `${JSON.stringify(dongHoaHocQa, null, 2)}\n`,
      );
      dongHoaHoc.qaSha256 = sha256(dongHoaHocQaPath);
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    };

    // Missing waiver entirely.
    dongHoaHocQa.approvedForPublish = true;
    writeDongHoaHocQa();
    expect(validate(target).join("\n")).toContain(
      "approvedForPublish requires a structured publishWaiver",
    );

    const validWaiver: PublishWaiver = {
      type: "P6.2-owner-exception",
      scope: "in_review",
      authorizedBy: "Thầy Xuyên (Project Owner)",
      authorizedDate: "2026-08-13",
      doesNotAuthorize: [
        "published",
        "productionDeployment",
        "publicBucketAccess",
        "automaticPublication",
      ],
      remediationDebtRetained: true,
      unresolvedBlockingCount: blockingCount,
      acknowledgedBlockedItems: [],
      reference: {
        contractAmendment: "docs/contracts/content.md#amendments",
        handoff: "docs/handoffs/P6/P6.2-claude.md",
      },
    };

    // Well-formed waiver validates clean.
    dongHoaHocQa.publishWaiver = validWaiver;
    writeDongHoaHocQa();
    expect(validate(target)).toEqual([]);

    // Wrong doesNotAuthorize set.
    dongHoaHocQa.publishWaiver = {
      ...validWaiver,
      doesNotAuthorize: ["published"],
    };
    writeDongHoaHocQa();
    expect(validate(target).join("\n")).toContain(
      "publishWaiver.doesNotAuthorize must list exactly",
    );

    // Stale/mismatched unresolvedBlockingCount.
    dongHoaHocQa.publishWaiver = {
      ...validWaiver,
      unresolvedBlockingCount: blockingCount + 1,
    };
    writeDongHoaHocQa();
    expect(validate(target).join("\n")).toContain(
      "publishWaiver.unresolvedBlockingCount must equal the QA record's actual blocking count",
    );

    // remediationDebtRetained must be literally true.
    dongHoaHocQa.publishWaiver = {
      ...validWaiver,
      remediationDebtRetained: false,
    };
    writeDongHoaHocQa();
    expect(validate(target).join("\n")).toContain(
      "publishWaiver.remediationDebtRetained must be true",
    );

    // acknowledgedBlockedItems referencing an id absent from unresolved.
    dongHoaHocQa.publishWaiver = {
      ...validWaiver,
      acknowledgedBlockedItems: ["not-a-real-id"],
    };
    writeDongHoaHocQa();
    expect(validate(target).join("\n")).toContain(
      "publishWaiver.acknowledgedBlockedItems references unknown id(s)",
    );

    // Reference pointing nowhere.
    dongHoaHocQa.publishWaiver = {
      ...validWaiver,
      reference: {
        contractAmendment: "docs/does/not/exist.md",
        handoff: validWaiver.reference.handoff,
      },
    };
    writeDongHoaHocQa();
    expect(validate(target).join("\n")).toContain(
      "publishWaiver.reference.contractAmendment does not point to an existing file",
    );

    // Restore dong-hoa-hoc to a valid waiver before moving to the second lesson.
    dongHoaHocQa.publishWaiver = validWaiver;
    writeDongHoaHocQa();
    expect(validate(target)).toEqual([]);

    // dung-dich-va-can-bang-hoa-hoc must specifically acknowledge T08-S01:e6352.
    const dungDich = manifest.lessons[1];
    const dungDichQaPath = path.join(target, dungDich.qaPath);
    const dungDichQa = readJson(dungDichQaPath) as QaRecord;
    expect(dungDichQa.lessonSlug).toBe("dung-dich-va-can-bang-hoa-hoc");
    expect(dungDichQa.unresolved.map((item) => item.id)).toContain(
      "T08-S01:e6352",
    );
    const dungDichBlockingCount = dungDichQa.unresolved.filter(
      (item) => item.severity === "blocking",
    ).length;

    const writeDungDichQa = () => {
      writeFileSync(dungDichQaPath, `${JSON.stringify(dungDichQa, null, 2)}\n`);
      dungDich.qaSha256 = sha256(dungDichQaPath);
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    };

    dungDichQa.approvedForPublish = true;
    dungDichQa.publishWaiver = {
      ...validWaiver,
      unresolvedBlockingCount: dungDichBlockingCount,
      acknowledgedBlockedItems: [],
    };
    writeDungDichQa();
    expect(validate(target).join("\n")).toContain(
      "publishWaiver.acknowledgedBlockedItems must include",
    );

    dungDichQa.publishWaiver = {
      ...validWaiver,
      unresolvedBlockingCount: dungDichBlockingCount,
      acknowledgedBlockedItems: ["T08-S01:e6352"],
    };
    writeDungDichQa();
    expect(validate(target)).toEqual([]);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}, 30_000);

test("P6-B1.0: manifest lessons can hold different lifecycle statuses at once", () => {
  const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p6-b1-0-status-"));
  try {
    expect(run(importer, ["--target-root", target]).status).toBe(0);
    const manifestPath = path.join(
      target,
      "content/pilot-staging-manifest.json",
    );
    const manifest = readJson(manifestPath) as PilotManifest;

    // A fresh import writes every lesson at draft, per-lesson, and validates
    // clean with no manifest-wide status field at all.
    expect(manifest.lessons.every((lesson) => lesson.status === "draft")).toBe(
      true,
    );
    expect(validate(target)).toEqual([]);

    // Promote only the second lesson to in_review; the first stays draft. This
    // is the core P6-B1.0 proof: one manifest, two lessons, two different
    // lifecycle stages, both valid at once.
    const [draftLesson, promotedLesson] = manifest.lessons;
    promotedLesson.status = "in_review";
    const mdxPath = path.join(target, promotedLesson.mdxPath);
    writeFileSync(
      mdxPath,
      readFileSync(mdxPath, "utf8").replace(
        "status: draft",
        "status: in_review",
      ),
    );
    promotedLesson.mdxSha256 = sha256(mdxPath);

    const qaPath = path.join(target, promotedLesson.qaPath);
    const qa = readJson(qaPath) as QaRecord;
    qa.reviewer = "Project owner";
    qa.reviewedAt = "2026-08-13T12:00:00+07:00";
    for (const check of Object.keys(qa.checks)) qa.checks[check] = true;
    writeFileSync(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
    promotedLesson.qaSha256 = sha256(qaPath);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    expect(validate(target)).toEqual([]);
    expect(draftLesson.status).toBe("draft");

    // Negative: a manifest lesson entry with a missing/invalid status fails
    // clearly instead of being silently treated as a default.
    delete (draftLesson as { status?: string }).status;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    expect(validate(target).join("\n")).toContain(
      "manifest lesson entry has missing or invalid status",
    );

    // Negative: a stale manifest-wide publicationStatus field (the pre-P6-B1.0
    // shape) is rejected outright rather than silently misread.
    draftLesson.status = "draft";
    (manifest as unknown as { publicationStatus: string }).publicationStatus =
      "in_review";
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    expect(validate(target).join("\n")).toContain(
      "pilot manifest publicationStatus is deprecated by P6-B1.0",
    );

    // Negative: a stale/missing manifestVersion is rejected outright.
    delete (manifest as { publicationStatus?: string }).publicationStatus;
    (manifest as unknown as { manifestVersion: string }).manifestVersion =
      "1.0.0";
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    expect(validate(target).join("\n")).toContain(
      "pilot manifest manifestVersion must be '1.1.0'",
    );
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}, 30_000);

test("P6-B1.0 safeguard: importer refuses to run against an in_review baseline, writing nothing", () => {
  const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-p6-b1-0-guard-"));
  try {
    expect(run(importer, ["--target-root", target]).status).toBe(0);
    const manifestPath = path.join(
      target,
      "content/pilot-staging-manifest.json",
    );
    const manifest = readJson(manifestPath) as PilotManifest;

    // Promote both lessons to a QA-signed in_review baseline, matching the
    // real committed manifest today.
    for (const lesson of manifest.lessons) {
      lesson.status = "in_review";
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

    // --force must not bypass this guard either.
    const refusedWithForce = run(importer, [
      "--target-root",
      target,
      "--force",
      "--backup-dir",
      path.join(target, "backup-attempt"),
    ]);
    expect(refusedWithForce.status).not.toBe(0);
    expect(refusedWithForce.stderr).toContain("in_review");
    expect(managedPaths.map((filePath) => sha256(filePath))).toEqual(before);
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

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}
