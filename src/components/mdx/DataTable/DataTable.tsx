import styles from "./DataTable.module.css";

interface DataTableProps {
  caption?: string;
  children: React.ReactNode;
}

export function DataTable({ caption, children }: DataTableProps) {
  return (
    <div
      className={styles.wrapper}
      role="region"
      aria-label={caption ?? "Bảng dữ liệu"}
      tabIndex={0}
    >
      <table className={styles.table}>
        {caption && <caption className={styles.caption}>{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
