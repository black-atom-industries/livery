use std::io::Write;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use yaml_edit::YamlFile;

/// Read a source YAML file, merge it into a target YAML file losslessly
/// (preserving comments and formatting), and write the result back.
///
/// Merge semantics:
/// - Mapping + Mapping → recurse, overlay keys win
/// - Anything else → overlay replaces target entirely
#[tauri::command]
pub fn patch_yaml_file(target_path: String, source_path: String) -> Result<(), String> {
    // Restrict both paths to files under $HOME
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;

    let resolved_target = PathBuf::from(&target_path);
    if !resolved_target.starts_with(&home) {
        return Err(format!(
            "Path outside home directory is not allowed: {target_path}"
        ));
    }

    let resolved_source = PathBuf::from(&source_path);
    if !resolved_source.starts_with(&home) {
        return Err(format!(
            "Path outside home directory is not allowed: {source_path}"
        ));
    }

    // Read source file and parse with yaml_serde (for structural walk decisions)
    let source_content = std::fs::read_to_string(&source_path)
        .map_err(|e| format!("Failed to read {source_path}: {e}"))?;
    let overlay: yaml_serde::Value = yaml_serde::from_str(&source_content)
        .map_err(|e| format!("Failed to parse source YAML: {e}"))?;

    // Also parse source with yaml_edit (to extract properly-typed nodes)
    let source_file = YamlFile::from_str(&source_content)
        .map_err(|e| format!("Failed to parse source YAML with yaml_edit: {e}"))?;
    let source_doc = source_file
        .documents()
        .next()
        .ok_or("Source YAML has no documents")?;
    let source_mapping = source_doc
        .as_mapping()
        .ok_or("Source YAML root is not a mapping")?;

    // Read target file and parse with yaml_edit (lossless, using YamlFile to preserve
    // top-level comments that Document::from_str drops)
    let target_content = std::fs::read_to_string(&target_path)
        .map_err(|e| format!("Failed to read {target_path}: {e}"))?;
    let target_file = YamlFile::from_str(&target_content)
        .map_err(|e| format!("Failed to parse target YAML: {e}"))?;
    let target_doc = target_file
        .documents()
        .next()
        .ok_or("Target YAML has no documents")?;
    let target_mapping = target_doc
        .as_mapping()
        .ok_or("Target YAML root is not a mapping")?;

    // Apply overlay
    apply_overlay(&target_mapping, &source_mapping, &overlay)?;

    // Atomic write: temp file + persist
    let parent = Path::new(&target_path)
        .parent()
        .ok_or(format!("No parent directory for {target_path}"))?;
    let mut tmp = tempfile::NamedTempFile::new_in(parent)
        .map_err(|e| format!("Failed to create temp file: {e}"))?;
    tmp.write_all(target_file.to_string().as_bytes())
        .map_err(|e| format!("Failed to write temp file: {e}"))?;
    tmp.persist(&target_path)
        .map_err(|e| format!("Failed to persist to {target_path}: {e}"))?;

    Ok(())
}

/// Recursively apply overlay values onto a target mapping.
///
/// Uses yaml_serde for structure decisions (is this a mapping?) and
/// yaml_edit nodes for the actual values (preserves types, quoting).
fn apply_overlay(
    target_mapping: &yaml_edit::Mapping,
    source_mapping: &yaml_edit::Mapping,
    overlay: &yaml_serde::Value,
) -> Result<(), String> {
    let overlay_map = match overlay {
        yaml_serde::Value::Mapping(m) => m,
        _ => return Err("Overlay root must be a mapping".to_string()),
    };

    for (key, value) in overlay_map {
        let key_str = key
            .as_str()
            .ok_or_else(|| format!("Non-string key in overlay: {:?}", key))?;

        // If both sides are mappings, recurse
        if let yaml_serde::Value::Mapping(_) = value {
            if let Some(target_sub) = target_mapping.get_mapping(key_str) {
                if let Some(source_sub) = source_mapping.get_mapping(key_str) {
                    apply_overlay(&target_sub, &source_sub, value)?;
                    continue;
                }
            }
        }

        // Get the value node from the yaml_edit source (preserves type info)
        let source_node = source_mapping
            .get(key_str)
            .ok_or_else(|| format!("Key '{key_str}' missing in source yaml_edit tree"))?;

        // For scalar values on existing entries, use set_value to preserve
        // surrounding whitespace and comments. For non-scalars (sequences, new mappings),
        // use insert_at_index_preserving which correctly formats block collections.
        let is_scalar = matches!(
            value,
            yaml_serde::Value::String(_)
                | yaml_serde::Value::Number(_)
                | yaml_serde::Value::Bool(_)
                | yaml_serde::Value::Null
        );

        if is_scalar {
            if let Some(entry) = target_mapping.find_entry_by_key(key_str) {
                entry.set_value(&source_node, false);
            } else {
                target_mapping.set(key_str, &source_node);
            }
        } else {
            // insert_at_index_preserving replaces existing entries at their current
            // position and correctly handles block sequences/mappings
            target_mapping.insert_at_index_preserving(0, key_str, &source_node);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn make_temp_file(content: &str) -> tempfile::NamedTempFile {
        let home = dirs::home_dir().expect("Cannot determine home directory");
        let mut file = tempfile::NamedTempFile::new_in(home).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file
    }

    #[test]
    fn test_merge_overwrites_scalar_values() {
        let target = make_temp_file("name: old\nversion: 1.0\n");
        let source = make_temp_file("name: new\n");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();
        assert!(
            result.contains("name: new"),
            "name should be updated: {result}"
        );
        assert!(
            result.contains("version: 1.0"),
            "version should be preserved: {result}"
        );
    }

    #[test]
    fn test_merge_replaces_arrays() {
        let target = make_temp_file("colors:\n  - red\n  - blue\n");
        let source = make_temp_file("colors:\n  - green\n");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();
        assert!(result.contains("green"), "should contain green: {result}");
        assert!(!result.contains("red"), "should not contain red: {result}");
        assert!(
            !result.contains("blue"),
            "should not contain blue: {result}"
        );
    }

    #[test]
    fn test_merge_preserves_untouched_keys() {
        let target = make_temp_file("a: 1\nb: 2\nc: 3\n");
        let source = make_temp_file("b: 99\n");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();
        assert!(result.contains("a: 1"), "a should be preserved: {result}");
        assert!(result.contains("b: 99"), "b should be updated: {result}");
        assert!(result.contains("c: 3"), "c should be preserved: {result}");
    }

    #[test]
    fn test_merge_handles_nested_mappings() {
        let target =
            make_temp_file("gui:\n  theme:\n    color: red\n    size: large\n  other: keep\n");
        let source = make_temp_file("gui:\n  theme:\n    color: blue\n");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();
        assert!(
            result.contains("color: blue"),
            "color should be blue: {result}"
        );
        assert!(
            result.contains("size: large"),
            "size should be preserved: {result}"
        );
        assert!(
            result.contains("other: keep"),
            "other should be preserved: {result}"
        );
    }

    #[test]
    fn test_merge_preserves_comments() {
        let target = make_temp_file("# My config\nname: old\n# Keep this comment\nversion: 1.0\n");
        let source = make_temp_file("name: new\n");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();
        assert!(
            result.contains("# My config"),
            "top comment should survive: {result}"
        );
        assert!(
            result.contains("# Keep this comment"),
            "inline comment should survive: {result}"
        );
        assert!(
            result.contains("name: new"),
            "name should be updated: {result}"
        );
        assert!(
            result.contains("version: 1.0"),
            "version should be preserved: {result}"
        );
    }

    #[test]
    fn test_merge_lazygit_theme() {
        let target = make_temp_file(
            r##"# Lazygit config
gui:
  # Theme settings
  theme:
    activeBorderColor:
      - "#ff0000"
      - bold
    inactiveBorderColor:
      - "#cccccc"
  authorColors:
    "author1": "#aaaaaa"
  nerdFontsVersion: "3"
keybinding:
  universal:
    quit: q
"##,
        );
        let source = make_temp_file(
            r##"gui:
  theme:
    activeBorderColor:
      - "#00ff00"
      - bold
    inactiveBorderColor:
      - "#999999"
  authorColors:
    "author1": "#bbbbbb"
"##,
        );
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();
        // Theme colors updated
        assert!(
            result.contains("#00ff00"),
            "activeBorderColor should be updated: {result}"
        );
        assert!(
            result.contains("#999999"),
            "inactiveBorderColor should be updated: {result}"
        );
        // Author colors updated
        assert!(
            result.contains("#bbbbbb"),
            "authorColors should be updated: {result}"
        );
        // Preserved values
        assert!(
            result.contains("nerdFontsVersion"),
            "nerdFontsVersion should be preserved: {result}"
        );
        assert!(
            result.contains("quit: q"),
            "keybinding should be preserved: {result}"
        );
        // Comments preserved
        assert!(
            result.contains("# Lazygit config"),
            "top comment should survive: {result}"
        );
        assert!(
            result.contains("# Theme settings"),
            "section comment should survive: {result}"
        );
    }

    #[test]
    fn test_target_not_found_returns_error() {
        let home = dirs::home_dir().unwrap();
        let target_path = home
            .join("nonexistent_yaml_target_12345.yml")
            .to_str()
            .unwrap()
            .to_string();
        let source = make_temp_file("key: value\n");
        let source_path = source.path().to_str().unwrap().to_string();

        let result = patch_yaml_file(target_path, source_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_source_not_found_returns_error() {
        let home = dirs::home_dir().unwrap();
        let target = make_temp_file("key: value\n");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = home
            .join("nonexistent_yaml_source_12345.yml")
            .to_str()
            .unwrap()
            .to_string();

        let result = patch_yaml_file(target_path, source_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_target_path_outside_home_rejected() {
        let source = make_temp_file("key: value\n");
        let source_path = source.path().to_str().unwrap().to_string();

        let result = patch_yaml_file("/etc/config.yml".to_string(), source_path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("outside home directory"));
    }

    #[test]
    fn test_source_path_outside_home_rejected() {
        let target = make_temp_file("key: value\n");
        let target_path = target.path().to_str().unwrap().to_string();

        let result = patch_yaml_file(target_path, "/etc/theme.yml".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("outside home directory"));
    }

    #[test]
    fn test_merge_preserves_key_ordering_for_sequences() {
        let target = make_temp_file("first: 1\ncolors:\n  - red\n  - blue\nlast: 3\n");
        let source = make_temp_file("colors:\n  - green\n");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();
        let first_pos = result.find("first:").expect("first key missing");
        let colors_pos = result.find("colors:").expect("colors key missing");
        let last_pos = result.find("last:").expect("last key missing");
        assert!(
            first_pos < colors_pos && colors_pos < last_pos,
            "Key ordering should be preserved: first < colors < last.\nGot: {result}"
        );
    }

    #[test]
    fn test_invalid_yaml_source_returns_error() {
        let target = make_temp_file("key: value\n");
        let source = make_temp_file("not: valid: yaml: [[[\n");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        let result = patch_yaml_file(target_path, source_path);
        assert!(result.is_err());
    }
}
