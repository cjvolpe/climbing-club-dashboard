import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import type { OCRDiagnostics, OCRProgress } from '../preload/ocr-types'
import { recognizeReceipt } from './receipt-ocr'

export function receiptPath(folder: string, file: string): string {
  const path = resolve(folder, file)
  const within = relative(join(folder, 'receipts'), path)
  if (!within || within.startsWith('..') || isAbsolute(within))
    throw new Error('Invalid receipt path')
  if (!/\.(png|jpe?g|webp)$/i.test(path)) throw new Error('Unsupported receipt image')
  return path
}

export async function readDiagnostics(
  folder: string,
  file: string
): Promise<OCRDiagnostics | null> {
  try {
    return JSON.parse(await readFile(`${receiptPath(folder, file)}.ocr.json`, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

// Serialize jobs to bound WASM memory and avoid concurrent writes to the same diagnostics file.
let pending: Promise<unknown> = Promise.resolve()

export function removeReceipt(folder: string, file: string): Promise<void> {
  const path = receiptPath(folder, file)
  // A scan that is already running must finish before deletion so it cannot recreate a sidecar.
  const removal = pending
    .catch(() => {})
    .then(async () => {
      for (const target of [path, `${path}.ocr.json`, `${path}.ocr.json.tmp`]) {
        await unlink(target).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') throw error
        })
      }
    })
  pending = removal
  return removal
}

export function scanReceipt(
  folder: string,
  file: string,
  onProgress: (event: Pick<OCRProgress, 'status' | 'progress'>) => void
): Promise<OCRDiagnostics> {
  const path = receiptPath(folder, file)
  onProgress({ status: 'Waiting for OCR', progress: 0 })
  const job = pending
    .catch(() => {})
    .then(async () => {
      const diagnostics = await recognizeReceipt(await readFile(path), onProgress)
      await writeFile(`${path}.ocr.json.tmp`, JSON.stringify(diagnostics))
      await rename(`${path}.ocr.json.tmp`, `${path}.ocr.json`)
      return diagnostics
    })
  pending = job
  return job
}
