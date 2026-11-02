import type { OCRBox, OCRWord, ReceiptAnalysis, ReceiptCandidate } from '../preload/ocr-types'

interface ReceiptLine {
  text: string
  words?: OCRWord[]
  bbox?: OCRBox
}

const totalPattern =
  /\b(?:grand\s+total|total(?:\s+(?:sale|amount|cost))?|amount\s+(?:paid|due)|sale\s+(?:amount|total)|credit)\b/i
const pricePattern =
  /(?:\b(?:price|cost)\s*(?:per|\/)?\s*gal(?:lon)?s?\b|\b(?:ppg|unit\s+price|price\s*\/\s*g)\b|\$\s*\/\s*gal\b|\bgal\s*@)/i
const excludedPattern =
  /\b(?:sub\s*total|tax|savings?|discount|gallons|volume|change|card|cash|tender)\b/i
const fuelItemPattern = /\bdiesel\b/i

function bounds(words: OCRWord[]): OCRBox {
  return {
    x0: Math.min(...words.map((word) => word.bbox.x0)),
    y0: Math.min(...words.map((word) => word.bbox.y0)),
    x1: Math.max(...words.map((word) => word.bbox.x1)),
    y1: Math.max(...words.map((word) => word.bbox.y1))
  }
}

// Rebuild physical rows across OCR blocks; reading order may separate labels and amounts.
function spatialLines(words: OCRWord[]): ReceiptLine[] {
  const rows: OCRWord[][] = []
  for (const word of [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0)) {
    if (!word.text.trim()) continue
    const center = (word.bbox.y0 + word.bbox.y1) / 2
    const row = rows.find((entry) => {
      const box = bounds(entry)
      const height = Math.min(box.y1 - box.y0, word.bbox.y1 - word.bbox.y0)
      return Math.abs(center - (box.y0 + box.y1) / 2) <= height * 0.5
    })
    if (row) row.push(word)
    else rows.push([word])
  }
  return rows.map((row) => {
    row.sort((a, b) => a.bbox.x0 - b.bbox.x0)
    return { text: row.map((word) => word.text).join(' '), words: row, bbox: bounds(row) }
  })
}

function numericNextLine(line: ReceiptLine, next?: ReceiptLine): next is ReceiptLine {
  if (!next || !/^\$?\s*\d[\d,.]*\s*$/.test(next.text)) return false
  if (!line.bbox || !next.bbox) return true
  const height = line.bbox.y1 - line.bbox.y0
  const gap = next.bbox.y0 - line.bbox.y1
  return (
    gap >= 0 &&
    gap <= height * 2 &&
    next.bbox.x1 >= line.bbox.x0 &&
    next.bbox.x0 <= line.bbox.x1 + height * 12
  )
}

function confidenceForRange(
  line: ReceiptLine,
  start: number,
  end: number,
  characters: RegExp
): number | undefined {
  let cursor = 0
  const scores: number[] = []
  for (const word of line.words || []) {
    const begin = cursor
    cursor += word.text.length + 1
    const overlap = word.text.slice(Math.max(0, start - begin), Math.max(0, end - begin))
    if (characters.test(overlap)) scores.push(word.confidence)
  }
  return scores.length ? Math.min(...scores) : undefined
}

function amountCandidates(line: ReceiptLine, label: string, start: number): ReceiptCandidate[] {
  const result: ReceiptCandidate[] = []
  const pattern = /(?<![\d.,])-?\s*\$?\s*-?\s*\d+(?:,\d{3})*\.\d{2,3}(?![\d.])/g
  for (const match of line.text.matchAll(pattern)) {
    const offset = match.index
    let cursor = 0
    const words = line.words?.filter((word) => {
      const begin = cursor
      cursor += word.text.length + 1
      return begin < offset + match[0].length && cursor - 1 > offset
    })
    const amountEnd = offset + match[0].length
    const suffix = line.text.slice(amountEnd).match(/^\s*([g])\b/i)
    const value = match[0].replace(/[\s$,]/g, '')
    const hasThreeDecimals = /\.\d{3}$/.test(value)
    const candidateLabel = suffix ? suffix[1] : hasThreeDecimals ? '' : label
    const field =
      suffix || hasThreeDecimals
        ? 'price'
        : label
          ? pricePattern.test(label)
            ? 'price'
            : 'total'
          : null
    // OCR confidence is word-level; mixed symbol/digit tokens share their word's score.
    const digitConfidence = confidenceForRange(line, offset, offset + match[0].length, /\d/)
    const currencySymbolConfidence = confidenceForRange(
      line,
      offset,
      offset + match[0].length,
      /\$/
    )
    let reason = ''
    if (!field) reason = 'No supported total or price-per-gallon label on this row.'
    else if (!suffix && !hasThreeDecimals && offset + match[0].search(/\S/) < start)
      reason = 'Amount appears before the label.'
    else if (Number(value) <= 0)
      reason = 'Amount must be positive; refunds and zero values require manual entry.'
    else if (field === 'total' && !/\.\d{2}$/.test(value))
      reason = 'Total must have exactly two decimal places.'
    else if (field === 'price' && !hasThreeDecimals)
      reason = 'Price per gallon must have exactly three decimal places.'
    const labelConfidence = suffix
      ? confidenceForRange(line, amountEnd, amountEnd + suffix[0].length, /g/i)
      : undefined
    if (!reason && labelConfidence !== undefined && labelConfidence < 50)
      reason = 'Label OCR confidence is below 50%; verify manually.'
    result.push({
      id: String(match.index),
      field,
      value,
      source: line.text,
      label: candidateLabel,
      // Digit confidence only adds support; explicit total labels retain priority.
      rank:
        (field === 'total' && fuelItemPattern.test(label)
          ? 0.25
          : field === 'total' && /grand|amount\s+paid/i.test(label)
            ? 2
            : 1) +
        Math.max(0, Math.min(100, digitConfidence ?? 0)) / 200 -
        // Unusually high fuel prices remain eligible, but lose priority to plausible prices.
        (field === 'price' && Number(value) > 7.5 ? 0.75 : 0),
      status: 'rejected',
      reason,
      bbox: words?.length ? bounds(words) : undefined,
      confidence: digitConfidence,
      digitConfidence,
      labelConfidence,
      currencySymbolConfidence
    })
  }
  return result
}

export function analyzeReceipt(text: string, words: OCRWord[] = []): ReceiptAnalysis {
  const lines: ReceiptLine[] = words.length
    ? spatialLines(words)
    : text
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => ({ text: line.trim() }))
  const candidates: ReceiptCandidate[] = []
  const consumed = new Set<number>()
  for (let index = 0; index < lines.length; index++) {
    if (consumed.has(index)) continue
    const line = lines[index]
    const price = line.text.match(pricePattern)
    const total = !excludedPattern.test(line.text) ? line.text.match(totalPattern) : null
    const fuelItem = !excludedPattern.test(line.text) ? line.text.match(fuelItemPattern) : null
    const match = price || total || fuelItem
    const label = match?.[0] || ''
    const start = match ? (match.index || 0) + label.length : 0
    const found = amountCandidates(line, label, start)
    if (match && !fuelItem && !found.length && numericNextLine(line, lines[index + 1])) {
      found.push(...amountCandidates(lines[index + 1], label, 0))
      consumed.add(index + 1)
    }
    const valid = found.filter((candidate) => !candidate.reason)
    if (match && line.words) {
      const labelStart = match.index || 0
      const labelConfidence = confidenceForRange(line, labelStart, start, /\S/)
      const labelled = found.filter((candidate) => candidate.label === label)
      for (const candidate of labelled) candidate.labelConfidence = labelConfidence
      if (labelConfidence !== undefined && labelConfidence < 50) {
        for (const candidate of labelled.filter((candidate) => !candidate.reason))
          candidate.reason = 'Label OCR confidence is below 50%; verify manually.'
      }
    }
    for (const field of ['total', 'price'] as const) {
      const matching = valid.filter((candidate) => candidate.field === field && !candidate.reason)
      if (matching.length > 1) {
        for (const candidate of matching)
          candidate.reason = 'Multiple amounts near the same label; verify manually.'
      }
    }
    candidates.push(...found.map((candidate) => ({ ...candidate, id: `${index}-${candidate.id}` })))
  }
  const analysis: ReceiptAnalysis = {
    diesel: fuelItemPattern.test(text) || words.some((word) => fuelItemPattern.test(word.text)),
    total: '',
    price: '',
    candidates,
    explanations: { total: '', price: '' }
  }
  for (const field of ['total', 'price'] as const) {
    const eligible = candidates.filter(
      (candidate) => candidate.field === field && !candidate.reason
    )
    const rank = Math.max(0, ...eligible.map((candidate) => candidate.rank))
    const preferred = eligible.filter((candidate) => candidate.rank === rank)
    const values = new Set(
      preferred.map((candidate) => Number(candidate.value).toFixed(field === 'total' ? 2 : 3))
    )
    const conflict = values.size > 1
    if (values.size === 1) analysis[field] = [...values][0]
    for (const candidate of eligible) {
      if (candidate.rank < rank)
        candidate.reason = 'Another candidate has a more explicit label or stronger OCR support.'
      else if (conflict) candidate.reason = 'Conflicting labelled amounts; verify manually.'
      else {
        candidate.status = 'selected'
        candidate.reason =
          candidate.field === 'price' && /\.\d{3}$/.test(candidate.value)
            ? 'Unique positive three-decimal amount indicates the price per gallon.'
            : 'Unique positive amount beside or directly below a supported label.'
      }
    }
    analysis.explanations[field] = analysis[field]
      ? `Selected ${analysis[field]} from ${field === 'price' ? 'a gallon suffix, price label, or three-decimal amount' : 'a supported label'}. Confirm against the original.`
      : conflict
        ? 'Conflicting labelled amounts. Enter the correct value manually.'
        : `No unambiguous ${field === 'total' ? 'total' : 'price per gallon'} found. Check the candidates and enter it manually.`
  }
  return analysis
}

/** Preserve the simple API for callers that do not need diagnostics. */
export function parseReceipt(text: string): { total: string; price: string } {
  const { total, price } = analyzeReceipt(text)
  return { total, price }
}
