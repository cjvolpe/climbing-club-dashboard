import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import type { OCRProgress } from './ocr-types'
import type { TreasuryAPI } from './types'

const api: TreasuryAPI = {
  load: () => ipcRenderer.invoke('treasury:load'),
  save: (data) => ipcRenderer.invoke('treasury:save', data),
  confirmDeleteReceipt: (name) => ipcRenderer.invoke('treasury:confirm-delete-receipt', name),
  confirmDeleteDriver: (name) => ipcRenderer.invoke('treasury:confirm-delete-driver', name),
  confirmDeleteTrip: (name) => ipcRenderer.invoke('treasury:confirm-delete-trip', name),
  chooseFolder: () => ipcRenderer.invoke('treasury:folder'),
  importReceipts: () => ipcRenderer.invoke('treasury:import'),
  readReceipt: (file) => ipcRenderer.invoke('treasury:read', file),
  readOCR: (file) => ipcRenderer.invoke('treasury:ocr-read', file),
  scanReceipt: (file, requestId) => ipcRenderer.invoke('treasury:ocr-scan', file, requestId),
  onOCRProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: OCRProgress) =>
      callback(progress)
    ipcRenderer.on('treasury:ocr-progress', listener)
    return () => ipcRenderer.removeListener('treasury:ocr-progress', listener)
  },
  exportPDF: (html, name) => ipcRenderer.invoke('treasury:pdf', html, name),
  previewPDF: (html) => ipcRenderer.invoke('treasury:preview-pdf', html)
}
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)
