/// <reference types="vite/client" />

import { ElectronAPI } from '@electron-toolkit/preload'

interface CustomAPI {
  saveTierList: (data: any) => Promise<void>
  loadTierList: () => Promise<any>
  minimize: () => void
  maximize: () => void
  close: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
