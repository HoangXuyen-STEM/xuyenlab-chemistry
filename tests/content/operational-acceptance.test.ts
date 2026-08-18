// @vitest-environment node

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
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

interface QueueItem {
  issueId: string;
  status: string;
  remediationChoice: string | null;
  kind: string;
  severity: string;
  discussionPrompt?: unknown;
  ownerDecision: { qaNote: string | null };
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

let baseTarget: string;

beforeAll(() => {
  if (!hasPilotDocx) return;
  baseTarget = mkdtempSync(path.join(tmpdir(), "xuyenlab-oa-base-"));
  expect(run(importer, ["--target-root", baseTarget]).status).toBe(0);
}, 30_000);

afterAll(() => {
  if (baseTarget) rmSync(baseTarget, { recursive: true, force: true });
});

describe("legacy remediation queue characterization (real committed data, read-only)", () => {
  const legacyOnlyFiles = [
    "content/qa/pending/dung-dich-va-can-bang-hoa-hoc.remediation-queue.json",
  ];
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
  const NEW_STATUSES = new Set(["accepted-with-limitation"]);
  const NEW_CHOICES = new Set([
    "owner-accepted-source-fidelity",
    "owner-accepted-visible-fallback",
  ]);
  const T06_TABLE_SOURCE_FIDELITY_IDS = new Set([
    "T06-S01:t3041",
    "T06-S01:t2740",
    "T06-S01:t6560",
  ]);

  it("every T08 committed item still uses only a legacy status/choice combination (test 1)", () => {
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

  it("T06 is mixed: formulas/drawing stay legacy; 3 warning tables use A1 source-fidelity vocabulary", () => {
    const queue = readJson<QueueItem[]>(
      path.join(
        repoRoot,
        "content/qa/pending/dong-hoa-hoc.remediation-queue.json",
      ),
    );
    const tableItems = queue.filter((i) =>
      T06_TABLE_SOURCE_FIDELITY_IDS.has(i.issueId),
    );
    expect(tableItems).toHaveLength(3);
    for (const item of tableItems) {
      expect(item.status, item.issueId).toBe("accepted-with-limitation");
      expect(item.remediationChoice, item.issueId).toBe(
        "owner-accepted-source-fidelity",
      );
      expect(item.kind, item.issueId).toBe("table");
      expect(item.severity, item.issueId).toBe("warning");
      expect(item.ownerDecision.qaNote, item.issueId).toBeTruthy();
      expect(item.discussionPrompt).toBeUndefined();
    }
    for (const item of queue) {
      if (T06_TABLE_SOURCE_FIDELITY_IDS.has(item.issueId)) continue;
      expect(
        LEGACY_STATUSES.has(item.status),
        `${item.issueId} status ${item.status}`,
      ).toBe(true);
      expect(
        LEGACY_CHOICES.has(item.remediationChoice),
        `${item.issueId} remediationChoice ${item.remediationChoice}`,
      ).toBe(true);
    }
    expect(queue.some((i) => NEW_STATUSES.has(i.status))).toBe(true);
    expect(queue.some((i) => LEGACY_STATUSES.has(i.status))).toBe(true);
    expect(
      queue.some(
        (i) =>
          i.remediationChoice !== null && NEW_CHOICES.has(i.remediationChoice),
      ),
    ).toBe(true);
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

describe.skipIf(!hasPilotDocx)(
  "live importer operational-acceptance cases",
  () => {
    it("runs only when Topic 6/8 Word sources exist locally", () => {
      expect(hasPilotDocx).toBe(true);
      expect(baseTarget).toBeTruthy();
      expect(existsSync(baseTarget)).toBe(true);
      void cpSync;
      void mkdirSync;
      void writeFileSync;
      void createHash;
    });
  },
);
