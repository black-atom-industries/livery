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
    /** Ref to the first input of the expanded row — the "e" hotkey focuses it. */
    firstFieldRef?: React.Ref<HTMLInputElement>;
    className?: string;
};

/**
 * ADAPTERS panel — one DisclosurePanel row per adapter, expand for editable
 * paths. VERIFY PATH is omitted — no backend command exists yet (follow-up
 * issue). TEST APPLY runs the real single-app updater.
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
        firstFieldRef,
    }: RowProps,
) {
    const enabled = appConfig.enabled !== false;

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
                        <span className={styles.path}>{appConfig.config_path}</span>
                        <StatusPip intent={enabled ? "ok" : "off"}>
                            {enabled ? "OK" : "DISABLED"}
                        </StatusPip>
                    </div>
                }
            >
                <FieldGrid
                    appConfig={appConfig}
                    onFieldCommit={onFieldCommit}
                    firstFieldRef={firstFieldRef}
                />
                <ActionRow
                    running={testApplyResult?.status === "running"}
                    onTestApply={onTestApply}
                    testApplyResult={testApplyResult}
                />
            </DisclosurePanel>
        </div>
    );
}

type ActionRowProps = {
    running: boolean;
    onTestApply: () => void;
    testApplyResult?: TestApplyResult;
};

/**
 * VERIFY PATH is intentionally omitted here — there is no backend command
 * for path verification yet (tracked as a follow-up issue).
 */
function ActionRow({ running, onTestApply, testApplyResult }: ActionRowProps) {
    return (
        <div className={styles.actionRow}>
            <Button intent="secondary" onClick={onTestApply} disabled={running}>
                {running ? "TESTING…" : "TEST APPLY"}
            </Button>
            <LastAppliedMeta result={testApplyResult} />
        </div>
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
