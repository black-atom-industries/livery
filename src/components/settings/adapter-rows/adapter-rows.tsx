import { useEffect, useState } from "react";
import type { AppConfig, AppName } from "../../../bindings.ts";
import { SectionHeader } from "../../primitives/section-header/section-header.tsx";
import { DisclosurePanel } from "../../primitives/disclosure-panel/disclosure-panel.tsx";
import { Toggle } from "../../primitives/toggle/toggle.tsx";
import { StatusPip } from "../../primitives/status-pip/status-pip.tsx";
import { TextInput } from "../../primitives/text-input/text-input.tsx";
import styles from "./adapter-rows.module.css";

export type AdapterField = "config_path" | "themes_path" | "match_pattern" | "replace_template";

type Props = {
    apps: [AppName, AppConfig][];
    /** Currently cursored row (j/k navigation), independent of expansion. */
    cursorIndex: number;
    /** The one adapter expanded at a time, or null. */
    expandedApp: AppName | null;
    onToggleEnabled: (appName: AppName) => void;
    onToggleExpanded: (appName: AppName) => void;
    onFieldCommit: (appName: AppName, field: AdapterField, value: string) => void;
    /** Ref to the first input of the expanded row — the "e" hotkey focuses it. */
    firstFieldRef?: React.Ref<HTMLInputElement>;
    className?: string;
};

/**
 * ADAPTERS panel — one DisclosurePanel row per adapter, expand for editable
 * paths. No per-tool layouts; VERIFY PATH / TEST APPLY / LAST APPLIED are
 * omitted (no backend support).
 */
export function AdapterRows(
    {
        apps,
        cursorIndex,
        expandedApp,
        onToggleEnabled,
        onToggleExpanded,
        onFieldCommit,
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
                header={
                    <div className={styles.header}>
                        <Toggle on={enabled} onChange={onToggleEnabled} />
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
            </DisclosurePanel>
        </div>
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
 */
function DraftField({ label, value, optional, onCommit, inputRef }: DraftFieldProps) {
    const [draft, setDraft] = useState(value);

    // Config prop changed underneath us (e.g. save from another field
    // resolved, or the row was reopened) — resync the draft.
    useEffect(() => {
        setDraft(value);
    }, [value]);

    function commit() {
        if (draft !== value) onFieldCommit(draft);
    }

    function onFieldCommit(next: string) {
        onCommit(next);
    }

    return (
        <TextInput
            label={label}
            optional={optional}
            value={draft}
            onChange={setDraft}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.currentTarget.blur();
                }
            }}
            inputRef={inputRef}
        />
    );
}
