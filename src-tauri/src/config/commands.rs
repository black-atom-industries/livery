use super::io;
use super::types::Config;

#[tauri::command]
pub fn get_config() -> Config {
    io::ensure_config_exists();

    let mut config = io::read_config_from_disk();
    io::expand_app_paths(&mut config);
    config
}

#[tauri::command]
pub fn save_config(mut config: Config) -> Result<(), String> {
    io::collapse_app_paths(&mut config);
    io::write_config_to_disk(&config)?;
    Ok(())
}
