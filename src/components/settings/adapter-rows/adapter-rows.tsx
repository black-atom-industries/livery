import { useEffect, useState } from "react";
import type { AppConfig, AppName } from "../../../bindings.ts";
import { SectionHeader } from "../../primitives/section-header/section-header.tsx";
import { DisclosurePanel } from "../../primitives/disclosure-panel/disclosure-panel.tsx";
import { Toggle } from "../../primitives/toggle/toggle.tsx";
import { StatusPip } from "../../primitives/status-pip/status-pip.tsx";
import { TextInput } from "../../primitives/text-input/text-input.tsx";
import { Button } from "../../primitives/button/button.tsx";
import styles from "./adapter-rows.module.css";

export type AdapterField = "config_path" | "themes_path" | "match_pattern" | "replace_template";

/** Session-local result of a "TEST APPLY" run — never persisted. */
export type TestApplyResult =
    | { status: "running" }
    | { status: "ok"; durationMs: number | null }
    | { status: "error"; message: string };

/** Session-local result of a "VERIFY PATH" run — never persisted. */
export type VerifyPathResult =
    | { status: "running" }
    | { status: "verified"; exists: boolean; patternMatches: boolean | null }
    | { status: "unverifiable"; message: string };

/** Session-local result of a "LINK THEMES" run — never persisted. */
export type LinkThemesRowResult =
    | { status: "running" }
    | { status: "ok"; linked: number; pruned: number; message: string | null }
    | { status: "error"; message: string };

/** The qualifier a verify fault puts on the row, or null when all clear. */
function verifyFaultLabel(result?: VerifyPathResult): string | null {
    if (!result) return null;
    if (result.status === "unverifiable") return "UNVERIFIABLE";
    if (result.status !== "verified") return null;
    if (!result.exists) return "PATH NOT FOUND";
    if (result.patternMatches === false) return "NO PATTERN MATCH";
    return null;
}

type Props = {
    apps: [AppName, AppConfig][];
    /** Currently cursored row (j/k navigation), independent of expansion. */
    cursorIndex: number;
    /** The one adapter expanded at a time, or null. */
    expandedApp: AppName | null;
    onToggleEnabled: (appName: AppName) => void;
    onToggleExpanded: (appName: AppName) => void;
    onFieldCommit: (appName: AppName, field: AdapterField, value: string) => void;
    /** Runs the real single-app update for the expanded adapter (TEST APPLY). */
    onTestApply: (appName: AppName) => void;
    /** Session-local last-applied result per app — starts empty, fills after a test apply. */
    testApplyResults?: Partial<Record<AppName, TestApplyResult>>;
    /** Checks config_path existence + match_pattern hit (VERIFY PATH). */
    onVerifyPath: (appName: AppName) => void;
    /** Session-local verification result per app — a fault puts a CHECK qualifier on the row. */
    verifyPathResults?: Partial<Record<AppName, VerifyPathResult>>;
    /** Adapters wired via managed symlinks (zed, ghostty) — shows LINK THEMES. */
    linkableApps?: ReadonlySet<AppName>;
    /** Symlinks the adapter's themes dir to the managed downloads (LINK THEMES). */
    onLinkThemes: (appName: AppName) => void;
    /** Session-local link result per app. */
    linkThemesResults?: Partial<Record<AppName, LinkThemesRowResult>>;
    /** Ref to the first input of the expanded row — the "e" hotkey focuses it. */
    firstFieldRef?: React.Ref<HTMLInputElement>;
    className?: string;
};

/**
 * ADAPTERS panel — one DisclosurePanel row per adapter, expand for editable
 * paths. VERIFY PATH checks the config_path read-only; TEST APPLY runs the
 * real single-app updater.
 */
export function AdapterRows(
    {
        apps,
        cursorIndex,
        expandedApp,
        onToggleEnabled,
        onToggleExpanded,
        onFieldCommit,
        onTestApply,
        testApplyResults,
        onVerifyPath,
        verifyPathResults,
        linkableApps,
        onLinkThemes,
        linkThemesResults,
        firstFieldRef,
        className,
    }: Props,
) {
    const enabledCount = apps.filter(([, cfg]) => cfg.enabled !== false).length;

    return (
        <div className={[styles.root, className].filter(Boolean).join(" ")}>
            <SectionHeader meta={`${apps.length} CONFIGURED · ${enabledCount} ENABLED`}>
                ADAPTERS
            </SectionHeader>
            <div className={styles.rows}>
                {apps.map(([appName, appConfig], index) => (
                    <AdapterRow
                        key={appName}
                        appName={appName}
                        appConfig={appConfig}
                        cursored={index === cursorIndex}
                        expanded={expandedApp === appName}
                        onToggleEnabled={() => onToggleEnabled(appName)}
                        onToggleExpanded={() => onToggleExpanded(appName)}
                        onFieldCommit={(field, value) => onFieldCommit(appName, field, value)}
                        onTestApply={() => onTestApply(appName)}
                        testApplyResult={testApplyResults?.[appName]}
                        onVerifyPath={() => onVerifyPath(appName)}
                        verifyPathResult={verifyPathResults?.[appName]}
                        linkable={linkableApps?.has(appName) ?? false}
                        onLinkThemes={() => onLinkThemes(appName)}
                        linkThemesResult={linkThemesResults?.[appName]}
                        firstFieldRef={expandedApp === appName ? firstFieldRef : undefined}
                    />
                ))}
            </div>
        </div>
    );
}

type RowProps = {
    appName: AppName;
    appConfig: AppConfig;
    cursored: boolean;
    expanded: boolean;
    onToggleEnabled: () => void;
    onToggleExpanded: () => void;
    onFieldCommit: (field: AdapterField, value: string) => void;
    onTestApply: () => void;
    testApplyResult?: TestApplyResult;
    onVerifyPath: () => void;
    verifyPathResult?: VerifyPathResult;
    linkable: boolean;
    onLinkThemes: () => void;
    linkThemesResult?: LinkThemesRowResult;
    firstFieldRef?: React.Ref<HTMLInputElement>;
};

function AdapterRow(
    {
        appName,
        appConfig,
        cursored,
        expanded,
        onToggleEnabled,
        onToggleExpanded,
        onFieldCommit,
        onTestApply,
        testApplyResult,
        onVerifyPath,
        verifyPathResult,
        linkable,
        onLinkThemes,
        linkThemesResult,
        firstFieldRef,
    }: RowProps,
) {
    const enabled = appConfig.enabled !== false;
    const fault = verifyFaultLabel(verifyPathResult);

    return (
        <div className={cursored ? `${styles.rowSlot} ${styles.rowSlotCursored}` : styles.rowSlot}>
            <DisclosurePanel
                expanded={expanded}
                onToggle={onToggleExpanded}
                className={styles.panel}
                leading={<Toggle on={enabled} onChange={onToggleEnabled} />}
                header={
                    <div className={styles.header}>
                        <span className={enabled ? styles.nameEnabled : styles.name}>
                            {appName}
                        </span>
                        <span className={styles.pathGroup}>
                            <span className={styles.path}>{appConfig.config_path}</span>
                            {fault && <span className={styles.pathFault}>— {fault}</span>}
                        </span>
                        {enabled && fault
                            ? <StatusPip intent="warn">CHECK</StatusPip>
                            : (
                                <StatusPip intent={enabled ? "ok" : "off"}>
                                    {enabled ? "OK" : "DISABLED"}
                                </StatusPip>
                            )}
                    </div>
                }
            >
                <FieldGrid
                    appConfig={appConfig}
                    onFieldCommit={onFieldCommit}
                    firstFieldRef={firstFieldRef}
                />
                <ActionRow
                    testRunning={testApplyResult?.status === "running"}
                    verifyRunning={verifyPathResult?.status === "running"}
                    onTestApply={onTestApply}
                    onVerifyPath={onVerifyPath}
                    testApplyResult={testApplyResult}
                    verifyPathResult={verifyPathResult}
                    linkable={linkable}
                    onLinkThemes={onLinkThemes}
                    linkThemesResult={linkThemesResult}
                />
            </DisclosurePanel>
        </div>
    );
}

type ActionRowProps = {
    testRunning: boolean;
    verifyRunning: boolean;
    onTestApply: () => void;
    onVerifyPath: () => void;
    testApplyResult?: TestApplyResult;
    verifyPathResult?: VerifyPathResult;
    linkable: boolean;
    onLinkThemes: () => void;
    linkThemesResult?: LinkThemesRowResult;
};

function ActionRow(
    {
        testRunning,
        verifyRunning,
        onTestApply,
        onVerifyPath,
        testApplyResult,
        verifyPathResult,
        linkable,
        onLinkThemes,
        linkThemesResult,
    }: ActionRowProps,
) {
    const linkRunning = linkThemesResult?.status === "running";

    return (
        <div className={styles.actionRow}>
            <Button intent="primary" onClick={onVerifyPath} disabled={verifyRunning}>
                {verifyRunning ? "VERIFYING…" : "VERIFY PATH"}
            </Button>
            {linkable && (
                <Button intent="secondary" onClick={onLinkThemes} disabled={linkRunning}>
                    {linkRunning ? "LINKING…" : "LINK THEMES"}
                </Button>
            )}
            <Button intent="secondary" onClick={onTestApply} disabled={testRunning}>
                {testRunning ? "TESTING…" : "TEST APPLY"}
            </Button>
            <span className={styles.metas}>
                <VerifyPathMeta result={verifyPathResult} />
                <LinkThemesMeta result={linkThemesResult} />
                <LastAppliedMeta result={testApplyResult} />
            </span>
        </div>
    );
}

/** Link verdict: counts on success, reason on failure. */
function LinkThemesMeta({ result }: { result?: LinkThemesRowResult }) {
    if (!result || result.status === "running") return null;

    if (result.status === "error") {
        return <span className={styles.lastAppliedError}>LINK FAILED — {result.message}</span>;
    }

    return (
        <span className={styles.lastAppliedOk}>
            {result.linked} LINKED{result.pruned > 0 ? ` · ${result.pruned} PRUNED` : ""}
            {result.message ? ` · ${result.message.toUpperCase()}` : ""}
        </span>
    );
}

/**
 * Verification verdict for the meta line. A fault repeats the header
 * qualifier; "unverifiable" carries the reason so the button is never
 * a dead control.
 */
function VerifyPathMeta({ result }: { result?: VerifyPathResult }) {
    if (!result || result.status === "running") return null;

    if (result.status === "unverifiable") {
        return <span className={styles.verifyFault}>UNVERIFIABLE — {result.message}</span>;
    }

    const fault = verifyFaultLabel(result);
    if (fault) return <span className={styles.verifyFault}>{fault}</span>;

    return (
        <span className={styles.verifyOk}>
            PATH OK{result.patternMatches === true ? " · PATTERN OK" : ""}
        </span>
    );
}

function LastAppliedMeta({ result }: { result?: TestApplyResult }) {
    if (!result || result.status === "running") return null;

    if (result.status === "error") {
        return (
            <span className={styles.lastAppliedError}>
                FAILED — {result.message}
            </span>
        );
    }

    const duration = result.durationMs === null ? "—" : `${result.durationMs} MS`;
    return (
        <span className={styles.lastAppliedOk}>
            APPLIED {duration} · OK
        </span>
    );
}

type FieldGridProps = {
    appConfig: AppConfig;
    onFieldCommit: (field: AdapterField, value: string) => void;
    firstFieldRef?: React.Ref<HTMLInputElement>;
};

function FieldGrid({ appConfig, onFieldCommit, firstFieldRef }: FieldGridProps) {
    return (
        <div className={styles.fieldGrid}>
            <DraftField
                label="CONFIG_PATH"
                value={appConfig.config_path}
                onCommit={(value) => onFieldCommit("config_path", value)}
                inputRef={firstFieldRef}
            />
            <DraftField
                label="THEMES_PATH"
                optional
                value={appConfig.themes_path ?? ""}
                onCommit={(value) => onFieldCommit("themes_path", value)}
            />
            <DraftField
                label="MATCH_PATTERN"
                value={appConfig.match_pattern ?? ""}
                onCommit={(value) => onFieldCommit("match_pattern", value)}
            />
            <DraftField
                label="REPLACE_TEMPLATE"
                value={appConfig.replace_template ?? ""}
                onCommit={(value) => onFieldCommit("replace_template", value)}
            />
        </div>
    );
}

type DraftFieldProps = {
    label: string;
    value: string;
    optional?: boolean;
    onCommit: (value: string) => void;
    inputRef?: React.Ref<HTMLInputElement>;
};

/**
 * TextInput with per-field draft state — persists through the whole-Config
 * save mutation on Enter or blur, not on every keystroke.
 *
 * Escape hierarchy: while a field is focused/dirty, Escape reverts the
 * draft to the last saved value and stops propagation — it does NOT
 * collapse the row. A second Escape (field is clean, focus leaves the
 * input) reaches the route's handler, which collapses the row; a third
 * Escape navigates back. Revert-before-collapse-before-back.
 */
function DraftField({ label, value, optional, onCommit, inputRef }: DraftFieldProps) {
    const [draft, setDraft] = useState(value);
    const [focused, setFocused] = useState(false);

    // Config prop changed underneath us (e.g. save from another field
    // resolved, or the row was reopened) — resync the draft.
    useEffect(() => {
        setDraft(value);
    }, [value]);

    function commit() {
        setFocused(false);
        if (draft !== value) onCommit(draft);
    }

    const editing = focused || draft !== value;

    return (
        <TextInput
            label={label}
            optional={optional}
            value={draft}
            editing={editing}
            hint={editing ? "⏎ SAVE · esc REVERT" : undefined}
            onChange={setDraft}
            onFocus={() => setFocused(true)}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.currentTarget.blur();
                } else if (event.key === "Escape") {
                    if (draft !== value) {
                        // Dirty: first Escape reverts and stays put —
                        // swallow it before the route-level Escape
                        // hotkey (collapse/back) can see it.
                        event.preventDefault();
                        event.stopPropagation();
                        setDraft(value);
                    } else {
                        // Clean: nothing left to revert, hand off to the
                        // route hierarchy (collapse row, then back).
                        event.currentTarget.blur();
                    }
                }
            }}
            inputRef={inputRef}
        />
    );
}
