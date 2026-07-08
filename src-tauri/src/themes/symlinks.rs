//! Symlink placement tail for apps that only load themes from their own
//! config directory by bare name (zed: ~/.config/zed/themes; ghostty:
//! ~/.config/ghostty/themes — ghostty rejects `~` paths in `theme =`).
//! Each downloaded theme gets a flat symlink there pointing into the
//! managed dir. Re-running heals dangling links and prunes managed-owned
//! leftovers; real files a user placed themselves are never touched.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Default, PartialEq, Eq)]
pub struct SymlinkSyncStats {
    pub linked: u32,
    pub pruned: u32,
    /// Names skipped because a real (non-symlink) file already sits there.
    pub skipped: Vec<String>,
}

/// Point `<app_themes_dir>/<file>` at every `black-atom-*<extension>` one
/// collection level below `managed_dir`, then prune managed-owned links
/// whose file no longer exists in the fresh set.
#[cfg(unix)]
pub fn sync_flat_symlinks(
    managed_dir: &Path,
    app_themes_dir: &Path,
    extension: &str,
) -> Result<SymlinkSyncStats, String> {
    std::fs::create_dir_all(app_themes_dir)
        .map_err(|e| format!("Failed to create {}: {e}", app_themes_dir.display()))?;
    super::extract::ensure_under_home(app_themes_dir)?;
    super::extract::ensure_under_home(managed_dir)?;

    let fresh = fresh_theme_files(managed_dir, extension)?;
    let mut stats = SymlinkSyncStats::default();

    for (name, target) in &fresh {
        let link = app_themes_dir.join(name);
        match std::fs::symlink_metadata(&link) {
            Ok(meta) if meta.file_type().is_symlink() => {
                // Replace unless it already points at the fresh target —
                // this heals dangling links and re-aims clone-farm links.
                if std::fs::read_link(&link).ok().as_deref() != Some(target.as_path()) {
                    std::fs::remove_file(&link)
                        .map_err(|e| format!("Failed to replace {}: {e}", link.display()))?;
                    std::os::unix::fs::symlink(target, &link)
                        .map_err(|e| format!("Failed to link {}: {e}", link.display()))?;
                }
                stats.linked += 1;
            }
            Ok(_) => {
                stats.skipped.push(name.clone());
            }
            Err(_) => {
                std::os::unix::fs::symlink(target, &link)
                    .map_err(|e| format!("Failed to link {}: {e}", link.display()))?;
                stats.linked += 1;
            }
        }
    }

    // Prune: managed-owned links whose theme vanished upstream.
    let entries = std::fs::read_dir(app_themes_dir)
        .map_err(|e| format!("Failed to read {}: {e}", app_themes_dir.display()))?;
    for entry in entries.flatten() {
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue };
        if !name.starts_with("black-atom-") || fresh.contains_key(name) {
            continue;
        }
        let path = entry.path();
        let Ok(meta) = std::fs::symlink_metadata(&path) else {
            continue;
        };
        if !meta.file_type().is_symlink() {
            continue;
        }
        let Ok(target) = std::fs::read_link(&path) else {
            continue;
        };
        if target.starts_with(managed_dir) {
            std::fs::remove_file(&path)
                .map_err(|e| format!("Failed to prune {}: {e}", path.display()))?;
            stats.pruned += 1;
        }
    }

    Ok(stats)
}

/// Filename → absolute managed path for every theme file one collection
/// level below the managed dir, filtered by extension.
fn fresh_theme_files(
    managed_dir: &Path,
    extension: &str,
) -> Result<HashMap<String, PathBuf>, String> {
    let mut fresh = HashMap::new();
    let collections = std::fs::read_dir(managed_dir)
        .map_err(|e| format!("Failed to read {}: {e}", managed_dir.display()))?;
    for collection in collections.flatten() {
        if !collection.path().is_dir() {
            continue;
        }
        let Ok(files) = std::fs::read_dir(collection.path()) else {
            continue;
        };
        for file in files.flatten() {
            let name = file.file_name();
            let Some(name) = name.to_str() else { continue };
            if name.starts_with("black-atom-") && name.ends_with(extension) {
                fresh.insert(name.to_string(), file.path());
            }
        }
    }
    Ok(fresh)
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    struct Setup {
        _root: tempfile::TempDir,
        managed: PathBuf,
        app_dir: PathBuf,
    }

    fn setup(extension: &str) -> Setup {
        let home = dirs::home_dir().expect("Cannot determine home directory");
        let root = tempfile::TempDir::new_in(home).unwrap();
        let managed = root.path().join("managed").join("app");
        let app_dir = root.path().join("app-config").join("themes");
        std::fs::create_dir_all(managed.join("jpn")).unwrap();
        std::fs::write(
            managed
                .join("jpn")
                .join(format!("black-atom-jpn-koyo-yoru{extension}")),
            "content",
        )
        .unwrap();
        Setup {
            _root: root,
            managed,
            app_dir,
        }
    }

    #[test]
    fn test_creates_links_into_managed_dir() {
        let s = setup(".json");
        let stats = sync_flat_symlinks(&s.managed, &s.app_dir, ".json").unwrap();

        assert_eq!(stats.linked, 1);
        let link = s.app_dir.join("black-atom-jpn-koyo-yoru.json");
        let target = std::fs::read_link(&link).unwrap();
        assert!(target.starts_with(&s.managed));
    }

    #[test]
    fn test_extension_filter_scopes_the_sync() {
        // A ghostty-style .conf sync must ignore .json files and vice versa.
        let s = setup(".conf");
        std::fs::write(
            s.managed.join("jpn").join("black-atom-other.json"),
            "not mine",
        )
        .unwrap();

        let stats = sync_flat_symlinks(&s.managed, &s.app_dir, ".conf").unwrap();

        assert_eq!(stats.linked, 1);
        assert!(s.app_dir.join("black-atom-jpn-koyo-yoru.conf").exists());
        assert!(!s.app_dir.join("black-atom-other.json").exists());
    }

    #[test]
    fn test_heals_dangling_and_foreign_links() {
        let s = setup(".json");
        std::fs::create_dir_all(&s.app_dir).unwrap();
        let link = s.app_dir.join("black-atom-jpn-koyo-yoru.json");
        std::os::unix::fs::symlink("/nonexistent/clone/theme.json", &link).unwrap();

        let stats = sync_flat_symlinks(&s.managed, &s.app_dir, ".json").unwrap();

        assert_eq!(stats.linked, 1);
        assert!(std::fs::read_link(&link).unwrap().starts_with(&s.managed));
    }

    #[test]
    fn test_prunes_managed_owned_leftovers_only() {
        let s = setup(".json");
        std::fs::create_dir_all(&s.app_dir).unwrap();
        // Managed-owned link whose theme no longer exists upstream.
        std::os::unix::fs::symlink(
            s.managed.join("jpn").join("black-atom-gone.json"),
            s.app_dir.join("black-atom-gone.json"),
        )
        .unwrap();
        // Foreign link (user's clone farm) — not ours to prune.
        std::os::unix::fs::symlink(
            "/somewhere/else/black-atom-foreign.json",
            s.app_dir.join("black-atom-foreign.json"),
        )
        .unwrap();

        let stats = sync_flat_symlinks(&s.managed, &s.app_dir, ".json").unwrap();

        assert_eq!(stats.pruned, 1);
        assert!(!s.app_dir.join("black-atom-gone.json").exists());
        assert!(
            std::fs::symlink_metadata(s.app_dir.join("black-atom-foreign.json")).is_ok(),
            "foreign symlink must survive"
        );
    }

    #[test]
    fn test_never_touches_a_real_file() {
        let s = setup(".json");
        std::fs::create_dir_all(&s.app_dir).unwrap();
        let real = s.app_dir.join("black-atom-jpn-koyo-yoru.json");
        std::fs::write(&real, "user's own file").unwrap();

        let stats = sync_flat_symlinks(&s.managed, &s.app_dir, ".json").unwrap();

        assert_eq!(stats.skipped, vec!["black-atom-jpn-koyo-yoru.json"]);
        assert_eq!(std::fs::read_to_string(&real).unwrap(), "user's own file");
    }

    #[test]
    fn test_rerun_is_stable() {
        let s = setup(".json");
        sync_flat_symlinks(&s.managed, &s.app_dir, ".json").unwrap();
        let stats = sync_flat_symlinks(&s.managed, &s.app_dir, ".json").unwrap();
        assert_eq!(stats.linked, 1);
        assert_eq!(stats.pruned, 0);
        assert!(stats.skipped.is_empty());
    }
}
