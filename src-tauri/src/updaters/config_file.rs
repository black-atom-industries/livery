use std::collections::HashMap;

use regex::Regex;

/// Read a file, apply regex replacement with template variables, and write it back.
/// Variables are rendered into the replace_template before replacement.
/// Supported variable placeholders: {themeKey}, {appearance}, {collectionKey}, {themesPath}
#[tauri::command]
pub fn replace_in_file(
    path: String,
    match_pattern: String,
    replace_template: String,
    variables: HashMap<String, String>,
) -> Result<(), String> {
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

    // Replace first match only
    let updated = regex.replace(&content, rendered.as_str()).to_string();

    // Write back
    std::fs::write(&path, updated).map_err(|e| format!("Failed to write {path}: {e}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn write_temp_file(content: &str) -> String {
        let mut file = tempfile::NamedTempFile::new().unwrap();
        file.write_all(content.as_bytes()).unwrap();
        let path = file.into_temp_path();
        let path_str = path.to_string_lossy().to_string();
        // Keep the file by leaking the temp path (it's a test)
        std::mem::forget(path);
        path_str
    }

    #[test]
    fn test_replace_ghostty_theme() {
        let path = write_temp_file("# Colors\ntheme = old-theme.conf\nbold-is-bright = false");
        let mut vars = HashMap::new();
        vars.insert("themeKey".to_string(), "new-theme".to_string());

        replace_in_file(
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
        let path = write_temp_file(
            "return {\n    colorscheme = \"old-theme\",\n    debug = false,\n}",
        );
        let mut vars = HashMap::new();
        vars.insert("themeKey".to_string(), "new-theme".to_string());

        replace_in_file(
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
        let path = write_temp_file("source-file ~/themes/terra/old.conf\nother line");
        let mut vars = HashMap::new();
        vars.insert("themeKey".to_string(), "new-theme".to_string());
        vars.insert("collectionKey".to_string(), "jpn".to_string());
        vars.insert("themesPath".to_string(), "~/themes".to_string());

        replace_in_file(
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
        let path = write_temp_file("[delta]\n    features = black-atom-dark");
        let mut vars = HashMap::new();
        vars.insert("themeKey".to_string(), "any".to_string());
        vars.insert("appearance".to_string(), "light".to_string());

        replace_in_file(
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
        let path = write_temp_file("no match here");
        let vars = HashMap::new();

        let result = replace_in_file(
            path,
            r"^theme\s*=\s*.+$".to_string(),
            "theme = new".to_string(),
            vars,
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Pattern not found"));
    }
}
