import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "../../components/primitives/badge/badge.tsx";
import { Button } from "../../components/primitives/button/button.tsx";
import { KeyHint } from "../../components/primitives/key-hint/key-hint.tsx";
import { KVRow } from "../../components/primitives/kv-row/kv-row.tsx";
import { SectionHeader } from "../../components/primitives/section-header/section-header.tsx";
import { StatusPip } from "../../components/primitives/status-pip/status-pip.tsx";
import { Swatch } from "../../components/primitives/swatch/swatch.tsx";

const KOYO_YORU_PALETTE = ["#C46A5A", "#D9A662", "#8FA36B", "#A97BA2"];

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
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge>Dark</Badge>
                    <Badge>Light</Badge>
                    <Badge size="mini">D</Badge>
                    <Badge size="mini">L</Badge>
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
                    Swatch — the one sanctioned home of saturated color
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Swatch
                        variant="band"
                        color="#C46A5A"
                        label="ACCENT · BURGUNDY"
                    />
                    <Swatch
                        variant="band"
                        color="#8FA36B"
                        label="ACCENT · 01"
                        tag="DERIVED FROM PALETTE.RED"
                    />
                    <div style={{ display: "flex", gap: 2, maxWidth: 420 }}>
                        {KOYO_YORU_PALETTE.map((c) => <Swatch key={c} color={c} />)}
                    </div>
                    <Swatch variant="pips" colors={KOYO_YORU_PALETTE} />
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
                    KVRow — datasheet key-value pair
                </h2>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        maxWidth: 280,
                    }}
                >
                    <KVRow label="COLLECTION">JPN</KVRow>
                    <KVRow label="STATUS" intent="positive">■ SYNCED · 8/8</KVRow>
                    <KVRow label="DRIFT" intent="warn">2 FILES</KVRow>
                    <KVRow label="LAST APPLY" intent="negative">FAILED</KVRow>
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
                    StatusPip — the system's only status indicator
                </h2>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                    <StatusPip intent="ok">SYNCED 8/8</StatusPip>
                    <StatusPip intent="running">delta ▶</StatusPip>
                    <StatusPip intent="pending">lazygit</StatusPip>
                    <StatusPip intent="warn">2 conflicts</StatusPip>
                    <StatusPip intent="error">obsidian</StatusPip>
                    <StatusPip intent="off">disabled</StatusPip>
                    <StatusPip intent="ok" />
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
                    SectionHeader — primary structural pattern
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
                    <SectionHeader>PRIMARIES · 12</SectionHeader>
                    <SectionHeader meta="REV 03">SPEC</SectionHeader>
                    <SectionHeader>JPN — JAPAN (4)</SectionHeader>
                </div>
            </section>
        </div>
    );
}
