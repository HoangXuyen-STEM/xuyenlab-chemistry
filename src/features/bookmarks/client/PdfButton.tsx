"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "@/components/private-reader/PrivateReader.module.css";

type PdfState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string; expiresAt: string | null }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

const ERROR_MESSAGES = {
  forbidden: "Bạn không có quyền tải PDF của bài học này.",
  notFound: "Bài học này chưa có bản PDF.",
  generic: "Không tạo được liên kết PDF. Vui lòng thử lại.",
  offline: "Không thể kết nối máy chủ. Kiểm tra mạng rồi thử lại.",
} as const;

function messageForStatus(status: number): string {
  if (status === 403) return ERROR_MESSAGES.forbidden;
  if (status === 404) return ERROR_MESSAGES.notFound;
  return ERROR_MESSAGES.generic;
}

function formatExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return null;
  return expiry.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Requests a short-lived signed PDF URL from the authenticated server endpoint.
 *
 * The URL is rendered as a link and never logged; R2 credentials stay on the
 * server (`docs/contracts/backend.md`).
 */
export function PdfButton({ lessonSlug }: { lessonSlug: string }) {
  const [state, setState] = useState<PdfState>({ status: "idle" });

  async function requestPdf() {
    setState({ status: "loading" });
    try {
      const response = await fetch(
        `/api/pdf/${encodeURIComponent(lessonSlug)}`,
        { credentials: "same-origin", headers: { accept: "application/json" } },
      );
      if (response.status === 401) {
        setState({ status: "unauthenticated" });
        return;
      }
      if (!response.ok) {
        setState({
          status: "error",
          message: messageForStatus(response.status),
        });
        return;
      }
      const payload = (await response.json()) as {
        url?: unknown;
        expiresAt?: unknown;
      };
      if (typeof payload.url !== "string") {
        setState({ status: "error", message: ERROR_MESSAGES.generic });
        return;
      }
      setState({
        status: "ready",
        url: payload.url,
        expiresAt:
          typeof payload.expiresAt === "string" ? payload.expiresAt : null,
      });
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch {
      setState({ status: "error", message: ERROR_MESSAGES.offline });
    }
  }

  const expiry =
    state.status === "ready" ? formatExpiry(state.expiresAt) : null;

  return (
    <div>
      <button
        className={styles.secondaryButton}
        disabled={state.status === "loading"}
        onClick={requestPdf}
        type="button"
      >
        {state.status === "loading" ? "Đang tạo liên kết…" : "Tải PDF"}
      </button>
      <p className={styles.pdfMessage} role="status">
        {state.status === "ready" ? (
          <>
            <a href={state.url} rel="noopener noreferrer" target="_blank">
              Mở PDF
            </a>
            {expiry ? ` · liên kết hết hạn lúc ${expiry}` : null}
          </>
        ) : null}
        {state.status === "unauthenticated" ? (
          <>
            Phiên đăng nhập đã hết hạn.{" "}
            <Link href="/dang-nhap">Đăng nhập lại</Link> để tải PDF.
          </>
        ) : null}
        {state.status === "error" ? state.message : null}
      </p>
    </div>
  );
}
