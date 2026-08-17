import type { AuthFormState, PasswordResetFormState } from "./form-state";
import { isAllowedEmail, markAllowedEmailVerified } from "./allowlist";
import { getNeonAuth } from "./neon";

const AFTER_LOGIN_PATH = "/thu-vien";
const RESET_PASSWORD_PATH = "/dat-lai-mat-khau";

const MESSAGES = {
  missingCredentials: "Vui lòng nhập email và mật khẩu.",
  invalidCredentials: "Email hoặc mật khẩu không đúng.",
  notAllowed:
    "Email chưa được ghi danh trong danh sách cho phép của lớp học. Vui lòng liên hệ giáo viên.",
  emailNotVerified:
    "Email chưa được xác minh. Vui lòng mở liên kết xác minh trong hộp thư của bạn.",
  weakPassword: "Mật khẩu phải có ít nhất 8 ký tự.",
  accountExists:
    "Email này đã có tài khoản. Vui lòng đăng nhập hoặc đặt lại mật khẩu.",
  passwordResetSent:
    "Nếu email hợp lệ, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.",
  missingResetToken:
    "Thiếu mã đặt lại mật khẩu. Vui lòng mở lại liên kết trong email.",
  passwordResetFailed:
    "Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn — vui lòng yêu cầu lại.",
  passwordResetSuccess:
    "Đã cập nhật mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.",
  genericAuthError:
    "Không thể kết nối dịch vụ đăng nhập. Vui lòng thử lại sau.",
} as const;

const MIN_PASSWORD_LENGTH = 8;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : email;
}

function messageFromAuthError(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const record = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
  const code = typeof record.code === "string" ? record.code.toUpperCase() : "";
  const message =
    typeof record.message === "string" ? record.message.toLowerCase() : "";

  if (
    code.includes("INVALID") ||
    code.includes("CREDENTIAL") ||
    message.includes("invalid") ||
    message.includes("credential")
  ) {
    return MESSAGES.invalidCredentials;
  }
  if (
    code.includes("NOT_VERIFIED") ||
    code.includes("UNVERIFIED") ||
    message.includes("not verified") ||
    message.includes("unverified")
  ) {
    return MESSAGES.emailNotVerified;
  }
  if (
    code.includes("EXISTS") ||
    code.includes("ALREADY") ||
    message.includes("already") ||
    message.includes("exists")
  ) {
    return MESSAGES.accountExists;
  }
  if (
    code.includes("PASSWORD") ||
    message.includes("password") ||
    message.includes("weak")
  ) {
    return MESSAGES.weakPassword;
  }
  return fallback;
}

function thrownMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return messageFromAuthError(error, error.message);
  }
  return messageFromAuthError(error, fallback);
}

export async function signInWithPasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  if (!email || !password) return { error: MESSAGES.missingCredentials };

  const allowed = await isAllowedEmail(email);
  if (!allowed) {
    return { error: MESSAGES.notAllowed };
  }

  try {
    const auth = await getNeonAuth();
    const result = await auth.signIn.email({ email, password });
    if (result.error) {
      return {
        error: messageFromAuthError(result.error, MESSAGES.invalidCredentials),
      };
    }
    await markAllowedEmailVerified(email);
  } catch (error) {
    return { error: thrownMessage(error, MESSAGES.genericAuthError) };
  }

  const { redirect } = await import("next/navigation");
  redirect(AFTER_LOGIN_PATH);
}

export async function signUpWithPasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  if (!email || !password) return { error: MESSAGES.missingCredentials };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: MESSAGES.weakPassword };
  }

  const allowed = await isAllowedEmail(email);
  if (!allowed) {
    return { error: MESSAGES.notAllowed };
  }

  try {
    const auth = await getNeonAuth();
    const result = await auth.signUp.email({
      email,
      password,
      name: displayNameFromEmail(email),
    });
    if (result.error) {
      return {
        error: messageFromAuthError(result.error, MESSAGES.genericAuthError),
      };
    }
    await markAllowedEmailVerified(email);
  } catch (error) {
    return { error: thrownMessage(error, MESSAGES.genericAuthError) };
  }

  const { redirect } = await import("next/navigation");
  redirect(AFTER_LOGIN_PATH);
}

export async function signInWithGoogleAction(): Promise<void> {
  // Google OAuth cannot pre-check email before the IdP round-trip.
  // Post-login enforcement lives in requireUser() / requireTeacher().
  const auth = await getNeonAuth();
  const result = await auth.signIn.social({
    provider: "google",
    callbackURL: AFTER_LOGIN_PATH,
  });
  if (result.error) {
    throw new Error(
      messageFromAuthError(result.error, MESSAGES.genericAuthError),
    );
  }
  if (result.data?.url) {
    const { redirect } = await import("next/navigation");
    redirect(result.data.url);
  }
}

export async function requestPasswordResetAction(
  _previous: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const email = field(formData, "email").toLowerCase();
  if (!email) {
    return { error: "Vui lòng nhập email.", submitted: true };
  }

  // Always return the same success message to avoid email enumeration.
  try {
    const auth = await getNeonAuth();
    const base =
      process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    await auth.requestPasswordReset({
      email,
      redirectTo: `${base}${RESET_PASSWORD_PATH}`,
    });
  } catch {
    // Swallow errors for anti-enumeration
  }
  return { success: MESSAGES.passwordResetSent, submitted: true };
}

export async function resetPasswordAction(
  _previous: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const token = field(formData, "token");
  const password = field(formData, "password");
  if (!token) {
    return { error: MESSAGES.missingResetToken, submitted: true };
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: MESSAGES.weakPassword, submitted: true };
  }

  try {
    const auth = await getNeonAuth();
    const result = await auth.resetPassword({
      newPassword: password,
      token,
    });
    if (result.error) {
      return {
        error: messageFromAuthError(result.error, MESSAGES.passwordResetFailed),
        submitted: true,
      };
    }
  } catch (error) {
    return {
      error: thrownMessage(error, MESSAGES.passwordResetFailed),
      submitted: true,
    };
  }
  return { success: MESSAGES.passwordResetSuccess, submitted: true };
}

export async function signOutAction(): Promise<void> {
  try {
    const auth = await getNeonAuth();
    await auth.signOut();
  } catch {
    // Always redirect home even if sign-out fails
  }
  redirect("/dang-nhap");
}
gn-out fails
  }
  const { redirect } = await import("next/navigation");
  redirect("/dang-nhap");
}
