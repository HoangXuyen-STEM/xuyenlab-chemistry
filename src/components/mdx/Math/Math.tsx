import katex from "katex";

import "katex/contrib/mhchem";

import styles from "./Math.module.css";

interface MathProps {
  formula: string;
  display?: boolean;
}

export function Math({ formula, display = false }: MathProps) {
  const html = katex.renderToString(formula, {
    throwOnError: false,
    displayMode: display,
  });

  if (display) {
    return (
      <div
        className={styles.display}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={styles.inline}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
