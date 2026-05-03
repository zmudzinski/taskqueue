use std::{fs, path::PathBuf};

use tauri::Manager;

fn state_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let app_data = app
    .path()
    .app_data_dir()
    .map_err(|error| format!("app_data_dir unavailable: {error}"))?;

  fs::create_dir_all(&app_data).map_err(|error| format!("failed to create app data directory: {error}"))?;

  Ok(app_data.join("state.json"))
}

#[tauri::command]
fn save_state(app: tauri::AppHandle, json: String) -> Result<(), String> {
  let path = state_path(&app)?;
  fs::write(path, json).map_err(|error| format!("failed to save state: {error}"))
}

#[tauri::command]
fn load_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
  let path = state_path(&app)?;
  if !path.exists() {
    return Ok(None);
  }

  let data = fs::read_to_string(path).map_err(|error| format!("failed to read state: {error}"))?;
  Ok(Some(data))
}

#[tauri::command]
fn toggle_main_window(window: tauri::Window) -> Result<(), String> {
  let visible = window
    .is_visible()
    .map_err(|error| format!("failed to read visibility: {error}"))?;

  if visible {
    window
      .hide()
      .map_err(|error| format!("failed to hide window: {error}"))?;
  } else {
    window
      .show()
      .map_err(|error| format!("failed to show window: {error}"))?;
    window
      .set_focus()
      .map_err(|error| format!("failed to focus window: {error}"))?;
  }

  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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
    .invoke_handler(tauri::generate_handler![save_state, load_state, toggle_main_window])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
