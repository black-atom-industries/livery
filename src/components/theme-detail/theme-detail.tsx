import type { ThemeDefinition } from "@black-atom/core";
import { Badge } from "../primitives/badge/badge.tsx";
import { CodePreview } from "../primitives/code-preview/code-preview.tsx";
import { CodeToken } from "../primitives/code-preview/code-token.tsx";
import { KVRow } from "../primitives/kv-row/kv-row.tsx";
import { SectionHeader } from "../primitives/section-header/section-header.tsx";
import { StatusPip } from "../primitives/status-pip/status-pip.tsx";
import { Swatch } from "../primitives/swatch/swatch.tsx";
import { Typo } from "../typo/index.ts";
import styles from "./theme-detail.module.css";

const STATUS_INTENT = {
    release: "positive",
    beta: "warn",
    development: "negative",
} as const satisfies Record<ThemeDefinition["meta"]["status"], "positive" | "warn" | "negative">;

interface ThemeDetailProps {
    theme: ThemeDefinition | undefined;
    /** Whether this theme is the one currently applied to the system. */
    isActive?: boolean;
}

const PRIMARY_KEYS = [
    "d10",
    "d20",
    "d30",
    "d40",
    "m10",
    "m20",
    "m30",
    "m40",
    "l10",
    "l20",
    "l30",
    "l40",
] as const;

export function ThemeDetail({ theme, isActive }: ThemeDetailProps) {
    if (!theme) {
        return <div className={styles.empty}>No theme selected</div>;
    }

    const { meta, palette, primaries, syntax } = theme;
    const appearanceLabel = meta.appearance.toUpperCase();
    const appearanceLetter = meta.appearance === "dark" ? "D" : "L";
    const docCode = `DOC LVR-${meta.collection.key.toUpperCase()}-${
        initials(meta.name)
    }-${appearanceLetter} · REV 01`;

    const accents = [
        { label: "RED", color: palette.red },
        { label: "YELLOW", color: palette.yellow },
        { label: "GREEN", color: palette.green },
        { label: "MAGENTA", color: palette.magenta },
    ];

    return (
        <div data-component="theme-detail" className={styles.root}>
            <div className={styles.headerRow}>
                <div className={styles.titleColumn}>
                    <div className={styles.titleGroup}>
                        <Typo.H1 className={styles.name}>{meta.name.toUpperCase()}</Typo.H1>
                        <Badge>{appearanceLabel}</Badge>
                    </div>
                    <div className={styles.collectionLine}>
                        {meta.collection.key.toUpperCase()} — {meta.collection.label.toUpperCase()}
                        {" "}
                        COLLECTION · KEY {meta.key}
                    </div>
                </div>
                {isActive
                    ? <StatusPip intent="ok">ACTIVE</StatusPip>
                    : <StatusPip intent="off">INACTIVE</StatusPip>}
            </div>

            <div className={styles.section}>
                <SectionHeader>ACCENTS · {accents.length}</SectionHeader>
                <div className={styles.bands}>
                    {accents.map((accent) => (
                        <Swatch
                            key={accent.label}
                            variant="band"
                            color={accent.color}
                            label={`ACCENT · ${accent.label}`}
                            tag={`DERIVED FROM PALETTE.${accent.label}`}
                        />
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <SectionHeader>PRIMARIES · {PRIMARY_KEYS.length}</SectionHeader>
                <div className={styles.primariesGrid}>
                    {PRIMARY_KEYS.map((key) => (
                        <Swatch key={key} variant="cell" color={primaries[key]} />
                    ))}
                </div>
            </div>

            <div className={styles.bottomGrid}>
                <div className={styles.section}>
                    <SectionHeader>PREVIEW · RENDERED IN THEME</SectionHeader>
                    <CodePreview>
                        <div>
                            <CodeToken color={syntax.comment.default}>
                                // adapters/ghostty.ts
                            </CodeToken>
                        </div>
                        <div>
                            <CodeToken color={syntax.keyword.default}>export function</CodeToken>
                            {" "}
                            <CodeToken color={syntax.func.default}>apply</CodeToken>(theme:{" "}
                            <CodeToken color={syntax.type.default}>Theme</CodeToken>) {"{"}
                        </div>
                        <div>
                            &nbsp;&nbsp;<CodeToken color={syntax.keyword.default}>const</CodeToken>
                            {" "}
                            path = <CodeToken color={syntax.func.default}>expand</CodeToken>(
                            <CodeToken color={syntax.string.default}>
                                "~/.config/ghostty"
                            </CodeToken>
                            );
                        </div>
                        <div>
                            &nbsp;&nbsp;<CodeToken color={syntax.keyword.default}>return</CodeToken>
                            {" "}
                            <CodeToken color={syntax.func.default}>write</CodeToken>(path,{" "}
                            <CodeToken color={syntax.func.default}>render</CodeToken>(theme));
                        </div>
                        <div>{"}"}</div>
                    </CodePreview>
                </div>

                <div className={styles.spec}>
                    <SectionHeader>SPEC</SectionHeader>
                    <div className={styles.kvRows}>
                        <KVRow label="COLLECTION">{meta.collection.key.toUpperCase()}</KVRow>
                        <KVRow label="APPEARANCE">{appearanceLabel}</KVRow>
                        <KVRow label="STATUS" intent={STATUS_INTENT[meta.status]}>
                            ■ {meta.status.toUpperCase()}
                        </KVRow>
                    </div>
                    <div className={styles.docCode}>{docCode}</div>
                </div>
            </div>
        </div>
    );
}

/** Two-letter initials from a theme name, e.g. "Koyo Yoru" -> "KY". */
function initials(name: string): string {
    const letters = name
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("");

    return (letters || name.slice(0, 2).toUpperCase()).slice(0, 2);
}
