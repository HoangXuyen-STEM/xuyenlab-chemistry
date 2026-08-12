import { getNeonAuthHandler } from "@/lib/auth/neon";
import { AppError } from "@/lib/validation/app-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

/**
 * Neon Auth browser endpoints (`sign-in`, `sign-out`, `get-session`, OAuth
 * callbacks). Without this mount every client auth call returns 404.
 */
export async function GET(request: Request, context: RouteContext) {
  return proxyToNeonAuth("GET", request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyToNeonAuth("POST", request, context);
}

async function proxyToNeonAuth(
  method: "GET" | "POST",
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const handler = await getNeonAuthHandler();
    return await handler[method](request, context);
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json(error.toEnvelope(), { status: 500 });
    }
    return Response.json(
      {
        error: {
          code: "INTERNAL",
          message: "Authentication service is unavailable.",
        },
      },
      { status: 502 },
    );
  }
}
