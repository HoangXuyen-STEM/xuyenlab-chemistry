import FixtureContent from "../../../../content/fixtures/mdx-renderer.mdx";

import styles from "./page.module.css";

export default function MdxFixturePage() {
  return (
    <div className={styles.fixtureRoot}>
      <div className={styles.fixtureHeader} aria-hidden="true">
        <span className={styles.fixtureHeaderLabel}>
          [FIXTURE] — Không phải bài học xuất bản — MDX Renderer P2.2
        </span>
      </div>
      <main className={styles.prose}>
        <FixtureContent />
      </main>
    </div>
  );
}
