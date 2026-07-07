use std::path::{Component, Path, PathBuf};

use flate2::read::GzDecoder;
use tar::Archive;

use super::registry::ExtractLayout;

/// Root of the managed themes directory: `~/.config/black-atom/themes`.
pub fn managed_themes_root() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    Ok(home.join(".config").join("black-atom").join("themes"))
}

/// Extract an adapter repo tarball's theme output into
/// `<managed_root>/<adapter>/`, replacing whatever was there. Returns the
/// number of theme files written.
///
/// The tarball is a codeload archive: one top-level `<repo>-<branch>/` dir,
/// then the repo as committed. Only files matching the layout AND named
/// `black-atom-*` are taken — this filters `collection.template.*` sources,
/// READMEs, and anything else a repo carries.
///
/// Staging + swap: entries land in a temp dir beside the target, then the
/// target is swapped out — a failed download never leaves a half-written
/// adapter dir visible. Leftover staging dirs from a crashed run are swept
/// on the next call.
pub fn extract_tarball(
    tar_gz: &[u8],
    layout: ExtractLayout,
    managed_root: &Path,
    adapter: &str,
) -> Result<u32, String> {
    std::fs::create_dir_all(managed_root)
        .map_err(|e| format!("Failed to create themes directory: {e}"))?;
    ensure_under_home(managed_root)?;
    sweep_stale_staging(managed_root);

    let staging = tempfile::Builder::new()
        .prefix(STAGING_PREFIX)
        .tempdir_in(managed_root)
        .map_err(|e| format!("Failed to create staging directory: {e}"))?;

    let mut archive = Archive::new(GzDecoder::new(tar_gz));
    let entries = archive
        .entries()
        .map_err(|e| format!("Failed to read tarball: {e}"))?;

    let mut file_count: u32 = 0;
    for entry in entries {
        let mut entry = entry.map_err(|e| format!("Failed to read tarball entry: {e}"))?;
        if !entry.header().entry_type().is_file() {
            continue;
        }
        let path = entry
            .path()
            .map_err(|e| format!("Tarball entry has an invalid path: {e}"))?
            .into_owned();

        // Zip-slip guard: a hostile archive is an error, not a skip.
        if path
            .components()
            .any(|c| !matches!(c, Component::Normal(_)))
        {
            return Err(format!(
                "Tarball entry escapes its directory: {}",
                path.display()
            ));
        }

        let Some(relative) = theme_relative_path(&path, layout) else {
            continue;
        };

        let target = staging.path().join(&relative);
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create {}: {e}", parent.display()))?;
        }
        let mut out = std::fs::File::create(&target)
            .map_err(|e| format!("Failed to create {}: {e}", target.display()))?;
        std::io::copy(&mut entry, &mut out)
            .map_err(|e| format!("Failed to write {}: {e}", target.display()))?;
        file_count += 1;
    }

    if file_count == 0 {
        return Err(format!(
            "Tarball for '{adapter}' contained no theme files — refusing to replace the existing directory"
        ));
    }

    swap_into_place(staging, managed_root, adapter)?;
    Ok(file_count)
}

const STAGING_PREFIX: &str = ".staging-";
const RETIRED_PREFIX: &str = ".retired-";

/// Map a tarball entry path to its path inside the adapter dir, or `None`
/// if the entry is not a theme file for this layout.
fn theme_relative_path(entry_path: &Path, layout: ExtractLayout) -> Option<PathBuf> {
    // Skip the tarball's top-level `<repo>-<branch>/` component.
    let mut components = entry_path.components();
    components.next()?;
    let repo_relative: Vec<&str> = components
        .map(|c| c.as_os_str().to_str())
        .collect::<Option<Vec<_>>>()?;

    match layout {
        ExtractLayout::Collections => match repo_relative.as_slice() {
            ["themes", collection, file] if file.starts_with("black-atom-") => {
                Some(PathBuf::from(collection).join(file))
            }
            _ => None,
        },
    }
}

/// Replace `<managed_root>/<adapter>` with the staged directory. Plain
/// renames within one directory (same filesystem); the retired dir is
/// removed last so a failure between renames is recoverable by re-running.
fn swap_into_place(
    staging: tempfile::TempDir,
    managed_root: &Path,
    adapter: &str,
) -> Result<(), String> {
    let dest = managed_root.join(adapter);
    let retired = managed_root.join(format!("{RETIRED_PREFIX}{adapter}"));

    let staged_path = staging.keep();

    if dest.exists() {
        std::fs::rename(&dest, &retired)
            .map_err(|e| format!("Failed to retire previous {adapter} themes: {e}"))?;
    }
    if let Err(e) = std::fs::rename(&staged_path, &dest) {
        // Put the previous version back rather than leaving nothing.
        if retired.exists() {
            let _ = std::fs::rename(&retired, &dest);
        }
        let _ = std::fs::remove_dir_all(&staged_path);
        return Err(format!("Failed to activate {adapter} themes: {e}"));
    }
    if retired.exists() {
        let _ = std::fs::remove_dir_all(&retired);
    }
    Ok(())
}

/// Remove staging/retired leftovers from a previously crashed run.
fn sweep_stale_staging(managed_root: &Path) {
    let Ok(entries) = std::fs::read_dir(managed_root) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue };
        if name.starts_with(STAGING_PREFIX) || name.starts_with(RETIRED_PREFIX) {
            let _ = std::fs::remove_dir_all(entry.path());
        }
    }
}

/// Same discipline as `file_ops` writers: never touch anything outside the
/// user's home directory.
fn ensure_under_home(path: &Path) -> Result<(), String> {
    let home = dirs::home_dir()
        .ok_or("Cannot determine home directory")?
        .canonicalize()
        .map_err(|e| format!("Cannot resolve home directory: {e}"))?;
    let resolved = path
        .canonicalize()
        .map_err(|e| format!("Cannot resolve {}: {e}", path.display()))?;
    if !resolved.starts_with(&home) {
        return Err(format!(
            "Refusing to write outside the home directory: {}",
            resolved.display()
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture_bytes(name: &str) -> Vec<u8> {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("themes")
            .join(name);
        std::fs::read(&path).unwrap_or_else(|e| panic!("missing fixture {}: {e}", path.display()))
    }

    fn temp_root() -> tempfile::TempDir {
        let home = dirs::home_dir().expect("Cannot determine home directory");
        tempfile::TempDir::new_in(home).unwrap()
    }

    fn managed_dir_listing(root: &Path) -> Vec<String> {
        let mut names: Vec<String> = walk(root)
            .iter()
            .map(|p| p.strip_prefix(root).unwrap().to_string_lossy().into_owned())
            .collect();
        names.sort();
        names
    }

    fn walk(dir: &Path) -> Vec<PathBuf> {
        let mut files = Vec::new();
        for entry in std::fs::read_dir(dir).unwrap().flatten() {
            let path = entry.path();
            if path.is_dir() {
                files.extend(walk(&path));
            } else {
                files.push(path);
            }
        }
        files
    }

    #[test]
    fn test_collections_extraction_filters_templates_and_noise() {
        let root = temp_root();
        let count = extract_tarball(
            &fixture_bytes("adapter-collections.tar.gz"),
            ExtractLayout::Collections,
            root.path(),
            "tmux",
        )
        .unwrap();

        assert_eq!(count, 3);
        assert_eq!(
            managed_dir_listing(&root.path().join("tmux")),
            vec![
                "default/black-atom-default-dark.conf",
                "default/black-atom-default-light.conf",
                "jpn/black-atom-jpn-koyo-yoru.conf",
            ]
        );
    }

    #[test]
    fn test_rerun_is_idempotent_and_leaves_no_residue() {
        let root = temp_root();
        let bytes = fixture_bytes("adapter-collections.tar.gz");
        extract_tarball(&bytes, ExtractLayout::Collections, root.path(), "tmux").unwrap();
        // A file that disappears upstream must not survive the re-sync.
        std::fs::write(
            root.path().join("tmux").join("default").join("stale.conf"),
            "stale",
        )
        .unwrap();

        let count =
            extract_tarball(&bytes, ExtractLayout::Collections, root.path(), "tmux").unwrap();

        assert_eq!(count, 3);
        let listing = managed_dir_listing(root.path());
        assert!(listing.iter().all(|n| !n.contains("stale")));
        assert!(
            listing
                .iter()
                .all(|n| !n.starts_with(".staging-") && !n.starts_with(".retired-")),
            "staging residue left behind: {listing:?}"
        );
    }

    #[test]
    fn test_zip_slip_entry_is_an_error() {
        let root = temp_root();
        let result = extract_tarball(
            &fixture_bytes("zip-slip.tar.gz"),
            ExtractLayout::Collections,
            root.path(),
            "tmux",
        );
        let err = result.unwrap_err();
        assert!(err.contains("escapes"), "unexpected error: {err}");
        // Nothing may have been activated.
        assert!(!root.path().join("tmux").exists());
    }

    #[test]
    fn test_empty_tarball_refuses_to_replace() {
        let root = temp_root();
        let bytes = fixture_bytes("adapter-collections.tar.gz");
        extract_tarball(&bytes, ExtractLayout::Collections, root.path(), "tmux").unwrap();

        let result = extract_tarball(
            &fixture_bytes("no-themes.tar.gz"),
            ExtractLayout::Collections,
            root.path(),
            "tmux",
        );

        assert!(result.unwrap_err().contains("no theme files"));
        // Previous download stays intact.
        assert_eq!(managed_dir_listing(&root.path().join("tmux")).len(), 3);
    }

    #[test]
    fn test_crashed_run_leftovers_are_swept() {
        let root = temp_root();
        std::fs::create_dir(root.path().join(".staging-abc123")).unwrap();
        std::fs::create_dir(root.path().join(".retired-tmux")).unwrap();

        extract_tarball(
            &fixture_bytes("adapter-collections.tar.gz"),
            ExtractLayout::Collections,
            root.path(),
            "tmux",
        )
        .unwrap();

        assert!(!root.path().join(".staging-abc123").exists());
        assert!(!root.path().join(".retired-tmux").exists());
    }
}
