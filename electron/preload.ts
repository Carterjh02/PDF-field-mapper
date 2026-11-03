// ============================================================
// PDF FIELD MAPPER
// ELECTRON PRELOAD BRIDGE
// ============================================================
//
// PURPOSE:
//
// Expose carefully controlled Electron functionality to
// the React renderer.
//
// SECURITY:
//
// - Context isolation remains enabled.
// - Node integration remains disabled.
// - The renderer does not receive ipcRenderer directly.
// - Only explicitly approved operations are exposed.
//
// IMPORTANT:
//
// Python execution and filesystem operations happen in
// the Electron main process.
//
// The preload script only forwards validated requests.
//
// ============================================================

import {
  contextBridge,
  ipcRenderer,
} from 'electron'


// ============================================================
// PDF RENAME INSTRUCTION
// ============================================================

export interface PdfRenameInstruction {

  originalName: string

  canonicalName: string

}


// ============================================================
// SAVE MAPPED PDF REQUEST
// ============================================================
//
// React sends:
//
// - The original PDF filename.
// - The original PDF contents.
// - A validated list of field-name changes.
//
// Filesystem paths are not provided by React.
//
// Electron handles the Save As dialog and temporary files.
//
// ============================================================

export interface SaveMappedPdfRequest {

  fileName: string

  pdfBytes: Uint8Array

  renames: PdfRenameInstruction[]

}


// ============================================================
// SAVE MAPPED PDF RESULT
// ============================================================
//
// Three possible outcomes:
//
// 1. Successful PDF save.
// 2. User cancelled the Save As dialog.
// 3. PDF processing failed.
//
// This distinction will be important when we connect
// successful saves to Supabase learning.
//
// ============================================================

export type SaveMappedPdfResult =

  | {

      ok: true

      cancelled: false

      outputPath: string

      pageCount: number

      logicalFieldCount: number

      renamedFieldCount: number

      appliedRenames: PdfRenameInstruction[]

    }

  | {

      ok: false

      cancelled: true

    }

  | {

      ok: false

      cancelled: false

      error: string

    }


// ============================================================
// APPROVED IPC CHANNELS
// ============================================================

const PDF_SAVE_CHANNEL =
  'pdf:save-mapped'


// ============================================================
// PUBLIC ELECTRON API
// ============================================================
//
// This is the only interface exposed to React.
//
// Do not expose ipcRenderer directly.
//
// ============================================================

const electronAPI = {

  // ==========================================================
  // APPLICATION VERSION
  // ==========================================================
  //
  // Preserve the existing application-version method.
  //
  // A dedicated version IPC handler can replace this
  // placeholder in a later milestone.
  //
  // ==========================================================

  getAppVersion: (): string => {

    return '0.0.0'

  },

  // ==========================================================
  // SAVE MAPPED PDF
  // ==========================================================
  //
  // Sends approved PDF-processing instructions to
  // the Electron main process.
  //
  // The main process:
  //
  // - Validates the request.
  // - Displays Save As.
  // - Executes Python.
  // - Saves the modified PDF.
  // - Returns the processing result.
  //
  // The preload does not access the filesystem
  // or launch Python directly.
  //
  // ==========================================================

  saveMappedPdf: (

    request: SaveMappedPdfRequest

  ): Promise<SaveMappedPdfResult> => {

    return ipcRenderer.invoke(
      PDF_SAVE_CHANNEL,
      request
    ) as Promise<SaveMappedPdfResult>

  },

}


// ============================================================
// EXPOSE CONTROLLED API TO REACT
// ============================================================
//
// React will eventually access:
//
// window.electronAPI.saveMappedPdf(...)
//
// The corresponding TypeScript Window declaration
// will be added when connecting the Editor.
//
// ============================================================

contextBridge.exposeInMainWorld(
  'electronAPI',
  electronAPI
)