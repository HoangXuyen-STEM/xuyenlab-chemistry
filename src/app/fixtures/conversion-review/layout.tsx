import type { Metadata } from "next";

import "katex/dist/katex.min.css";

import "../mdx/tokens.css";

export const metadata: Metadata = {
  title: "P2.4 Conversion Review — XuyenLab Chemistry",
  description: "Staging-only review fixture for Phase P2 conversion outputs.",
  robots: { index: false, follow: false },
};

export default function ConversionReviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
