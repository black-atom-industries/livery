import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "../../components/primitives/badge/badge.tsx";

export const Route = createFileRoute("/dev/primitives")({
    component: Page,
});

function Page() {
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
                Primitives
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
                    Badge
                </h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Badge>Dark</Badge>
                </div>
            </section>
        </div>
    );
}
