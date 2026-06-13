import styles from "./section-header.module.css";

interface SectionHeaderProps {
    /** Uppercase mono label text. */
    label: string;
    /** Optional right-aligned metadata (e.g. count). */
    meta?: string;
}

/**
 * SectionHeader — Uppercase monospace label with horizontal rule underneath.
 *
 * Matches the DESIGN.md "Section Headers" pattern: mono font, uppercase,
 * wide letter-spacing, optional right-aligned metadata, and a 1px rule
 * in --lvr-color-bg-hint.
 */
export function SectionHeader({ label, meta }: SectionHeaderProps) {
    return (
        <div className={styles.root}>
            <div className={styles.row}>
                <span className={styles.label}>{label}</span>
                {meta && <span className={styles.meta}>{meta}</span>}
            </div>
            <hr className={styles.rule} />
        </div>
    );
}
