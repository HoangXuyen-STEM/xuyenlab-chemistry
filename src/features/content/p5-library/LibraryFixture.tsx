import Link from "next/link";

import type { PilotLibraryLesson } from "./library";
import styles from "./LibraryFixture.module.css";

export type FixtureState = "populated" | "loading" | "error" | "empty";

interface Props {
  lessons: PilotLibraryLesson[];
  query: string;
  state: FixtureState;
}

export function LibraryFixture({ lessons, query, state }: Props) {
  const hasQuery = query.trim().length > 0;

  return (
    <main className={styles.page}>
      <div className={styles.banner} role="status">
        Staging — nội dung đang duyệt
      </div>
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="Điều hướng fixture P5">
          <Link href="/fixtures/p5/library">Thư viện fixture</Link>
          <span aria-current="page">Tìm kiếm metadata</span>
        </nav>

        <header className={styles.header}>
          <p className={styles.eyebrow}>P5 · Không cần tài khoản ứng dụng</p>
          <h1>Thư viện pilot đang duyệt</h1>
          <p>
            Tra cứu metadata của hai bài pilot. Nội dung và các cảnh báo QA vẫn
            đang ở staging, chưa được xuất bản.
          </p>
        </header>

        <form
          className={styles.search}
          role="search"
          action="/fixtures/p5/library"
        >
          <label htmlFor="pilot-query">
            Tìm theo tiêu đề, tóm tắt, từ khóa hoặc chuyên đề
          </label>
          <div className={styles.searchControls}>
            <input
              id="pilot-query"
              name="q"
              type="search"
              defaultValue={query}
            />
            <button type="submit">Tìm kiếm</button>
          </div>
        </form>

        <section
          className={styles.results}
          aria-labelledby="results-heading"
          aria-live="polite"
        >
          <h2 id="results-heading">
            {hasQuery ? `Kết quả cho “${query}”` : "Chuyên đề gợi ý"}
          </h2>
          {state === "loading" ? <LoadingState /> : null}
          {state === "error" ? <ErrorState /> : null}
          {state === "empty" ? <EmptyCorpusState /> : null}
          {state === "populated" && lessons.length === 0 && hasQuery ? (
            <NoResults query={query} />
          ) : null}
          {state === "populated" && lessons.length > 0 ? (
            <ul className={styles.grid}>
              {lessons.map((lesson) => (
                <LessonCard lesson={lesson} key={lesson.slug} />
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function LessonCard({ lesson }: { lesson: PilotLibraryLesson }) {
  return (
    <li className={styles.card}>
      <div className={styles.cardTopline}>
        <span>{lesson.topicTitle}</span>
        <span className={styles.status}>in_review</span>
      </div>
      <h3>
        <Link href={lesson.href}>{lesson.title}</Link>
      </h3>
      <p className={styles.summary}>{lesson.summary}</p>
      <ul className={styles.keywords} aria-label="Từ khóa">
        {lesson.keywords.map((keyword) => (
          <li key={keyword}>{keyword}</li>
        ))}
      </ul>
      <dl className={styles.metadata}>
        <div>
          <dt>Thời lượng</dt>
          <dd>{lesson.estimatedMinutes} phút</dd>
        </div>
        <div>
          <dt>Phiên bản</dt>
          <dd>{lesson.version}</dd>
        </div>
        <div>
          <dt>QA chưa xử lý</dt>
          <dd>
            {lesson.unresolvedBlocking} chặn · {lesson.unresolvedWarnings} cảnh
            báo
          </dd>
        </div>
      </dl>
    </li>
  );
}

function LoadingState() {
  return (
    <div
      className={styles.skeletonGrid}
      aria-label="Đang tải nội dung"
      aria-busy="true"
    >
      {[0, 1].map((item) => (
        <div className={styles.skeletonCard} key={item}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function ErrorState() {
  return (
    <div className={styles.statePanel} role="alert">
      <h3>Không thể tải metadata pilot</h3>
      <p>Fixture giữ nguyên vùng kết quả để bạn có thể thử lại.</p>
      <Link
        className={styles.action}
        href="/fixtures/p5/library?state=populated"
      >
        Thử lại
      </Link>
    </div>
  );
}

function EmptyCorpusState() {
  return (
    <div className={styles.statePanel}>
      <h3>Chưa có nội dung đang duyệt</h3>
      <p>Trạng thái này mô phỏng corpus staging chưa có bài in_review.</p>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className={styles.statePanel}>
      <h3>Không tìm thấy kết quả cho “{query}”</h3>
      <Link className={styles.action} href="/fixtures/p5/library">
        Về thư viện fixture
      </Link>
    </div>
  );
}
