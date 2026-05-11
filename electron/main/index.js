const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

const backendBaseUrl = process.env.VIDEO_SEARCH_BACKEND_URL || 'http://127.0.0.1:8765'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#f7f7f2',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  const rendererUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173'
  mainWindow.loadURL(rendererUrl)
}

ipcMain.handle('app:get-info', () => ({
  name: 'VideoSearch',
  version: app.getVersion(),
  platform: process.platform
}))

ipcMain.handle('backend:get-base-url', () => backendBaseUrl)

ipcMain.handle('backend:get-status', () => ({
  running: false,
  baseUrl: backendBaseUrl
}))

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

