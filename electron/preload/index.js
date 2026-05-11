const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopApi', {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getBackendBaseUrl: () => ipcRenderer.invoke('backend:get-base-url'),
  getBackendStatus: () => ipcRenderer.invoke('backend:get-status'),
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChanged: (callback) => {
    ipcRenderer.on('window:maximized-changed', (_event, isMaximized) => callback(isMaximized))
  }
})

