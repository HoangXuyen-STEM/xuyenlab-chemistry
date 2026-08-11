import Link from "next/link";

import styles from "@/components/private-reader/PrivateReader.module.css";

/** Presentation-only synthetic data. P3.1 supplies authorized data later. */
const rows = [
  {
    id: "staging-student-a",
    name: "Học sinh staging A",
    completed: "0/26",
    updated: "Chưa bắt đầu",
  },
] as const;

export function TeacherOverview() {
  return (
    <main className={styles.reader}>
      <h1>Danh sách học sinh</h1>
      <p>
        Chỉ đọc. Dữ liệu thật chỉ đến từ teacher service đã kiểm tra ở server.
      </p>
      <div
        aria-label="Bảng tiến độ học sinh"
        className={styles.toc}
        role="region"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Tên</th>
              <th scope="col">Chuyên đề hoàn thành</th>
              <th scope="col">Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/giao-vien/hoc-sinh/${row.id}`}>{row.name}</Link>
                </td>
                <td>{row.completed}</td>
                <td>{row.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export function TeacherStudentDetail({ id }: { id: string }) {
  return (
    <main className={styles.reader}>
      <nav aria-label="Điều hướng giáo viên" className={styles.breadcrumbs}>
        <Link href="/giao-vien">Danh sách học sinh</Link>
        <span>/</span>
        <span>Học sinh staging</span>
      </nav>
      <h1>Học sinh staging</h1>
      <p>
        Mã synthetic: {id}. Trang này chỉ hiển thị sau teacher guard phía server
        và không có điều khiển chỉnh sửa.
      </p>
      <section className={styles.toc}>
        <h2>Chưa có tiến độ</h2>
        <p>Học sinh chưa bắt đầu bài fixture.</p>
      </section>
    </main>
  );
}
