// @vitest-environment node

import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const importer = path.join(repoRoot, "scripts/import-docx/pilot_import.py");
const validator = path.join(repoRoot, "scripts/validate-content/validate.py");

interface OwnerDecision {
  decidedBy: string | null;
  decidedAt: string | null;
  altText: string | null;
  caption: string | null;
  reviewedLatex: string | null;
  qaNote: string | null;
}

interface DiscussionPrompt {
  classification: string;
  recordedBy: string;
  recordedDate: string;
  promptOrObjective: string;
  scientificStatus: string;
  identityAssurance: string;
  // Not part of the real schema (see docs/contracts/content.md "Discussion
  // prompt": provenance is always inherited from the parent item) -- only
  // present here so negative tests can construct a malformed
  // discussionPrompt that wrongly defines its own provenance.
  issueId?: string;
  sourceId?: string;
  sourceLocator?: unknown;
}

interface QueueItem {
  issueId: string;
  sourceId: string;
  topic: string;
  lessonSlug: string;
  sourceLocator: {
    pathHint: string;
    sectionPath: string;
    blockOrder: number;
    textAnchor?: string;
  };
  issueCode: string;
  kind: string;
  severity: "warning" | "blocking";
  message: string;
  observedType: string;
  observedTypeEvidence: string;
  previewPath: string | null;
  status: string;
  remediationChoice: string | null;
  ownerDecision: OwnerDecision;
  discussionPrompt?: DiscussionPrompt;
}

interface ManifestLesson {
  slug: string;
  mdxPath: string;
  qaPath: string;
  failureReportPath: string;
  mdxSha256: string;
  qaSha256: string;
  failureReportSha256: string;
}

interface ManifestFile {
  lessons: ManifestLesson[];
}

interface QaRecord {
  lessonSlug: string;
  checks: Record<string, boolean>;
  approvedForPublish: boolean;
  unresolved: Array<{ id: string; severity: string; description: string }>;
}

interface FailureReportBlock {
  id: string;
  severity?: string;
  message?: string;
  issueCode?: string;
  kind?: string;
  sourceLocator?: unknown;
  fallback?: { assetPath?: string; altText?: string };
}

interface FailureReport {
  source: { sourceId: string };
  blocks: FailureReportBlock[];
  summary: { blockingCount: number; warningCount: number };
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
  const payload = JSON.parse(result.stdout) as {
    valid: boolean;
    errors: string[];
  };
  return payload.errors;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function readManifest(target: string): ManifestFile {
  return readJson<ManifestFile>(
    path.join(target, "content/pilot-staging-manifest.json"),
  );
}

function writeManifest(target: string, manifest: ManifestFile): void {
  writeJson(path.join(target, "content/pilot-staging-manifest.json"), manifest);
}

function queuePathFor(target: string, lessonSlug: string): string {
  return path.join(
    target,
    `content/qa/pending/${lessonSlug}.remediation-queue.json`,
  );
}

function writeQueueItem(queuePath: string, item: QueueItem): void {
  const queue = readJson<QueueItem[]>(queuePath);
  const index = queue.findIndex((entry) => entry.issueId === item.issueId);
  expect(
    index,
    `${item.issueId} not found in ${queuePath}`,
  ).toBeGreaterThanOrEqual(0);
  queue[index] = item;
  writeJson(queuePath, queue);
}

function updateQa(
  target: string,
  lessonSlug: string,
  mutate: (qa: QaRecord) => void,
): void {
  const manifest = readManifest(target);
  const lesson = manifest.lessons.find((entry) => entry.slug === lessonSlug)!;
  const qaPath = path.join(target, lesson.qaPath);
  const qa = readJson<QaRecord>(qaPath);
  mutate(qa);
  writeJson(qaPath, qa);
  lesson.qaSha256 = sha256(qaPath);
  writeManifest(target, manifest);
}

function updateMdx(
  target: string,
  lessonSlug: string,
  mutate: (mdx: string) => string,
): void {
  const manifest = readManifest(target);
  const lesson = manifest.lessons.find((entry) => entry.slug === lessonSlug)!;
  const mdxPath = path.join(target, lesson.mdxPath);
  writeFileSync(mdxPath, mutate(readFileSync(mdxPath, "utf8")), "utf8");
  lesson.mdxSha256 = sha256(mdxPath);
  writeManifest(target, manifest);
}

function updateFailureReport(
  target: string,
  lessonSlug: string,
  mutate: (report: FailureReport) => void,
): void {
  const manifest = readManifest(target);
  const lesson = manifest.lessons.find((entry) => entry.slug === lessonSlug)!;
  const reportPath = path.join(target, lesson.failureReportPath);
  const report = readJson<FailureReport>(reportPath);
  mutate(report);
  writeJson(reportPath, report);
  lesson.failureReportSha256 = sha256(reportPath);
  writeManifest(target, manifest);
}

/** Fresh, isolated copy of the shared importer-generated base root, so each
 * test mutates its own private files without re-running the (slow) real
 * importer or touching any other test's state. */
function cloneTarget(): string {
  const target = mkdtempSync(path.join(tmpdir(), "xuyenlab-oa-"));
  cpSync(baseTarget, target, { recursive: true });
  return target;
}

function findItem(
  target: string,
  kind: "table" | "image" | "drawing",
): { lessonSlug: string; queuePath: string; qaPath: string; item: QueueItem } {
  const manifest = readManifest(target);
  for (const lesson of manifest.lessons) {
    const queuePath = queuePathFor(target, lesson.slug);
    const queue = readJson<QueueItem[]>(queuePath);
    const item = queue.find((entry) => entry.kind === kind);
    if (item) {
      return {
        lessonSlug: lesson.slug,
        queuePath,
        qaPath: path.join(target, lesson.qaPath),
        item,
      };
    }
  }
  throw new Error(`no ${kind}-kind item found in any pilot remediation queue`);
}

/** Like findItem, but returns every matching item in the first lesson that
 * has any -- used when a test needs two distinct real items of the same
 * kind (e.g. two different image assets) rather than just one. */
function findItems(
  target: string,
  kind: "table" | "image",
): { lessonSlug: string; queuePath: string; items: QueueItem[] } {
  const manifest = readManifest(target);
  for (const lesson of manifest.lessons) {
    const queuePath = queuePathFor(target, lesson.slug);
    const queue = readJson<QueueItem[]>(queuePath);
    const items = queue.filter((entry) => entry.kind === kind);
    if (items.length > 0) {
      return { lessonSlug: lesson.slug, queuePath, items };
    }
  }
  throw new Error(`no ${kind}-kind item found in any pilot remediation queue`);
}

function baseAcceptedTableItem(item: QueueItem): QueueItem {
  return {
    ...item,
    status: "accepted-with-limitation",
    remediationChoice: "owner-accepted-source-fidelity",
    ownerDecision: {
      decidedBy: "Thầy Xuyên (Project Owner)",
      decidedAt: "2026-08-14",
      qaNote:
        "Owner compared the flattened table with the source DOCX table; representation retained unchanged.",
      altText: null,
      caption: null,
      reviewedLatex: null,
    },
  };
}

function baseAcceptedImageItem(item: QueueItem): QueueItem {
  return {
    ...item,
    status: "accepted-with-limitation",
    remediationChoice: "owner-accepted-visible-fallback",
    ownerDecision: {
      decidedBy: "Thầy Xuyên (Project Owner)",
      decidedAt: "2026-08-14",
      qaNote:
        "Owner visually reviewed the existing fallback image and accepted it unchanged.",
      altText: null,
      caption: null,
      reviewedLatex: null,
    },
  };
}

/** Writes a real, content-addressed static asset under the target's
 * public/staging-assets/lessons/ tree (same convention P6-B2.4A used for
 * the real T02 candidate diagram), so a synthetic applied/
 * reviewed-image-fallback test exercises the validator's real asset-path
 * check (scripts/validate-content/validate.py's HASHED_ASSET match)
 * instead of pointing at a file that doesn't exist. */
function writeSyntheticAsset(target: string, content: string): string {
  const bytes = Buffer.from(content, "utf8");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const relDir = `public/staging-assets/lessons/${hash.slice(0, 2)}`;
  mkdirSync(path.join(target, relDir), { recursive: true });
  const relPath = `${relDir}/${hash}.svg`;
  writeFileSync(path.join(target, relPath), bytes);
  return `/staging-assets/lessons/${hash.slice(0, 2)}/${hash}.svg`;
}

const P6_B2_4B_ALT_TEXT = "Sơ đồ thay thế cho hình vẽ Word gốc.";
const P6_B2_4B_CAPTION_FOR = (issueId: string) =>
  `Hình vẽ tái tạo (thay AutoShape Word ${issueId})`;

/** P6-B2.4B: status applied + remediationChoice reviewed-image-fallback,
 * the only supported combination for kind: "drawing" (docs/contracts/
 * content.md "Applied reviewed-image-fallback"). `assetPath` must already
 * exist on disk (see writeSyntheticAsset) for the validator's ChemFigure
 * pairing/asset-path checks to resolve. */
function baseAppliedDrawingItem(item: QueueItem, assetPath: string): QueueItem {
  return {
    ...item,
    status: "applied",
    remediationChoice: "reviewed-image-fallback",
    previewPath: assetPath,
    ownerDecision: {
      decidedBy: "Thầy Xuyên (Project Owner)",
      decidedAt: "2026-08-15",
      qaNote: "Owner approved the candidate diagram replacing this drawing.",
      altText: P6_B2_4B_ALT_TEXT,
      caption: P6_B2_4B_CAPTION_FOR(item.issueId),
      reviewedLatex: null,
    },
  };
}

/** Replaces the target lesson's MDX with: the item's own blocking Callout
 * removed (if present), and a single matching `<ChemFigure>` for the given
 * asset/alt/caption appended -- the exact shape P6-B2.4B's validator rule
 * requires for an applied reviewed-image-fallback item. */
function applyDrawingReplacementInMdx(
  target: string,
  lessonSlug: string,
  issueId: string,
  assetPath: string,
): void {
  updateMdx(target, lessonSlug, (mdx) => {
    const withoutCallout = mdx.replace(
      /<Callout\b[\s\S]*?<\/Callout>\n*/gu,
      (match) => (match.includes(issueId) ? "" : match),
    );
    return (
      `${withoutCallout}\n<ChemFigure src="${assetPath}" alt="${P6_B2_4B_ALT_TEXT}" ` +
      `caption="${P6_B2_4B_CAPTION_FOR(issueId)}" />\n`
    );
  });
}

let baseTarget: string;

beforeAll(() => {
  baseTarget = mkdtempSync(path.join(tmpdir(), "xuyenlab-oa-base-"));
  expect(run(importer, ["--target-root", baseTarget]).status).toBe(0);
}, 30_000);

afterAll(() => {
  rmSync(baseTarget, { recursive: true, force: true });
});

describe("legacy remediation queue characterization (real committed data, read-only)", () => {
  // T06/T08 never adopted the new vocabulary; Topic 24's three items are the
  // real, Owner-authorized P6-B1.4 use of it (see
  // docs/handoffs/P6/P6-B1.4-claude.md) — characterized separately below,
  // not folded into the "still legacy" file list.
  const legacyOnlyFiles = [
    "content/qa/pending/dong-hoa-hoc.remediation-queue.json",
    "content/qa/pending/dung-dich-va-can-bang-hoa-hoc.remediation-queue.json",
  ];
  // Locked in from the actual committed data (see docs/handoffs/P6/P6-B1.3P-claude.md):
  // never remove or rename these while adding the new vocabulary.
  const LEGACY_STATUSES = new Set([
    "pending-owner-review",
    "applied",
    "blocked",
  ]);
  const LEGACY_CHOICES = new Set([
    null,
    "reviewed-latex-mdx",
    "reviewed-image-fallback",
    "remain-blocking",
  ]);

  it("every T06/T08 committed item still uses only a legacy status/choice combination (test 1)", () => {
    let total = 0;
    for (const file of legacyOnlyFiles) {
      const queue = readJson<QueueItem[]>(path.join(repoRoot, file));
      for (const item of queue) {
        total += 1;
        expect(
          LEGACY_STATUSES.has(item.status),
          `${file} ${item.issueId} status ${item.status}`,
        ).toBe(true);
        expect(
          LEGACY_CHOICES.has(item.remediationChoice),
          `${file} ${item.issueId} remediationChoice ${item.remediationChoice}`,
        ).toBe(true);
        expect(item.discussionPrompt).toBeUndefined();
      }
    }
    expect(total).toBeGreaterThan(0);
  });

  it("Topic 24's three committed items are exactly the P6-B1.4 Owner-authorized accepted-with-limitation dispositions (test 1)", () => {
    const queue = readJson<QueueItem[]>(
      path.join(
        repoRoot,
        "content/qa/pending/phan-bon-hoa-hoc.remediation-queue.json",
      ),
    );
    expect(queue).toHaveLength(3);
    for (const item of queue) {
      expect(item.status, item.issueId).toBe("accepted-with-limitation");
      expect(item.remediationChoice, item.issueId).toBe(
        item.kind === "table"
          ? "owner-accepted-source-fidelity"
          : "owner-accepted-visible-fallback",
      );
      expect(item.discussionPrompt).toBeUndefined();
    }
  });

  it("real committed content still validates clean with the new validator logic in place (test 1, test 16)", () => {
    expect(validate(repoRoot)).toEqual([]);
  });
});

describe("accepted-with-limitation: positive cases", () => {
  it("accepts a synthetic table item (owner-accepted-source-fidelity) (test 2)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");
      writeQueueItem(queuePath, baseAcceptedTableItem(item));
      expect(validate(target)).toEqual([]);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("accepts a synthetic image item (owner-accepted-visible-fallback) (test 3)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "image");
      writeQueueItem(queuePath, baseAcceptedImageItem(item));
      expect(validate(target)).toEqual([]);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("accepted-with-limitation: negative cases", () => {
  it("rejects a missing ownerDecision.decidedBy/decidedAt/qaNote (test 4)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");
      const accepted = baseAcceptedTableItem(item);

      writeQueueItem(queuePath, {
        ...accepted,
        ownerDecision: { ...accepted.ownerDecision, decidedBy: "" },
      });
      expect(validate(target).join("\n")).toContain(
        "ownerDecision.decidedBy is required",
      );

      writeQueueItem(queuePath, {
        ...accepted,
        ownerDecision: { ...accepted.ownerDecision, decidedAt: null },
      });
      expect(validate(target).join("\n")).toContain(
        "ownerDecision.decidedAt must be an ISO 8601 date",
      );

      writeQueueItem(queuePath, {
        ...accepted,
        ownerDecision: { ...accepted.ownerDecision, qaNote: "" },
      });
      expect(validate(target).join("\n")).toContain(
        "ownerDecision.qaNote is required",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects a non-null altText/caption/reviewedLatex on the new accepted choices (test 5)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");
      const accepted = baseAcceptedTableItem(item);

      for (const field of ["altText", "caption", "reviewedLatex"] as const) {
        writeQueueItem(queuePath, {
          ...accepted,
          ownerDecision: { ...accepted.ownerDecision, [field]: "invented" },
        });
        expect(validate(target).join("\n")).toContain(
          `ownerDecision.${field} must remain null`,
        );
      }
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects a status/choice mismatch in either direction (test 6)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");

      // accepted-with-limitation status with a legacy/null choice
      writeQueueItem(queuePath, {
        ...baseAcceptedTableItem(item),
        remediationChoice: null,
      });
      expect(validate(target).join("\n")).toContain(
        "requires remediationChoice to be one of",
      );

      // a new choice paired with a non-accepted status
      writeQueueItem(queuePath, {
        ...item,
        status: "pending-owner-review",
        remediationChoice: "owner-accepted-source-fidelity",
      });
      expect(validate(target).join("\n")).toContain(
        "requires status 'accepted-with-limitation'",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects owner-accepted-visible-fallback used on a table item (test 7)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");
      writeQueueItem(queuePath, {
        ...baseAcceptedTableItem(item),
        remediationChoice: "owner-accepted-visible-fallback",
      });
      expect(validate(target).join("\n")).toContain(
        "is only supported for kind 'image'",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects owner-accepted-source-fidelity used on an image item (test 7)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "image");
      writeQueueItem(queuePath, {
        ...baseAcceptedImageItem(item),
        remediationChoice: "owner-accepted-source-fidelity",
      });
      expect(validate(target).join("\n")).toContain(
        "is only supported for kind 'table'",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects an item removed from QA unresolved (test 8)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, qaPath, item, lessonSlug } = findItem(target, "table");
      writeQueueItem(queuePath, baseAcceptedTableItem(item));
      updateQa(target, lessonSlug, (qa) => {
        qa.unresolved = qa.unresolved.filter(
          (entry) => entry.id !== item.issueId,
        );
      });
      expect(validate(target).join("\n")).toContain(
        "missing from QA unresolved",
      );
      void qaPath;
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects an item removed from the failure report (test 9)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "table");
      writeQueueItem(queuePath, baseAcceptedTableItem(item));
      updateFailureReport(target, lessonSlug, (report) => {
        report.blocks = report.blocks.filter(
          (block) => block.id !== item.issueId,
        );
      });
      expect(validate(target).join("\n")).toContain(
        "missing from the failure report",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects a changed severity, sourceId or sourceLocator (test 10)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");
      const accepted = baseAcceptedTableItem(item);

      writeQueueItem(queuePath, {
        ...accepted,
        severity: accepted.severity === "warning" ? "blocking" : "warning",
      });
      expect(validate(target).join("\n")).toContain("severity is inconsistent");

      writeQueueItem(queuePath, { ...accepted, sourceId: "T99-S99" });
      expect(validate(target).join("\n")).toContain(
        "differs from the failure report's source",
      );

      writeQueueItem(queuePath, {
        ...accepted,
        sourceLocator: {
          ...accepted.sourceLocator,
          blockOrder: accepted.sourceLocator.blockOrder + 1000,
        },
      });
      expect(validate(target).join("\n")).toContain(
        "sourceLocator differs from the original failure-report evidence",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects an accepted item whose lessonSlug or topic disagrees with the canonical lesson being validated (test B)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");
      const accepted = baseAcceptedTableItem(item);

      writeQueueItem(queuePath, {
        ...accepted,
        lessonSlug: "not-the-real-lesson",
      });
      expect(validate(target).join("\n")).toContain(
        "differs from the canonical lesson being validated",
      );

      writeQueueItem(queuePath, { ...accepted, topic: "chuyen-de-99" });
      expect(validate(target).join("\n")).toContain(
        "differs from the canonical lesson topic",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects an accepted item whose issueCode or kind disagrees with the failure-report block (test B)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");
      const accepted = baseAcceptedTableItem(item);

      writeQueueItem(queuePath, { ...accepted, issueCode: "WRONG_ISSUE_CODE" });
      expect(validate(target).join("\n")).toContain(
        "issueCode 'WRONG_ISSUE_CODE' differs from the failure report's",
      );

      writeQueueItem(queuePath, { ...accepted, kind: "not-a-real-kind" });
      expect(validate(target).join("\n")).toContain(
        "kind 'not-a-real-kind' differs from the failure report's",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects missing table source-fidelity evidence in the canonical MDX (test 11)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "table");
      writeQueueItem(queuePath, baseAcceptedTableItem(item));
      updateMdx(target, lessonSlug, (mdx) =>
        mdx.replace(/<DataTable[\s\S]*?<\/DataTable>/u, ""),
      );
      expect(validate(target).join("\n")).toContain(
        "source-fidelity evidence is not traceable",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects missing image visible-fallback evidence in the canonical MDX (test 11)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "image");
      writeQueueItem(queuePath, baseAcceptedImageItem(item));
      expect(item.previewPath).toBeTruthy();
      updateMdx(target, lessonSlug, (mdx) =>
        mdx.replace(
          `src="${item.previewPath}"`,
          `src="/staging-assets/lessons/00/does-not-exist.jpeg"`,
        ),
      );
      expect(validate(target).join("\n")).toContain(
        "visible-fallback asset is not traceable",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects a previewPath that points at a different asset also legitimately present in the same MDX (test C)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, items } = findItems(target, "image");
      const primary = items[0];
      // Must be a genuinely different asset, not another issueId that
      // happens to share the same extracted image.
      const other = items.find(
        (candidate) => candidate.previewPath !== primary.previewPath,
      );
      expect(
        other,
        "expected at least two distinct image assets",
      ).toBeDefined();

      writeQueueItem(queuePath, {
        ...baseAcceptedImageItem(primary),
        previewPath: other!.previewPath,
      });
      expect(validate(target).join("\n")).toContain(
        "previewPath must exactly equal the failure report's fallback.assetPath",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects an MDX ChemFigure that keeps the correct src but changes the original alt (test C)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "image");
      writeQueueItem(queuePath, baseAcceptedImageItem(item));
      updateMdx(target, lessonSlug, (mdx) => {
        const escape = (value: string) =>
          value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
        const tagPattern = new RegExp(
          `<ChemFigure\\b[^>]*src="${escape(item.previewPath!)}"[^>]*/?>`,
          "u",
        );
        const tag = tagPattern.exec(mdx);
        expect(tag).not.toBeNull();
        const originalAlt = /alt="([^"]*)"/u.exec(tag![0])?.[1];
        expect(originalAlt).toBeTruthy();
        const mutatedTag = tag![0].replace(
          `alt="${originalAlt}"`,
          `alt="Placeholder alt changed by the test"`,
        );
        return mdx.replace(tag![0], mutatedTag);
      });
      expect(validate(target).join("\n")).toContain(
        "visible-fallback asset is not traceable to a single canonical ChemFigure",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects an MDX where the correct src and alt each exist, but never paired on the same ChemFigure (test C)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "image");
      writeQueueItem(queuePath, baseAcceptedImageItem(item));
      updateMdx(target, lessonSlug, (mdx) => {
        const escape = (value: string) =>
          value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
        const tagPattern = new RegExp(
          `<ChemFigure\\b[^>]*src="${escape(item.previewPath!)}"[^>]*/?>`,
          "u",
        );
        const tag = tagPattern.exec(mdx);
        expect(tag).not.toBeNull();
        const correctAlt = /alt="([^"]*)"/u.exec(tag![0])?.[1];
        expect(correctAlt).toBeTruthy();
        // Split the one correct pairing into two separate elements: one
        // keeps the correct src paired with a WRONG alt, the other carries
        // the correct alt paired with a WRONG src -- so both original
        // values still exist somewhere in the document, just never
        // together on a single ChemFigure.
        const splitSrcTag = tag![0].replace(
          `alt="${correctAlt}"`,
          `alt="Wrong alt, split from its real src"`,
        );
        const splitAltTag = tag![0].replace(
          item.previewPath!,
          "/staging-assets/lessons/00/unrelated-other-asset.png",
        );
        return mdx.replace(tag![0], `${splitSrcTag}\n${splitAltTag}`);
      });
      expect(validate(target).join("\n")).toContain(
        "visible-fallback asset is not traceable to a single canonical ChemFigure",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects an accepted image item whose failure-report block is missing fallback.assetPath or fallback.altText (test C)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "image");
      writeQueueItem(queuePath, baseAcceptedImageItem(item));

      updateFailureReport(target, lessonSlug, (report) => {
        const block = report.blocks.find(
          (candidate) => candidate.id === item.issueId,
        )!;
        delete block.fallback?.assetPath;
      });
      expect(validate(target).join("\n")).toContain(
        "fallback.assetPath is required",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects an accepted image item whose failure-report block is missing fallback.altText (test C)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "image");
      writeQueueItem(queuePath, baseAcceptedImageItem(item));

      updateFailureReport(target, lessonSlug, (report) => {
        const block = report.blocks.find(
          (candidate) => candidate.id === item.issueId,
        )!;
        delete block.fallback?.altText;
      });
      expect(validate(target).join("\n")).toContain(
        "fallback.altText is required",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("keeps an accepted-with-limitation blocking item blocking, and it does not act as a publish bypass (test 12)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, qaPath, item, lessonSlug } = findItem(target, "table");
      writeQueueItem(queuePath, {
        ...baseAcceptedTableItem(item),
        severity: "blocking",
      });
      updateQa(target, lessonSlug, (qa) => {
        const entry = qa.unresolved.find(
          (candidate) => candidate.id === item.issueId,
        )!;
        entry.severity = "blocking";
      });
      updateFailureReport(target, lessonSlug, (report) => {
        const block = report.blocks.find(
          (candidate) => candidate.id === item.issueId,
        )!;
        const wasWarning = block.severity === "warning";
        block.severity = "blocking";
        if (wasWarning) {
          report.summary.blockingCount += 1;
          report.summary.warningCount -= 1;
        }
      });
      // Independent of accepted-with-limitation: any blocking issue's id
      // must stay visibly present in the MDX body (validate.py's
      // pre-existing "hidden unresolved blocking issue" rule). Satisfying
      // it here keeps this test isolated to what it actually means to
      // prove — that acceptance itself does not bypass publication rules —
      // rather than incidentally tripping an unrelated, already-correct
      // rule.
      updateMdx(
        target,
        lessonSlug,
        (mdx) => `${mdx}\n{/* ${item.issueId} */}\n`,
      );

      // The item validates cleanly as accepted-with-limitation...
      expect(validate(target)).toEqual([]);

      // ...but stays counted as a real blocking issue: acceptance did not
      // silently downgrade or resolve it.
      const qa = readJson<QaRecord>(qaPath);
      const stillUnresolved = qa.unresolved.find(
        (entry) => entry.id === item.issueId,
      );
      expect(stillUnresolved?.severity).toBe("blocking");

      // And it still cannot substitute for the real P6.2 publishWaiver
      // mechanism: approvedForPublish: true without a structured waiver is
      // still rejected exactly as before, regardless of the accepted item.
      updateQa(target, lessonSlug, (qa) => {
        qa.approvedForPublish = true;
      });
      expect(validate(target).join("\n")).toContain(
        "approvedForPublish requires a structured publishWaiver",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("discussionPrompt", () => {
  const validPrompt: DiscussionPrompt = {
    classification: "discussion-prompt",
    // A declared TEACHER identity, deliberately not the Project Owner:
    // discussionPrompt classification (unlike an accepted-with-limitation
    // disposition, which is always an Owner decision) may be explicitly
    // recorded by a teacher/author or the Owner. This proves the validator
    // does not incorrectly require Project Owner identity for
    // discussionPrompt.
    recordedBy: "Giáo viên phụ trách (declared)",
    recordedDate: "2026-08-14",
    promptOrObjective:
      "Học sinh so sánh cách trình bày bảng gốc và bảng đã chuyển đổi.",
    scientificStatus: "not-a-verified-scientific-conclusion",
    identityAssurance: "declared-not-authenticated",
  };

  it("accepts a well-formed synthetic discussionPrompt recorded by a declared teacher identity, on an otherwise-untouched legacy item (test 13)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");
      // Legacy status/choice (pending-owner-review + null) stay exactly as
      // they were; only discussionPrompt is added.
      writeQueueItem(queuePath, { ...item, discussionPrompt: validPrompt });
      expect(validate(target)).toEqual([]);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects a discussionPrompt that defines its own issueId, sourceId or sourceLocator (test D)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");

      writeQueueItem(queuePath, {
        ...item,
        discussionPrompt: { ...validPrompt, issueId: "SOME-OTHER-ISSUE-ID" },
      });
      expect(validate(target).join("\n")).toContain(
        "discussionPrompt must not define its own issueId",
      );

      writeQueueItem(queuePath, {
        ...item,
        discussionPrompt: { ...validPrompt, sourceId: "T99-S99" },
      });
      expect(validate(target).join("\n")).toContain(
        "discussionPrompt must not define its own sourceId",
      );

      writeQueueItem(queuePath, {
        ...item,
        discussionPrompt: {
          ...validPrompt,
          sourceLocator: {
            pathHint: "word/document.xml#body/p[1]",
            sectionPath: "Phần I",
            blockOrder: 1,
          },
        },
      });
      expect(validate(target).join("\n")).toContain(
        "discussionPrompt must not define its own sourceLocator",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects a discussionPrompt with the wrong identityAssurance or scientificStatus literal (test 14)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");

      writeQueueItem(queuePath, {
        ...item,
        discussionPrompt: {
          ...validPrompt,
          identityAssurance: "authenticated",
        },
      });
      expect(validate(target).join("\n")).toContain(
        "discussionPrompt.identityAssurance must be",
      );

      writeQueueItem(queuePath, {
        ...item,
        discussionPrompt: {
          ...validPrompt,
          scientificStatus: "verified-scientific-conclusion",
        },
      });
      expect(validate(target).join("\n")).toContain(
        "discussionPrompt.scientificStatus must be",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects a discussionPrompt missing recordedBy/recordedDate/promptOrObjective (test 14)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item } = findItem(target, "table");

      writeQueueItem(queuePath, {
        ...item,
        discussionPrompt: { ...validPrompt, recordedBy: "" },
      });
      expect(validate(target).join("\n")).toContain(
        "discussionPrompt.recordedBy is required",
      );

      writeQueueItem(queuePath, {
        ...item,
        discussionPrompt: { ...validPrompt, recordedDate: "14/08/2026" },
      });
      expect(validate(target).join("\n")).toContain(
        "discussionPrompt.recordedDate must be an ISO 8601 date",
      );

      writeQueueItem(queuePath, {
        ...item,
        discussionPrompt: { ...validPrompt, promptOrObjective: "" },
      });
      expect(validate(target).join("\n")).toContain(
        "discussionPrompt.promptOrObjective is required",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("does not let a discussionPrompt affect lesson lifecycle, QA checks or publication state (test 15)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "table");
      writeQueueItem(queuePath, { ...item, discussionPrompt: validPrompt });

      expect(validate(target)).toEqual([]);

      const manifest = readManifest(target);
      const lesson = manifest.lessons.find(
        (entry) => entry.slug === lessonSlug,
      )!;
      const status = readFileSync(path.join(target, lesson.mdxPath), "utf8");
      expect(status).toMatch(/\nstatus: draft\n/u);

      const qa = readJson<QaRecord>(path.join(target, lesson.qaPath));
      expect(Object.values(qa.checks).every((value) => value === false)).toBe(
        true,
      );
      expect(qa.approvedForPublish).toBe(false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("P6-B2.4B: applied reviewed-image-fallback (kind: drawing)", () => {
  it("accepts a synthetic applied reviewed-image-fallback drawing item with a matching ChemFigure and no Callout (P6-B2.4B test 1)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, qaPath, item, lessonSlug } = findItem(
        target,
        "drawing",
      );
      const assetPath = writeSyntheticAsset(
        target,
        `<svg xmlns="http://www.w3.org/2000/svg"><title>${item.issueId}</title></svg>`,
      );
      writeQueueItem(queuePath, baseAppliedDrawingItem(item, assetPath));
      applyDrawingReplacementInMdx(target, lessonSlug, item.issueId, assetPath);

      expect(validate(target)).toEqual([]);

      // The item is still a real blocking issue in QA/failure-report terms
      // (P6-B2.4B does not remove it from the historical record), same
      // invariant already proven for accepted-with-limitation above.
      const qa = readJson<QaRecord>(qaPath);
      const stillUnresolved = qa.unresolved.find(
        (entry) => entry.id === item.issueId,
      );
      expect(stillUnresolved?.severity).toBe("blocking");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects applied reviewed-image-fallback used on a non-drawing kind (P6-B2.4B test 2)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "image");
      const assetPath = writeSyntheticAsset(target, "<svg></svg>");
      writeQueueItem(queuePath, baseAppliedDrawingItem(item, assetPath));
      applyDrawingReplacementInMdx(target, lessonSlug, item.issueId, assetPath);
      expect(validate(target).join("\n")).toContain(
        "is only supported for kind in ['drawing']",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects a missing ownerDecision.altText, caption or previewPath (P6-B2.4B test 3)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "drawing");
      const assetPath = writeSyntheticAsset(target, "<svg></svg>");
      const applied = baseAppliedDrawingItem(item, assetPath);
      applyDrawingReplacementInMdx(target, lessonSlug, item.issueId, assetPath);

      writeQueueItem(queuePath, {
        ...applied,
        ownerDecision: { ...applied.ownerDecision, altText: null },
      });
      expect(validate(target).join("\n")).toContain(
        "ownerDecision.altText is required for an applied reviewed-image-fallback",
      );

      writeQueueItem(queuePath, {
        ...applied,
        ownerDecision: { ...applied.ownerDecision, caption: "" },
      });
      expect(validate(target).join("\n")).toContain(
        "ownerDecision.caption is required for an applied reviewed-image-fallback",
      );

      writeQueueItem(queuePath, { ...applied, previewPath: null });
      expect(validate(target).join("\n")).toContain(
        "previewPath is required for an applied reviewed-image-fallback",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects a non-null ownerDecision.reviewedLatex (P6-B2.4B test 4)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "drawing");
      const assetPath = writeSyntheticAsset(target, "<svg></svg>");
      const applied = baseAppliedDrawingItem(item, assetPath);
      applyDrawingReplacementInMdx(target, lessonSlug, item.issueId, assetPath);

      writeQueueItem(queuePath, {
        ...applied,
        ownerDecision: { ...applied.ownerDecision, reviewedLatex: "$$x$$" },
      });
      expect(validate(target).join("\n")).toContain(
        "ownerDecision.reviewedLatex must remain null for reviewed-image-fallback",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects a ChemFigure whose alt or caption doesn't match ownerDecision (P6-B2.4B test 5)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "drawing");
      const assetPath = writeSyntheticAsset(target, "<svg></svg>");
      writeQueueItem(queuePath, baseAppliedDrawingItem(item, assetPath));

      // ChemFigure present, but its alt text does not match
      // ownerDecision.altText exactly.
      updateMdx(target, lessonSlug, (mdx) => {
        const withoutCallout = mdx.replace(
          /<Callout\b[\s\S]*?<\/Callout>\n*/gu,
          (match) => (match.includes(item.issueId) ? "" : match),
        );
        return (
          `${withoutCallout}\n<ChemFigure src="${assetPath}" alt="Wrong alt text" ` +
          `caption="${P6_B2_4B_CAPTION_FOR(item.issueId)}" />\n`
        );
      });
      expect(validate(target).join("\n")).toContain(
        "applied replacement is not traceable to a single canonical ChemFigure",
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects an applied item whose fallback Callout is still present in the MDX (P6-B2.4B test 6)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, item, lessonSlug } = findItem(target, "drawing");
      const assetPath = writeSyntheticAsset(target, "<svg></svg>");
      writeQueueItem(queuePath, baseAppliedDrawingItem(item, assetPath));

      // Add the matching ChemFigure but deliberately leave the original
      // Callout in place (do not strip it, unlike applyDrawingReplacementInMdx).
      updateMdx(
        target,
        lessonSlug,
        (mdx) =>
          `${mdx}\n<ChemFigure src="${assetPath}" alt="${P6_B2_4B_ALT_TEXT}" ` +
          `caption="${P6_B2_4B_CAPTION_FOR(item.issueId)}" />\n`,
      );
      expect(validate(target).join("\n")).toContain(
        `${item.issueId} is applied and must not remain a fallback Callout`,
      );
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("rejects an applied drawing item missing from QA unresolved or the failure report (P6-B2.4B test 7)", () => {
    const target = cloneTarget();
    try {
      const { queuePath, qaPath, item, lessonSlug } = findItem(
        target,
        "drawing",
      );
      const assetPath = writeSyntheticAsset(target, "<svg></svg>");
      writeQueueItem(queuePath, baseAppliedDrawingItem(item, assetPath));
      applyDrawingReplacementInMdx(target, lessonSlug, item.issueId, assetPath);

      updateQa(target, lessonSlug, (qa) => {
        qa.unresolved = qa.unresolved.filter(
          (entry) => entry.id !== item.issueId,
        );
      });
      expect(validate(target).join("\n")).toContain(
        "applied issue missing from QA unresolved",
      );
      void qaPath;

      const target2 = cloneTarget();
      try {
        const found = findItem(target2, "drawing");
        expect(found.item.issueId).toBe(item.issueId);
        const asset2 = writeSyntheticAsset(target2, "<svg></svg>");
        writeQueueItem(
          found.queuePath,
          baseAppliedDrawingItem(found.item, asset2),
        );
        applyDrawingReplacementInMdx(
          target2,
          found.lessonSlug,
          found.item.issueId,
          asset2,
        );
        updateFailureReport(target2, found.lessonSlug, (report) => {
          report.blocks = report.blocks.filter(
            (block) => block.id !== found.item.issueId,
          );
        });
        expect(validate(target2).join("\n")).toContain(
          "applied issue missing from the failure report",
        );
      } finally {
        rmSync(target2, { recursive: true, force: true });
      }
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
