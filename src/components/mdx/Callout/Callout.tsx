import styles from "./Callout.module.css";

export type CalloutType = "note" | "warning" | "definition";

const LABELS: Record<CalloutType, string> = {
  note: "Lưu ý",
  warning: "Cảnh báo",
  definition: "Định nghĩa",
};

interface CalloutProps {
  type: CalloutType;
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type, title, children }: CalloutProps) {
  const label = LABELS[type];

  return (
    <aside
      className={`${styles.callout} ${styles[type]}`}
      aria-label={title ?? label}
    >
      <p className={styles.typeLabel}>{label}</p>
      {title && <p className={styles.title}>{title}</p>}
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
