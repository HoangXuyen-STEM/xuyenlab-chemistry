import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/validation/app-error";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/auth", () => ({ getSession }));

import { getReaderViewer } from "./reader-session";

/**
 * A rejection the mock can return. The `catch` marks it as observed so Vitest
 * does not report the deliberate failure as an unhandled rejection; for the same
 * reason this file sets a fresh return value per test instead of `mockReset`.
 */
function rejected(error: Error): Promise<never> {
  const promise = Promise.reject(error);
  promise.catch(() => {});
  return promise;
}

describe("getReaderViewer", () => {
  it("returns null for an anonymous request", async () => {
    getSession.mockResolvedValue(null);

    await expect(getReaderViewer()).resolves.toBeNull();
  });

  it("falls back to the email when the profile has no display name", async () => {
    getSession.mockResolvedValue({
      user: {
        id: "student-a",
        email: "a@example.com",
        displayName: null,
        role: "student",
        emailVerified: true,
      },
    });

    await expect(getReaderViewer()).resolves.toEqual({
      displayName: "a@example.com",
      role: "student",
    });
  });

  it("fails closed when the auth provider is unconfigured", async () => {
    getSession.mockReturnValue(
      rejected(new AppError("INTERNAL", "Neon Auth is not configured.")),
    );

    await expect(getReaderViewer()).resolves.toBeNull();
  });
});
