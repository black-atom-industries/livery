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
        <div className="flex gap-6">
            {SHORTCUTS.map((s) => (
                <span key={s.key}>
                    <kbd className="text-neutral-300">{s.key}</kbd>{" "}
                    <span className="text-neutral-500">{s.label}</span>
                </span>
            ))}
        </div>
    );
}
