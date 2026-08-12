import Link from "next/link";

import { signOutAction } from "@/lib/auth/actions";
import type { ReaderViewer } from "@/features/content/private-reader-facade";

import styles from "./AppShell.module.css";

export function AppShell({
  children,
  viewer,
}: {
  children: React.ReactNode;
  viewer: ReaderViewer;
}) {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/thu-vien">
          XuyenLab Chemistry
        </Link>
        <nav aria-label="Điều hướng chính" className={styles.nav}>
          <Link href="/thu-vien">Thư viện</Link>
          <Link href="/tien-do">Tiến độ</Link>
          {viewer.role === "teacher" ? (
            <Link href="/giao-vien">Giáo viên</Link>
          ) : null}
        </nav>
        <div className={styles.account}>
          <span>{viewer.displayName}</span>
          <form action={signOutAction}>
            <button className={styles.signOut} type="submit">
              Đăng xuất
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
