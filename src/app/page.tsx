export default function HomePage() {
  return (
    <main className="shell">
      <section className="card" aria-labelledby="page-title">
        <p className="eyebrow">XuyenLab Chemistry</p>
        <h1 id="page-title">Nền tảng ứng dụng đã sẵn sàng</h1>
        <p className="summary">
          Đây là trang kiểm tra của Phase 1. Nội dung bài học, đăng nhập và tiến
          độ sẽ được bổ sung ở các phase tiếp theo.
        </p>
        <dl className="status-list">
          <div>
            <dt>Ứng dụng</dt>
            <dd>Next.js App Router</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>Sẵn sàng cho CI và UX spec</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
