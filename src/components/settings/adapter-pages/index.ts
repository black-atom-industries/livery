import type { ReactElement } from "react";
import type { AppName } from "../../../bindings.ts";
import type { AdapterPageProps } from "./types.ts";
import { NvimSettings } from "./nvim.tsx";
import { GhosttySettings } from "./ghostty.tsx";
import { HelmSettings } from "./helm.tsx";
import { DeltaSettings } from "./delta.tsx";
import { TmuxSettings } from "./tmux.tsx";
import { ZedSettings } from "./zed.tsx";
import { LazygitSettings } from "./lazygit.tsx";
import { HerdrSettings } from "./herdr.tsx";
import { ObsidianSettings } from "./obsidian.tsx";

export type { AdapterField, AdapterPageProps } from "./types.ts";

/** One real settings page per adapter — dispatched by name, each hardcoding
    its own fields rather than a shared page filtering a conditional grid. */
export const adapterSettingsPages: Record<AppName, (props: AdapterPageProps) => ReactElement> = {
    nvim: NvimSettings,
    ghostty: GhosttySettings,
    helm: HelmSettings,
    delta: DeltaSettings,
    tmux: TmuxSettings,
    zed: ZedSettings,
    lazygit: LazygitSettings,
    herdr: HerdrSettings,
    obsidian: ObsidianSettings,
};
