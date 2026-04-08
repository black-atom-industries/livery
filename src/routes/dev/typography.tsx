import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dev/typography")({
    component: Component,
});

const sampleText = "The quick brown fox jumps over the lazy dog";

function Component() {
    return (
        <div>
            <h1
                style={{
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 24,
                }}
            >
                Typography
            </h1>

            <section style={{ marginBottom: 32 }}>
                <h2
                    style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--fg-subtle)",
                        marginBottom: 12,
                    }}
                >
                    Monospace
                </h2>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        fontFamily: "var(--font-mono, ui-monospace, monospace)",
                    }}
                >
                    {[10, 12, 14, 16, 20, 24].map((size) => (
                        <div key={size}>
                            <span
                                style={{
                                    fontSize: 10,
                                    color: "var(--fg-subtle)",
                                    display: "inline-block",
                                    width: 40,
                                }}
                            >
                                {size}px
                            </span>
                            <span style={{ fontSize: size }}>{sampleText}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2
                    style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--fg-subtle)",
                        marginBottom: 12,
                    }}
                >
                    Color Roles
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                        { var: "--fg-default", label: "fg-default" },
                        { var: "--fg-subtle", label: "fg-subtle" },
                        { var: "--fg-accent", label: "fg-accent" },
                        { var: "--fg-disabled", label: "fg-disabled" },
                        { var: "--fg-contrast", label: "fg-contrast" },
                    ].map((item) => (
                        <div
                            key={item.var}
                            style={{ display: "flex", alignItems: "center", gap: 12 }}
                        >
                            <span
                                style={{
                                    fontSize: 10,
                                    color: "var(--fg-subtle)",
                                    width: 100,
                                    fontFamily: "ui-monospace, monospace",
                                }}
                            >
                                {item.label}
                            </span>
                            <span
                                style={{
                                    fontSize: 14,
                                    color: `var(${item.var})`,
                                    fontFamily: "ui-monospace, monospace",
                                }}
                            >
                                {sampleText}
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
