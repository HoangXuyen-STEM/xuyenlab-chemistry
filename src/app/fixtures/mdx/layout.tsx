import type { Metadata } from "next";

import "katex/dist/katex.min.css";

import "./tokens.css";

export const metadata: Metadata = {
  title: "MDX Renderer Fixture — XuyenLab Chemistry",
  description:
    "Fixture kiểm tra renderer MDX: KaTeX, mhchem, bảng, hình, ví dụ, gợi ý, lời giải.",
  robots: { index: false, follow: false },
};

export default function FixtureMdxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
