// ============================================================
// PDF FIELD MAPPER - ELECTRON RENDERER BRIDGE TYPES
// ============================================================
// Type-only import from preload keeps the IPC request/response
// contract consistent between Electron and the React renderer.
// This declaration does not expose Node.js or ipcRenderer.
// ============================================================

import type {
  SaveMappedPdfRequest,
  SaveMappedPdfResult,
} from '../../electron/preload'

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => string
      saveMappedPdf: (
        request: SaveMappedPdfRequest
      ) => Promise<SaveMappedPdfResult>
    }
  }
}

export {}
