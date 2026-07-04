import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useStore } from "@tanstack/react-store";
import { Typo } from "../../../components/typo/index.ts";
import { useConfig } from "../../../queries/use-config.ts";
import { App } from "../../../components/layouts/app.ts";
import { ListRow } from "../../../components/primitives/list-row/list-row.tsx";
import { AdapterRows } from "../../../components/settings/adapter-rows/index.ts";
import { GeneralPanel } from "../../../components/settings/general-panel/index.ts";
import type {
    AdapterField,
    TestApplyResult,
} from "../../../components/settings/adapter-rows/index.ts";
import { commands } from "../../../bindings.ts";
import type { AppConfig, AppName, Config } from "../../../bindings.ts";
import { appStore } from "../../../store/app.ts";
import denoConfig from "../../../../deno.json" with { type: "json" };
import styles from "./route.module.css";

export type SettingsSection = "adapters" | "general";

export const Route = createFileRoute("/_app/settings")({
    validateSearch: (search: Record<string, unknown>): { section: SettingsSection } => ({
        section: search.section === "general" ? "general" : "adapters",
    }),
    component: SettingsRoute,
});

function SettingsRoute() {
    const config = useConfig();
    const navigate = useNavigate();
    const { section } = Route.useSearch();

    const [cursorIndex, setCursorIndex] = useState(0);
    const [expandedApp, setExpandedApp] = useState<AppName | null>(null);
    const firstFieldRef = useRef<HTMLInputElement>(null);
    // Session-local TEST APPLY results — never persisted, starts empty.
    const [testApplyResults, setTestApplyResults] = useState<
        Partial<Record<AppName, TestApplyResult>>
    >({});
    const currentTheme = useStore(appStore, (s) => s.currentTheme);

    const data = config.query.data;
    const appEntries = (data ? Object.entries(data.apps) : []) as [AppName, AppConfig][];
    const rowCount = section === "adapters" ? appEntries.length : 1;
    const clampedCursor = Math.min(cursorIndex, Math.max(0, rowCount - 1));
    const cursoredApp = section === "adapters" ? appEntries[clampedCursor]?.[0] : undefined;
    // The disclosure only ever shows the row under the cursor — moving the
    // cursor off an expanded row implicitly collapses it, no effect needed.
    const effectiveExpandedApp = expandedApp && cursoredApp === expandedApp ? expandedApp : null;

    // Section switches reset the row cursor and any expansion — the two
    // panels don't share a row cursor namespace.
    function setSection(next: SettingsSection) {
        setCursorIndex(0);
        setExpandedApp(null);
        navigate({ to: "/settings", search: { section: next } });
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

    async function testApplyAdapter(appName: AppName) {
        setTestApplyResults((prev) => ({ ...prev, [appName]: { status: "running" } }));
        try {
            const result = await commands.updateApp(appName, {
                theme_key: currentTheme.meta.key,
                appearance: currentTheme.meta.appearance,
                collection_key: currentTheme.meta.collection.key,
                theme_label: currentTheme.meta.label,
            });
            const next: TestApplyResult = result.status === "error"
                ? { status: "error", message: result.message ?? "Unknown error" }
                : { status: "ok", durationMs: result.duration_ms };
            setTestApplyResults((prev) => ({ ...prev, [appName]: next }));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setTestApplyResults((prev) => ({ ...prev, [appName]: { status: "error", message } }));
        }
    }

    function toggleSystemAppearance() {
        if (!data) return;
        const next: Config = { ...data, system_appearance: !data.system_appearance };
        config.save.mutate(next);
    }

    function moveCursor(delta: number) {
        setCursorIndex((i) => Math.min(Math.max(0, rowCount - 1), Math.max(0, i + delta)));
    }

    function toggleCursoredRow() {
        if (section === "adapters") {
            const entry = appEntries[clampedCursor];
            if (entry) toggleAppEnabled(entry[0]);
        } else {
            toggleSystemAppearance();
        }
    }

    function toggleExpandCursoredRow() {
        if (section !== "adapters") return;
        const entry = appEntries[clampedCursor];
        if (!entry) return;
        const [appName] = entry;
        setExpandedApp((current) => (current === appName ? null : appName));
    }

    function focusFirstField() {
        if (section !== "adapters" || !effectiveExpandedApp) return;
        firstFieldRef.current?.focus();
    }

    function handleEscape() {
        if (section === "adapters" && effectiveExpandedApp) {
            setExpandedApp(null);
            return;
        }
        navigate({ to: "/" });
    }

    useHotkey("J", () => moveCursor(1));
    useHotkey("K", () => moveCursor(-1));
    useHotkey("Space", toggleCursoredRow);
    useHotkey("Enter", toggleExpandCursoredRow);
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
                    <ListRow
                        name="GENERAL"
                        selected={section === "general"}
                        onClick={() => setSection("general")}
                    />
                </>
            }
            right={section === "adapters"
                ? (
                    <AdapterRows
                        apps={appEntries}
                        cursorIndex={clampedCursor}
                        expandedApp={effectiveExpandedApp}
                        onToggleEnabled={toggleAppEnabled}
                        onToggleExpanded={(appName) =>
                            setExpandedApp((current) => (current === appName ? null : appName))}
                        onFieldCommit={commitAdapterField}
                        onTestApply={testApplyAdapter}
                        testApplyResults={testApplyResults}
                        firstFieldRef={firstFieldRef}
                    />
                )
                : (
                    <GeneralPanel
                        followOsAppearance={data.system_appearance}
                        onToggleFollowOsAppearance={toggleSystemAppearance}
                        liveryVersion={denoConfig.version}
                        cursored={clampedCursor === 0}
                    />
                )}
        />
    );
}
