"use client";

import { useState } from "react";

import type { PrivateReaderFacade } from "@/features/content/private-reader-facade";

import styles from "@/components/private-reader/PrivateReader.module.css";

export function PdfButton({
  facade,
  lessonSlug,
}: {
  facade: PrivateReaderFacade;
  lessonSlug: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function requestPdf() {
    setState("loading");
    try {
      await facade.requestPdf(lessonSlug);
      setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <button
        className={styles.secondaryButton}
        disabled={state === "loading"}
        onClick={requestPdf}
        type="button"
      >
        {state === "loading" ? "Đang tạo liên kết…" : "Tải PDF"}
      </button>
      {state === "error" ? (
        <p className={styles.pdfMessage} role="status">
          PDF staging chưa sẵn sàng. P3.3 sẽ cấp liên kết ký ngắn hạn sau xác
          thực.
        </p>
      ) : null}
    </div>
  );
}
