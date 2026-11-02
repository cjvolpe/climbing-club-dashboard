const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')

function load(file, dependencies = {}) {
  const module = new Module(file)
  module.paths = Module._nodeModulePaths(process.cwd())
  module.require = (name) => dependencies[name] ?? require(name)
  module._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText,
    file
  )
  return module.exports
}

async function check(texts, expected, passes) {
  let calls = 0
  let terminated = false
  const image = {
    isEmpty: () => false,
    getSize: () => ({ width: 100, height: 100 }),
    resize: () => image,
    toBitmap: () => Buffer.alloc(0)
  }
  const worker = {
    setParameters: async (parameters) => {
      assert.deepEqual(parameters, { tessedit_pageseg_mode: '4' })
    },
    recognize: async (_input, options) => {
      if (calls) assert.deepEqual(options, { rotateRadians: 0.1 })
      return { data: { text: texts[calls++], confidence: 95, rotateRadians: 0.1 } }
    },
    terminate: async () => {
      terminated = true
    }
  }
  const { recognizeReceipt } = load('src/main/receipt-ocr.ts', {
    electron: { nativeImage: { createFromBuffer: () => image } },
    'tesseract.js': { createWorker: async () => worker, PSM: { SINGLE_COLUMN: '4' } },
    './receipt-crop': { findReceiptCrop: () => null },
    './receipt-parser': load('src/main/receipt-parser.ts')
  })
  const result = await recognizeReceipt(Buffer.alloc(0))
  assert.equal(result.error, undefined)
  assert.deepEqual({ total: result.total, price: result.price }, expected)
  assert.equal(calls, passes)
  assert.ok(terminated)
  for (const field of ['total', 'price']) {
    assert.equal(
      result.candidates.some((c) => c.field === field && c.status === 'selected'),
      !!expected[field]
    )
  }
}

async function main() {
  await check(['TOTAL 42.50\n3.459'], { total: '42.50', price: '3.459' }, 1)
  await check(['TOTAL 42.50', 'TOTAL 99.00\n3.459'], { total: '42.50', price: '3.459' }, 2)
  await check(['3.459', 'TOTAL 42.50\n3.559'], { total: '42.50', price: '3.459' }, 2)
  await check(
    ['unreadable', 'TOTAL 40.00\nGRAND TOTAL 42.50\n3.459'],
    { total: '42.50', price: '3.459' },
    2
  )
  await check(['', 'TOTAL 42.50\nTOTAL 43.50'], { total: '', price: '' }, 2)
  console.log('PASS: PSM-4 fallback, ranking, preserved selections, conflicts, and worker cleanup')
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
