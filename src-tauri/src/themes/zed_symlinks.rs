//! Zed placement tail: zed only loads themes from `~/.config/zed/themes`,
//! so each downloaded theme gets a symlink there pointing into the managed
//! dir. Re-running heals dangling links and prunes managed-owned leftovers;
//! real files a user placed themselves are never touched.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Default, PartialEq, Eq)]
pub struct SymlinkSyncStats {
    pub linked: u32,
    pub pruned: u32,
    /// Names skipped because a real (non-symlink) file already sits there.
    pub skipped: Vec<String>,
}

/// Point `<zed_themes_dir>/<file>.json` at every `black-atom-*.json` under
/// `managed_zed_dir` (collections layout, one level deep), then prune
/// managed-owned links whose file no longer exists in the fresh set.
#[cfg(unix)]
pub fn sync_zed_symlinks(
    managed_zed_dir: &Path,
    zed_themes_dir: &Path,
) -> Result<SymlinkSyncStats, String> {
    std::fs::create_dir_all(zed_themes_dir)
        .map_err(|e| format!("Failed to create {}: {e}", zed_themes_dir.display()))?;
    super::extract::ensure_under_home(zed_themes_dir)?;
    super::extract::ensure_under_home(managed_zed_dir)?;

    let fresh = fresh_theme_files(managed_zed_dir)?;
    let mut stats = SymlinkSyncStats::default();

    for (name, target) in &fresh {
        let link = zed_themes_dir.join(name);
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
    let entries = std::fs::read_dir(zed_themes_dir)
        .map_err(|e| format!("Failed to read {}: {e}", zed_themes_dir.display()))?;
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
        if target.starts_with(managed_zed_dir) {
            std::fs::remove_file(&path)
                .map_err(|e| format!("Failed to prune {}: {e}", path.display()))?;
            stats.pruned += 1;
        }
    }

    Ok(stats)
}

/// Filename → absolute managed path for every theme file one collection
/// level below the managed zed dir.
fn fresh_theme_files(managed_zed_dir: &Path) -> Result<HashMap<String, PathBuf>, String> {
    let mut fresh = HashMap::new();
    let collections = std::fs::read_dir(managed_zed_dir)
        .map_err(|e| format!("Failed to read {}: {e}", managed_zed_dir.display()))?;
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
            if name.starts_with("black-atom-") && name.ends_with(".json") {
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
        zed: PathBuf,
    }

    fn setup() -> Setup {
        let home = dirs::home_dir().expect("Cannot determine home directory");
        let root = tempfile::TempDir::new_in(home).unwrap();
        let managed = root.path().join("managed").join("zed");
        let zed = root.path().join("zed-config").join("themes");
        std::fs::create_dir_all(managed.join("jpn")).unwrap();
        std::fs::write(
            managed.join("jpn").join("black-atom-jpn-koyo-yoru.json"),
            "{}",
        )
        .unwrap();
        Setup {
            _root: root,
            managed,
            zed,
        }
    }

    #[test]
    fn test_creates_links_into_managed_dir() {
        let s = setup();
        let stats = sync_zed_symlinks(&s.managed, &s.zed).unwrap();

        assert_eq!(stats.linked, 1);
        let link = s.zed.join("black-atom-jpn-koyo-yoru.json");
        let target = std::fs::read_link(&link).unwrap();
        assert!(target.starts_with(&s.managed));
    }

    #[test]
    fn test_heals_dangling_and_foreign_links() {
        let s = setup();
        std::fs::create_dir_all(&s.zed).unwrap();
        let link = s.zed.join("black-atom-jpn-koyo-yoru.json");
        std::os::unix::fs::symlink("/nonexistent/clone/theme.json", &link).unwrap();

        let stats = sync_zed_symlinks(&s.managed, &s.zed).unwrap();

        assert_eq!(stats.linked, 1);
        assert!(std::fs::read_link(&link).unwrap().starts_with(&s.managed));
    }

    #[test]
    fn test_prunes_managed_owned_leftovers_only() {
        let s = setup();
        std::fs::create_dir_all(&s.zed).unwrap();
        // Managed-owned link whose theme no longer exists upstream.
        std::os::unix::fs::symlink(
            s.managed.join("jpn").join("black-atom-gone.json"),
            s.zed.join("black-atom-gone.json"),
        )
        .unwrap();
        // Foreign link (user's clone farm) — not ours to prune.
        std::os::unix::fs::symlink(
            "/somewhere/else/black-atom-foreign.json",
            s.zed.join("black-atom-foreign.json"),
        )
        .unwrap();

        let stats = sync_zed_symlinks(&s.managed, &s.zed).unwrap();

        assert_eq!(stats.pruned, 1);
        assert!(!s.zed.join("black-atom-gone.json").exists());
        assert!(
            std::fs::symlink_metadata(s.zed.join("black-atom-foreign.json")).is_ok(),
            "foreign symlink must survive"
        );
    }

    #[test]
    fn test_never_touches_a_real_file() {
        let s = setup();
        std::fs::create_dir_all(&s.zed).unwrap();
        let real = s.zed.join("black-atom-jpn-koyo-yoru.json");
        std::fs::write(&real, "user's own file").unwrap();

        let stats = sync_zed_symlinks(&s.managed, &s.zed).unwrap();

        assert_eq!(stats.skipped, vec!["black-atom-jpn-koyo-yoru.json"]);
        assert_eq!(std::fs::read_to_string(&real).unwrap(), "user's own file");
    }

    #[test]
    fn test_rerun_is_stable() {
        let s = setup();
        sync_zed_symlinks(&s.managed, &s.zed).unwrap();
        let stats = sync_zed_symlinks(&s.managed, &s.zed).unwrap();
        assert_eq!(stats.linked, 1);
        assert_eq!(stats.pruned, 0);
        assert!(stats.skipped.is_empty());
    }
}
