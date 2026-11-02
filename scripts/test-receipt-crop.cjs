const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
const cropModule = new Module('receipt-crop')
cropModule._compile(
  ts.transpileModule(fs.readFileSync('src/main/receipt-crop.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText,
  'receipt-crop.cjs'
)
const { findReceiptCrop } = cropModule.exports
const width = 200
const height = 160
const pixels = new Uint8Array(width * height * 4)
function fill(x0, y0, x1, y1, shade) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      pixels.set([shade, shade, shade, 255], (y * width + x) * 4)
    }
  }
}
assert.equal(findReceiptCrop(pixels, width, height), null)
fill(60, 15, 140, 145, 240)
// Text holes must not split the surrounding paper into separate receipts.
fill(70, 50, 130, 53, 0)
fill(70, 80, 130, 83, 0)
// A bright object in a corner must not displace the centered receipt.
fill(0, 0, 45, 50, 255)
assert.deepEqual(findReceiptCrop(pixels, width, height), { x0: 56, y0: 11, x1: 144, y1: 149 })
fill(0, 0, width, height, 255)
assert.deepEqual(findReceiptCrop(pixels, width, height), { x0: 0, y0: 0, x1: width, y1: height })
console.log(
  'PASS: centered receipt, text holes, distracting highlight, blank and full-frame images'
)
