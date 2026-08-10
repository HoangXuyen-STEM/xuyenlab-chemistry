import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const optionalSecret = z.preprocess(
  emptyToUndefined,
  z.string().min(16).optional(),
);

const optionalEmailList = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .transform((value) => value.split(",").map((email) => email.trim()))
    .pipe(z.array(z.string().email()))
    .optional(),
);

export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: optionalUrl,
  NEON_AUTH_BASE_URL: optionalUrl,
  NEON_AUTH_COOKIE_SECRET: optionalSecret,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  TEACHER_EMAILS: optionalEmailList,
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalSecret,
  R2_PUBLIC_BUCKET: optionalString,
  R2_PRIVATE_BUCKET: optionalString,
  R2_PUBLIC_BASE_URL: optionalUrl,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  return serverEnvSchema.parse(source);
}
