/// Reload tmux by sourcing the config file.
/// Returns Ok even if tmux isn't running.
#[tauri::command]
pub fn reload_tmux(config_path: String) -> Result<(), String> {
    match std::process::Command::new("tmux")
        .args(["source-file", &config_path])
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                log::info!("Reloaded tmux config: {config_path}");
            } else {
                log::info!("tmux source-file returned non-zero (tmux may not be running)");
            }
            Ok(())
        }
        Err(e) => {
            log::warn!("Failed to run tmux: {e}");
            Ok(())
        }
    }
}
