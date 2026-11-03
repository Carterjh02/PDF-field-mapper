// ============================================================
// PDF FIELD MAPPER
// ELECTRON MAIN PROCESS
// ============================================================
//
// PURPOSE:
//
// Manage the Electron desktop application and provide
// controlled access to privileged desktop functionality.
//
// RESPONSIBILITIES:
//
// - Create the main application window.
// - Preserve existing Electron security settings.
// - Manage application lifecycle events.
// - Receive approved PDF-processing requests.
// - Validate requests before invoking Python.
// - Display the system Save As dialog.
// - Execute the local Python PDF processor.
// - Handle processing errors and timeouts.
// - Clean up temporary files.
// - Return PDF save results to React.
//
// IMPORTANT:
//
// React does not receive unrestricted filesystem access.
//
// Python is executed only through a controlled IPC handler.
//
// Original PDF documents are never overwritten.
//
// ============================================================

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
} from 'electron'

import {
  fileURLToPath,
} from 'node:url'

import path from 'node:path'

import os from 'node:os'

import {
  spawn,
} from 'node:child_process'

import {
  promises as fs,
} from 'node:fs'


// ============================================================
// APPLICATION DIRECTORIES
// ============================================================

// Resolve the current directory in an ES module environment.
const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
)

// Application root directory.
const APP_ROOT = path.join(
  __dirname,
  '..'
)

process.env.APP_ROOT = APP_ROOT

// Development server address.
const VITE_DEV_SERVER_URL =
  process.env['VITE_DEV_SERVER_URL']

// Compiled React application directory.
const RENDERER_DIST = path.join(
  APP_ROOT,
  'dist'
)


// ============================================================
// MAIN APPLICATION WINDOW
// ============================================================

let mainWindow: BrowserWindow | null = null


// ============================================================
// PDF PROCESSING CONFIGURATION
// ============================================================

// Dedicated IPC channel for saving mapped PDFs.
const PDF_SAVE_CHANNEL = 'pdf:save-mapped'

// Maximum PDF size accepted through the IPC bridge.
//
// This is a safety limit for the initial implementation.
// It can be adjusted later for larger documents.
const MAX_PDF_SIZE_BYTES =
  100 * 1024 * 1024

// Maximum number of rename instructions.
const MAX_RENAME_COUNT = 5000

// Maximum time allowed for Python processing.
const PYTHON_TIMEOUT_MS = 120_000

// Maximum Python stdout response size.
const MAX_PYTHON_OUTPUT_BYTES =
  1024 * 1024

// Maximum captured Python error-output size.
const MAX_PYTHON_ERROR_BYTES =
  64 * 1024


// ============================================================
// PDF SAVE REQUEST TYPES
// ============================================================

interface PdfRenameInstruction {

  originalName: string

  canonicalName: string

}

interface SaveMappedPdfRequest {

  // Original filename for suggesting the output filename.
  fileName: string

  // Original PDF contents.
  pdfBytes: Uint8Array

  // Reviewed field-name changes.
  renames: PdfRenameInstruction[]

}


// ============================================================
// PYTHON RESPONSE TYPES
// ============================================================

interface PythonPdfSuccess {

  ok: true

  outputPath: string

  pageCount: number

  logicalFieldCount: number

  renamedFieldCount: number

  appliedRenames: PdfRenameInstruction[]

}

interface PythonPdfFailure {

  ok: false

  error: string

}

type PythonPdfResponse =
  | PythonPdfSuccess
  | PythonPdfFailure


// ============================================================
// ELECTRON SAVE RESULT
// ============================================================

type SaveMappedPdfResult =

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
// VALIDATE GENERAL OBJECT
// ============================================================

function isRecord(
  value: unknown
): value is Record<string, unknown> {

  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )

}


// ============================================================
// VALIDATE PDF SAVE REQUEST
// ============================================================
//
// The React renderer is not trusted to provide arbitrary
// filesystem paths or executable commands.
//
// This function validates all incoming instructions.
//
// Python independently validates the actual PDF structure.
//
// ============================================================

function validateSaveRequest(
  value: unknown
): SaveMappedPdfRequest {

  if (!isRecord(value)) {

    throw new Error(
      'Invalid PDF save request.'
    )

  }

  // ----------------------------------------------------------
  // VALIDATE FILENAME
  // ----------------------------------------------------------

  if (
    typeof value.fileName !== 'string' ||
    !value.fileName.trim() ||
    value.fileName.length > 255
  ) {

    throw new Error(
      'A valid PDF filename is required.'
    )

  }

  if (
    !value.fileName.toLowerCase().endsWith('.pdf')
  ) {

    throw new Error(
      'Only PDF documents can be processed.'
    )

  }

  // ----------------------------------------------------------
  // VALIDATE PDF BYTES
  // ----------------------------------------------------------

  if (
    !(value.pdfBytes instanceof Uint8Array)
  ) {

    throw new Error(
      'The PDF contents are missing or invalid.'
    )

  }

  const pdfBytes = value.pdfBytes

  if (
    pdfBytes.byteLength === 0 ||
    pdfBytes.byteLength > MAX_PDF_SIZE_BYTES
  ) {

    throw new Error(
      'The PDF must be non-empty and smaller than 100 MB.'
    )

  }

  // Confirm the input begins with a PDF signature.
  //
  // The Python processor will perform complete structural
  // validation when the file is opened.

  const signature = String.fromCharCode(
    ...pdfBytes.subarray(0, 5)
  )

  if (signature !== '%PDF-') {

    throw new Error(
      'The selected file does not contain a recognized PDF header.'
    )

  }

  // ----------------------------------------------------------
  // VALIDATE RENAME INSTRUCTIONS
  // ----------------------------------------------------------

  if (
    !Array.isArray(value.renames) ||
    value.renames.length === 0 ||
    value.renames.length > MAX_RENAME_COUNT
  ) {

    throw new Error(
      'At least one valid PDF field rename is required.'
    )

  }

  const renames: PdfRenameInstruction[] = []

  const originalNames = new Set<string>()

  for (const item of value.renames) {

    if (!isRecord(item)) {

      throw new Error(
        'Invalid field rename instruction.'
      )

    }

    const originalName =
      item.originalName

    const canonicalName =
      item.canonicalName

    if (
      typeof originalName !== 'string' ||
      typeof canonicalName !== 'string'
    ) {

      throw new Error(
        'Field names must be strings.'
      )

    }

    if (
      !originalName.trim() ||
      originalName.length > 255
    ) {

      throw new Error(
        'A PDF field has an invalid original name.'
      )

    }

    // The initial Python processor supports simple
    // nonhierarchical canonical identifiers.

    if (
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(
        canonicalName
      )
    ) {

      throw new Error(
        `Invalid canonical field name: "${canonicalName}".`
      )

    }

    if (
      originalNames.has(originalName)
    ) {

      throw new Error(
        `Duplicate rename instructions were provided ` +
        `for "${originalName}".`
      )

    }

    originalNames.add(originalName)

    renames.push({
      originalName,
      canonicalName,
    })

  }

  return {

    fileName: value.fileName,

    pdfBytes,

    renames,

  }

}


// ============================================================
// CREATE SUGGESTED OUTPUT FILENAME
// ============================================================
//
// Prevent directory information and invalid filename
// characters from affecting the Save As dialog.
//
// Example:
//
// PermitApplication.pdf
//
// becomes:
//
// PermitApplication-mapped.pdf
//
// ============================================================

function createSuggestedFileName(
  originalName: string
): string {

  const basename = path.basename(
    originalName
  )

  const withoutExtension =
    basename.replace(/\.pdf$/i, '')

    // ============================================================
    // SANITIZE OUTPUT FILENAME
    // ============================================================
    //
    // Remove characters that Windows does not permit in
    // filenames.
    //
    // Unicode category Cc identifies control characters
    // without explicitly including them in the regex.
    //
    // This avoids ESLint's no-control-regex warning.
    //
    // ============================================================
    
    const safeName = withoutExtension
    
      // Replace characters prohibited in Windows filenames.
      .replace(
        /[<>:"/\\|?*]/g,
        '_'
      )
    
      // Replace control characters.
      .replace(
        /\p{Cc}/gu,
        '_'
      )
    
      // Remove trailing periods and spaces.
      .replace(
        /[. ]+$/g,
        ''
      )
    
      // Keep the suggested filename reasonably short.
      .slice(0, 180)

  return `${
    safeName || 'document'
  }-mapped.pdf`

}


// ============================================================
// RESOLVE PYTHON PROCESSOR PATHS
// ============================================================
//
// DEVELOPMENT:
//
// Python interpreter:
// .venv/Scripts/python.exe
//
// Python processor:
// python/pdf_processor.py
//
// IMPORTANT:
//
// The packaged application will eventually contain
// a bundled Python executable.
//
// Until packaging support is implemented, this function
// explicitly rejects packaged execution rather than
// attempting to run an unavailable interpreter.
//
// ============================================================

async function getPythonProcessorPaths(): Promise<{

  pythonExecutable: string

  processorScript: string

}> {

  if (app.isPackaged) {

    throw new Error(
      'The Python PDF processor has not yet been bundled ' +
      'with the packaged application. ' +
      'PDF saving is currently supported in development.'
    )

  }

  const pythonExecutable = path.join(
    APP_ROOT,
    '.venv',
    'Scripts',
    'python.exe'
  )

  const processorScript = path.join(
    APP_ROOT,
    'python',
    'pdf_processor.py'
  )

  // ----------------------------------------------------------
  // VERIFY PYTHON EXECUTABLE EXISTS
  // ----------------------------------------------------------

  try {

    await fs.access(
      pythonExecutable
    )

  } catch {

    throw new Error(
      'The project Python environment was not found. ' +
      'Create the .venv environment and install the ' +
      'dependencies from python/requirements.txt.'
    )

  }

  // ----------------------------------------------------------
  // VERIFY PROCESSOR SCRIPT EXISTS
  // ----------------------------------------------------------

  try {

    await fs.access(
      processorScript
    )

  } catch {

    throw new Error(
      'python/pdf_processor.py could not be found.'
    )

  }

  return {

    pythonExecutable,

    processorScript,

  }

}


// ============================================================
// VERIFY OUTPUT PATH DOES NOT ALREADY EXIST
// ============================================================
//
// The initial version never replaces existing files.
//
// This provides additional protection against
// accidentally overwriting the original PDF.
//
// The Python processor performs the same check again.
//
// ============================================================

async function ensureOutputDoesNotExist(
  outputPath: string
): Promise<void> {

  try {

    await fs.lstat(outputPath)

    throw new Error(
      'A file with that name already exists. ' +
      'Choose a different output filename.'
    )

  } catch (error) {

    const fileError =
      error as NodeJS.ErrnoException

    if (fileError.code === 'ENOENT') {
      return
    }

    throw error

  }

}


// ============================================================
// RUN PYTHON PDF PROCESSOR
// ============================================================
//
// Python receives a JSON request through stdin.
//
// Python returns one JSON response through stdout.
//
// Shell execution is disabled.
//
// No user-supplied command-line arguments are executed.
//
// Processing is subject to a timeout and output limits.
//
// ============================================================

async function runPythonProcessor(

  pythonExecutable: string,

  processorScript: string,

  sourcePath: string,

  outputPath: string,

  renames: PdfRenameInstruction[]

): Promise<PythonPdfSuccess> {

  const pythonRequest = {

    action: 'rename_fields',

    sourcePath,

    outputPath,

    renames,

  }

  return new Promise<PythonPdfSuccess>(
    (resolve, reject) => {

      let finished = false

      let stdout = ''

      let stderr = ''

      // ------------------------------------------------------
      // START PYTHON
      // ------------------------------------------------------

      const child = spawn(

        pythonExecutable,

        [
          processorScript,
        ],

        {
          cwd: APP_ROOT,

          shell: false,

          windowsHide: true,

          stdio: [
            'pipe',
            'pipe',
            'pipe',
          ],
        }

      )

      // ------------------------------------------------------
      // COMPLETE REQUEST
      // ------------------------------------------------------

      function finish(
        error: Error | null,
        result?: PythonPdfSuccess
      ) {

        if (finished) {
          return
        }

        finished = true

        clearTimeout(timeout)

        if (error) {

          reject(error)

        } else if (result) {

          resolve(result)

        } else {

          reject(
            new Error(
              'Python processing ended without a result.'
            )
          )

        }

      }

      // ------------------------------------------------------
      // TIMEOUT
      // ------------------------------------------------------

      const timeout = setTimeout(() => {

        child.kill()

        finish(
          new Error(
            'PDF processing timed out after 120 seconds.'
          )
        )

      }, PYTHON_TIMEOUT_MS)

      // ------------------------------------------------------
      // COLLECT STANDARD OUTPUT
      // ------------------------------------------------------

      child.stdout.on(
        'data',
        (chunk: Buffer) => {

          stdout += chunk.toString('utf8')

          if (
            Buffer.byteLength(stdout, 'utf8') >
            MAX_PYTHON_OUTPUT_BYTES
          ) {

            child.kill()

            finish(
              new Error(
                'Python returned more output than expected.'
              )
            )

          }

        }
      )

      // ------------------------------------------------------
      // COLLECT ERROR OUTPUT
      // ------------------------------------------------------

      child.stderr.on(
        'data',
        (chunk: Buffer) => {

          if (
            Buffer.byteLength(stderr, 'utf8') <
            MAX_PYTHON_ERROR_BYTES
          ) {

            stderr += chunk.toString('utf8')

          }

        }
      )

      // ------------------------------------------------------
      // HANDLE PROCESS START FAILURE
      // ------------------------------------------------------

      child.on(
        'error',
        (error) => {

          finish(
            new Error(
              `Unable to start Python: ${error.message}`
            )
          )

        }
      )

      // ------------------------------------------------------
      // HANDLE PROCESS COMPLETION
      // ------------------------------------------------------

      child.on(
        'close',
        (exitCode) => {

          if (finished) {
            return
          }

          let response: PythonPdfResponse

          try {

            response = JSON.parse(
              stdout.trim()
            ) as PythonPdfResponse

          } catch {

            finish(
              new Error(
                'Python did not return a valid JSON response. ' +
                (stderr.trim() || 'No error details were provided.')
              )
            )

            return

          }

          // Python reported an application-level error.
          if (!response.ok) {

            finish(
              new Error(
                response.error ||
                'Python could not process the PDF.'
              )
            )

            return

          }

          // The process must exit successfully.
          if (exitCode !== 0) {

            finish(
              new Error(
                `Python exited with code ${exitCode}. ` +
                stderr.trim()
              )
            )

            return

          }

          finish(
            null,
            response
          )

        }
      )

      // ------------------------------------------------------
      // HANDLE STANDARD INPUT ERRORS
      // ------------------------------------------------------

      child.stdin.on(
        'error',
        (error: NodeJS.ErrnoException) => {

          // EPIPE may occur if Python exits early.
          // The close handler will report Python's
          // own error response when available.

          if (error.code === 'EPIPE') {
            return
          }

          finish(
            new Error(
              `Unable to send PDF instructions to Python: ` +
              error.message
            )
          )

        }
      )

      // ------------------------------------------------------
      // SEND JSON INSTRUCTIONS
      // ------------------------------------------------------

      child.stdin.end(
        JSON.stringify(pythonRequest)
      )

    }
  )

}


// ============================================================
// SAVE MAPPED PDF
// ============================================================
//
// Main Electron-side save operation.
//
// WORKFLOW:
//
// 1. Validate renderer request.
// 2. Verify Python is available.
// 3. Display Save As dialog.
// 4. Create temporary source PDF.
// 5. Execute Python.
// 6. Verify output exists.
// 7. Return result.
// 8. Clean up temporary files.
//
// No Supabase writes occur here.
//
// ============================================================

async function handleSaveMappedPdf(

  event: IpcMainInvokeEvent,

  incomingRequest: unknown

): Promise<SaveMappedPdfResult> {

  let temporaryDirectory: string | null = null

  try {

    // ========================================================
    // STEP 1: VERIFY REQUEST ORIGIN
    // ========================================================

    if (
      !mainWindow ||
      event.sender !== mainWindow.webContents
    ) {

      throw new Error(
        'PDF save requests are only allowed from ' +
        'the main application window.'
      )

    }

    // ========================================================
    // STEP 2: VALIDATE REQUEST
    // ========================================================

    const request =
      validateSaveRequest(incomingRequest)

    // ========================================================
    // STEP 3: VERIFY PYTHON AVAILABILITY
    // ========================================================

    const {
      pythonExecutable,
      processorScript,
    } = await getPythonProcessorPaths()

    // ========================================================
    // STEP 4: OPEN SAVE AS DIALOG
    // ========================================================

    const suggestedFileName =
      createSuggestedFileName(
        request.fileName
      )

    const saveResult =
      await dialog.showSaveDialog(
        mainWindow,
        {
          title: 'Save Mapped PDF',

          defaultPath: path.join(
            app.getPath('documents'),
            suggestedFileName
          ),

          buttonLabel: 'Save Mapped PDF',

          filters: [
            {
              name: 'PDF Documents',
              extensions: ['pdf'],
            },
          ],

          properties: [
            'createDirectory',
            'showOverwriteConfirmation',
          ],
        }
      )

    // ========================================================
    // STEP 5: HANDLE CANCELLATION
    // ========================================================

    if (
      saveResult.canceled ||
      !saveResult.filePath
    ) {

      return {
        ok: false,
        cancelled: true,
      }

    }

    const outputPath =
      path.resolve(
        saveResult.filePath
      )

    if (
      path.extname(outputPath).toLowerCase() !== '.pdf'
    ) {

      throw new Error(
        'The output filename must end with .pdf.'
      )

    }

    // Never overwrite an existing file.
    await ensureOutputDoesNotExist(
      outputPath
    )

    // ========================================================
    // STEP 6: CREATE TEMPORARY WORKSPACE
    // ========================================================

    temporaryDirectory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          'pdf-field-mapper-'
        )
      )

    const temporarySourcePath =
      path.join(
        temporaryDirectory,
        'source.pdf'
      )

    // Write the original PDF into the temporary directory.
    //
    // The user's original file remains untouched.

    await fs.writeFile(
      temporarySourcePath,
      request.pdfBytes,
      {
        flag: 'wx',
        mode: 0o600,
      }
    )

    // ========================================================
    // STEP 7: EXECUTE PYTHON PROCESSOR
    // ========================================================

    const pythonResult =
      await runPythonProcessor(

        pythonExecutable,

        processorScript,

        temporarySourcePath,

        outputPath,

        request.renames

      )

    // ========================================================
    // STEP 8: VERIFY OUTPUT
    // ========================================================

    const outputStats =
      await fs.stat(
        outputPath
      )

    if (
      !outputStats.isFile() ||
      outputStats.size === 0
    ) {

      throw new Error(
        'Python completed, but the output PDF ' +
        'was missing or empty.'
      )

    }

    // Confirm Python reported the requested destination.
    if (
      path.normalize(pythonResult.outputPath).toLowerCase() !==
      path.normalize(outputPath).toLowerCase()
    ) {

      throw new Error(
        'Python returned an unexpected output path.'
      )

    }

    // ========================================================
    // STEP 9: RETURN SUCCESS
    // ========================================================

    return {

      ok: true,

      cancelled: false,

      outputPath,

      pageCount:
        pythonResult.pageCount,

      logicalFieldCount:
        pythonResult.logicalFieldCount,

      renamedFieldCount:
        pythonResult.renamedFieldCount,

      appliedRenames:
        pythonResult.appliedRenames,

    }

  } catch (error) {

    // ========================================================
    // REPORT FAILURE
    // ========================================================

    const message =
      error instanceof Error
        ? error.message
        : 'Unable to save the modified PDF.'

    console.error(
      '[PDF Save] Processing failed:',
      error
    )

    return {

      ok: false,

      cancelled: false,

      error: message,

    }

  } finally {

    // ========================================================
    // REMOVE TEMPORARY FILES
    // ========================================================
    //
    // Cleanup runs after success, failure, or cancellation.
    //
    // Never remove the user's selected output file here.
    //
    // ========================================================

    if (temporaryDirectory) {

      try {

        await fs.rm(
          temporaryDirectory,
          {
            recursive: true,
            force: true,
          }
        )

      } catch (error) {

        console.warn(
          '[PDF Save] Temporary cleanup failed:',
          error
        )

      }

    }

  }

}


// ============================================================
// REGISTER ELECTRON IPC HANDLERS
// ============================================================
//
// Register privileged operations after Electron is ready.
//
// The renderer cannot invoke arbitrary commands.
//
// ============================================================

function registerIpcHandlers(): void {

  ipcMain.handle(
    PDF_SAVE_CHANNEL,
    handleSaveMappedPdf
  )

}


// ============================================================
// CREATE MAIN APPLICATION WINDOW
// ============================================================
//
// Preserve the existing application window configuration.
//
// Security settings remain unchanged.
//
// ============================================================

function createWindow(): void {

  mainWindow = new BrowserWindow({

    title: 'PDF Field Mapper',

    width: 1440,
    height: 900,

    minWidth: 1024,
    minHeight: 700,

    show: false,

    backgroundColor: '#F5F7FB',

    webPreferences: {

      preload: path.join(
        __dirname,
        'preload.mjs'
      ),

      // Preserve Electron renderer isolation.
      nodeIntegration: false,

      contextIsolation: true,

      sandbox: true,

      webSecurity: true,

    },

  })

  // ==========================================================
  // SHOW WINDOW WHEN READY
  // ==========================================================

  mainWindow.once(
    'ready-to-show',
    () => {

      mainWindow?.show()

    }
  )

  // ==========================================================
  // LOAD REACT APPLICATION
  // ==========================================================

  if (VITE_DEV_SERVER_URL) {

    void mainWindow.loadURL(
      VITE_DEV_SERVER_URL
    )

  } else {

    void mainWindow.loadFile(
      path.join(
        RENDERER_DIST,
        'index.html'
      )
    )

  }

  // ==========================================================
  // BLOCK EXTERNAL NAVIGATION
  // ==========================================================

  mainWindow.webContents.on(
    'will-navigate',
    (event) => {

      event.preventDefault()

    }
  )

  // ==========================================================
  // BLOCK ADDITIONAL WINDOWS
  // ==========================================================

  mainWindow.webContents.setWindowOpenHandler(
    () => {

      return {
        action: 'deny',
      }

    }
  )

  // ==========================================================
  // RELEASE WINDOW REFERENCE
  // ==========================================================

  mainWindow.on(
    'closed',
    () => {

      mainWindow = null

    }
  )

}


// ============================================================
// APPLICATION INITIALIZATION
// ============================================================

app.whenReady().then(() => {

  // Register privileged IPC handlers.
  registerIpcHandlers()

  // Create the application window.
  createWindow()

  // Preserve macOS application behavior.
  app.on(
    'activate',
    () => {

      if (
        BrowserWindow.getAllWindows().length === 0
      ) {

        createWindow()

      }

    }
  )

})


// ============================================================
// APPLICATION SHUTDOWN
// ============================================================

app.on(
  'window-all-closed',
  () => {

    if (process.platform !== 'darwin') {

      app.quit()

    }

  }
)