import "server-only";

import { redirect } from "next/navigation";

import { AppError } from "@/lib/validation/app-error";

import { isAllowedEmail, markAllowedEmailVerified } from "./allowlist";
import { getNeonAuth } from "./neon";
import type { AppSession, AppUser as LegacyAppUser } from "./types";

export type AppUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: "student" | "teacher";
};

type SessionUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean | null;
};

function teacherEmails(): Set<string> {
  return new Set(
    (process.env.TEACHER_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function asSessionUser(value: unknown): SessionUser | null {
  if (!value || typeof value !== "object") return null;
  return value as SessionUser;
}

function resolveRole(email: string): AppUser["role"] {
  return teacherEmails().has(email.toLowerCase()) ? "teacher" : "student";
}

export async function getSessionUser(): Promise<AppUser | null> {
  try {
    const auth = await getNeonAuth();
    const result = await auth.getSession();
    const user = asSessionUser(result.data?.user);
    if (!user?.id || !user.email) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
      role: resolveRole(user.email),
    };
  } catch {
    return null;
  }
}

// --- Legacy provider-neutral contract (docs/adr/0003-auth-and-data-access.md) ---
//
// `getSession`/`requireUser`/`requireTeacher` below predate the P7.2 page-level
// redirect flow above and are still the documented API for the service layer
// (src/features/*/server/service.ts) and API routes, neither of which can use
// `next/navigation`'s `redirect()` — a route handler has no page render to
// redirect, and a server action's caller expects a thrown, catchable error to
// translate into an HTTP status. They intentionally do NOT re-run the P7.2
// allowlist/revoke-on-access check: that check already runs on every
// authenticated page load via `requireUser()`/`requireTeacher()` above, and
// these two behaviors (throw vs redirect) cannot share one exported name, so
// they are exported under distinct names and aliased back to `requireUser`/
// `requireTeacher` in `./index.ts` for existing service-layer consumers.

type NeonSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  emailVerified?: boolean;
};

type NeonSession = { user: NeonSessionUser };

type SessionReader = () => Promise<NeonSession | null>;

let testSessionReader: SessionReader | undefined;

function toLegacyAppUser(user: NeonSessionUser): LegacyAppUser {
  const email = user.email.trim().toLowerCase();
  return {
    id: user.id,
    email,
    displayName: user.name ?? null,
    role: resolveRole(email),
    emailVerified: user.emailVerified ?? false,
  };
}

async function readNeonSession(): Promise<NeonSession | null> {
  const auth = await getNeonAuth();
  const result = await auth.getSession();
  const user = asSessionUser(result.data?.user);
  if (!user?.id || !user.email) return null;
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified ?? undefined,
    },
  };
}

export async function getSession(): Promise<AppSession | null> {
  try {
    const session = await (testSessionReader ?? readNeonSession)();
    return session ? { user: toLegacyAppUser(session.user) } : null;
  } catch {
    return null;
  }
}

export async function requireUserOrThrow(): Promise<LegacyAppUser> {
  const session = await getSession();
  if (!session) {
    throw new AppError("UNAUTHENTICATED", "Authentication is required.");
  }
  return session.user;
}

export async function requireTeacherOrThrow(): Promise<
  LegacyAppUser & { role: "teacher" }
> {
  const user = await requireUserOrThrow();
  if (user.role !== "teacher") {
    throw new AppError("FORBIDDEN", "Teacher access is required.");
  }
  return { ...user, role: "teacher" };
}

/** Test seam. Deliberately unavailable outside the test runtime. */
export function setAuthSessionReaderForTests(
  reader: SessionReader | undefined,
): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Test auth session injection is only available in tests.");
  }
  testSessionReader = reader;
}

export async function requireUser(redirectTo = "/dang-nhap"): Promise<AppUser> {
  const user = await getSessionUser();
  if (!user) redirect(redirectTo);

  const allowed = await isAllowedEmail(user.email);
  if (!allowed) {
    try {
      const auth = await getNeonAuth();
      await auth.signOut();
    } catch {
      // Best-effort sign-out when access is revoked
    }
    redirect(
      `${redirectTo}?error=${encodeURIComponent(
        "Email chưa được ghi danh trong danh sách cho phép của lớp học. Vui lòng liên hệ giáo viên.",
      )}`,
    );
  }

  await markAllowedEmailVerified(user.email);
  return user;
}

export async function requireTeacher(
  redirectTo = "/dang-nhap",
): Promise<AppUser> {
  const user = await requireUser(redirectTo);
  if (user.role !== "teacher") {
    redirect("/thu-vien");
  }
  return user;
}
