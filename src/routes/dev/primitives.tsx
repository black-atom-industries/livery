import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "../../components/primitives/badge/badge.tsx";
import { Button } from "../../components/primitives/button/button.tsx";
import { KeyHint } from "../../components/primitives/key-hint/key-hint.tsx";

export const Route = createFileRoute("/dev/primitives")({
    component: Page,
});

function Page() {
    return (
        <div>
            <h1
                style={{
                    fontFamily: "var(--ba-font-display)",
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 24,
                }}
            >
                Primitives
            </h1>

            <section style={{ marginBottom: 32 }}>
                <h2
                    style={{
                        fontFamily: "var(--ba-font-mono)",
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--ba-color-fg-subtle)",
                        marginBottom: 12,
                    }}
                >
                    Badge
                </h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Badge>Dark</Badge>
                </div>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2
                    style={{
                        fontFamily: "var(--ba-font-mono)",
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--ba-color-fg-subtle)",
                        marginBottom: 12,
                    }}
                >
                    Button — bracket actuator
                </h2>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <Button intent="primary">Apply Theme</Button>
                    <Button>Configure</Button>
                    <Button intent="ghost">Dismiss</Button>
                    <Button hotkey="r">Retry Failed</Button>
                    <Button disabled>Unavailable</Button>
                    <Button intent="primary" disabled>Unavailable</Button>
                </div>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2
                    style={{
                        fontFamily: "var(--ba-font-mono)",
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--ba-color-fg-subtle)",
                        marginBottom: 12,
                    }}
                >
                    KeyHint — footer key vocabulary
                </h2>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    <KeyHint keys="j/k">NAVIGATE</KeyHint>
                    <KeyHint keys="/">SEARCH</KeyHint>
                    <KeyHint keys="f">FILTERS</KeyHint>
                    <KeyHint keys="⏎">APPLY</KeyHint>
                    <KeyHint keys="esc">DISMISS</KeyHint>
                    <KeyHint keys="q">QUIT</KeyHint>
                </div>
            </section>
        </div>
    );
}
