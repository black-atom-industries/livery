import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { themeMap } from "@black-atom/core";
import { AppHeader } from "../../components/app-header/index.ts";
import { AppFooter } from "../../components/app-footer/index.ts";
import { ApplyStrip } from "../../components/apply-strip/index.ts";
import { EmptyState } from "../../components/empty-state/index.ts";
import { Button } from "../../components/primitives/button/button.tsx";
import { Chip } from "../../components/primitives/chip/chip.tsx";
import { DisclosurePanel } from "../../components/primitives/disclosure-panel/disclosure-panel.tsx";
import { Dialog } from "../../components/primitives/dialog/dialog.tsx";
import { KeyHint } from "../../components/primitives/key-hint/key-hint.tsx";
import { ProgressBar } from "../../components/primitives/progress-bar/progress-bar.tsx";
import { StatusPip } from "../../components/primitives/status-pip/status-pip.tsx";
import { ThemeList } from "../../components/theme-list/index.ts";
import { ThemeDetail } from "../../components/theme-detail/index.ts";
import { AdapterRows } from "../../components/settings/adapter-rows/index.ts";
import type {
    AdapterField,
    TestApplyResult,
} from "../../components/settings/adapter-rows/index.ts";
import { getGroupedThemes } from "../../lib/themes.ts";
import type { UpdateResult } from "../../lib/updaters.ts";
import type { AppConfig, AppName, Config } from "../../bindings.ts";

const SETTINGS_ADAPTERS_FIXTURE: Config = {
    system_appearance: false,
    apps: {
        nvim: { enabled: true, config_path: "~/.config/nvim/lua/theme.lua" },
        ghostty: {
            enabled: true,
            config_path: "~/.config/ghostty/config",
            themes_path: "~/.config/ghostty/themes",
            match_pattern: "^theme = .*$",
            replace_template: "theme = {theme_key}",
        },
        obsidian: { enabled: false, config_path: "~/.config/obsidian/themes/black-atom.css" },
        tmux: { enabled: true, config_path: "~/.tmux.conf" },
        zed: { enabled: true, config_path: "~/.config/zed/settings.json" },
        delta: { enabled: true, config_path: "~/.gitconfig" },
        lazygit: { enabled: true, config_path: "~/.config/lazygit/config.yml" },
        helm: { enabled: true, config_path: "~/.config/helm/config.json" },
    },
};

const APPLY_STRIP_FIXTURES: Record<string, UpdateResult[]> = {
    running: [
        { app: "nvim", status: "done", duration_ms: 12 },
        { app: "tmux", status: "done", duration_ms: 8 },
        { app: "ghostty", status: "done", duration_ms: 15 },
        { app: "delta", status: "running", duration_ms: null },
        { app: "lazygit", status: "pending", duration_ms: null },
        { app: "obsidian", status: "pending", duration_ms: null },
        { app: "helm", status: "pending", duration_ms: null },
    ],
    success: [
        { app: "nvim", status: "done", duration_ms: 12 },
        { app: "tmux", status: "done", duration_ms: 8 },
        { app: "ghostty", status: "done", duration_ms: 15 },
        { app: "delta", status: "done", duration_ms: 60 },
        { app: "lazygit", status: "done", duration_ms: 92 },
        { app: "obsidian", status: "done", duration_ms: 110 },
        { app: "helm", status: "done", duration_ms: 115 },
    ],
    partialFailure: [
        { app: "nvim", status: "done", duration_ms: 12 },
        { app: "tmux", status: "done", duration_ms: 8 },
        { app: "ghostty", status: "done", duration_ms: 15 },
        { app: "delta", status: "done", duration_ms: 60 },
        { app: "lazygit", status: "done", duration_ms: 92 },
        {
            app: "obsidian",
            status: "error",
            message:
                "config not found at ~/.config/obsidian/themes/black-atom.css — check THEMES_PATH in settings",
            duration_ms: 3,
        },
        { app: "helm", status: "done", duration_ms: 115 },
    ],
};

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
    const [dialogOpen, setDialogOpen] = useState(false);
    const [collectionValue, setCollectionValue] = useState("jpn");
    const [panelExpanded, setPanelExpanded] = useState(true);
    const [settingsFixture, setSettingsFixture] = useState(SETTINGS_ADAPTERS_FIXTURE);
    const [settingsExpandedApp, setSettingsExpandedApp] = useState<AppName | null>("ghostty");
    const [settingsCursorIndex, setSettingsCursorIndex] = useState(1);
    const [settingsTestApplyResults, setSettingsTestApplyResults] = useState<
        Partial<Record<AppName, TestApplyResult>>
    >({ ghostty: { status: "ok", durationMs: 412 } });

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
            <div
                style={{
                    border: "1px solid var(--ba-color-fg-hint)",
                    marginBottom: 32,
                    padding: "14px 20px",
                }}
            >
                <AppHeader version="0.3.0" context="24 THEMES · 6 COLLECTIONS · ENV DARK" />
            </div>

            <SectionLabel>AppFooter</SectionLabel>
            <div
                style={{
                    border: "1px solid var(--ba-color-fg-hint)",
                    marginBottom: 32,
                    padding: "10px 20px",
                }}
            >
                <AppFooter
                    hints={
                        <>
                            <KeyHint keys="j/k">NAVIGATE</KeyHint>
                            <KeyHint keys="/">SEARCH</KeyHint>
                            <KeyHint keys="⏎">APPLY</KeyHint>
                            <KeyHint keys="q">QUIT</KeyHint>
                        </>
                    }
                    status={<StatusPip intent="ok">READY</StatusPip>}
                />
            </div>

            <SectionLabel>Dialog</SectionLabel>
            <div style={{ marginBottom: 32 }}>
                <Button onClick={() => setDialogOpen(true)}>OPEN FILTERS</Button>
                <Dialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    title="FILTERS"
                    footerLeft="12 THEMES MATCH"
                    footerRight={
                        <>
                            <KeyHint keys="h/l ←→">MOVE</KeyHint> <KeyHint keys="⏎">DONE</KeyHint>
                        </>
                    }
                >
                    <Chip
                        active={collectionValue === "all"}
                        hotkey="1"
                        onClick={() => setCollectionValue("all")}
                    >
                        ALL
                    </Chip>{" "}
                    <Chip
                        active={collectionValue === "jpn"}
                        hotkey="3"
                        onClick={() => setCollectionValue("jpn")}
                    >
                        JPN
                    </Chip>{" "}
                    <Chip
                        active={collectionValue === "terra"}
                        hotkey="4"
                        onClick={() => setCollectionValue("terra")}
                    >
                        TERRA
                    </Chip>
                </Dialog>
            </div>

            <SectionLabel>DisclosurePanel</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                <DisclosurePanel
                    expanded={panelExpanded}
                    onToggle={() => setPanelExpanded((v) => !v)}
                    header={
                        <>
                            <b style={{ width: 110 }}>ghostty</b>
                            <span>~/.config/ghostty/config</span>
                            <StatusPip intent="ok">OK</StatusPip>
                        </>
                    }
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 14,
                            padding: 16,
                        }}
                    >
                        <div>CONFIG_PATH: ~/.config/ghostty/config</div>
                        <div>MATCH_PATTERN: ^theme = .*$</div>
                    </div>
                </DisclosurePanel>
                <DisclosurePanel
                    expanded={false}
                    header={
                        <>
                            <b style={{ width: 110 }}>nvim</b>
                            <span>~/.config/nvim/…</span>
                            <StatusPip intent="ok">OK</StatusPip>
                        </>
                    }
                />
            </div>

            <SectionLabel>Settings — adapters panel</SectionLabel>
            <div
                style={{
                    border: "1px solid var(--ba-color-fg-hint)",
                    marginBottom: 32,
                    padding: "24px 28px",
                    maxWidth: 720,
                }}
            >
                <AdapterRows
                    apps={Object.entries(settingsFixture.apps) as [AppName, AppConfig][]}
                    cursorIndex={settingsCursorIndex}
                    expandedApp={settingsExpandedApp}
                    onToggleEnabled={(appName) => {
                        setSettingsFixture((prev) => ({
                            ...prev,
                            apps: {
                                ...prev.apps,
                                [appName]: {
                                    ...prev.apps[appName],
                                    enabled: prev.apps[appName].enabled === false,
                                },
                            },
                        }));
                    }}
                    onToggleExpanded={(appName) => {
                        setSettingsExpandedApp((current) => (current === appName ? null : appName));
                        setSettingsCursorIndex(
                            Object.keys(settingsFixture.apps).indexOf(appName),
                        );
                    }}
                    onFieldCommit={(appName, field: AdapterField, value) => {
                        setSettingsFixture((prev) => ({
                            ...prev,
                            apps: {
                                ...prev.apps,
                                [appName]: { ...prev.apps[appName], [field]: value },
                            },
                        }));
                    }}
                    onTestApply={(appName) => {
                        setSettingsTestApplyResults((prev) => ({
                            ...prev,
                            [appName]: { status: "running" },
                        }));
                        setTimeout(() => {
                            setSettingsTestApplyResults((prev) => ({
                                ...prev,
                                [appName]: appName === "obsidian"
                                    ? { status: "error", message: "config not found" }
                                    : {
                                        status: "ok",
                                        durationMs: 380 + Math.round(Math.random() * 80),
                                    },
                            }));
                        }, 600);
                    }}
                    testApplyResults={settingsTestApplyResults}
                />
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

            <SectionLabel>ApplyStrip — running</SectionLabel>
            <div
                style={{
                    border: "1px solid var(--ba-color-fg-hint)",
                    marginBottom: 32,
                    padding: "12px 20px",
                }}
            >
                <ApplyStrip themeName="KOYO YORU" results={APPLY_STRIP_FIXTURES.running} />
            </div>

            <SectionLabel>ApplyStrip — success</SectionLabel>
            <div
                style={{
                    border: "1px solid var(--ba-color-fg-hint)",
                    marginBottom: 32,
                    padding: "12px 20px",
                }}
            >
                <ApplyStrip themeName="KOYO YORU" results={APPLY_STRIP_FIXTURES.success} />
            </div>

            <SectionLabel>ApplyStrip — partial failure + retry</SectionLabel>
            <div
                style={{
                    border: "1px solid var(--ba-color-fg-hint)",
                    marginBottom: 32,
                    padding: "12px 20px",
                }}
            >
                <ApplyStrip
                    themeName="KOYO YORU"
                    results={APPLY_STRIP_FIXTURES.partialFailure}
                    onRetryFailed={() => {}}
                />
            </div>

            <SectionLabel>EmptyState — first run, no adapters</SectionLabel>
            <div
                style={{
                    border: "1px solid var(--ba-color-fg-hint)",
                    marginBottom: 32,
                    padding: 28,
                }}
            >
                <EmptyState
                    eyebrow={`${themes.length} THEMES INDEXED · 0 APPLIED`}
                    headline="PICK A LIVERY, PAINT THE COCKPIT"
                    body="Select any theme with j/k and press ⏎ — Livery repaints every enabled tool in one pass. Nothing is written until you apply. No adapters are enabled yet — check settings."
                    onOpenSettings={() => {}}
                />
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
