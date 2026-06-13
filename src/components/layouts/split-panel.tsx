import type { ReactNode } from "react";
import styles from "./split-panel.module.css";

interface SplitPanelProps {
    /** Content for the left panel. */
    left: ReactNode;
    /** Content for the right panel. */
    right: ReactNode;
}

/**
 * App.SplitPanel — Two-panel horizontal split layout.
 *
 * Renders two side-by-side panels at 50% width each. The left panel has a
 * 1px right border. Both panels scroll independently. Carries zero opinions
 * about what goes inside — routes compose their page content into the slots.
 */
export function SplitPanel({ left, right }: SplitPanelProps) {
    return (
        <div className={styles.root}>
            <div className={styles.left}>{left}</div>
            <div className={styles.right}>{right}</div>
        </div>
    );
}
