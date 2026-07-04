import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { themeMap } from "@black-atom/core";
import { AppHeader } from "../../components/app-header/index.ts";
import { AppFooter } from "../../components/app-footer/index.ts";
import { ProgressBar } from "../../components/primitives/progress-bar/progress-bar.tsx";
import { ThemeList } from "../../components/theme-list/index.ts";
import { ThemeDetail } from "../../components/theme-detail/index.ts";
import { getGroupedThemes } from "../../lib/themes.ts";
import type { UpdateResult } from "../../lib/updaters.ts";

export const Route = createFileRoute("/dev/components")({
    component: Page,
});

const groups = getGroupedThemes(themeMap);
const themes = groups.flatMap((g) => g.themes);

const PROGRESS_FIXTURES: Record<string, UpdateResult[]> = {
    idle: [],
    running: [
        { app: "neovim", status: "running", message: null, duration_ms: null },
        { app: "alacritty", status: "pending", message: null, duration_ms: null },
        { app: "tmux", status: "pending", message: null, duration_ms: null },
    ],
    done: [
        { app: "neovim", status: "done", message: null, duration_ms: 42 },
        { app: "alacritty", status: "done", message: null, duration_ms: 18 },
        { app: "tmux", status: "done", message: null, duration_ms: 9 },
    ],
    error: [
        { app: "neovim", status: "done", message: null, duration_ms: 42 },
        { app: "alacritty", status: "error", message: "config file locked", duration_ms: 12 },
        { app: "tmux", status: "done", message: null, duration_ms: 9 },
    ],
};

function Page() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [progressState, setProgressState] = useState<keyof typeof PROGRESS_FIXTURES>("running");

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
                Components
            </h1>

            <SectionLabel>AppHeader</SectionLabel>
            <div style={{ border: "1px solid var(--ba-color-fg-hint)", marginBottom: 32 }}>
                <AppHeader version="dev" />
            </div>

            <SectionLabel>AppFooter</SectionLabel>
            <div style={{ border: "1px solid var(--ba-color-fg-hint)", marginBottom: 32 }}>
                <AppFooter />
            </div>

            <SectionLabel>ProgressBar</SectionLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {(Object.keys(PROGRESS_FIXTURES) as (keyof typeof PROGRESS_FIXTURES)[]).map((
                    key,
                ) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setProgressState(key)}
                        style={{
                            fontFamily: "var(--ba-font-mono)",
                            fontSize: 11,
                            textTransform: "uppercase",
                            padding: "4px 10px",
                            border: "1px solid var(--ba-color-fg-hint)",
                            background: progressState === key
                                ? "var(--ba-color-bg-hint)"
                                : "transparent",
                            color: progressState === key
                                ? "var(--ba-color-fg-positive)"
                                : "var(--ba-color-fg-subtle)",
                            cursor: "pointer",
                        }}
                    >
                        {key}
                    </button>
                ))}
            </div>
            <div style={{ marginBottom: 32 }}>
                <ProgressBar results={PROGRESS_FIXTURES[progressState]} />
            </div>

            <SectionLabel>ThemeList + ThemeDetail</SectionLabel>
            <div
                style={{
                    display: "flex",
                    border: "1px solid var(--ba-color-fg-hint)",
                    height: 320,
                    marginBottom: 32,
                }}
            >
                <div
                    style={{
                        width: "50%",
                        overflow: "auto",
                        borderRight: "1px solid var(--ba-color-fg-hint)",
                    }}
                >
                    <ThemeList
                        groups={groups}
                        selectedIndex={selectedIndex}
                        onSelect={setSelectedIndex}
                    />
                </div>
                <div style={{ width: "50%", overflow: "auto", padding: 16 }}>
                    <ThemeDetail theme={themes[selectedIndex]} />
                </div>
            </div>
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontFamily: "var(--ba-font-mono)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--ba-color-fg-subtle)",
                marginBottom: 12,
            }}
        >
            {children}
        </div>
    );
}
