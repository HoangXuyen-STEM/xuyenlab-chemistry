import styles from "./Hint.module.css";

interface HintProps {
  children: React.ReactNode;
}

export function Hint({ children }: HintProps) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>Gợi ý</summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
