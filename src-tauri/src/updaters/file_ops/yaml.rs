use std::io::Write;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use yaml_edit::YamlFile;

/// A pending sequence replacement to apply after the yaml_edit pass.
/// yaml_edit's `Mapping::set` / `MappingEntry::set_value` don't properly
/// handle block-sequence indentation in nested mappings, so we collect
/// sequence replacements and apply them as string operations.
struct SequenceReplacement {
    key: String,
    items: Vec<yaml_serde::Value>,
    indent: usize,
}

/// Read a source YAML file, merge it into a target YAML file losslessly
/// (preserving comments and formatting), and write the result back.
///
/// Merge semantics:
/// - Mapping + Mapping → recurse, overlay keys win
/// - Anything else → overlay replaces target entirely
#[tauri::command]
pub fn patch_yaml_file(target_path: String, source_path: String) -> Result<(), String> {
    // Expand tildes and restrict both paths to files under $HOME
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    let target_path = shellexpand::tilde(&target_path).to_string();
    let source_path = shellexpand::tilde(&source_path).to_string();

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

    // Phase 1: Apply overlay for scalars and nested mappings via yaml_edit.
    // Collect sequence replacements for phase 2.
    let mut seq_replacements: Vec<SequenceReplacement> = Vec::new();
    apply_overlay(
        &target_mapping,
        &source_mapping,
        &overlay,
        &mut seq_replacements,
    )?;

    // Get the yaml_edit result (scalars already merged)
    let mut result = target_file.to_string();

    // Phase 2: Apply sequence replacements as string operations.
    for replacement in &seq_replacements {
        result = replace_sequence_in_string(
            &result,
            &replacement.key,
            &replacement.items,
            replacement.indent,
        )?;
    }

    // Atomic write: temp file + persist
    let parent = Path::new(&target_path)
        .parent()
        .ok_or(format!("No parent directory for {target_path}"))?;
    let mut tmp = tempfile::NamedTempFile::new_in(parent)
        .map_err(|e| format!("Failed to create temp file: {e}"))?;
    tmp.write_all(result.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {e}"))?;
    tmp.persist(&target_path)
        .map_err(|e| format!("Failed to persist to {target_path}: {e}"))?;

    Ok(())
}

/// Convert a yaml_serde::Value to a string suitable for YAML scalar output.
fn serde_value_to_yaml_scalar(value: &yaml_serde::Value) -> String {
    match value {
        yaml_serde::Value::String(s) => {
            // Preserve quoting for strings that look like hex colors, etc.
            if s.starts_with('#') || s.contains(' ') || s.contains(':') {
                format!("\"{}\"", s)
            } else {
                s.clone()
            }
        }
        yaml_serde::Value::Number(n) => n.to_string(),
        yaml_serde::Value::Bool(b) => b.to_string(),
        yaml_serde::Value::Null => "null".to_string(),
        // For nested structures in sequences, serialize as YAML
        other => yaml_serde::to_string(other)
            .unwrap_or_default()
            .trim()
            .to_string(),
    }
}

/// Replace a sequence entry in a YAML string by line-based manipulation.
///
/// yaml_edit's `Mapping::set` and `MappingEntry::set_value` don't properly
/// handle block-sequence indentation in nested mappings — sequence items
/// either lose their indentation or the newline between the key and first
/// item is dropped.
///
/// This function works around the limitation by finding the key line at the
/// specified indentation, replacing the subsequent sequence items, and
/// preserving all other content.
fn replace_sequence_in_string(
    content: &str,
    key: &str,
    items: &[yaml_serde::Value],
    indent: usize,
) -> Result<String, String> {
    let lines: Vec<&str> = content.lines().collect();
    let indent_str = " ".repeat(indent);
    let key_prefix = format!("{indent_str}{key}:");

    // Find the line with the key (must match exactly at indent level)
    let key_line_idx = lines
        .iter()
        .position(|line| {
            line.starts_with(&key_prefix)
                && (line.len() == key_prefix.len()
                    || line[key_prefix.len()..].starts_with(' ')
                    || line[key_prefix.len()..].starts_with('\n'))
        })
        .ok_or_else(|| format!("Key '{key}' not found at indent {indent}"))?;

    // Find the extent of the old value: lines indented deeper than the key
    let mut end_idx = key_line_idx + 1;
    while end_idx < lines.len() {
        let line = lines[end_idx];
        if line.is_empty() {
            // Peek ahead — if the next non-empty line is still deeper, include this blank line
            let next_non_empty = lines[end_idx + 1..].iter().find(|l| !l.is_empty());
            if let Some(next) = next_non_empty {
                let next_indent = next.len() - next.trim_start().len();
                if next_indent > indent {
                    end_idx += 1;
                    continue;
                }
            }
            break;
        }
        let line_indent = line.len() - line.trim_start().len();
        if line_indent > indent {
            end_idx += 1;
        } else {
            break;
        }
    }

    // Build the replacement lines
    let item_indent_str = " ".repeat(indent + 2);
    let mut new_lines: Vec<String> = vec![format!("{indent_str}{key}:")];
    for item in items {
        let text = serde_value_to_yaml_scalar(item);
        new_lines.push(format!("{item_indent_str}- {text}"));
    }

    // Reconstruct the content
    let mut result_lines: Vec<String> = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        if i == key_line_idx {
            result_lines.extend(new_lines.iter().cloned());
        } else if i > key_line_idx && i < end_idx {
            continue;
        } else {
            result_lines.push(line.to_string());
        }
    }

    let mut result = result_lines.join("\n");
    if content.ends_with('\n') {
        result.push('\n');
    }

    Ok(result)
}

/// Recursively apply overlay values onto a target mapping.
///
/// Uses yaml_serde for structure decisions (is this a mapping?) and
/// yaml_edit nodes for scalar values (preserves types, quoting).
/// Sequence replacements are collected into `seq_replacements` for
/// a subsequent string-level pass.
fn apply_overlay(
    target_mapping: &yaml_edit::Mapping,
    source_mapping: &yaml_edit::Mapping,
    overlay: &yaml_serde::Value,
    seq_replacements: &mut Vec<SequenceReplacement>,
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
                    apply_overlay(&target_sub, &source_sub, value, seq_replacements)?;
                    continue;
                }
            }
        }

        let is_scalar = matches!(
            value,
            yaml_serde::Value::String(_)
                | yaml_serde::Value::Number(_)
                | yaml_serde::Value::Bool(_)
                | yaml_serde::Value::Null
        );

        if is_scalar {
            // For scalars, use set_value on existing entries to preserve
            // surrounding whitespace/comments, or set() for new entries.
            let source_node = source_mapping
                .get(key_str)
                .ok_or_else(|| format!("Key '{key_str}' missing in source yaml_edit tree"))?;
            if let Some(entry) = target_mapping.find_entry_by_key(key_str) {
                entry.set_value(&source_node, false);
            } else {
                target_mapping.set(key_str, &source_node);
            }
        } else if let yaml_serde::Value::Sequence(seq) = value {
            // Defer sequence replacement to string-level pass.
            let indent = target_mapping.detect_indentation_level();
            seq_replacements.push(SequenceReplacement {
                key: key_str.to_string(),
                items: seq.clone(),
                indent,
            });
        } else {
            // For mappings that don't exist in target (no recursion happened),
            // serialize with yaml_serde and parse as fresh yaml_edit
            let serialized = yaml_serde::to_string(value)
                .map_err(|e| format!("Failed to serialize value for '{key_str}': {e}"))?;
            let wrapper = format!("{key_str}:\n{serialized}");
            let temp_file = YamlFile::from_str(&wrapper)
                .map_err(|e| format!("Failed to parse serialized value: {e}"))?;
            if let Some(temp_doc) = temp_file.documents().next() {
                if let Some(temp_map) = temp_doc.as_mapping() {
                    if let Some(fresh_node) = temp_map.get(key_str) {
                        target_mapping.set(key_str, &fresh_node);
                    }
                }
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::path::PathBuf;

    fn fixture_path(name: &str) -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join(name)
    }

    fn copy_fixture_to_temp(fixture_name: &str) -> tempfile::NamedTempFile {
        let content = std::fs::read_to_string(fixture_path(fixture_name)).unwrap();
        let home = dirs::home_dir().expect("Cannot determine home directory");
        let mut file = tempfile::NamedTempFile::new_in(home).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file
    }

    fn make_temp_file(content: &str) -> tempfile::NamedTempFile {
        let home = dirs::home_dir().expect("Cannot determine home directory");
        let mut file = tempfile::NamedTempFile::new_in(home).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file
    }

    #[test]
    fn test_lazygit_theme_merge() {
        let target = copy_fixture_to_temp("yaml/lazygit-config.yml");
        let source = copy_fixture_to_temp("yaml/lazygit-theme-source.yml");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();
        let expected =
            std::fs::read_to_string(fixture_path("yaml/lazygit-config-expected.yml")).unwrap();

        assert_eq!(
            result.trim_end(),
            expected.trim_end(),
            "Merged output does not match expected fixture.\n\n--- ACTUAL ---\n{result}\n--- EXPECTED ---\n{expected}"
        );

        // Verify the result is valid YAML that can be parsed
        let parsed: Result<yaml_serde::Value, _> = yaml_serde::from_str(&result);
        assert!(
            parsed.is_ok(),
            "Merged output is not valid YAML: {:?}",
            parsed.err()
        );
    }

    #[test]
    fn test_simple_scalar_merge() {
        let target = copy_fixture_to_temp("yaml/simple-config.yml");
        let source = copy_fixture_to_temp("yaml/simple-overlay.yml");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();
        let expected =
            std::fs::read_to_string(fixture_path("yaml/simple-config-expected.yml")).unwrap();

        assert_eq!(
            result.trim_end(),
            expected.trim_end(),
            "Simple merge output does not match expected.\n\n--- ACTUAL ---\n{result}\n--- EXPECTED ---\n{expected}"
        );
    }

    #[test]
    fn test_merge_preserves_comments() {
        let target = copy_fixture_to_temp("yaml/lazygit-config.yml");
        let source = copy_fixture_to_temp("yaml/lazygit-theme-source.yml");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();

        assert!(
            result.contains("# Theme colors managed by pick-theme"),
            "Section comment should survive: {result}"
        );
        assert!(
            result.contains("# stuff relating to the UI"),
            "UI comment should survive: {result}"
        );
        assert!(
            result.contains("# yaml-language-server"),
            "Header comment should survive: {result}"
        );
        assert!(
            result.contains("# how many lines you scroll by"),
            "Inline comment should survive: {result}"
        );
    }

    #[test]
    fn test_merge_preserves_untouched_sections() {
        let target = copy_fixture_to_temp("yaml/lazygit-config.yml");
        let source = copy_fixture_to_temp("yaml/lazygit-theme-source.yml");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        patch_yaml_file(target_path.clone(), source_path).unwrap();

        let result = std::fs::read_to_string(&target_path).unwrap();

        assert!(
            result.contains("autoFetch: true"),
            "git.autoFetch should be preserved: {result}"
        );
        assert!(
            result.contains("mainBranches: [master, main]"),
            "git.mainBranches should be preserved: {result}"
        );
        assert!(
            result.contains("confirmOnQuit: false"),
            "confirmOnQuit should be preserved: {result}"
        );
        assert!(
            result.contains("open: \"zed {{filename}}\""),
            "os.open should be preserved: {result}"
        );
        assert!(
            result.contains("editInTerminal: false"),
            "os.editInTerminal should be preserved: {result}"
        );
        assert!(
            result.contains("branchColors:"),
            "branchColors should be preserved: {result}"
        );
    }

    #[test]
    fn test_target_not_found() {
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
    fn test_source_not_found() {
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
    fn test_target_outside_home() {
        let source = make_temp_file("key: value\n");
        let source_path = source.path().to_str().unwrap().to_string();

        let result = patch_yaml_file("/etc/config.yml".to_string(), source_path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("outside home directory"));
    }

    #[test]
    fn test_source_outside_home() {
        let target = make_temp_file("key: value\n");
        let target_path = target.path().to_str().unwrap().to_string();

        let result = patch_yaml_file(target_path, "/etc/theme.yml".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("outside home directory"));
    }

    #[test]
    fn test_invalid_yaml_source() {
        let target = make_temp_file("key: value\n");
        let source = make_temp_file("not: valid: yaml: [[[\n");
        let target_path = target.path().to_str().unwrap().to_string();
        let source_path = source.path().to_str().unwrap().to_string();

        let result = patch_yaml_file(target_path, source_path);
        assert!(result.is_err());
    }
}
