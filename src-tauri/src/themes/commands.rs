use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use specta::Type;

use crate::config::types::AppName;
use crate::updaters::UpdateStatus;

use super::manifest::ManifestEntry;
use super::{extract, manifest, registry, symlinks};

/// Outcome of one adapter's theme download. Shares `UpdateStatus` with the
/// apply flow so the frontend reuses the same row-status mapping.
#[derive(Debug, Serialize, Type)]
pub struct DownloadResult {
    pub app: String,
    pub status: UpdateStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    pub file_count: Option<u32>,
    pub duration_ms: Option<u32>,
}

impl DownloadResult {
    fn done(app: &str, file_count: u32) -> Self {
        Self {
            app: app.to_string(),
            status: UpdateStatus::Done,
            message: None,
            file_count: Some(file_count),
            duration_ms: None,
        }
    }

    fn error(app: &str, msg: impl Into<String>) -> Self {
        Self {
            app: app.to_string(),
            status: UpdateStatus::Error,
            message: Some(msg.into()),
            file_count: None,
            duration_ms: None,
        }
    }

    fn skipped(app: &str, msg: impl Into<String>) -> Self {
        Self {
            app: app.to_string(),
            status: UpdateStatus::Skipped,
            message: Some(msg.into()),
            file_count: None,
            duration_ms: None,
        }
    }
}

#[derive(Debug, Serialize, Type)]
pub struct AdapterThemesStatus {
    pub downloaded: bool,
    /// True for adapters wired via LINK THEMES (zed, ghostty) — drives the
    /// action's visibility in the settings adapter row.
    pub linked_placement: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub etag: Option<String>,
    /// Unix epoch seconds (u32 carries us to 2106; tauri-specta has no u64).
    pub fetched_at_epoch: Option<u32>,
    pub file_count: Option<u32>,
}

#[derive(Debug, Serialize, Type)]
pub struct ThemesStatus {
    /// One entry per downloadable adapter (helm/delta have none).
    pub adapters: HashMap<AppName, AdapterThemesStatus>,
    pub any_downloaded: bool,
    /// The first-run greeting's "continue without" flag.
    pub dismissed: bool,
}

/// Download one adapter's theme files into the managed themes directory.
/// Pure fetch — wiring apps to the files is adapter setup (link_app_themes
/// for zed/ghostty, config-pointed themes_path for tmux/lazygit).
#[tauri::command]
#[specta::specta]
pub async fn download_theme(app: AppName) -> DownloadResult {
    let app_str = app.as_str();
    let start = std::time::Instant::now();

    let mut result = match download_theme_inner(app).await {
        Ok(file_count) => DownloadResult::done(app_str, file_count),
        Err(DownloadError::NotDownloadable(msg)) => DownloadResult::skipped(app_str, msg),
        Err(DownloadError::Failed(msg)) => DownloadResult::error(app_str, msg),
    };
    result.duration_ms = Some(start.elapsed().as_millis() as u32);
    log::info!(
        "theme download for {} finished in {}ms ({})",
        app_str,
        result.duration_ms.unwrap_or(0),
        result.status.as_str()
    );
    result
}

/// Read the managed themes manifest for the frontend's greeting gate and
/// the settings SYNC display.
#[tauri::command]
#[specta::specta]
pub async fn get_themes_status() -> ThemesStatus {
    let Ok(root) = extract::managed_themes_root() else {
        return ThemesStatus {
            adapters: HashMap::new(),
            any_downloaded: false,
            dismissed: false,
        };
    };
    let stored = manifest::read_manifest(&root);

    let mut adapters = HashMap::new();
    for app in AppName::all() {
        if registry::distribution(*app).is_none() {
            continue;
        }
        let entry = stored.adapters.get(app.as_str());
        adapters.insert(
            *app,
            AdapterThemesStatus {
                downloaded: entry.is_some(),
                linked_placement: registry::linked_placement_extension(*app).is_some(),
                etag: entry.and_then(|e| e.etag.clone()),
                fetched_at_epoch: entry.map(|e| e.fetched_at_epoch as u32),
                file_count: entry.map(|e| e.file_count),
            },
        );
    }

    ThemesStatus {
        any_downloaded: adapters.values().any(|a| a.downloaded),
        dismissed: stored.greeting_dismissed,
        adapters,
    }
}

/// Outcome of wiring one adapter's themes dir via managed symlinks.
#[derive(Debug, Serialize, Type)]
pub struct LinkThemesResult {
    pub app: String,
    pub status: UpdateStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    pub linked: Option<u32>,
    pub pruned: Option<u32>,
}

/// Wire an adapter's own themes dir to the managed downloads via flat
/// symlinks (create, heal, prune). Explicit adapter-setup action — never
/// runs implicitly on download. The target dir is derived from the
/// adapter's CONFIGURED config_path (its sibling `themes/`), so custom
/// setups link into the right place.
#[tauri::command]
#[specta::specta]
pub async fn link_app_themes(app: AppName) -> LinkThemesResult {
    let app_str = app.as_str();

    let Some(extension) = registry::linked_placement_extension(app) else {
        return LinkThemesResult {
            app: app_str.to_string(),
            status: UpdateStatus::Skipped,
            message: Some(format!("{app_str} is not wired via linked themes")),
            linked: None,
            pruned: None,
        };
    };

    match link_app_themes_inner(app, extension) {
        Ok(stats) => LinkThemesResult {
            app: app_str.to_string(),
            status: UpdateStatus::Done,
            message: (!stats.skipped.is_empty()).then(|| {
                format!(
                    "left {} real file(s) untouched: {}",
                    stats.skipped.len(),
                    stats.skipped.join(", ")
                )
            }),
            linked: Some(stats.linked),
            pruned: Some(stats.pruned),
        },
        Err(msg) => LinkThemesResult {
            app: app_str.to_string(),
            status: UpdateStatus::Error,
            message: Some(msg),
            linked: None,
            pruned: None,
        },
    }
}

#[cfg(unix)]
fn link_app_themes_inner(
    app: AppName,
    extension: &str,
) -> Result<symlinks::SymlinkSyncStats, String> {
    let root = extract::managed_themes_root()?;
    let managed_dir = root.join(app.as_str());
    if !managed_dir.is_dir() {
        return Err(format!(
            "No downloaded themes for {} — run SYNC THEMES first",
            app.as_str()
        ));
    }

    let mut config = crate::config::io::read_config_from_disk();
    crate::config::io::expand_app_paths(&mut config);
    let app_config = config
        .apps
        .get(&app)
        .ok_or_else(|| format!("{} not found in config", app.as_str()))?;
    let themes_dir = app_themes_dir(&app_config.config_path).ok_or_else(|| {
        format!(
            "Cannot derive a themes directory from config_path '{}'",
            app_config.config_path
        )
    })?;

    symlinks::sync_flat_symlinks(&managed_dir, &themes_dir, extension)
}

#[cfg(not(unix))]
fn link_app_themes_inner(
    _app: AppName,
    _extension: &str,
) -> Result<symlinks::SymlinkSyncStats, String> {
    Err("Linked theme placement requires a unix filesystem".to_string())
}

/// The adapter's themes dir is the sibling `themes/` of its configured
/// config file — NOT a hardcoded default path, so custom config locations
/// (e.g. ~/.config/zed-custom/settings.json) are wired correctly.
fn app_themes_dir(config_path: &str) -> Option<std::path::PathBuf> {
    let path = std::path::Path::new(config_path);
    Some(path.parent()?.join("themes"))
}

/// Persist the greeting's "continue without" choice so hand-managed setups
/// aren't greeted on every launch.
#[tauri::command]
#[specta::specta]
pub async fn dismiss_themes_greeting() -> Result<(), String> {
    let root = extract::managed_themes_root()?;
    let mut stored = manifest::read_manifest(&root);
    stored.greeting_dismissed = true;
    manifest::write_manifest(&root, &stored)
}

enum DownloadError {
    /// Nothing to download for this adapter — a skip, not a failure.
    NotDownloadable(String),
    Failed(String),
}

async fn download_theme_inner(app: AppName) -> Result<u32, DownloadError> {
    let Some(dist) = registry::distribution(app) else {
        return Err(DownloadError::NotDownloadable(format!(
            "{} has no downloadable theme files",
            app.as_str()
        )));
    };
    let root = extract::managed_themes_root().map_err(DownloadError::Failed)?;

    // HEAD resolves each repo's default branch (obsidian uses master, the
    // rest main) — no per-adapter branch knowledge needed.
    let url = format!(
        "https://codeload.github.com/black-atom-industries/{}/tar.gz/HEAD",
        dist.repo
    );
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| DownloadError::Failed(format!("Failed to build HTTP client: {e}")))?;
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| DownloadError::Failed(format!("Download failed: {e}")))?;
    if !response.status().is_success() {
        return Err(DownloadError::Failed(format!(
            "Download failed: HTTP {} for {url}",
            response.status()
        )));
    }
    let etag = response
        .headers()
        .get(reqwest::header::ETAG)
        .and_then(|v| v.to_str().ok())
        .map(str::to_string);
    let bytes = response
        .bytes()
        .await
        .map_err(|e| DownloadError::Failed(format!("Download failed mid-transfer: {e}")))?;

    let file_count = extract::extract_tarball(&bytes, dist.layout, &root, app.as_str())
        .map_err(DownloadError::Failed)?;

    let fetched_at_epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    manifest::upsert_entry(
        &root,
        app.as_str(),
        ManifestEntry {
            etag,
            fetched_at_epoch,
            file_count,
        },
    )
    .map_err(DownloadError::Failed)?;

    Ok(file_count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_themes_dir_derives_from_config_path_sibling() {
        assert_eq!(
            app_themes_dir("/Users/x/.config/zed/settings.json"),
            Some(std::path::PathBuf::from("/Users/x/.config/zed/themes"))
        );
        assert_eq!(
            app_themes_dir("/Users/x/.config/zed-custom/settings.json"),
            Some(std::path::PathBuf::from(
                "/Users/x/.config/zed-custom/themes"
            ))
        );
    }
}
