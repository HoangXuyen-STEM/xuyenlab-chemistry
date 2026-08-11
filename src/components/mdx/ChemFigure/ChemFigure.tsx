import styles from "./ChemFigure.module.css";

interface ChemFigureProps {
  src: string;
  alt: string;
  caption?: string;
  sourceId?: string;
}

export function ChemFigure({ src, alt, caption, sourceId }: ChemFigureProps) {
  return (
    <figure className={styles.figure} data-source-id={sourceId}>
      <div className={styles.imgWrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={styles.img} />
      </div>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}
