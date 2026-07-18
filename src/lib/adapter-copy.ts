import type { AppName, ThemeProvisioning } from "../bindings.ts";

/**
 * One sentence per provisioning class — the settings row's explanation of
 * how an adapter gets its theme files. Definitions mirror ADAPTERS.md.
 */
export const provisioningCopy: Record<ThemeProvisioning, string> = {
    external:
        "Theme files are provided outside of livery — by a plugin, a binary, or you — livery only switches between them.",
    linked:
        "Downloaded themes are symlinked into a location the app itself reads; switching selects one via a pointer in the app's config.",
    merged:
        "The app cannot read external theme files — livery writes the theme's values into its config on every switch.",
};

/** One-time setup prerequisites livery cannot automate, per adapter. */
export const adapterPrerequisites: Partial<Record<AppName, string>> = {
    nvim:
        "Install the black-atom-industries/nvim plugin via your plugin manager and keep a colorscheme line in your config.",
    helm: "Themes are compiled into the helm binary — nothing to install.",
    delta: "Maintain your own ~/.gitconfig.delta with black-atom-dark/light features.",
    obsidian: "Point CONFIG_PATH at your vault's .obsidian/appearance.json, then run SET UP.",
    tmux: "Keep a source-file line in tmux.conf pointing at ~/.config/tmux/themes.",
};
