"use client";

import { useEffect, useState } from "react";

import { uniqueSlugger } from "./slugify";

import styles from "./PilotHeadingNav.module.css";

interface HeadingEntry {
  id: string;
  text: string;
}

/**
 * Builds an in-page jump list from the rendered `h2` elements inside
 * `articleId`. The imported lesson MDX has no heading ids (no `rehype-slug`
 * in `next.config.ts`), so this assigns one per heading on mount instead of
 * duplicating the article's text into a separate outline structure.
 */
export function PilotHeadingNav({ articleId }: { articleId: string }) {
  const [headings, setHeadings] = useState<HeadingEntry[]>([]);

  useEffect(() => {
    const article = document.getElementById(articleId);
    if (!article) return;
    const nextId = uniqueSlugger();
    const elements = Array.from(article.querySelectorAll("h2"));
    const entries = elements.map((element, index) => {
      const text = element.textContent?.trim() ?? "";
      const id = element.id || nextId(text, index);
      element.id = id;
      return { id, text: text || `Mục ${index + 1}` };
    });
    // The heading list can only be read after the MDX children (owned by the
    // parent, not this component) have painted into `articleId`'s subtree, so
    // it cannot be derived during render; this is the DOM-as-external-system
    // case the setState-in-effect rule doesn't model.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeadings(entries);
  }, [articleId]);

  if (headings.length === 0) return null;

  return (
    <details className={styles.toc} open>
      <summary className={styles.summary}>Mục lục ({headings.length})</summary>
      <nav aria-label="Mục lục bài học" className={styles.nav}>
        <ol>
          {headings.map((heading) => (
            <li key={heading.id}>
              <a href={`#${heading.id}`}>{heading.text}</a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
