import { NextResponse } from "next/server";

import { getNeonAuthProxy, isNeonAuthConfigured } from "@/lib/auth/neon";

import type { NextRequest } from "next/server";

/**
 * Refreshes the Neon Auth session and redirects anonymous navigation to the login
 * page. Per ADR-0003 this is navigation convenience only: every private route also
 * checks the session server-side, so a pass-through here cannot expose data.
 */
export default async function proxy(request: NextRequest) {
  if (!isNeonAuthConfigured()) return NextResponse.next();
  try {
    const neonAuthProxy = await getNeonAuthProxy();
    return await neonAuthProxy(request);
  } catch {
    // Fail open for navigation; the server-side guards still deny the request.
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/thu-vien/:path*",
    "/chuyen-de/:path*",
    "/tien-do/:path*",
    "/giao-vien/:path*",
  ],
};
