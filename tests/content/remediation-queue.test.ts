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

    it("every entry stays pending-owner-review with no decision applied yet", () => {
      for (const item of queue) {
        expect(item.status).toBe("pending-owner-review");
        expect(item.remediationChoice).toBeNull();
        expect(item.ownerDecision.decidedBy).toBeNull();
        expect(item.ownerDecision.decidedAt).toBeNull();
      }
    });

    it("every entry has a valid observedType and remediationChoice enum value", () => {
      for (const item of queue) {
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

  it("canonical lesson MDX files are unchanged by this triage task", () => {
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
      expect(item!.observedType).toBe("formula");
    }
  });
});
