/// Reload ghostty by sending SIGUSR2.
/// Returns Ok even if ghostty isn't running — the config file is already updated.
#[tauri::command]
pub fn reload_ghostty() -> Result<(), String> {
    match std::process::Command::new("pkill")
        .args(["-SIGUSR2", "ghostty"])
        .output()
    {
        Ok(output) => {
            if !output.status.success() {
                log::info!("pkill returned non-zero (ghostty may not be running)");
            }
            Ok(())
        }
        Err(e) => {
            log::warn!("Failed to run pkill: {e}");
            Ok(())
        }
    }
}
