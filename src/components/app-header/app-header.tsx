import styles from "./app-header.module.css";

type Props = {
    /** Product name appended to the wordmark. */
    product?: string;
    /** e.g. "0.3.0". Rendered without a "v" prefix, matched by the spec's "V0.3.0" style hint. */
    version?: string;
    /** Right-side env stats slot, e.g. "24 THEMES · 6 COLLECTIONS · ENV DARK" or "SETTINGS / ADAPTERS". */
    context?: React.ReactNode;
    className?: string;
};

/**
 * App header bar — wordmark (brand dot standing in for the O, the system's
 * sole border-radius exception) + version left, uppercase env context right.
 *
 * Spec: docs/design-system/reference/components/containers/AppHeader.jsx
 */
export function AppHeader({ product = "LIVERY", version, context, className }: Props) {
    return (
        <div
            data-component="app-header"
            className={[styles.root, className].filter(Boolean).join(" ")}
        >
            <div className={styles.wordmarkRow}>
                <span className={styles.wordmark}>
                    BLACK AT<span className={styles.dot} aria-hidden="true" />M {product}
                </span>
                {version ? <span className={styles.version}>V{version}</span> : null}
            </div>
            {context ? <div className={styles.context}>{context}</div> : null}
        </div>
    );
}
