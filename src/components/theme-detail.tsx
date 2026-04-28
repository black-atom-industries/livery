import { cva } from "cva";
import type { ThemeDefinition } from "@black-atom/core";
import styles from "./theme-detail.module.css";

const badgeVariants = cva({
    base: styles.badge,
    variants: {
        appearance: {
            dark: styles.badgeDark,
            light: styles.badgeLight,
        },
    },
});

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
        <div data-component="theme-detail">
            <h2 className={styles.heading}>
                {name}{" "}
                <span className={badgeVariants({ appearance })}>
                    {appearance}
                </span>
            </h2>
            <p className={styles.collection}>{collection}</p>
        </div>
    );
}
