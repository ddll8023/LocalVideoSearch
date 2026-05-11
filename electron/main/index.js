const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const BACKEND_HOST = '127.0.0.1'
const BACKEND_PORT = 4740
const PROJECT_ROOT = path.resolve(__dirname, '../..')

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

function getBackendRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(PROJECT_ROOT, 'backend')
}

function getPythonExecutablePath() {
  return path.join(getBackendRoot(), '.venv', 'Scripts', 'python.exe')
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

function requestBackendHealth(baseUrl) {
  return new Promise((resolve) => {
    const request = http.get(`${baseUrl}/api/v1/health`, (response) => {
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
    })

    request.on('error', () => resolve(false))
    request.setTimeout(1000, () => {
      request.destroy()
      resolve(false)
    })
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
  const pythonPath = getPythonExecutablePath()
  const appDataDir = path.join(app.getPath('appData'), 'VideoSearch')
  const logsDir = path.join(appDataDir, 'logs')
  const port = BACKEND_PORT
  const baseUrl = `http://${BACKEND_HOST}:${port}`

  if (!fs.existsSync(pythonPath)) {
    backendState = {
      running: false,
      status: 'error',
      baseUrl,
      host: BACKEND_HOST,
      port,
      pid: null,
      appDataDir,
      error: `Python executable not found: ${pythonPath}`
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

  backendProcess = spawn(
    pythonPath,
    ['-m', 'uvicorn', 'app.main:app', '--host', BACKEND_HOST, '--port', String(port)],
    {
      cwd: backendRoot,
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

  const rendererUrl = getRendererUrl()
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
    return
  }

  mainWindow.loadFile(getRendererFilePath())
}

ipcMain.handle('app:get-info', () => ({
  name: 'VideoSearch',
  version: app.getVersion(),
  platform: process.platform
}))

ipcMain.handle('backend:get-base-url', () => backendState.baseUrl)

ipcMain.handle('backend:get-status', () => backendState)

app.whenReady().then(async () => {
  try {
    await startBackend()
  } catch (error) {
    backendState = {
      ...backendState,
      running: false,
      status: 'error',
      error: error.message
    }
  }

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
