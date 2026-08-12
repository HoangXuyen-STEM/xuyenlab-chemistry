import { AppError } from "@/lib/validation/app-error";

import { getNeonAuth } from "./neon";
import type { AppSession, AppUser } from "./types";

type NeonSession = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    emailVerified?: boolean;
  };
};

type SessionReader = () => Promise<NeonSession | null>;

let testSessionReader: SessionReader | undefined;
let neonSessionReader: SessionReader | undefined;

function configuredTeacherEmails(): Set<string> {
  return new Set(
    (process.env.TEACHER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function toAppUser(user: NeonSession["user"]): AppUser {
  const email = user.email.trim().toLowerCase();
  return {
    id: user.id,
    email,
    displayName: user.name ?? null,
    role: configuredTeacherEmails().has(email) ? "teacher" : "student",
    emailVerified: user.emailVerified ?? false,
  };
}

async function getNeonSessionReader(): Promise<SessionReader> {
  if (neonSessionReader) return neonSessionReader;

  // `./neon` keeps the provider import lazy so backend unit tests and non-auth
  // build paths do not load Next request APIs, and shares one instance with the
  // `/api/auth` handler, the proxy and the sign-in actions.
  const auth = await getNeonAuth();
  neonSessionReader = async () => {
    const { data } = await auth.getSession();
    return (data as NeonSession | null) ?? null;
  };
  return neonSessionReader;
}

export async function getSession(): Promise<AppSession | null> {
  const readSession = testSessionReader ?? (await getNeonSessionReader());
  const session = await readSession();
  return session ? { user: toAppUser(session.user) } : null;
}

export async function requireUser(): Promise<AppUser> {
  const session = await getSession();
  if (!session)
    throw new AppError("UNAUTHENTICATED", "Authentication is required.");
  return session.user;
}

export async function requireTeacher(): Promise<AppUser & { role: "teacher" }> {
  const user = await requireUser();
  if (user.role !== "teacher")
    throw new AppError("FORBIDDEN", "Teacher access is required.");
  return { ...user, role: "teacher" };
}

/** Test seam. It is deliberately unavailable outside the test runtime. */
export function setAuthSessionReaderForTests(
  reader: SessionReader | undefined,
): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Test auth session injection is only available in tests.");
  }
  testSessionReader = reader;
}
