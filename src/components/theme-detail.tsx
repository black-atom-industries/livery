import type { ThemeDefinition } from "@black-atom/core";
import { Badge } from "./primitives/badge/badge.tsx";
import { Typo } from "./typo/index.ts";
import styles from "./theme-detail.module.css";

interface ThemeDetailProps {
    theme: ThemeDefinition | undefined;
}

export function ThemeDetail({ theme }: ThemeDetailProps) {
    if (!theme) {
        return <div className={styles.empty}>No theme selected</div>;
    }

    const name = theme.meta.name;
    const appearance = theme.meta.appearance;
    const collection = theme.meta.collection.label;

    return (
        <div data-component="theme-detail" className={styles.card}>
            <div className={styles.header}>
                <Typo.H2>{name}</Typo.H2>
                <Badge>{appearance}</Badge>
            </div>
            <Typo.Lead color="subtle">{collection}</Typo.Lead>

            <div className={styles.meta}>
                <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>COLLECTION</span>
                    <span className={styles.metaValue}>{collection}</span>
                </div>
                <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>APPEARANCE</span>
                    <span className={styles.metaValue}>{appearance}</span>
                </div>
            </div>
        </div>
    );
}
