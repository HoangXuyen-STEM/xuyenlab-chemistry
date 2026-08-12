import { getSession } from "@/lib/auth";

import type { ReaderViewer } from "./private-reader-facade";

/**
 * Server-side viewer for the private shell. It returns `null` for anonymous
 * requests and also when the auth provider is unconfigured or unreachable, so
 * every caller fails closed.
 */
export async function getReaderViewer(): Promise<ReaderViewer | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    return {
      displayName: session.user.displayName ?? session.user.email,
      role: session.user.role,
    };
  } catch {
    return null;
  }
}
