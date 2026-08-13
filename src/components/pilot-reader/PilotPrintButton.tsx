"use client";

import styles from "./PilotLessonShell.module.css";

/** Triggers the browser print dialog; hidden from the printed output itself. */
export function PilotPrintButton() {
  return (
    <button
      className={styles.printButton}
      onClick={() => window.print()}
      type="button"
    >
      In / Lưu PDF
    </button>
  );
}
