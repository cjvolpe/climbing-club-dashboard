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
const { parseReceipt } = parser.exports
for (const [text, expected] of [
  ['TOTAL $42.50\nPRICE/GAL $3.459', { total: '42.50', price: '3.459' }],
  [
    'Subtotal 40.00\nTax 2.50\nTotal\n$42.50\nPrice per gallon\n3.459',
    { total: '42.50', price: '3.459' }
  ],
  ['TOTAL 40.00\nGRAND TOTAL 42.50\nUNIT PRICE 3.459', { total: '42.50', price: '3.459' }],
  ['TOTAL 42.50\nTOTAL 43.50\nPPG 3.459', { total: '', price: '3.459' }],
  ['TOTAL 42.50\nPPG 3.459\nPPG 3.559', { total: '42.50', price: '' }],
  ['TOTAL GALLONS 12.345\nSUBTOTAL 40.00\nCARD 123456789\nCHANGE 2.00', { total: '', price: '' }],
  ['TOTAL 42.50\nPRICE/GAL 0.00', { total: '42.50', price: '' }],
  ['TOTAL -42.50\nPRICE/GAL 3.459', { total: '', price: '3.459' }],
  ['unreadable', { total: '', price: '' }]
])
  assert.deepEqual(parseReceipt(text), expected, text)
console.log(
  'PASS: labelled amounts, split lines, subtotal exclusion, conflicts, missing and invalid values'
)
