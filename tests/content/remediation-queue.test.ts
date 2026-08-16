// @vitest-environment node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

interface PendingRecord {
  unresolved: Array<{ id: string; severity: "warning" | "blocking" }>;
}

interface QueueItem {
  issueId: string;
  sourceId: string;
  topic: string;
  lessonSlug: string;
  sourceLocator: { pathHint: string; sectionPath: string; blockOrder: number };
  issueCode: string;
  kind: string;
  severity: "warning" | "blocking";
  observedType: "formula" | "figure" | "table" | "diagram" | "unknown";
  observedTypeEvidence: string;
  previewPath: string | null;
  status: string;
  remediationChoice: string | null;
  ownerDecision: {
    decidedBy: string | null;
    decidedAt: string | null;
    altText: string | null;
    caption: string | null;
    reviewedLatex: string | null;
    qaNote: string | null;
  };
}

interface ManifestLesson {
  topic: string;
  slug: string;
  mdxPath: string;
  mdxSha256: string;
  blockingCount: number;
  warningCount: number;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(path.join(repoRoot, relativePath), "utf8"),
  ) as T;
}

const LESSONS = [
  {
    lessonSlug: "dong-hoa-hoc",
    topic: "chuyen-de-06",
    pendingPath: "content/qa/pending/dong-hoa-hoc.json",
    queuePath: "content/qa/pending/dong-hoa-hoc.remediation-queue.json",
  },
  {
    lessonSlug: "dung-dich-va-can-bang-hoa-hoc",
    topic: "chuyen-de-08",
    pendingPath: "content/qa/pending/dung-dich-va-can-bang-hoa-hoc.json",
    queuePath:
      "content/qa/pending/dung-dich-va-can-bang-hoa-hoc.remediation-queue.json",
  },
] as const;

const VALID_OBSERVED_TYPES = new Set([
  "formula",
  "figure",
  "table",
  "diagram",
  "unknown",
]);
const VALID_REMEDIATION_CHOICES = new Set([
  null,
  "reviewed-latex-mdx",
  "reviewed-image-fallback",
  "remain-blocking",
]);
const VALID_STATUSES = new Set(["pending-owner-review", "applied", "blocked"]);

/**
 * P4.5 processed these 7 sample issues (the same 7 named in the P4.4
 * triage request): 6 got Owner-approved LaTeX applied to the canonical MDX
 * (`status: "applied"`), and 1 (`T08-S01:e6352`) got an Owner-approved
 * image-fallback decision that is still `status: "blocked"` -- the Owner
 * confirmed the source object's real content (a two-arrow diagram), but no
 * renderer available in this environment can produce a faithful asset from
 * it (missing proprietary fonts; see its `ownerDecision.qaNote`). P6-B2.7
 * (Batch A1) later applied Owner-approved LaTeX to 11 more T06 OLE
 * formulas. Every other entry must remain untouched
 * (`status: "pending-owner-review"`, no decision).
 */
const PROCESSED_ISSUE_IDS = new Set([
  "T06-S01:e6259",
  "T06-S01:e5248",
  "T06-S01:e4743",
  "T06-S01:e9544",
  "T06-S01:e0469",
  "T06-S01:e0245",
  "T06-S01:e1520",
  "T06-S01:e8803",
  "T06-S01:e2801",
  "T06-S01:e4916",
  "T06-S01:e3758",
  "T06-S01:e2548",
  "T06-S01:e7681",
  "T06-S01:e2249",
  "T06-S01:e7685",
  "T08-S01:e7414",
  "T08-S01:e3055",
  "T08-S01:e6352",
]);
const BLOCKED_ISSUE_IDS = new Set(["T08-S01:e6352"]);

describe.each(LESSONS)(
  "remediation queue for $lessonSlug",
  ({ lessonSlug, topic, pendingPath, queuePath }) => {
    const pending = readJson<PendingRecord>(pendingPath);
    const queue = readJson<QueueItem[]>(queuePath);

    it("has exactly one queue entry per pending unresolved issue, no loss", () => {
      const pendingIds = new Set(pending.unresolved.map((u) => u.id));
      const queueIds = new Set(queue.map((q) => q.issueId));
      expect(queueIds.size).toBe(queue.length); // no duplicate issueId
      expect([...queueIds].sort()).toEqual([...pendingIds].sort());
    });

    it("never downgrades or drops a severity", () => {
      const pendingSeverity = new Map(
        pending.unresolved.map((u) => [u.id, u.severity]),
      );
      for (const item of queue) {
        expect(item.severity).toBe(pendingSeverity.get(item.issueId));
      }
    });

    it("every entry not processed by P4.5 stays pending-owner-review with no decision", () => {
      for (const item of queue) {
        if (PROCESSED_ISSUE_IDS.has(item.issueId)) continue;
        expect(item.status).toBe("pending-owner-review");
        expect(item.remediationChoice).toBeNull();
        expect(item.ownerDecision.decidedBy).toBeNull();
        expect(item.ownerDecision.decidedAt).toBeNull();
        expect(item.ownerDecision.reviewedLatex).toBeNull();
      }
    });

    it("every P4.5-processed entry records a real Owner decision", () => {
      for (const item of queue) {
        if (!PROCESSED_ISSUE_IDS.has(item.issueId)) continue;
        expect(item.remediationChoice).not.toBeNull();
        expect(item.ownerDecision.decidedBy).not.toBeNull();
        expect(item.ownerDecision.decidedAt).not.toBeNull();
        if (BLOCKED_ISSUE_IDS.has(item.issueId)) {
          // Owner approved a decision, but no available renderer can
          // produce a faithful asset (missing fonts) -- recorded, not
          // silently actioned.
          expect(item.status).toBe("blocked");
        } else {
          expect(item.status).toBe("applied");
          expect(item.remediationChoice).toBe("reviewed-latex-mdx");
          expect(item.ownerDecision.reviewedLatex).not.toBeNull();
        }
      }
    });

    it("every entry has a valid status/observedType/remediationChoice enum value", () => {
      for (const item of queue) {
        expect(VALID_STATUSES.has(item.status)).toBe(true);
        expect(VALID_OBSERVED_TYPES.has(item.observedType)).toBe(true);
        expect(VALID_REMEDIATION_CHOICES.has(item.remediationChoice)).toBe(
          true,
        );
        expect(item.observedTypeEvidence.length).toBeGreaterThan(0);
      }
    });

    it("every entry carries its topic/lessonSlug consistently", () => {
      for (const item of queue) {
        expect(item.topic).toBe(topic);
        expect(item.lessonSlug).toBe(lessonSlug);
        expect(item.issueId.startsWith(`${item.sourceId}:`)).toBe(true);
      }
    });

    it("every previewPath, when present, points at a file that exists under public/", () => {
      for (const item of queue) {
        if (!item.previewPath) continue;
        expect(item.previewPath.startsWith("/")).toBe(true);
        const onDisk = path.join(repoRoot, "public", item.previewPath);
        expect(existsSync(onDisk)).toBe(true);
      }
    });

    it("formula/table/figure entries are certain (never unknown)", () => {
      // These kinds are classified from objective evidence (OOXML kind,
      // ProgID, or an already-extracted asset), not inference, so none of
      // them should ever fall back to "unknown".
      for (const item of queue) {
        if (["table", "figure"].includes(item.kind)) {
          expect(item.observedType).not.toBe("unknown");
        }
      }
    });

    it("only embeddedObject/drawing kinds are allowed to be unknown", () => {
      for (const item of queue) {
        if (item.observedType === "unknown") {
          expect(["embeddedObject", "drawing"]).toContain(item.kind);
        }
      }
    });
  },
);

describe("remediation queue counts match the P4.1 pilot manifest", () => {
  const manifest = readJson<{ lessons: ManifestLesson[] }>(
    "content/pilot-staging-manifest.json",
  );

  it.each(LESSONS)(
    "$lessonSlug: blocking/warning counts equal the manifest",
    ({ lessonSlug, queuePath }) => {
      const queue = readJson<QueueItem[]>(queuePath);
      const manifestLesson = manifest.lessons.find(
        (l) => l.slug === lessonSlug,
      );
      expect(manifestLesson).toBeDefined();
      const blocking = queue.filter((q) => q.severity === "blocking").length;
      const warning = queue.filter((q) => q.severity === "warning").length;
      expect(blocking).toBe(manifestLesson!.blockingCount);
      expect(warning).toBe(manifestLesson!.warningCount);
    },
  );

  it("canonical lesson MDX files match the hash recorded in the manifest", () => {
    // Any authorized content edit (e.g. P4.5 applying Owner-approved LaTeX)
    // must update this manifest hash in the same change, so this keeps
    // catching *unrecorded* drift without hard-coding one task's hash.
    for (const lesson of manifest.lessons) {
      const bytes = readFileSync(path.join(repoRoot, lesson.mdxPath));
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      expect(sha256).toBe(lesson.mdxSha256);
    }
  });
});

describe("P4 total (both lessons)", () => {
  it("222 blocking + 45 warning issues are all represented in the queues", () => {
    const allItems = LESSONS.flatMap(({ queuePath }) =>
      readJson<QueueItem[]>(queuePath),
    );
    const blocking = allItems.filter((i) => i.severity === "blocking").length;
    const warning = allItems.filter((i) => i.severity === "warning").length;
    expect(blocking).toBe(222);
    expect(warning).toBe(45);
    expect(allItems).toHaveLength(267);
  });

  it("the 7 sample issues named in the triage request are present and classified", () => {
    const sampleIds = [
      "T06-S01:e6259",
      "T06-S01:e5248",
      "T06-S01:e4743",
      "T06-S01:e9544",
      "T08-S01:e7414",
      "T08-S01:e3055",
      "T08-S01:e6352",
    ];
    const allItems = LESSONS.flatMap(({ queuePath }) =>
      readJson<QueueItem[]>(queuePath),
    );
    const byId = new Map(allItems.map((i) => [i.issueId, i]));
    for (const id of sampleIds) {
      const item = byId.get(id);
      expect(item, `${id} missing from queue`).toBeDefined();
      expect(item!.issueCode).toBe("UNSUPPORTED_OLE_OBJECT");
      expect(item!.severity).toBe("blocking");
      // All 7 were inferred "formula" from their Equation.DSMT4 ProgID at
      // triage time. T08-S01:e6352 was later reclassified "diagram" on the
      // Owner's own direct inspection of the source Word object -- stronger
      // evidence than the ProgID inference, and the whole point of keeping
      // this field owner-correctable rather than locking it at triage time.
      const expectedType = id === "T08-S01:e6352" ? "diagram" : "formula";
      expect(item!.observedType).toBe(expectedType);
    }
  });
});

describe("P4.5: applied LaTeX is actually present in the canonical MDX", () => {
  const t06Mdx = readFileSync(
    path.join(repoRoot, "content/topics/chuyen-de-06/dong-hoa-hoc.mdx"),
    "utf8",
  );
  const t08Mdx = readFileSync(
    path.join(
      repoRoot,
      "content/topics/chuyen-de-08/dung-dich-va-can-bang-hoa-hoc.mdx",
    ),
    "utf8",
  );

  it("every blocking id -- processed or not -- stays traceable in its MDX body", () => {
    // Mirrors scripts/validate-content/validate.py's "hidden unresolved
    // blocking issue" check: an id must never silently vanish from the body,
    // whether it's still a Callout or now a one-line {/* ... */} marker next
    // to the content that replaced it.
    for (const [mdx, ids] of [
      [
        t06Mdx,
        ["T06-S01:e6259", "T06-S01:e5248", "T06-S01:e4743", "T06-S01:e9544"],
      ],
      [t08Mdx, ["T08-S01:e7414", "T08-S01:e3055", "T08-S01:e6352"]],
    ] as const) {
      for (const id of ids) {
        expect(mdx).toContain(id);
      }
    }
  });

  it("T06 inline/display LaTeX for the 4 applied issues is present", () => {
    expect(t06Mdx).toContain(String.raw`$\Delta C$`);
    expect(t06Mdx).toContain(String.raw`$\Delta t$`);
    expect(t06Mdx).toContain(
      String.raw`$$\bar{v} = \pm\dfrac{\Delta C}{\Delta t}$$`,
    );
    expect(t06Mdx).toContain(String.raw`$\bar{v}$`);
    // The 3 replaced Callouts are gone. e0469 was applied later, in
    // P6-B2.7 (Batch A1), and its Callout is gone too.
    expect(t06Mdx).not.toMatch(/Chưa chuyển đối tượng `T06-S01:e6259`/);
    expect(t06Mdx).not.toMatch(/Chưa chuyển đối tượng `T06-S01:e0469`/);
  });

  it("T08 combined reversible-reaction LaTeX is present exactly once", () => {
    const formula = String.raw`$$\text{aA} + \text{bB} \rightleftharpoons \text{cC} + \text{dD}$$`;
    expect(t08Mdx.split(formula)).toHaveLength(2); // exactly one occurrence
  });

  it("T08-S01:e6352's Callout fallback is deliberately untouched (blocked decision)", () => {
    expect(t08Mdx).toContain("Chưa chuyển đối tượng `T08-S01:e6352`");
    expect(t08Mdx).toContain(
      '<Callout type="warning" title="Đối tượng Word cần biên tập">',
    );
  });

  it("T08-S01:e6352 is traceable as an Owner-approved (but not-yet-applied) image fallback", () => {
    const queue = readJson<QueueItem[]>(
      "content/qa/pending/dung-dich-va-can-bang-hoa-hoc.remediation-queue.json",
    );
    const item = queue.find((i) => i.issueId === "T08-S01:e6352");
    expect(item, "T08-S01:e6352 missing from the T08 queue").toBeDefined();
    // The Owner-approved decision is fully recorded even though it isn't
    // live yet -- this is what makes it "traceable" rather than lost.
    expect(item!.remediationChoice).toBe("reviewed-image-fallback");
    expect(item!.ownerDecision.altText).toBeTruthy();
    expect(item!.ownerDecision.caption).toBeTruthy();
    expect(item!.ownerDecision.decidedBy).toBeTruthy();
    expect(item!.ownerDecision.decidedAt).toBeTruthy();
    expect(item!.ownerDecision.qaNote).toBeTruthy();
    // Not applied: no ChemFigure exists yet, so there is no publish asset
    // path to assert on. previewPath still points at the QA-preview-only
    // image (public/qa-preview/README.md: never a ChemFigure fallback
    // source on its own), and status reflects "approved but blocked", not
    // "applied".
    expect(item!.status).toBe("blocked");
    expect(item!.previewPath).toBe(
      "/qa-preview/lessons/chuyen-de-08/e6352.png",
    );
    expect(existsSync(path.join(repoRoot, "public", item!.previewPath!))).toBe(
      true,
    );
    // T08 already has 31 legitimate ChemFigure usages from P4.1; this task
    // must not add a 32nd one for e6352 (that would mean it got applied
    // despite being blocked). No `qa-preview` path appears in a ChemFigure
    // `src`, since public/qa-preview/README.md forbids using those images
    // as a publish fallback source.
    const chemFigureCount = (t08Mdx.match(/<ChemFigure/g) ?? []).length;
    expect(chemFigureCount).toBe(31);
    expect(t08Mdx).not.toMatch(/<ChemFigure[^>]*qa-preview/);
  });
});
