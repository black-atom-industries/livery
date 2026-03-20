mod config;
mod updaters;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn start_app() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            config::commands::get_config,
            config::commands::save_config,
            updaters::config_file::replace_in_file,
            updaters::ghostty::reload_ghostty,
            updaters::nvim::reload_nvim,
            updaters::tmux::reload_tmux,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
