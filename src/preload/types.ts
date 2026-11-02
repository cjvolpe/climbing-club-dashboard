import type { OCRDiagnostics, OCRProgress } from './ocr-types'

export interface Receipt {
  id: string
  name: string
  file?: string
  total: string
  price: string
  totalParseError?: boolean
  priceParseError?: boolean
  diesel?: boolean
  reviewed: boolean
}
export interface Driver {
  id: string
  name: string
  method: string
  receipts: Receipt[]
}
export interface Trip {
  id: string
  name: string
  start: string
  end: string
  location: string
  drivers: Driver[]
  /** Legacy per-trip preference; used when loading older workspaces. */
  excludeDiesel?: boolean
  number: string
}
export interface Profile {
  icon?: string
  organization: string
  email: string
  address: string
  city: string
  account: string
}
export interface Data {
  excludeDiesel?: boolean
  trips: Trip[]
  profile: Profile
}
export interface TreasuryAPI {
  load(): Promise<{ data: Data | null; folder: string }>
  save(data: Data): Promise<void>
  confirmDeleteReceipt(name: string): Promise<boolean>
  confirmDeleteDriver(name: string): Promise<boolean>
  confirmDeleteTrip(name: string): Promise<boolean>
  chooseFolder(): Promise<string | null>
  importReceipts(): Promise<
    Pick<
      Receipt,
      'name' | 'file' | 'total' | 'price' | 'totalParseError' | 'priceParseError' | 'diesel'
    >[]
  >
  readReceipt(file: string): Promise<string>
  readOCR(file: string): Promise<OCRDiagnostics | null>
  scanReceipt(file: string, requestId: string): Promise<OCRDiagnostics>
  onOCRProgress(callback: (event: OCRProgress) => void): () => void
  exportPDF(html: string, name: string): Promise<boolean>
  previewPDF(html: string): Promise<string>
}
