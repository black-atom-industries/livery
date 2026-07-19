import type { AppConfig, AppName } from "../../../bindings.ts";
import { ListRow } from "../../primitives/list-row/list-row.tsx";
import { StatusPip } from "../../primitives/status-pip/status-pip.tsx";
import { Button } from "../../primitives/button/button.tsx";
import type { VerifyPathResult } from "../adapter-shared/results.ts";
import { verifyFaultLabel } from "../adapter-shared/results.ts";
import styles from "./adapter-nav.module.css";

type Props = {
    apps: [AppName, AppConfig][];
    selectedApp?: AppName;
    onSelect: (appName: AppName) => void;
    detectedApps?: ReadonlySet<AppName> | null;
    detecting: boolean;
    onAutoDetect: () => void;
    detectError: string | null;
    verifyPathResults?: Partial<Record<AppName, VerifyPathResult>>;
    /** Ref to the selected row's element — Escape from the detail pane
        returns focus here before it would navigate back. */
    selectedRowRef?: React.Ref<HTMLDivElement>;
};

/** Left-panel adapter list — one row per adapter, AUTO-DETECT toolbar
    above. Selection drives which adapter's page renders on the right. */
export function AdapterNav(
    {
        apps,
        selectedApp,
        onSelect,
        detectedApps,
        detecting,
        onAutoDetect,
        detectError,
        verifyPathResults,
        selectedRowRef,
    }: Props,
) {
    return (
        <div className={styles.root}>
            <div className={styles.detectBar}>
                <Button intent="secondary" onClick={onAutoDetect} disabled={detecting}>
                    {detecting ? "DETECTING…" : "AUTO-DETECT"}
                </Button>
                {detectError
                    ? <span className={styles.detectError}>DETECT FAILED</span>
                    : detectedApps
                    ? <span className={styles.detectMeta}>{detectedApps.size} FOUND</span>
                    : null}
            </div>
            {apps.map(([appName, appConfig]) => {
                const enabled = appConfig.enabled !== false;
                const fault = verifyFaultLabel(verifyPathResults?.[appName]);
                const detected = detectedApps?.has(appName) ?? false;

                return (
                    <ListRow
                        key={appName}
                        name={appName}
                        selected={selectedApp === appName}
                        onClick={() => onSelect(appName)}
                        rootRef={selectedApp === appName ? selectedRowRef : undefined}
                        trailing={
                            <span className={styles.badges}>
                                {detected && !enabled && <StatusPip intent="warn">FOUND</StatusPip>}
                                {enabled && fault
                                    ? <StatusPip intent="warn">CHECK</StatusPip>
                                    : (
                                        <StatusPip intent={enabled ? "ok" : "off"}>
                                            {enabled ? "OK" : "DISABLED"}
                                        </StatusPip>
                                    )}
                            </span>
                        }
                    />
                );
            })}
        </div>
    );
}
