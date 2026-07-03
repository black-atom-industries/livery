import styles from "./app-footer.module.css";

interface Shortcut {
    key: string;
    label: string;
}

const SHORTCUTS: Shortcut[] = [
    { key: "↑/↓ j/k", label: "navigate" },
    { key: "gg/G", label: "top/bottom" },
    { key: "Enter", label: "select" },
    { key: "q", label: "quit" },
];

export function AppFooter() {
    return (
        <div data-component="app-footer" className={styles.root}>
            {SHORTCUTS.map((s) => (
                <span key={s.key} className={styles.shortcut}>
                    <kbd className={styles.keys}>{s.key}</kbd>
                    <span className={styles.label}>{s.label}</span>
                </span>
            ))}
        </div>
    );
}
