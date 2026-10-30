import { contextBridge } from 'electron'

/**
 * PDF Field Mapper preload bridge.
 *
 * This file defines the functionality that the React renderer
 * is allowed to access from Electron.
 *
 * Do not expose ipcRenderer directly.
 *
 * Future application functionality should be implemented through
 * narrowly scoped methods with validated arguments.
 */

// Public API exposed to the renderer process.
const electronAPI = {
  /**
   * Returns the current desktop application version.
   *
   * This initial implementation is a placeholder.
   * Version retrieval will be connected through a dedicated
   * IPC handler when application services are implemented.
   */
  getAppVersion: (): string => {
    return '0.0.0'
  },
}

// Expose the controlled API to the renderer.
contextBridge.exposeInMainWorld(
  'electronAPI',
  electronAPI
)