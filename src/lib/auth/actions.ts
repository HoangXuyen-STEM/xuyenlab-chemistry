"use server";

import { redirect } from "next/navigation";

import { AppError } from "@/lib/validation/app-error";

import type { AuthFormState, PasswordResetFormState } from "./form-state";
import { getNeonAuth } from "./neon";

const AFTER_LOGIN_PATH = "/thu-vien";
const RESET_PASSWORD_PATH = "/dat-lai-mat-khau";

const MESSAGES = {
  missingCredentials: "Vui lòng nhập email và mật khẩu.",
  invalidCredentials: "Email hoặc mật khẩu không đúng.",
  emailNotVerified:
    "Email chưa được xác minh. Vui lòng mở liên kết xác minh trong hộp thư của bạn.",
  unavailable: "Không thể kết nối dịch vụ đăng nhập. Vui lòng thử lại sau.",
  notConfigured: "Dịch vụ đăng nhập chưa được cấu hình trên môi trường này.",
  missingEmail: "Vui lòng nhập email.",
  weakPassword: "Mật khẩu mới phải có ít nhất 8 ký tự.",
  passwordMismatch: "Hai lần nhập mật khẩu không khớp.",
  missingToken:
    "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.",
  resetFailed:
    "Không đặt lại được mật khẩu. Liên kết có thể đã hết hạn; hãy yêu cầu liên kết mới.",
} as const;

const MIN_PASSWORD_LENGTH = 8;

/** Absolute URL for provider callbacks; falls back to a relative path. */
function appUrl(path: string): string {
  const base = process.env.APP_BASE_URL;
  return base ? new URL(path, base).toString() : path;
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function errorCodeOf(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/**
 * Maps a thrown value to a user-facing message. Provider messages are never
 * forwarded (`docs/contracts/backend.md`: no provider internals in responses).
 */
function thrownMessage(error: unknown): string {
  if (error instanceof AppError && error.code === "INTERNAL") {
    return MESSAGES.notConfigured;
  }
  return MESSAGES.unavailable;
}

export async function signInWithPasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  if (!email || !password) return { error: MESSAGES.missingCredentials };

  try {
    const auth = await getNeonAuth();
    const { error } = await auth.signIn.email({ email, password });
    if (error) {
      return {
        error:
          errorCodeOf(error) === "EMAIL_NOT_VERIFIED"
            ? MESSAGES.emailNotVerified
            : MESSAGES.invalidCredentials,
      };
    }
  } catch (error) {
    return { error: thrownMessage(error) };
  }

  // `redirect` throws its own control-flow signal, so it stays outside the try.
  redirect(AFTER_LOGIN_PATH);
}

export async function signInWithGoogleAction(): Promise<void> {
  let providerUrl: string | undefined;
  try {
    const auth = await getNeonAuth();
    const { data } = await auth.signIn.social({
      provider: "google",
      callbackURL: appUrl(AFTER_LOGIN_PATH),
    });
    const url = (data as { url?: unknown } | null | undefined)?.url;
    if (typeof url === "string") providerUrl = url;
  } catch {
    providerUrl = undefined;
  }

  redirect(providerUrl ?? "/dang-nhap?loi=google");
}

export async function signOutAction(): Promise<void> {
  try {
    const auth = await getNeonAuth();
    await auth.signOut();
  } catch {
    // Sign-out is best effort; the login page is safe either way.
  }
  redirect("/dang-nhap");
}

export async function requestPasswordResetAction(
  _previous: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const email = field(formData, "email").toLowerCase();
  if (!email) return { error: MESSAGES.missingEmail, submitted: false };

  try {
    const auth = await getNeonAuth();
    await auth.requestPasswordReset({
      email,
      redirectTo: appUrl(RESET_PASSWORD_PATH),
    });
  } catch (error) {
    return { error: thrownMessage(error), submitted: false };
  }

  // Always report the same outcome so the form cannot enumerate accounts.
  return { error: null, submitted: true };
}

export async function resetPasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const token = field(formData, "token");
  const password = formData.get("password");
  const confirmation = formData.get("confirmPassword");
  if (!token) return { error: MESSAGES.missingToken };
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { error: MESSAGES.weakPassword };
  }
  if (password !== confirmation) return { error: MESSAGES.passwordMismatch };

  try {
    const auth = await getNeonAuth();
    const { error } = await auth.resetPassword({
      newPassword: password,
      token,
    });
    if (error) return { error: MESSAGES.resetFailed };
  } catch (error) {
    return { error: thrownMessage(error) };
  }

  redirect("/dang-nhap?trang-thai=da-doi-mat-khau");
}
