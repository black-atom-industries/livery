use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use specta::Type;

use crate::config::types::AppName;
use crate::updaters::UpdateStatus;

use super::manifest::ManifestEntry;
#[cfg(unix)]
use super::symlinks;
use super::{extract, manifest, registry};

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
/// Placement wiring that belongs to the adapter (e.g. zed symlinks) is part
/// of this call, not a separate step.
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

    // Placement tail — part of the sync, never a separate step. Zed and
    // ghostty only load themes by bare name from their own themes dir
    // (ghostty rejects `~` paths), so they get flat managed symlinks.
    #[cfg(unix)]
    if let Some((app_themes_dir, extension)) = match app {
        AppName::Zed => Some((".config/zed/themes", ".json")),
        AppName::Ghostty => Some((".config/ghostty/themes", ".conf")),
        _ => None,
    } {
        let home = dirs::home_dir()
            .ok_or_else(|| DownloadError::Failed("Cannot determine home directory".to_string()))?;
        let stats = symlinks::sync_flat_symlinks(
            &root.join(app.as_str()),
            &home.join(app_themes_dir),
            extension,
        )
        .map_err(DownloadError::Failed)?;
        if !stats.skipped.is_empty() {
            log::warn!(
                "{} symlink sync skipped {} real file(s): {}",
                app.as_str(),
                stats.skipped.len(),
                stats.skipped.join(", ")
            );
        }
    }

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
