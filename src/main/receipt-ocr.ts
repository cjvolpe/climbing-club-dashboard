import { dirname, join } from 'node:path'
import { nativeImage } from 'electron'
import { createWorker, PSM } from 'tesseract.js'
import type { OCRDiagnostics, OCRProgress } from '../preload/ocr-types'
import { findReceiptCrop } from './receipt-crop'
import { analyzeReceipt } from './receipt-parser'

export async function recognizeReceipt(
  image: Buffer,
  onProgress?: (event: Pick<OCRProgress, 'status' | 'progress'>) => void
): Promise<OCRDiagnostics> {
  const started = Date.now()
  const empty: OCRDiagnostics = {
    ...analyzeReceipt(''),
    version: 1,
    createdAt: new Date().toISOString(),
    durationMs: 0,
    status: 'failed',
    text: '',
    confidence: 0,
    words: [],
    imageGrey: null,
    imageBinary: null
  }
  // Worker threads and WASM must run from real files outside the packaged ASAR.
  const unpacked = (path: string) => path.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1')
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const source = nativeImage.createFromBuffer(image)
    if (source.isEmpty()) {
      throw new Error(
        'The receipt image could not be decoded. Import a valid PNG, JPEG, or WebP image.'
      )
    }
    onProgress?.({ status: 'cropping receipt', progress: 0 })
    const size = source.getSize()
    const scale = Math.min(1, 400 / Math.max(size.width, size.height))
    const preview = source.resize({
      width: Math.max(1, Math.round(size.width * scale)),
      height: Math.max(1, Math.round(size.height * scale))
    })
    const previewSize = preview.getSize()
    const bounds = findReceiptCrop(preview.toBitmap(), previewSize.width, previewSize.height)
    const crop = bounds && {
      x: Math.floor((bounds.x0 * size.width) / previewSize.width),
      y: Math.floor((bounds.y0 * size.height) / previewSize.height),
      width: 0,
      height: 0
    }
    if (crop && bounds) {
      crop.width = Math.ceil((bounds.x1 * size.width) / previewSize.width) - crop.x
      crop.height = Math.ceil((bounds.y1 * size.height) / previewSize.height) - crop.y
    }
    const input = crop ? source.crop(crop).toPNG() : image
    // Keep the exact cropped input, including when recognition subsequently fails.
    empty.crop = crop || undefined
    empty.imageCropped = crop ? `data:image/png;base64,${input.toString('base64')}` : null
    worker = await createWorker('eng', 1, {
      workerPath: unpacked(require.resolve('tesseract.js/src/worker-script/node/index.js')),
      langPath: unpacked(
        join(dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0')
      ),
      cacheMethod: 'none',
      logger: (event) => onProgress?.({ status: event.status, progress: event.progress }),
      errorHandler: () => {}
    })
    onProgress?.({ status: 'straightening receipt', progress: 0 })
    const output = { text: true, blocks: true, imageGrey: true, imageBinary: true }
    const recognize = async () => {
      const first = await worker!.recognize(
        input,
        // Deskew the cropped image from detected text lines before recognition.
        { rotateAuto: true },
        output
      )
      const extractWords = (data: typeof first.data) =>
        (data.blocks || []).flatMap((block) =>
          block.paragraphs.flatMap((paragraph) =>
            paragraph.lines.flatMap((line) =>
              line.words.map(({ text, confidence, bbox }) => ({ text, confidence, bbox }))
            )
          )
        )
      const words = extractWords(first.data)
      const analysis = analyzeReceipt(first.data.text, words)
      if (analysis.total && analysis.price) return { data: first.data, words, analysis }

      onProgress?.({ status: 'screening unresolved amounts with PSM-4', progress: 0 })
      await worker!.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN })
      const second = await worker!.recognize(
        input,
        // Keep both passes' candidate boxes aligned with the same deskewed image.
        { rotateRadians: first.data.rotateRadians ?? 0 },
        output
      )
      const fallbackWords = extractWords(second.data)
      const fallback = analyzeReceipt(second.data.text, fallbackWords)
      for (const field of ['total', 'price'] as const) {
        if (analysis[field]) continue
        analysis[field] = fallback[field]
        analysis.explanations[field] = fallback.explanations[field]
        analysis.candidates = analysis.candidates
          .filter((candidate) => candidate.field !== field)
          .concat(
            fallback.candidates
              .filter((candidate) => candidate.field === field)
              .map((candidate) => ({ ...candidate, id: `psm4-${candidate.id}` }))
          )
      }
      return second.data.text.trim()
        ? { data: second.data, words: fallbackWords, analysis }
        : { data: first.data, words, analysis }
    }
    const { data, words, analysis } = await Promise.race([
      recognize(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error('OCR exceeded 60 seconds. Try a smaller or clearer image.')),
          60_000
        )
      })
    ])
    return {
      ...empty,
      ...analysis,
      durationMs: Date.now() - started,
      status: data.text.trim() ? 'recognized' : 'no-text',
      text: data.text,
      confidence: data.confidence,
      rotationRadians: data.rotateRadians ?? 0,
      words,
      crop: crop || undefined,
      imageGrey: data.imageGrey,
      imageBinary: data.imageBinary
    }
  } catch (error) {
    return { ...empty, durationMs: Date.now() - started, error: String(error) }
  } finally {
    clearTimeout(timeout)
    await worker?.terminate().catch(() => {})
  }
}
