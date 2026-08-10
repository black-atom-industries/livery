import type { AppConfig } from "../../../bindings.ts";
import type {
    LinkThemesRowResult,
    TestApplyResult,
    VerifyPathResult,
} from "../adapter-shared/results.ts";
import type { SetUpOutcome } from "../../../lib/adapter-setup.ts";

/** Every field an adapter page can offer — a page renders only what its
    updater reads, listed explicitly in the page's own JSX. */
export type AdapterField = "config_path" | "themes_path" | "match_pattern" | "replace_template";

/** Props every per-adapter settings page receives — one shape, one
    component per adapter, each hardcoding which of these fields it shows. */
export type AdapterPageProps = {
    appConfig: AppConfig;
    detected: boolean;
    onToggleEnabled: () => void;
    onFieldCommit: (field: AdapterField, value: string) => void;
    firstFieldRef?: React.RefObject<HTMLInputElement>;
    onOpenUrl?: (url: string) => void;

    onSetUp: () => void;
    setUpResult?: SetUpOutcome;
    onVerifyPath: () => void;
    verifyPathResult?: VerifyPathResult;
    linkable: boolean;
    onLinkThemes: () => void;
    linkThemesResult?: LinkThemesRowResult;
    onTestApply: () => void;
    testApplyResult?: TestApplyResult;
};
