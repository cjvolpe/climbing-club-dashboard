/** Only accept explicitly labelled, unambiguous amounts; never guess from card numbers. */
export function parseReceipt(text: string): { total: string; price: string } {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
  const totals: { value: string; rank: number }[] = []
  const prices: string[] = []
  const amounts = (line: string) =>
    [...line.matchAll(/(?<![\d.])-?\$?\s*(\d+(?:,\d{3})*\.\d{2,3})(?!\d)/g)]
      .filter((match) => !match[0].trim().startsWith('-'))
      .map((match) => match[1].replace(/,/g, ''))
      .filter((value) => Number(value) > 0)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const totalLabel =
      /\b(?:grand\s+total|total(?:\s+(?:sale|amount|cost))?|amount\s+(?:paid|due)|sale\s+(?:amount|total))\b/i.test(
        line
      ) && !/\b(?:sub\s*total|subtotal|tax|saving|discount|gallons|volume)\b/i.test(line)
    const priceLabel =
      /(?:\b(?:price|cost)\s*(?:per|\/)?\s*gal(?:lon)?s?\b|\b(?:ppg|unit\s+price|price\s*\/\s*g)\b|\$\s*\/\s*gal\b|\bgal\s*@)/i.test(
        line
      )
    if (!totalLabel && !priceLabel) continue
    let values = amounts(line)
    if (!values.length && lines[i + 1] && /^\$?\s*\d[\d,.]*\s*$/.test(lines[i + 1])) {
      values = amounts(lines[i + 1])
    }
    if (totalLabel) {
      const candidates = values.filter((value) => /\.\d{2}$/.test(value))
      if (candidates.length === 1)
        totals.push({
          value: Number(candidates[0]).toFixed(2),
          rank: /grand|amount\s+paid/i.test(line) ? 2 : 1
        })
    }
    if (priceLabel && values.length === 1) prices.push(Number(values[0]).toFixed(3))
  }
  const rank = Math.max(0, ...totals.map((entry) => entry.rank))
  const unique = (values: string[]) => [...new Set(values)]
  const total = unique(totals.filter((entry) => entry.rank === rank).map((entry) => entry.value))
  const price = unique(prices)
  return { total: total.length === 1 ? total[0] : '', price: price.length === 1 ? price[0] : '' }
}
