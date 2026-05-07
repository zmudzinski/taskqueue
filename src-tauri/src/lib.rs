use std::{
  fs,
  path::PathBuf,
  sync::Mutex,
};

#[cfg(not(debug_assertions))]
use tauri::{Emitter, Manager};
#[cfg(debug_assertions)]
use tauri::Manager;
#[cfg(not(debug_assertions))]
use tauri_plugin_updater::UpdaterExt;

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

/// Holds the pending update so we can download/install it when the user confirms.
struct PendingUpdate(Mutex<Option<tauri_plugin_updater::Update>>);

#[tauri::command]
async fn install_update(
  app: tauri::AppHandle,
  pending: tauri::State<'_, PendingUpdate>,
) -> Result<(), String> {
  let update = pending.0.lock().unwrap().take();
  if let Some(update) = update {
    update
      .download_and_install(|_chunk, _total| {}, || {})
      .await
      .map_err(|e| e.to_string())?;
    app.restart();
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(PendingUpdate(Mutex::new(None)))
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Check for updates in the background (release builds only).
      // On finding one, emit "update-available" so the UI can prompt the user.
      #[cfg(not(debug_assertions))]
      {
        let handle = app.handle().clone();
        tauri::async_runtime::spawn(async move {
          let Ok(updater) = handle.updater_builder().build() else {
            return;
          };
          match updater.check().await {
            Ok(Some(update)) => {
              let version = update.version.clone();
              if let Some(state) = handle.try_state::<PendingUpdate>() {
                *state.0.lock().unwrap() = Some(update);
              }
              let _ = handle.emit("update-available", version);
            }
            Ok(None) => {}
            Err(e) => log::warn!("Update check failed: {e}"),
          }
        });
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      save_state,
      load_state,
      toggle_main_window,
      install_update,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
