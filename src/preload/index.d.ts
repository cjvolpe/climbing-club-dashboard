import type { ElectronAPI } from '@electron-toolkit/preload'
import type { TreasuryAPI } from './types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: TreasuryAPI
  }
}
