import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Resolve the current directory in an ES module environment.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Application directories.
process.env.APP_ROOT = path.join(__dirname, '..')

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

const RENDERER_DIST = path.join(
  process.env.APP_ROOT,
  'dist'
)

// Keep a reference to the main application window.
let mainWindow: BrowserWindow | null = null

/**
 * Creates the main PDF Field Mapper application window.
 *
 * The renderer is isolated from Node.js and Electron internals.
 * Future filesystem and PDF operations will be exposed through
 * explicitly approved methods in the preload script.
 */
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
      preload: path.join(__dirname, 'preload.mjs'),

      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,

      webSecurity: true,
    },
  })

  // Display the window once its initial content is ready.
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load the development server or packaged application.
  if (VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(
      path.join(RENDERER_DIST, 'index.html')
    )
  }

  // Prevent application content from navigating to external pages.
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  // Prevent websites from opening additional Electron windows.
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  // Release the window reference when it closes.
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Initialize Electron after the application is ready.
 */
app.whenReady().then(() => {
  createWindow()

  // macOS convention: recreate the window when the dock icon
  // is clicked and no application windows remain.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

/**
 * Quit when all windows are closed, except on macOS.
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})