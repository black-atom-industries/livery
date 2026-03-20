use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};

use regex::Regex;

/// Read a file, apply regex replacement with template variables, and write it back.
/// Variables are rendered into the replace_template before replacement.
/// Supported variable placeholders: {themeKey}, {appearance}, {collectionKey}, {themesPath}
#[tauri::command]
pub fn patch_text_file(
    path: String,
    match_pattern: String,
    replace_template: String,
    variables: HashMap<String, String>,
) -> Result<(), String> {
    // Restrict writes to files under $HOME
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    let resolved = PathBuf::from(&path);
    if !resolved.starts_with(&home) {
        return Err(format!(
            "Path outside home directory is not allowed: {path}"
        ));
    }

    // Read file
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read {path}: {e}"))?;

    // Compile regex with multiline mode
    let regex = Regex::new(&format!("(?m){match_pattern}"))
        .map_err(|e| format!("Invalid regex pattern: {e}"))?;

    // Check pattern exists in content
    if !regex.is_match(&content) {
        return Err(format!("Pattern not found in {path}: {match_pattern}"));
    }

    // Render template with variables
    let mut rendered = replace_template.clone();
    for (key, value) in &variables {
        let placeholder = format!("{{{key}}}");
        rendered = rendered.replace(&placeholder, value);
    }

    // Validate no unreplaced placeholders remain
    let re_placeholder = Regex::new(r"\{[a-zA-Z]+\}").unwrap();
    if re_placeholder.is_match(&rendered) {
        let missing: Vec<&str> = re_placeholder
            .find_iter(&rendered)
            .map(|m| m.as_str())
            .collect();
        return Err(format!(
            "Unreplaced placeholders in template: {}",
            missing.join(", ")
        ));
    }

    // Replace first match only
    let updated = regex.replace(&content, rendered.as_str()).to_string();

    // Atomic write: temp file + persist
    let parent = Path::new(&path)
        .parent()
        .ok_or(format!("No parent directory for {path}"))?;
    let mut tmp = tempfile::NamedTempFile::new_in(parent)
        .map_err(|e| format!("Failed to create temp file: {e}"))?;
    tmp.write_all(updated.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {e}"))?;
    tmp.persist(&path)
        .map_err(|e| format!("Failed to persist to {path}: {e}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_temp_file(content: &str) -> tempfile::NamedTempFile {
        let home = dirs::home_dir().expect("Cannot determine home directory");
        let mut file = tempfile::NamedTempFile::new_in(home).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file
    }

    #[test]
    fn test_replace_ghostty_theme() {
        let file = make_temp_file("# Colors\ntheme = old-theme.conf\nbold-is-bright = false");
        let path = file.path().to_str().unwrap().to_string();
        let mut vars = HashMap::new();
        vars.insert("themeKey".to_string(), "new-theme".to_string());

        patch_text_file(
            path.clone(),
            r"^theme\s*=\s*.+$".to_string(),
            "theme = {themeKey}.conf".to_string(),
            vars,
        )
        .unwrap();

        let result = std::fs::read_to_string(&path).unwrap();
        assert!(result.contains("theme = new-theme.conf"));
        assert!(result.contains("bold-is-bright = false"));
    }

    #[test]
    fn test_replace_nvim_colorscheme() {
        let file =
            make_temp_file("return {\n    colorscheme = \"old-theme\",\n    debug = false,\n}");
        let path = file.path().to_str().unwrap().to_string();
        let mut vars = HashMap::new();
        vars.insert("themeKey".to_string(), "new-theme".to_string());

        patch_text_file(
            path.clone(),
            r#"colorscheme\s*=\s*"[^"]*""#.to_string(),
            "colorscheme = \"{themeKey}\"".to_string(),
            vars,
        )
        .unwrap();

        let result = std::fs::read_to_string(&path).unwrap();
        assert!(result.contains("colorscheme = \"new-theme\""));
    }

    #[test]
    fn test_replace_tmux_source_file() {
        let file = make_temp_file("source-file ~/themes/terra/old.conf\nother line");
        let path = file.path().to_str().unwrap().to_string();
        let mut vars = HashMap::new();
        vars.insert("themeKey".to_string(), "new-theme".to_string());
        vars.insert("collectionKey".to_string(), "jpn".to_string());
        vars.insert("themesPath".to_string(), "~/themes".to_string());

        patch_text_file(
            path.clone(),
            r"^source-file\s+.+/themes/.+\.conf$".to_string(),
            "source-file {themesPath}/{collectionKey}/{themeKey}.conf".to_string(),
            vars,
        )
        .unwrap();

        let result = std::fs::read_to_string(&path).unwrap();
        assert!(result.contains("source-file ~/themes/jpn/new-theme.conf"));
    }

    #[test]
    fn test_replace_delta_appearance() {
        let file = make_temp_file("[delta]\n    features = black-atom-dark");
        let path = file.path().to_str().unwrap().to_string();
        let mut vars = HashMap::new();
        vars.insert("themeKey".to_string(), "any".to_string());
        vars.insert("appearance".to_string(), "light".to_string());

        patch_text_file(
            path.clone(),
            r"features\s*=\s*black-atom-(dark|light)".to_string(),
            "features = black-atom-{appearance}".to_string(),
            vars,
        )
        .unwrap();

        let result = std::fs::read_to_string(&path).unwrap();
        assert!(result.contains("features = black-atom-light"));
    }

    #[test]
    fn test_pattern_not_found_returns_error() {
        let file = make_temp_file("no match here");
        let path = file.path().to_str().unwrap().to_string();
        let vars = HashMap::new();

        let result = patch_text_file(
            path,
            r"^theme\s*=\s*.+$".to_string(),
            "theme = new".to_string(),
            vars,
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Pattern not found"));
    }
}
