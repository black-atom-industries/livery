import {
    ActionRow,
    AdapterHeader,
    ClassDefinition,
    DraftField,
    PrerequisiteNote,
} from "../adapter-shared/index.ts";
import type { AdapterPageProps } from "./types.ts";
import styles from "./adapter-page.module.css";

/** delta — external provisioning, patches ~/.gitconfig.delta via regex. */
export function DeltaSettings(
    {
        appConfig,
        detected,
        onToggleEnabled,
        onFieldCommit,
        firstFieldRef,
        onSetUp,
        setUpResult,
        onVerifyPath,
        verifyPathResult,
        linkable,
        onLinkThemes,
        linkThemesResult,
        onTestApply,
        testApplyResult,
    }: AdapterPageProps,
) {
    return (
        <div className={styles.root}>
            <AdapterHeader
                appName="delta"
                appConfig={appConfig}
                detected={detected}
                onToggleEnabled={onToggleEnabled}
                verifyPathResult={verifyPathResult}
            />
            <div className={styles.fieldGrid}>
                <DraftField
                    label="CONFIG_PATH"
                    note="THE FILE LIVERY PATCHES"
                    value={appConfig.config_path}
                    onCommit={(value) => onFieldCommit("config_path", value)}
                    inputRef={firstFieldRef}
                />
                <DraftField
                    label="MATCH_PATTERN"
                    note="REGEX — FINDS THE THEME LINE"
                    value={appConfig.match_pattern ?? ""}
                    onCommit={(value) => onFieldCommit("match_pattern", value)}
                />
                <DraftField
                    label="REPLACE_TEMPLATE"
                    note="REPLACES THE MATCHED LINE"
                    value={appConfig.replace_template ?? ""}
                    onCommit={(value) => onFieldCommit("replace_template", value)}
                />
                <p className={styles.fieldGridNote}>
                    Template variables: {"{themeKey}"} · {"{themesPath}"} · {"{collectionKey}"} ·
                    {" "}
                    {"{appearance}"}
                </p>
            </div>
            <ActionRow
                onSetUp={onSetUp}
                setUpResult={setUpResult}
                onVerifyPath={onVerifyPath}
                verifyPathResult={verifyPathResult}
                linkable={linkable}
                onLinkThemes={onLinkThemes}
                linkThemesResult={linkThemesResult}
                onTestApply={onTestApply}
                testApplyResult={testApplyResult}
            />
            <ClassDefinition provisioning="external" />
            <PrerequisiteNote>
                Maintain your own ~/.gitconfig.delta with black-atom-dark/light features.
            </PrerequisiteNote>
        </div>
    );
}
