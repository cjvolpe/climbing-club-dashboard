import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import type { TreasuryAPI } from './types'

const api: TreasuryAPI = {
  load: () => ipcRenderer.invoke('treasury:load'),
  save: (data) => ipcRenderer.invoke('treasury:save', data),
  confirmDeleteDriver: (name) => ipcRenderer.invoke('treasury:confirm-delete-driver', name),
  confirmDeleteTrip: (name) => ipcRenderer.invoke('treasury:confirm-delete-trip', name),
  chooseFolder: () => ipcRenderer.invoke('treasury:folder'),
  importReceipts: () => ipcRenderer.invoke('treasury:import'),
  readReceipt: (file) => ipcRenderer.invoke('treasury:read', file),
  exportPDF: (html, name) => ipcRenderer.invoke('treasury:pdf', html, name),
  previewPDF: (html) => ipcRenderer.invoke('treasury:preview-pdf', html)
}
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)
