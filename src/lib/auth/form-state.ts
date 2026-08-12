/**
 * Form state shared by the auth server actions and their client forms.
 *
 * It lives outside `actions.ts` because a `"use server"` module may only export
 * async functions.
 */
export interface AuthFormState {
  /** User-facing message; never a raw provider or database error. */
  error: string | null;
}

export interface PasswordResetFormState extends AuthFormState {
  /** True after the request was accepted, whether or not the email exists. */
  submitted: boolean;
}

export const initialAuthFormState: AuthFormState = { error: null };

export const initialPasswordResetFormState: PasswordResetFormState = {
  error: null,
  submitted: false,
};
