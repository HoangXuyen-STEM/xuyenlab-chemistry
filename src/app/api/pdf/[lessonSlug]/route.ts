import { requireUser } from "@/lib/auth";
import { getStagingPdfDownload } from "@/features/pdf/staging-pdf";
import { AppError } from "@/lib/validation/app-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ lessonSlug: string }> },
) {
  try {
    await requireUser();
    const { lessonSlug } = await context.params;
    return Response.json(await getStagingPdfDownload(lessonSlug));
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json(error.toEnvelope(), {
        status: statusFor(error.code),
      });
    }
    return Response.json(
      {
        error: { code: "INTERNAL", message: "Unable to create PDF download." },
      },
      { status: 500 },
    );
  }
}

function statusFor(code: AppError["code"]): number {
  if (code === "UNAUTHENTICATED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND") return 404;
  if (code === "VALIDATION_FAILED") return 400;
  if (code === "CONFLICT") return 409;
  return 500;
}
