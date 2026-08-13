import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thư viện pilot staging | XuyenLab Chemistry",
  robots: { index: false, follow: false },
};

export default function P5LibraryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
