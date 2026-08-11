import { AppShell } from "@/components/app-shell/AppShell";
import { stagingPrivateReaderFacade } from "@/features/content/private-reader-facade";

export default async function PrivateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await stagingPrivateReaderFacade.getViewer();
  if (!viewer) return children;
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
