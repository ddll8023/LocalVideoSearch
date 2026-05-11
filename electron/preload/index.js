const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopApi', {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getBackendBaseUrl: () => ipcRenderer.invoke('backend:get-base-url'),
  getBackendStatus: () => ipcRenderer.invoke('backend:get-status')
})

