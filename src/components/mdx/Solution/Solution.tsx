import styles from "./Solution.module.css";

interface SolutionProps {
  children: React.ReactNode;
}

export function Solution({ children }: SolutionProps) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>Lời giải</summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
