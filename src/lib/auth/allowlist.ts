import { createAllowlistRepository } from "@/lib/db/allowlist.repo";
import { getDatabase } from "@/lib/db/client";

function configuredTeacherEmails(): Set<string> {
  return new Set(
    (process.env.TEACHER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Checks whether an email address is permitted to sign up / sign in.
 * - Teacher emails (configured via TEACHER_EMAILS env) are automatically allowed.
 * - Allowed students in DB table `allowed_students` are allowed.
 * - If DATABASE_URL is not set or db query fails, falls back to teacher check only.
 */
export async function isAllowedEmail(rawEmail: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return false;

  // 1. Teacher emails bypass allowlist check
  if (configuredTeacherEmails().has(email)) {
    return true;
  }

  // 2. Check allowed_students table in Database
  try {
    const db = getDatabase();
    const repo = createAllowlistRepository(db);
    return await repo.isEmailAllowed(email);
  } catch {
    // If DB is unavailable, deny unless teacher
    return false;
  }
}

/**
 * Marks an allowlisted student as verified after a successful auth event.
 * Teachers and unknown emails are no-ops. DB errors are swallowed so auth
 * success is never blocked by a secondary write.
 */
export async function markAllowedEmailVerified(
  rawEmail: string,
): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return;
  if (configuredTeacherEmails().has(email)) return;

  try {
    const db = getDatabase();
    const repo = createAllowlistRepository(db);
    await repo.markEmailVerified(email);
  } catch {
    // Best-effort side effect only
  }
}
