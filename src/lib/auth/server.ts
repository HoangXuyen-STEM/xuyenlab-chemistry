import "server-only";

import { redirect } from "next/navigation";

import { isAllowedEmail, markAllowedEmailVerified } from "./allowlist";
import { getNeonAuth } from "./neon";

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
