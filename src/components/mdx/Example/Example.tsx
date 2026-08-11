import styles from "./Example.module.css";

interface ExampleProps {
  title?: string;
  children: React.ReactNode;
}

export function Example({ title, children }: ExampleProps) {
  return (
    <section className={styles.example} aria-label={title ?? "Ví dụ"}>
      {title && <p className={styles.title}>{title}</p>}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
