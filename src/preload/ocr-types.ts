export interface OCRBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OCRWord {
  text: string
  confidence: number
  bbox: OCRBox
}

export interface ReceiptCandidate {
  id: string
  field: 'total' | 'price' | null
  value: string
  source: string
  label: string
  rank: number
  status: 'selected' | 'rejected'
  reason: string
  bbox?: OCRBox
  /** Legacy alias for digitConfidence. */
  confidence?: number
  digitConfidence?: number
  currencySymbolConfidence?: number
  labelConfidence?: number
}

export interface ReceiptAnalysis {
  total: string
  price: string
  candidates: ReceiptCandidate[]
  explanations: { total: string; price: string }
}

export interface OCRDiagnostics extends ReceiptAnalysis {
  /** Deskew correction applied after cropping; word boxes use the corrected image. */
  rotationRadians?: number
  crop?: { x: number; y: number; width: number; height: number }
  imageCropped?: string | null
  version: 1
  createdAt: string
  durationMs: number
  status: 'recognized' | 'no-text' | 'failed'
  error?: string
  text: string
  confidence: number
  words: OCRWord[]
  imageGrey: string | null
  imageBinary: string | null
}

export interface OCRProgress {
  file: string
  requestId: string
  status: string
  progress: number
  name?: string
}
