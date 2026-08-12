import { AppError } from "@/lib/validation/app-error";

import type { NeonAuth } from "@neondatabase/auth/next/server";

type NeonAuthHandler = ReturnType<NeonAuth["handler"]>;
type NeonAuthProxy = ReturnType<NeonAuth["middleware"]>;

const LOGIN_PATH = "/dang-nhap";

let authInstance: Promise<NeonAuth> | undefined;
let handlerInstance: Promise<NeonAuthHandler> | undefined;
let proxyInstance: Promise<NeonAuthProxy> | undefined;

/** True when both Neon Auth server variables are present. */
export function isNeonAuthConfigured(): boolean {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
  );
}

/**
 * The single Neon Auth server instance.
 *
 * The provider import stays dynamic so unit tests and non-auth build paths never
 * load the SDK; `docs/contracts/backend.md` allows provider imports only inside
 * `src/lib/auth/`.
 */
export function getNeonAuth(): Promise<NeonAuth> {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret) {
    throw new AppError("INTERNAL", "Neon Auth is not configured.");
  }
  authInstance ??= import("@neondatabase/auth/next/server")
    .then(({ createNeonAuth }) =>
      createNeonAuth({ baseUrl, cookies: { secret } }),
    )
    .catch((error: unknown) => {
      // Never cache a failed construction; the next request retries.
      authInstance = undefined;
      throw error;
    });
  return authInstance;
}

/** Route handlers for `/api/auth/[...path]`. */
export function getNeonAuthHandler(): Promise<NeonAuthHandler> {
  handlerInstance ??= getNeonAuth()
    .then((auth) => auth.handler())
    .catch((error: unknown) => {
      handlerInstance = undefined;
      throw error;
    });
  return handlerInstance;
}

/** Session refresh and navigation redirects for `src/proxy.ts`. */
export function getNeonAuthProxy(): Promise<NeonAuthProxy> {
  proxyInstance ??= getNeonAuth()
    .then((auth) => auth.middleware({ loginUrl: LOGIN_PATH }))
    .catch((error: unknown) => {
      proxyInstance = undefined;
      throw error;
    });
  return proxyInstance;
}
