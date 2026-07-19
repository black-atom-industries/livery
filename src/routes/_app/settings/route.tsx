import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useStore } from "@tanstack/react-store";
import { themeMap } from "@black-atom/core";
import { Typo } from "../../../components/typo/index.ts";
import { useConfig } from "../../../queries/use-config.ts";
import { useThemesStatus } from "../../../queries/use-themes-status.ts";
import {
    downloadableApps,
    type DownloadRowResult,
    downloadThemes,
    latestFetchedAtEpoch,
} from "../../../lib/theme-downloads.ts";
import { pickRandomOtherTheme } from "../../../lib/themes.ts";
import { App } from "../../../components/layouts/app.ts";
import { ListRow } from "../../../components/primitives/list-row/list-row.tsx";
import { AdapterNav } from "../../../components/settings/adapter-nav/index.ts";
import {
    type AdapterField,
    adapterSettingsPages,
} from "../../../components/settings/adapter-pages/index.ts";
import { GeneralPanel } from "../../../components/settings/general-panel/index.ts";
import type {
    LinkThemesRowResult,
    TestApplyResult,
    VerifyPathResult,
} from "../../../components/settings/adapter-shared/index.ts";
import { commands } from "../../../bindings.ts";
import type {
    AdapterThemesStatus,
    AppConfig,
    AppName,
    Config,
    ThemeProvisioning,
} from "../../../bindings.ts";
import { openUrl } from "@tauri-apps/plugin-opener";
import { setUpAdapter, type SetUpOutcome } from "../../../lib/adapter-setup.ts";
import { appStore } from "../../../store/app.ts";
import denoConfig from "../../../../deno.json" with { type: "json" };
import styles from "./route.module.css";

export type SettingsSection = "adapters" | "general";

const APP_NAMES: readonly AppName[] = [
    "nvim",
    "ghostty",
    "helm",
    "delta",
    "tmux",
    "zed",
    "lazygit",
    "obsidian",
];

function isAppName(value: unknown): value is AppName {
    return typeof value === "string" && (APP_NAMES as readonly string[]).includes(value);
}

/** How long a TEST APPLY probe theme stays applied before reverting. */
const TEST_APPLY_REVERT_DELAY_MS = 3000;

export const Route = createFileRoute("/_app/settings")({
    validateSearch: (
        search: Record<string, unknown>,
    ): { section: SettingsSection; adapter?: AppName } => ({
        section: search.section === "general" ? "general" : "adapters",
        adapter: isAppName(search.adapter) ? search.adapter : undefined,
    }),
    component: SettingsRoute,
});

function SettingsRoute() {
    const config = useConfig();
    const navigate = useNavigate();
    const { section, adapter } = Route.useSearch();

    const firstFieldRef = useRef<HTMLInputElement>(null);
    const selectedRowRef = useRef<HTMLDivElement>(null);
    const detailPaneRef = useRef<HTMLDivElement>(null);
    // Session-local TEST APPLY results — never persisted, starts empty.
    const [testApplyResults, setTestApplyResults] = useState<
        Partial<Record<AppName, TestApplyResult>>
    >({});
    // Session-local VERIFY PATH results — same lifetime as test applies.
    const [verifyPathResults, setVerifyPathResults] = useState<
        Partial<Record<AppName, VerifyPathResult>>
    >({});
    // Session-local SYNC THEMES results — same runner as the first-run greeting.
    const themesStatus = useThemesStatus();
    const [syncResults, setSyncResults] = useState<DownloadRowResult[] | null>(null);
    const [syncing, setSyncing] = useState(false);
    // Session-local LINK THEMES results per adapter.
    const [linkThemesResults, setLinkThemesResults] = useState<
        Partial<Record<AppName, LinkThemesRowResult>>
    >({});
    const currentTheme = useStore(appStore, (s) => s.currentTheme);

    // Linked adapters (symlink placement) — drives LINK THEMES visibility.
    const adapterEntries = Object.entries(themesStatus.query.data?.adapters ?? {}) as [
        AppName,
        AdapterThemesStatus,
    ][];
    const linkableApps = new Set(
        adapterEntries
            .filter(([, status]) => status.provisioning === "linked")
            .map(([name]) => name),
    );
    const provisioningByApp = Object.fromEntries(
        adapterEntries.map(([name, status]) => [name, status.provisioning]),
    ) as Partial<Record<AppName, ThemeProvisioning>>;

    // AUTO-DETECT scan — session-local, null until the first run.
    const [detecting, setDetecting] = useState(false);
    const [detections, setDetections] = useState<Partial<Record<AppName, boolean>> | null>(null);
    const [detectError, setDetectError] = useState<string | null>(null);
    const [setUpResults, setSetUpResults] = useState<Partial<Record<AppName, SetUpOutcome>>>({});

    const detectedApps = detections
        ? new Set(
            (Object.entries(detections) as [AppName, boolean][])
                .filter(([, found]) => found)
                .map(([name]) => name),
        )
        : null;

    async function autoDetectApps() {
        if (detecting) return;
        setDetecting(true);
        try {
            const results = await commands.detectApps();
            setDetections(Object.fromEntries(results.map((d) => [d.app, d.found])));
            setDetectError(null);
        } catch (error) {
            // A failed scan must never read as "scanned, found nothing".
            setDetections(null);
            setDetectError(error instanceof Error ? error.message : String(error));
        } finally {
            setDetecting(false);
        }
    }

    /** SET UP — the class-appropriate chain, ending in the page's verify state. */
    async function setUpAdapterRow(appName: AppName) {
        const current = config.query.data;
        const provisioningClass = provisioningByApp[appName];
        if (!current || !provisioningClass) return;

        const outcome = await setUpAdapter(
            appName,
            provisioningClass,
            current.apps[appName]?.config_path ?? "",
            {
                enable: async (app) => {
                    const latest = config.query.data;
                    if (!latest) throw new Error("Config not loaded");
                    if (latest.apps[app]?.enabled) return;
                    const next: Config = {
                        ...latest,
                        apps: {
                            ...latest.apps,
                            [app]: { ...latest.apps[app], enabled: true },
                        },
                    };
                    const result = await config.save.mutateAsync(next);
                    if (result.status === "error") throw new Error(result.error);
                },
                download: (app) => commands.downloadTheme(app),
                link: (app) => commands.linkAppThemes(app),
                verify: (app) => commands.verifyAppPath(app),
            },
            (partial) => setSetUpResults((prev) => ({ ...prev, [appName]: partial })),
        );
        // SET UP's own result line narrates the whole chain (including link
        // count and verify state via outcome.link/outcome.verify) — it does
        // not cross-populate the VERIFY PATH / LINK THEMES rows below, which
        // only reflect a direct run of those actions.
        setSetUpResults((prev) => ({ ...prev, [appName]: outcome }));
        themesStatus.query.refetch();
    }

    async function linkAppThemes(appName: AppName) {
        setLinkThemesResults((prev) => ({ ...prev, [appName]: { status: "running" } }));
        try {
            const result = await commands.linkAppThemes(appName);
            const next: LinkThemesRowResult = result.status === "done"
                ? {
                    status: "ok",
                    linked: result.linked ?? 0,
                    pruned: result.pruned ?? 0,
                    message: result.message ?? null,
                }
                : { status: "error", message: result.message ?? "Unknown error" };
            setLinkThemesResults((prev) => ({ ...prev, [appName]: next }));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setLinkThemesResults((prev) => ({
                ...prev,
                [appName]: { status: "error", message },
            }));
        }
    }

    async function syncThemes() {
        if (syncing) return;
        setSyncing(true);
        try {
            let adapters = themesStatus.query.data?.adapters;
            if (!adapters) adapters = (await themesStatus.query.refetch()).data?.adapters;
            if (!adapters) return;
            await downloadThemes(downloadableApps(adapters), setSyncResults);
        } finally {
            setSyncing(false);
            themesStatus.query.refetch();
        }
    }

    const data = config.query.data;
    const appEntries = (data ? Object.entries(data.apps) : []) as [AppName, AppConfig][];

    // `?adapter` is the single source of truth for selection — no separate
    // cursor state to desync from it. Missing/invalid resolves to the first
    // configured adapter so the detail pane never renders empty.
    const selectedApp = section === "adapters"
        ? (adapter && appEntries.some(([name]) => name === adapter) ? adapter : appEntries[0]?.[0])
        : undefined;
    const cursorIndex = selectedApp
        ? Math.max(0, appEntries.findIndex(([name]) => name === selectedApp))
        : 0;

    function setSection(next: SettingsSection) {
        navigate({ to: "/settings", search: { section: next } });
    }

    function selectAdapter(appName: AppName) {
        navigate({
            to: "/settings",
            search: { section: "adapters", adapter: appName },
            replace: true,
        });
    }

    function toggleAppEnabled(appName: AppName) {
        if (!data) return;
        const appConfig = data.apps[appName];
        const next: Config = {
            ...data,
            apps: {
                ...data.apps,
                [appName]: { ...appConfig, enabled: appConfig.enabled === false },
            },
        };
        config.save.mutate(next);
    }

    function commitAdapterField(appName: AppName, field: AdapterField, value: string) {
        if (!data) return;
        const appConfig = data.apps[appName];
        const next: Config = {
            ...data,
            apps: {
                ...data.apps,
                [appName]: { ...appConfig, [field]: value },
            },
        };
        config.save.mutate(next);
    }

    /**
     * TEST APPLY — applies a random *other* theme so the change is visible,
     * then reverts to the theme active before the test after a short delay.
     * Reverting is silent (the row just clears) — the steady state after a
     * test is "back to normal", not "still showing a stale test result".
     */
    async function testApplyAdapter(appName: AppName) {
        const before = currentTheme;
        const probe = pickRandomOtherTheme(themeMap, before.meta.key);
        if (!probe) return;

        setTestApplyResults((prev) => ({ ...prev, [appName]: { status: "running" } }));
        try {
            const result = await commands.updateApp(appName, {
                theme_key: probe.meta.key,
                appearance: probe.meta.appearance,
                collection_key: probe.meta.collection.key,
                theme_label: probe.meta.label,
            });
            if (result.status === "error") {
                setTestApplyResults((prev) => ({
                    ...prev,
                    [appName]: { status: "error", message: result.message ?? "Unknown error" },
                }));
                return;
            }
            setTestApplyResults((prev) => ({
                ...prev,
                [appName]: {
                    status: "ok",
                    durationMs: result.duration_ms,
                    testedThemeLabel: probe.meta.label,
                },
            }));

            setTimeout(async () => {
                setTestApplyResults((prev) => ({ ...prev, [appName]: { status: "reverting" } }));
                try {
                    await commands.updateApp(appName, {
                        theme_key: before.meta.key,
                        appearance: before.meta.appearance,
                        collection_key: before.meta.collection.key,
                        theme_label: before.meta.label,
                    });
                } finally {
                    setTestApplyResults((prev) => {
                        const { [appName]: _discard, ...rest } = prev;
                        return rest;
                    });
                }
            }, TEST_APPLY_REVERT_DELAY_MS);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setTestApplyResults((prev) => ({ ...prev, [appName]: { status: "error", message } }));
        }
    }

    async function verifyAdapterPath(appName: AppName) {
        setVerifyPathResults((prev) => ({ ...prev, [appName]: { status: "running" } }));
        try {
            const result = await commands.verifyAppPath(appName);
            const next: VerifyPathResult = result.message != null
                ? { status: "unverifiable", message: result.message }
                : {
                    status: "verified",
                    exists: result.exists,
                    patternMatches: result.pattern_matches,
                };
            setVerifyPathResults((prev) => ({ ...prev, [appName]: next }));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setVerifyPathResults((prev) => ({
                ...prev,
                [appName]: { status: "unverifiable", message },
            }));
        }
    }

    function toggleSystemAppearance() {
        if (!data) return;
        const next: Config = { ...data, system_appearance: !data.system_appearance };
        config.save.mutate(next);
    }

    function moveSelection(delta: number) {
        if (section !== "adapters") return;
        const nextIndex = Math.min(Math.max(0, appEntries.length - 1), cursorIndex + delta);
        const entry = appEntries[nextIndex];
        if (entry) selectAdapter(entry[0]);
    }

    function toggleSelected() {
        if (section === "adapters") {
            if (selectedApp) toggleAppEnabled(selectedApp);
        } else {
            toggleSystemAppearance();
        }
    }

    function focusFirstField() {
        if (section !== "adapters" || !selectedApp) return;
        firstFieldRef.current?.focus();
    }

    /**
     * Global fallback — only reached when focus isn't inside the detail
     * pane (the pane's own capture-phase handler intercepts Escape first
     * and returns focus to the sidebar instead of navigating).
     */
    function handleEscape() {
        if (detailPaneRef.current?.contains(document.activeElement)) return;
        navigate({ to: "/" });
    }

    useHotkey("J", () => moveSelection(1));
    useHotkey("K", () => moveSelection(-1));
    useHotkey("Space", toggleSelected);
    useHotkey("Enter", focusFirstField);
    useHotkey("E", focusFirstField);
    useHotkey("Escape", handleEscape);

    if (config.query.isPending) {
        return (
            <div className={styles.root}>
                <Typo.Small color="hint">Loading configuration…</Typo.Small>
            </div>
        );
    }

    if (config.query.isError || !data) {
        return (
            <div className={styles.root}>
                <Typo.Small color="hint">
                    Could not load configuration. Is the Livery backend running?
                </Typo.Small>
            </div>
        );
    }

    const selectedConfig = selectedApp ? data.apps[selectedApp] : undefined;
    const AdapterSettings = selectedApp ? adapterSettingsPages[selectedApp] : undefined;

    return (
        <App.SplitPanel
            left={
                <>
                    <ListRow name="THEMES" onClick={() => navigate({ to: "/" })} />
                    <ListRow
                        name="ADAPTERS"
                        selected={section === "adapters"}
                        onClick={() => setSection("adapters")}
                    />
                    {section === "adapters" && (
                        <AdapterNav
                            apps={appEntries}
                            selectedApp={selectedApp}
                            onSelect={selectAdapter}
                            detectedApps={detectedApps}
                            detecting={detecting}
                            onAutoDetect={autoDetectApps}
                            detectError={detectError}
                            verifyPathResults={verifyPathResults}
                            selectedRowRef={selectedRowRef}
                        />
                    )}
                    <ListRow
                        name="GENERAL"
                        selected={section === "general"}
                        onClick={() => setSection("general")}
                    />
                </>
            }
            right={section === "adapters"
                ? (selectedApp && selectedConfig && AdapterSettings
                    ? (
                        <div
                            ref={detailPaneRef}
                            onKeyDownCapture={(event) => {
                                // Escape on a clean/blurred field: return
                                // focus to the sidebar instead of letting
                                // the global Escape hotkey navigate back.
                                // A dirty field's own handler reverts and
                                // stops propagation before this ever runs.
                                if (event.key !== "Escape") return;
                                event.stopPropagation();
                                selectedRowRef.current?.focus();
                            }}
                        >
                            <AdapterSettings
                                appConfig={selectedConfig}
                                detected={detectedApps?.has(selectedApp) ?? false}
                                onToggleEnabled={() => toggleAppEnabled(selectedApp)}
                                onFieldCommit={(field, value) =>
                                    commitAdapterField(selectedApp, field, value)}
                                firstFieldRef={firstFieldRef}
                                onOpenUrl={(url) => {
                                    openUrl(url).catch((error) => console.error(error));
                                }}
                                onSetUp={() => setUpAdapterRow(selectedApp)}
                                setUpResult={setUpResults[selectedApp]}
                                onVerifyPath={() => verifyAdapterPath(selectedApp)}
                                verifyPathResult={verifyPathResults[selectedApp]}
                                linkable={linkableApps.has(selectedApp)}
                                onLinkThemes={() => linkAppThemes(selectedApp)}
                                linkThemesResult={linkThemesResults[selectedApp]}
                                onTestApply={() => testApplyAdapter(selectedApp)}
                                testApplyResult={testApplyResults[selectedApp]}
                            />
                        </div>
                    )
                    : null)
                : (
                    <GeneralPanel
                        followOsAppearance={data.system_appearance}
                        onToggleFollowOsAppearance={toggleSystemAppearance}
                        liveryVersion={denoConfig.version}
                        themesLastSyncedEpoch={latestFetchedAtEpoch(
                            themesStatus.query.data?.adapters ?? {},
                        )}
                        syncResults={syncResults}
                        syncing={syncing}
                        onSyncThemes={syncThemes}
                        cursored
                    />
                )}
        />
    );
}
