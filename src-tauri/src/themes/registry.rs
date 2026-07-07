use crate::config::types::AppName;

/// How an adapter repo lays out its committed theme output.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExtractLayout {
    /// `themes/<collection>/black-atom-*.<ext>` (ghostty, tmux, lazygit, zed).
    Collections,
    /// `colors/black-atom-*.lua`, flat (nvim).
    NvimColors,
    /// Flat `themes/black-atom-*.css` plus the merged root `theme.css` +
    /// `manifest.json` pair Obsidian installs into a vault.
    ObsidianMerged,
}

/// Where an adapter's theme files come from.
pub struct AdapterDistribution {
    /// Repo name under the black-atom-industries GitHub org.
    pub repo: &'static str,
    pub layout: ExtractLayout,
}

/// V1 stand-in for a distribution/readiness flag in `black-atom-adapter.json`
/// (planned core schema addition) — until adapters declare it themselves,
/// livery carries the knowledge. `None` = nothing to download: helm compiles
/// themes into its binary, delta has no adapter repo.
pub fn distribution(app: AppName) -> Option<AdapterDistribution> {
    match app {
        AppName::Ghostty => Some(AdapterDistribution {
            repo: "ghostty",
            layout: ExtractLayout::Collections,
        }),
        AppName::Tmux => Some(AdapterDistribution {
            repo: "tmux",
            layout: ExtractLayout::Collections,
        }),
        AppName::Lazygit => Some(AdapterDistribution {
            repo: "lazygit",
            layout: ExtractLayout::Collections,
        }),
        AppName::Zed => Some(AdapterDistribution {
            repo: "zed",
            layout: ExtractLayout::Collections,
        }),
        AppName::Nvim => Some(AdapterDistribution {
            repo: "nvim",
            layout: ExtractLayout::NvimColors,
        }),
        AppName::Obsidian => Some(AdapterDistribution {
            repo: "obsidian",
            layout: ExtractLayout::ObsidianMerged,
        }),
        AppName::Delta | AppName::Helm => None,
    }
}
