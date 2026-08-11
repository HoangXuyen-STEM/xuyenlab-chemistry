import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/validation/app-error";

import { getStagingPdfDownload, STAGING_PDF_LESSON_SLUG } from "./staging-pdf";

describe("getStagingPdfDownload", () => {
  it("signs only the staging fixture with a bounded expiry", async () => {
    const signDownload = async (input: {
      key: string;
      expiresInSeconds: number;
    }) => {
      expect(input).toEqual({
        key: "pdf/p3-can-bang-hoa-hoc/v1/p3-staging-fixture.pdf",
        expiresInSeconds: 120,
      });
      return {
        url: "https://signed.example.test/file.pdf",
        expiresAt: "2026-01-01T00:02:00.000Z",
      };
    };
    await expect(
      getStagingPdfDownload(STAGING_PDF_LESSON_SLUG, { signDownload }),
    ).resolves.toEqual({
      url: "https://signed.example.test/file.pdf",
      expiresAt: "2026-01-01T00:02:00.000Z",
    });
  });

  it("does not sign any other lesson", async () => {
    await expect(
      getStagingPdfDownload("other", {
        signDownload: async () => {
          throw new Error("must not sign");
        },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" } satisfies Partial<AppError>);
  });
});
