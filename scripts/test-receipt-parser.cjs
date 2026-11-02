const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
const parser = new Module('receipt-parser')
parser._compile(
  ts.transpileModule(fs.readFileSync('src/main/receipt-parser.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText,
  'receipt-parser.cjs'
)
const { parseReceipt, analyzeReceipt } = parser.exports
for (const [text, expected] of [
  ['TOTAL $42.50\nPRICE/GAL $3.459', { total: '42.50', price: '3.459' }],
  ['TOTAL $42.50\n$3.459G', { total: '42.50', price: '3.459' }],
  ['3.45 g', { total: '', price: '' }],
  ['3.45G', { total: '', price: '' }],
  ['Pump, # $43.26 =', { total: '', price: '' }],
  ['PPG 3.45', { total: '', price: '' }],
  ['PRICE/GAL\n3.45', { total: '', price: '' }],
  ['PPG 3.45\n3.459', { total: '', price: '3.459' }],
  ['3.459g\n3.559G', { total: '', price: '' }],
  ['3.45GAS', { total: '', price: '' }],
  ['3.459', { total: '', price: '3.459' }],
  ['7.500\n7.501', { total: '', price: '7.500' }],
  ['7.501', { total: '', price: '7.501' }],
  ['TOTAL 42.50\n3.459\n12.345', { total: '42.50', price: '3.459' }],
  ['DIESEL 2Â°CR #06 7 6616 42.59', { total: '42.59', price: '' }],
  ['DIESEL 2Â°CR #06 7 3.459 42.59', { total: '42.59', price: '3.459' }],
  ['DIESEL 42.59\nTOTAL 45.00', { total: '45.00', price: '' }],
  ['DIESEL PRICE/GAL 3.45', { total: '', price: '' }],
  ['DIESEL\n42.59', { total: '', price: '' }],
  ['DIESEL -42.59', { total: '', price: '' }],
  ['TOTAL 42.50 3.459', { total: '42.50', price: '3.459' }],
  ['3.459\n3.559', { total: '', price: '' }],
  ['0.000\n-3.459\n3.4599', { total: '', price: '' }],
  ['0.00G\n-3.459g', { total: '', price: '' }],
  [
    'Subtotal 40.00\nTax 2.50\nTotal\n$42.50\nPrice per gallon\n3.459',
    { total: '42.50', price: '3.459' }
  ],
  ['TOTAL 40.00\nGRAND TOTAL 42.50\nUNIT PRICE 3.459', { total: '42.50', price: '3.459' }],
  ['TOTAL 42.50\nTOTAL 43.50\nPPG 3.459', { total: '', price: '3.459' }],
  ['TOTAL 42.50\nPPG 3.459\nPPG 3.559', { total: '42.50', price: '' }],
  [
    'TOTAL GALLONS 12.345\nSUBTOTAL 40.00\nCARD 123456789\nCHANGE 2.00',
    { total: '', price: '12.345' }
  ],
  ['TOTAL 42.50\nPRICE/GAL 0.00', { total: '42.50', price: '' }],
  ['TOTAL -42.50\nPRICE/GAL 3.459', { total: '', price: '3.459' }],
  ['unreadable', { total: '', price: '' }]
])
  assert.deepEqual(parseReceipt(text), expected, text)
console.log(
  'PASS: labelled amounts, split lines, subtotal exclusion, conflicts, missing and invalid values'
)

const word = (text, x, y, confidence = 95) => ({
  text,
  confidence,
  bbox: { x0: x, y0: y, x1: x + text.length * 10, y1: y + 20 }
})
const spatial = analyzeReceipt('TOTAL\nPRICE/GAL\n42.50\n3.459', [
  word('TOTAL', 10, 10),
  word('PRICE/GAL', 10, 50),
  word('42.50', 220, 11),
  word('3.459', 220, 51)
])
assert.equal(spatial.total, '42.50', 'Pairs amounts with physical rows across separate OCR blocks')
assert.equal(spatial.price, '3.459')
assert.equal(spatial.candidates[0].status, 'selected')
assert.deepEqual(spatial.candidates[0].bbox, { x0: 220, y0: 11, x1: 270, y1: 31 })
const below = analyzeReceipt('', [word('TOTAL', 10, 10), word('$42.50', 30, 45)])
assert.equal(analyzeReceipt('', [word('3.459G', 10, 10)]).price, '3.459')
const twoDecimalPrice = analyzeReceipt('', [word('PPG', 10, 10), word('3.45', 80, 10)])
const pumpAmount = analyzeReceipt('Pump, # $43.26 =')
assert.equal(pumpAmount.candidates[0].field, null)
assert.equal(pumpAmount.candidates[0].status, 'rejected')
assert.equal(twoDecimalPrice.price, '')
assert.equal(twoDecimalPrice.candidates[0].status, 'rejected')
assert.match(twoDecimalPrice.candidates[0].reason, /exactly three decimal places/)
assert.equal(analyzeReceipt('', [word('3.459', 10, 10, 30)]).price, '3.459')
assert.equal(
  analyzeReceipt('', [word('PPG', 10, 10, 20), word('3.459', 80, 10)]).price,
  '3.459',
  'Three decimal places identify the price even when the label is uncertain'
)
assert.equal(
  analyzeReceipt('', [word('3.459', 10, 10), word('g', 80, 10, 20)]).price,
  '',
  'Rejects a low-confidence gallon suffix'
)
assert.equal(below.total, '42.50', 'Accepts an immediately adjacent amount below a label')
assert.equal(
  analyzeReceipt('', [word('TOTAL', 10, 10), word('42.50', 30, 200)]).total,
  '',
  'Does not match an unrelated distant row'
)
const uncertain = analyzeReceipt('', [word('TOTAL', 10, 10), word('42.50', 220, 10, 30)])
assert.equal(uncertain.total, '42.50')
assert.equal(uncertain.candidates[0].status, 'selected')
for (const amountY of [10, 45]) {
  const weakSymbol = analyzeReceipt('', [
    word('TOTAL', 10, 10, 90),
    word('$', 200, amountY, 20),
    word('42.50', 220, amountY, 95)
  ])
  assert.equal(weakSymbol.total, '42.50', 'A weak currency symbol does not reject clear digits')
  assert.equal(weakSymbol.candidates[0].digitConfidence, 95)
  assert.equal(weakSymbol.candidates[0].confidence, 95)
  assert.equal(weakSymbol.candidates[0].currencySymbolConfidence, 20)
  assert.equal(weakSymbol.candidates[0].labelConfidence, 90)
}
assert.equal(uncertain.candidates[0].digitConfidence, 30)
assert.equal(uncertain.candidates[0].currencySymbolConfidence, undefined)
assert.equal(uncertain.candidates[0].labelConfidence, 95)
const mixedToken = analyzeReceipt('', [word('TOTAL', 10, 10), word('$42.50', 220, 10, 30)])
assert.equal(mixedToken.total, '42.50', 'Low-confidence mixed tokens remain eligible')
assert.equal(mixedToken.candidates[0].digitConfidence, 30)
assert.equal(mixedToken.candidates[0].currencySymbolConfidence, 30)
const weakDigits = analyzeReceipt('', [
  word('TOTAL', 10, 10),
  word('$', 200, 10),
  word('42.50', 220, 10, 30)
])
assert.equal(weakDigits.total, '42.50', 'Weak digits do not reject a valid amount')
assert.equal(
  analyzeReceipt('', [word('TOTAL', 10, 10, 20), word('42.50', 220, 10)]).total,
  '',
  'Does not autofill from a low-confidence label'
)
const conflict = analyzeReceipt('TOTAL 42.50\nTOTAL 43.50')
assert.equal(conflict.total, '')
assert.ok(conflict.candidates.every((candidate) => candidate.reason.includes('Conflicting')))
const multiple = analyzeReceipt('TOTAL 42.50 43.50')
assert.equal(multiple.total, '')
assert.ok(multiple.candidates.every((candidate) => candidate.reason.includes('Multiple')))
assert.equal(analyzeReceipt('42.50 TOTAL').total, '', 'Rejects amounts before a label')
assert.equal(
  analyzeReceipt('TOTAL $-42.50').total,
  '',
  'Rejects negative amounts after currency sign'
)
assert.equal(analyzeReceipt('TOTAL 42.500').total, '', 'Rejects three-decimal totals')
assert.equal(analyzeReceipt('TOTAL $1,242.50').total, '1242.50')
assert.match(analyzeReceipt('SUBTOTAL 40.00').candidates[0].reason, /No supported/)
console.log(
  'PASS: spatial rows, adjacent and distant values, confidence, candidate reasons, invalid amounts'
)

for (const confidence of [0, 1, 49, 50, 100]) {
  const result = analyzeReceipt('', [word('TOTAL', 10, 10), word('42.50', 220, 10, confidence)])
  assert.equal(result.total, '42.50', `Digit confidence ${confidence} never rejects a valid amount`)
  assert.ok(result.candidates[0].rank >= 1, 'Digit confidence never subtracts from the base rank')
}
const supported = analyzeReceipt('', [
  word('TOTAL', 10, 10),
  word('42.50', 220, 10, 30),
  word('TOTAL', 10, 50),
  word('43.50', 220, 50, 95)
])
assert.equal(
  supported.total,
  '43.50',
  'Stronger digit support improves selection among equal labels'
)
assert.ok(supported.candidates[1].rank > supported.candidates[0].rank)
const explicit = analyzeReceipt('', [
  word('TOTAL', 10, 10),
  word('42.50', 220, 10, 100),
  word('GRAND TOTAL', 10, 50),
  word('43.50', 220, 50, 0)
])
assert.equal(explicit.total, '43.50', 'Explicit label priority outweighs digit confidence')
console.log('PASS: digit confidence adds support without a rejection cutoff')

assert.equal(analyzeReceipt('ULTRA DIESEL 42.50').diesel, true)
assert.equal(analyzeReceipt('Fuel: diesel.').diesel, true)
assert.equal(analyzeReceipt('Regular unleaded').diesel, false)
assert.equal(analyzeReceipt('', [word('Diesel', 10, 10)]).diesel, true)
const receiptsModule = new Module('receipts')
receiptsModule._compile(
  ts.transpileModule(fs.readFileSync('src/renderer/src/lib/receipts.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText,
  'receipts.cjs'
)
const { averageGasPrice, driverTotal } = receiptsModule.exports
const fuelReceipts = [
  { price: '3.000', total: '30.00' },
  { price: '5.000', total: '50.00', diesel: true },
  { price: 'invalid', total: '', diesel: false },
  { price: '9.000', total: '', priceParseError: true }
]
assert.equal(averageGasPrice(fuelReceipts), 4)
assert.equal(averageGasPrice(fuelReceipts, true), 3)
assert.equal(averageGasPrice([fuelReceipts[1]], true), null)
assert.equal(averageGasPrice([]), null)
assert.equal(driverTotal({ receipts: fuelReceipts }), 80)
console.log('PASS: diesel detection, optional exclusion, empty averages, unchanged totals')
