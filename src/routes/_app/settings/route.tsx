import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Typo } from "../../../components/typo/index.ts";
import { useConfig } from "../../../queries/use-config.ts";
import { SectionHeader } from "../../../components/primitives/section-header/section-header.tsx";
import { DisclosurePanel } from "../../../components/primitives/disclosure-panel/disclosure-panel.tsx";
import { Toggle } from "../../../components/primitives/toggle/toggle.tsx";
import { KVRow } from "../../../components/primitives/kv-row/kv-row.tsx";
import { StatusPip } from "../../../components/primitives/status-pip/status-pip.tsx";
import type { AppConfig, AppName, Config } from "../../../bindings.ts";
import denoConfig from "../../../../deno.json" with { type: "json" };
import styles from "./route.module.css";

export const Route = createFileRoute("/_app/settings")({
    component: SettingsRoute,
});

function SettingsRoute() {
    const config = useConfig();
    const [expandedApp, setExpandedApp] = useState<AppName | null>(null);

    if (config.query.isPending) {
        return (
            <div className={styles.root}>
                <div className={styles.heading}>
                    <Typo.H2>Settings</Typo.H2>
                </div>
                <Typo.Small color="hint">Loading configuration…</Typo.Small>
            </div>
        );
    }

    if (config.query.isError || !config.query.data) {
        return (
            <div className={styles.root}>
                <div className={styles.heading}>
                    <Typo.H2>Settings</Typo.H2>
                </div>
                <Typo.Small color="hint">
                    Could not load configuration. Is the Livery backend running?
                </Typo.Small>
            </div>
        );
    }

    const data = config.query.data;
    const appEntries = Object.entries(data.apps) as [AppName, AppConfig][];
    const enabledCount = appEntries.filter(([, cfg]) => cfg.enabled !== false).length;

    function toggleAppEnabled(appName: AppName, appConfig: AppConfig) {
        const next: Config = {
            ...data,
            apps: {
                ...data.apps,
                [appName]: { ...appConfig, enabled: appConfig.enabled === false },
            },
        };
        config.save.mutate(next);
    }

    function toggleSystemAppearance() {
        const next: Config = { ...data, system_appearance: !data.system_appearance };
        config.save.mutate(next);
    }

    return (
        <div className={styles.root}>
            <div className={styles.heading}>
                <Typo.H2>Settings</Typo.H2>
            </div>

            <div className={styles.section}>
                <SectionHeader meta={`${appEntries.length} CONFIGURED · ${enabledCount} ENABLED`}>
                    ADAPTERS
                </SectionHeader>
                <div className={styles.panelList}>
                    {appEntries.map(([appName, appConfig]) => {
                        const enabled = appConfig.enabled !== false;
                        const expanded = expandedApp === appName;

                        return (
                            <div key={appName} className={styles.panelRow}>
                                <Toggle
                                    on={enabled}
                                    onChange={() => toggleAppEnabled(appName, appConfig)}
                                />
                                <DisclosurePanel
                                    expanded={expanded}
                                    onToggle={() => setExpandedApp(expanded ? null : appName)}
                                    className={styles.panel}
                                    header={
                                        <div className={styles.panelHeader}>
                                            <span className={styles.appName}>{appName}</span>
                                            <span className={styles.appPath}>
                                                {appConfig.config_path}
                                            </span>
                                            <StatusPip intent={enabled ? "ok" : "off"}>
                                                {enabled ? "ENABLED" : "DISABLED"}
                                            </StatusPip>
                                        </div>
                                    }
                                >
                                    <div className={styles.fieldGrid}>
                                        <KVRow label="CONFIG_PATH">{appConfig.config_path}</KVRow>
                                        {appConfig.themes_path
                                            ? (
                                                <KVRow label="THEMES_PATH · OPTIONAL">
                                                    {appConfig.themes_path}
                                                </KVRow>
                                            )
                                            : null}
                                        {appConfig.match_pattern
                                            ? (
                                                <KVRow label="MATCH_PATTERN">
                                                    {appConfig.match_pattern}
                                                </KVRow>
                                            )
                                            : null}
                                        {appConfig.replace_template
                                            ? (
                                                <KVRow label="REPLACE_TEMPLATE">
                                                    {appConfig.replace_template}
                                                </KVRow>
                                            )
                                            : null}
                                    </div>
                                </DisclosurePanel>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={styles.section}>
                <SectionHeader>GENERAL</SectionHeader>
                <div className={styles.toggleRow}>
                    <Toggle on={data.system_appearance} onChange={toggleSystemAppearance} />
                    <div className={styles.toggleCopy}>
                        <span className={styles.toggleLabel}>FOLLOW OS APPEARANCE</span>
                        <Typo.Small color="hint">
                            Switch between a paired light/dark theme when the OS appearance changes.
                        </Typo.Small>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <SectionHeader>SYSTEM</SectionHeader>
                <div className={styles.fieldGrid}>
                    <KVRow label="LIVERY">{denoConfig.version}</KVRow>
                </div>
            </div>
        </div>
    );
}
