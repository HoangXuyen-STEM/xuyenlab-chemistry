import { AppError } from "@/lib/validation/app-error";
import {
  createPrivatePdfSigner,
  privatePdfKey,
  type PrivatePdfSigner,
} from "@/lib/r2/private-pdf";

export const STAGING_PDF_LESSON_SLUG = "p3-can-bang-hoa-hoc";
const STAGING_PDF_VERSION = 1;
const STAGING_PDF_CONTENT_HASH = "p3-staging-fixture";
const PDF_TTL_SECONDS = 120;

export async function getStagingPdfDownload(
  lessonSlug: string,
  signer: PrivatePdfSigner = createPrivatePdfSigner(),
): Promise<{ url: string; expiresAt: string }> {
  if (lessonSlug !== STAGING_PDF_LESSON_SLUG) {
    throw new AppError("NOT_FOUND", "PDF is not available for this lesson.");
  }
  return signer.signDownload({
    key: privatePdfKey(
      lessonSlug,
      STAGING_PDF_VERSION,
      STAGING_PDF_CONTENT_HASH,
    ),
    expiresInSeconds: PDF_TTL_SECONDS,
  });
}
