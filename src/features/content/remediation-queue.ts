import { readFileSync } from "node:fs";

import { resolveRepositoryFilePath } from "@/features/content/p5-library/library";

const TOPIC = /^chuyen-de-\d{2}$/u;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const ACCEPTED_STATUS = "accepted-with-limitation";
const ACCEPTED_CHOICES = new Set([
  "owner-accepted-source-fidelity",
  "owner-accepted-visible-fallback",
]);
const DISCUSSION_PROMPT_CLASSIFICATION = "discussion-prompt";
const DISCUSSION_PROMPT_SCIENTIFIC_STATUS =
  "not-a-verified-scientific-conclusion";
const DISCUSSION_PROMPT_IDENTITY_ASSURANCE = "declared-not-authenticated";

export interface AcceptedLimitation {
  issueId: string;
  sourceId: string;
  kind: string;
  remediationChoice:
    "owner-accepted-source-fidelity" | "owner-accepted-visible-fallback";
  qaNote: string;
  decidedBy: string;
  decidedAt: string;
}

export interface DiscussionPromptEntry {
  issueId: string;
  sourceId: string;
  promptOrObjective: string;
  recordedBy: string;
  recordedDate: string;
  scientificStatus: string;
  identityAssurance: string;
}

export interface RemediationQueueSummary {
  acceptedLimitations: AcceptedLimitation[];
  discussionPrompts: DiscussionPromptEntry[];
}

const EMPTY_SUMMARY: RemediationQueueSummary = {
  acceptedLimitations: [],
  discussionPrompts: [],
};

/**
 * Pure parse step (no filesystem access), reusable anywhere the raw queue
 * text is already available through a different validated reader (e.g. the
 * P5 library's own manifest-scoped file access). Derives only the declared
 * operational-acceptance vocabulary (docs/contracts/content.md "Remediation
 * queue") — never infers chemistry, and a malformed item is skipped rather
 * than thrown, since this is a best-effort presentation read, not the
 * validator (scripts/validate-content/validate.py remains the source of
 * truth for whether the underlying data is actually valid).
 */
export function parseRemediationQueueSummary(
  raw: string,
): RemediationQueueSummary {
  let queue: unknown;
  try {
    queue = JSON.parse(raw);
  } catch {
    return EMPTY_SUMMARY;
  }
  if (!Array.isArray(queue)) return EMPTY_SUMMARY;

  const acceptedLimitations: AcceptedLimitation[] = [];
  const discussionPrompts: DiscussionPromptEntry[] = [];

  for (const entry of queue) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;

    if (item.status === ACCEPTED_STATUS) {
      const accepted = readAcceptedLimitation(item);
      if (accepted) acceptedLimitations.push(accepted);
    }

    const prompt = readDiscussionPrompt(item);
    if (prompt) discussionPrompts.push(prompt);
  }

  return { acceptedLimitations, discussionPrompts };
}

/**
 * Reads the OPTIONAL, already-validator-approved
 * `content/qa/pending/<slug>.remediation-queue.json` for a manifest-known
 * lesson. `lesson` must come from an allowlisted manifest entry (e.g.
 * `PilotLessonManifestEntry`) — the topic/slug shape is re-checked here as
 * defense-in-depth, but this is never meant to accept arbitrary path input
 * (there is no caller-supplied path parameter at all; the queue path is
 * always derived, never passed in). Fails safely to an empty summary on any
 * missing file, unreadable path, or malformed JSON — the file is optional
 * per lesson, and this is a presentation read, not a validation gate.
 */
export function loadRemediationQueueSummary(
  lesson: { topic: string; slug: string },
  readFile: (repositoryPath: string) => string = readRepositoryFile,
): RemediationQueueSummary {
  if (!TOPIC.test(lesson.topic) || !SLUG.test(lesson.slug)) {
    return EMPTY_SUMMARY;
  }

  const queuePath = `content/qa/pending/${lesson.slug}.remediation-queue.json`;
  let raw: string;
  try {
    raw = readFile(queuePath);
  } catch {
    return EMPTY_SUMMARY;
  }

  return parseRemediationQueueSummary(raw);
}

function readAcceptedLimitation(
  item: Record<string, unknown>,
): AcceptedLimitation | null {
  const issueId = item.issueId;
  const sourceId = item.sourceId;
  const kind = item.kind;
  const choice = item.remediationChoice;
  const decision = item.ownerDecision;
  if (
    typeof issueId !== "string" ||
    !issueId ||
    typeof sourceId !== "string" ||
    !sourceId ||
    typeof kind !== "string" ||
    !kind ||
    typeof choice !== "string" ||
    !ACCEPTED_CHOICES.has(choice) ||
    !decision ||
    typeof decision !== "object"
  ) {
    return null;
  }

  const ownerDecision = decision as Record<string, unknown>;
  const qaNote = ownerDecision.qaNote;
  const decidedBy = ownerDecision.decidedBy;
  const decidedAt = ownerDecision.decidedAt;
  if (
    typeof qaNote !== "string" ||
    !qaNote ||
    typeof decidedBy !== "string" ||
    !decidedBy ||
    typeof decidedAt !== "string" ||
    !decidedAt
  ) {
    return null;
  }

  return {
    issueId,
    sourceId,
    kind,
    remediationChoice: choice as AcceptedLimitation["remediationChoice"],
    qaNote,
    decidedBy,
    decidedAt,
  };
}

function readDiscussionPrompt(
  item: Record<string, unknown>,
): DiscussionPromptEntry | null {
  const prompt = item.discussionPrompt;
  if (!prompt || typeof prompt !== "object") return null;
  const promptFields = prompt as Record<string, unknown>;

  const issueId = item.issueId;
  const sourceId = item.sourceId;
  const promptOrObjective = promptFields.promptOrObjective;
  const recordedBy = promptFields.recordedBy;
  const recordedDate = promptFields.recordedDate;
  if (
    promptFields.classification !== DISCUSSION_PROMPT_CLASSIFICATION ||
    typeof issueId !== "string" ||
    !issueId ||
    typeof sourceId !== "string" ||
    !sourceId ||
    typeof promptOrObjective !== "string" ||
    !promptOrObjective ||
    typeof recordedBy !== "string" ||
    !recordedBy ||
    typeof recordedDate !== "string" ||
    !recordedDate ||
    promptFields.scientificStatus !== DISCUSSION_PROMPT_SCIENTIFIC_STATUS ||
    promptFields.identityAssurance !== DISCUSSION_PROMPT_IDENTITY_ASSURANCE
  ) {
    return null;
  }

  return {
    issueId,
    sourceId,
    promptOrObjective,
    recordedBy,
    recordedDate,
    scientificStatus: DISCUSSION_PROMPT_SCIENTIFIC_STATUS,
    identityAssurance: DISCUSSION_PROMPT_IDENTITY_ASSURANCE,
  };
}

function readRepositoryFile(repositoryPath: string): string {
  return readFileSync(resolveRepositoryFilePath(repositoryPath), "utf8");
}
