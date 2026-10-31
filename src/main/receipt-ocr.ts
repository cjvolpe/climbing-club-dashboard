import { dirname, join } from 'node:path'
import { createWorker } from 'tesseract.js'
import { parseReceipt } from './receipt-parser'

export async function recognizeReceipt(image: Buffer): Promise<{ total: string; price: string }> {
  // Worker threads and WASM must run from real files outside the packaged ASAR.
  const unpacked = (path: string) => path.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1')
  const worker = await createWorker('eng', 1, {
    workerPath: unpacked(require.resolve('tesseract.js/src/worker-script/node/index.js')),
    langPath: unpacked(
      join(dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0')
    ),
    cacheMethod: 'none',
    errorHandler: () => {}
  })
  try {
    const { data } = await worker.recognize(image)
    return parseReceipt(data.text)
  } finally {
    await worker.terminate()
  }
}
