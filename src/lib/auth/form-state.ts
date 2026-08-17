export type AuthFormState = {
  error?: string;
  success?: string;
};

export const initialAuthFormState: AuthFormState = {};

export type PasswordResetFormState = {
  error?: string;
  success?: string;
  submitted: boolean;
};

export const initialPasswordResetFormState: PasswordResetFormState = {
  submitted: false,
};
