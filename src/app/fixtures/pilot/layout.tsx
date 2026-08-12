import type { Metadata } from "next";

import "katex/dist/katex.min.css";

import "../mdx/tokens.css";

export const metadata: Metadata = {
  title: "Pilot P4 — XuyenLab Chemistry",
  description:
    "Xem trước staging Chuyên đề 6 và 8 (P4.1 draft), không cần đăng nhập.",
  robots: { index: false, follow: false },
};

export default function PilotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
