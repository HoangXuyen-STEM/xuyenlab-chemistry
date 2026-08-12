import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { getReaderViewer } from "@/features/content/reader-session";

// Every private route reads the session, so it can never be statically rendered.
export const dynamic = "force-dynamic";

export default async function PrivateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getReaderViewer();
  if (!viewer) redirect("/dang-nhap");
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
