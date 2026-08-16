const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

let mainWindow = null

const APP_ID = 'com.videosearch.desktop'
const APP_NAME = 'VideoSearch'
const LEGACY_USER_DATA_NAME = 'videosearch-desktop'
const BACKEND_HOST = '127.0.0.1'
const BACKEND_PORT = 4740
const PROJECT_ROOT = path.resolve(__dirname, '../..')
const APP_DATA_ROOT = path.join(app.getPath('appData'), APP_NAME)
const LEGACY_USER_DATA_ROOT = path.join(app.getPath('appData'), LEGACY_USER_DATA_NAME)

app.setName(APP_NAME)
app.setAppUserModelId(APP_ID)
app.setPath('userData', APP_DATA_ROOT)

let backendProcess = null
let isWaitingBackendStop = false
let backendState = {
  running: false,
  status: 'stopped',
  baseUrl: '',
  host: BACKEND_HOST,
  port: null,
  pid: null,
  appDataDir: '',
  error: ''
}

let updateState = {
  status: 'idle',
  version: '',
  releaseName: '',
  releaseDate: '',
  percent: 0,
  error: ''
}
let autoUpdaterInitialized = false

function getBackendRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(PROJECT_ROOT, 'backend')
}

function getBackendExecutablePath() {
  if (app.isPackaged) {
    const executableName = process.platform === 'win32' ? 'backend.exe' : 'backend'
    return path.join(getBackendRoot(), executableName)
  }
  const isWindows = process.platform === 'win32'
  const venvPython = isWindows
    ? path.join('Scripts', 'python.exe')
    : path.join('bin', 'python')
  return path.join(getBackendRoot(), '.venv', venvPython)
}

function getRendererUrl() {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL
  }
  if (app.isPackaged) {
    return null
  }
  return 'http://127.0.0.1:4739'
}

function getRendererFilePath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'frontend', 'dist', 'index.html')
    : path.join(PROJECT_ROOT, 'frontend', 'dist', 'index.html')
}

function removeLegacyEntry(entryName) {
  fs.rmSync(path.join(LEGACY_USER_DATA_ROOT, entryName), { force: true, recursive: true })
}

function moveLegacyEntry(entryName) {
  const sourcePath = path.join(LEGACY_USER_DATA_ROOT, entryName)
  const targetPath = path.join(APP_DATA_ROOT, entryName)

  if (!fs.existsSync(sourcePath)) {
    return
  }

  if (fs.existsSync(targetPath)) {
    removeLegacyEntry(entryName)
    return
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.renameSync(sourcePath, targetPath)
}

function migrateLegacyDatabase() {
  const databaseEntries = ['video_search.db', 'video_search.db-shm', 'video_search.db-wal']
  const sourceDatabasePath = path.join(LEGACY_USER_DATA_ROOT, 'video_search.db')
  const targetDatabasePath = path.join(APP_DATA_ROOT, 'video_search.db')

  if (!fs.existsSync(sourceDatabasePath)) {
    for (const entryName of databaseEntries.slice(1)) {
      removeLegacyEntry(entryName)
    }
    return
  }

  if (fs.existsSync(targetDatabasePath)) {
    for (const entryName of databaseEntries) {
      removeLegacyEntry(entryName)
    }
    return
  }

  for (const entryName of databaseEntries) {
    moveLegacyEntry(entryName)
  }
}

function migrateLegacyUserData() {
  if (
    path.resolve(LEGACY_USER_DATA_ROOT) === path.resolve(APP_DATA_ROOT) ||
    !fs.existsSync(LEGACY_USER_DATA_ROOT)
  ) {
    return
  }

  fs.mkdirSync(APP_DATA_ROOT, { recursive: true })
  moveLegacyEntry('resource_sites.json')
  migrateLegacyDatabase()
  moveLegacyEntry('logs')

  fs.rmSync(LEGACY_USER_DATA_ROOT, { force: true, recursive: true })
}

function publishUpdateState(nextState) {
  updateState = {
    ...updateState,
    ...nextState
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', updateState)
  }

  return updateState
}

function getUpdateInfo(info = {}) {
  return {
    version: info.version || '',
    releaseName: info.releaseName || '',
    releaseDate: info.releaseDate || ''
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged || autoUpdaterInitialized) {
    return
  }

  autoUpdaterInitialized = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false

  autoUpdater.on('checking-for-update', () => {
    publishUpdateState({ status: 'checking', error: '' })
  })

  autoUpdater.on('update-available', (info) => {
    publishUpdateState({
      status: 'available',
      ...getUpdateInfo(info),
      percent: 0,
      error: ''
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    publishUpdateState({
      status: 'not-available',
      ...getUpdateInfo(info),
      percent: 0,
      error: ''
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    publishUpdateState({
      status: 'downloading',
      percent: Math.min(100, Math.max(0, Math.round(progress.percent || 0))),
      error: ''
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    publishUpdateState({
      status: 'downloaded',
      ...getUpdateInfo(info),
      percent: 100,
      error: ''
    })
  })

  autoUpdater.on('error', (error) => {
    publishUpdateState({
      status: 'error',
      error: error?.message || '自动更新失败'
    })
  })
}

async function checkForUpdates() {
  if (!app.isPackaged) {
    return publishUpdateState({ status: 'disabled', error: '' })
  }

  setupAutoUpdater()
  if (['checking', 'downloading'].includes(updateState.status)) {
    return updateState
  }

  publishUpdateState({ status: 'checking', error: '' })
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    publishUpdateState({
      status: 'error',
      error: error?.message || '自动更新检查失败'
    })
  }
  return updateState
}

async function downloadUpdate() {
  if (!app.isPackaged || updateState.status !== 'available') {
    return updateState
  }

  try {
    publishUpdateState({ status: 'downloading', percent: 0, error: '' })
    await autoUpdater.downloadUpdate()
  } catch (error) {
    publishUpdateState({
      status: 'error',
      error: error?.message || '更新下载失败'
    })
  }
  return updateState
}

function installUpdate() {
  if (!app.isPackaged || updateState.status !== 'downloaded') {
    return updateState
  }

  publishUpdateState({ status: 'installing', error: '' })
  setImmediate(() => autoUpdater.quitAndInstall(false, true))
  return updateState
}

function requestBackendHealth(baseUrl) {
  return new Promise((resolve) => {
    const request = http.request(
      `${baseUrl}/api/v1/health`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': 2
        }
      },
      (response) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            resolve(false)
            return
          }

          try {
            const payload = JSON.parse(body)
            resolve(payload.code === 0)
          } catch {
            resolve(false)
          }
        })
      }
    )

    request.on('error', () => resolve(false))
    request.setTimeout(1000, () => {
      request.destroy()
      resolve(false)
    })
    request.end('{}')
  })
}

async function waitForBackendReady(baseUrl) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const isReady = await requestBackendHealth(baseUrl)
    if (isReady) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  return false
}

async function startBackend() {
  if (backendProcess) {
    return backendState
  }

  const backendRoot = getBackendRoot()
  const backendExePath = getBackendExecutablePath()
  const appDataDir = app.getPath('userData')
  const logsDir = path.join(appDataDir, 'logs')
  const port = BACKEND_PORT
  const baseUrl = `http://${BACKEND_HOST}:${port}`

  if (!fs.existsSync(backendExePath)) {
    backendState = {
      running: false,
      status: 'error',
      baseUrl,
      host: BACKEND_HOST,
      port,
      pid: null,
      appDataDir,
      error: `Backend executable not found: ${backendExePath}`
    }
    return backendState
  }

  fs.mkdirSync(logsDir, { recursive: true })

  backendState = {
    running: false,
    status: 'starting',
    baseUrl,
    host: BACKEND_HOST,
    port,
    pid: null,
    appDataDir,
    error: ''
  }

  const spawnArgs = app.isPackaged
    ? []
    : ['-m', 'uvicorn', 'app.main:app', '--host', BACKEND_HOST, '--port', String(port)]

  backendProcess = spawn(
    backendExePath,
    spawnArgs,
    {
      cwd: app.isPackaged ? undefined : backendRoot,
      env: {
        ...process.env,
        API_HOST: BACKEND_HOST,
        API_PORT: String(port),
        APP_DATA_DIR: appDataDir,
        PYTHONUNBUFFERED: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    }
  )

  backendState.pid = backendProcess.pid

  backendProcess.stdout.on('data', (data) => {
    console.log(`[backend] ${data.toString().trim()}`)
  })

  backendProcess.stderr.on('data', (data) => {
    console.error(`[backend] ${data.toString().trim()}`)
  })

  backendProcess.once('error', (error) => {
    backendState = {
      ...backendState,
      running: false,
      status: 'error',
      error: error.message
    }
    backendProcess = null
  })

  backendProcess.once('exit', (code, signal) => {
    const exitError =
      code === 0 || code === null ? '' : `Backend exited: code=${code} signal=${signal || ''}`

    backendState = {
      ...backendState,
      running: false,
      status: 'stopped',
      pid: null,
      error: exitError
    }
    backendProcess = null
  })

  const isReady = await waitForBackendReady(baseUrl)
  backendState = {
    ...backendState,
    running: isReady,
    status: isReady ? 'running' : 'error',
    error: isReady ? '' : 'Backend health check timeout'
  }

  return backendState
}

function stopBackend() {
  if (!backendProcess) {
    backendState = {
      ...backendState,
      running: false,
      status: 'stopped',
      pid: null
    }
    return Promise.resolve()
  }

  const processToStop = backendProcess
  backendState = {
    ...backendState,
    running: false,
    status: 'stopping'
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      resolve()
    }

    processToStop.once('exit', finish)
    processToStop.kill()
    setTimeout(finish, 3000)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    backgroundColor: '#f7f7f2',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-changed', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-changed', false)
  })

  const rendererUrl = getRendererUrl()
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
    return
  }

  mainWindow.loadFile(getRendererFilePath())
}

ipcMain.handle('app:get-info', () => ({
  name: APP_NAME,
  version: app.getVersion(),
  platform: process.platform
}))

ipcMain.handle('backend:get-base-url', () => backendState.baseUrl)

ipcMain.handle('backend:get-status', () => backendState)

ipcMain.handle('update:get-status', () => updateState)

ipcMain.handle('update:check', () => checkForUpdates())

ipcMain.handle('update:download', () => downloadUpdate())

ipcMain.handle('update:install', () => installUpdate())

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  }
})

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle('window:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false
})

async function ensureBackendOrShowError() {
  let state
  try {
    state = await startBackend()
  } catch (error) {
    backendState = {
      ...backendState,
      running: false,
      status: 'error',
      error: error.message
    }
    state = backendState
  }

  if (state.running) {
    return true
  }

  const { response } = await dialog.showMessageBox({
    type: 'error',
    title: 'VideoSearch',
    message: '后端服务启动失败',
    detail: `${state.error || '未知错误'}\n\n可以点击"重试"重新启动后端服务，或退出应用后检查安装是否完整。`,
    buttons: ['重试', '退出'],
    defaultId: 0,
    cancelId: 1
  })

  if (response === 0) {
    await stopBackend()
    return ensureBackendOrShowError()
  }

  app.quit()
  return false
}

app.whenReady().then(async () => {
  try {
    migrateLegacyUserData()
  } catch (error) {
    dialog.showErrorBox(
      APP_NAME,
      `旧开发数据迁移失败，应用无法继续启动：${error?.message || '未知错误'}`
    )
    app.quit()
    return
  }

  const backendReady = await ensureBackendOrShowError()
  if (!backendReady) {
    return
  }

  createWindow()
  setupAutoUpdater()
  if (app.isPackaged) {
    setTimeout(() => checkForUpdates(), 1500)
  }

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

app.on('before-quit', (event) => {
  if (!backendProcess || isWaitingBackendStop) {
    return
  }

  event.preventDefault()
  isWaitingBackendStop = true
  stopBackend().finally(() => {
    app.quit()
  })
})
