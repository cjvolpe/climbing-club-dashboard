import type { OCRBox } from '../preload/ocr-types'

/** Find a connected paper region in a small BGRA preview, preferring the center. */
export function findReceiptCrop(pixels: Uint8Array, width: number, height: number): OCRBox | null {
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let best: OCRBox | null = null
  let bestScore = 0
  const isPaper = (index: number): boolean => {
    const offset = index * 4
    const blue = pixels[offset]
    const green = pixels[offset + 1]
    const red = pixels[offset + 2]
    return (
      Math.min(red, green, blue) >= 150 &&
      Math.max(red, green, blue) - Math.min(red, green, blue) < 65
    )
  }

  for (let seed = 0; seed < visited.length; seed++) {
    if (visited[seed] || !isPaper(seed)) continue
    let head = 0
    let tail = 1
    queue[0] = seed
    visited[seed] = 1
    let x0 = width
    let y0 = height
    let x1 = 0
    let y1 = 0
    while (head < tail) {
      const index = queue[head++]
      const x = index % width
      const y = Math.floor(index / width)
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x + 1)
      y1 = Math.max(y1, y + 1)
      for (const neighbor of [
        x > 0 ? index - 1 : -1,
        x + 1 < width ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y + 1 < height ? index + width : -1
      ]) {
        if (neighbor < 0 || visited[neighbor] || !isPaper(neighbor)) continue
        visited[neighbor] = 1
        queue[tail++] = neighbor
      }
    }
    const area = (x1 - x0) * (y1 - y0)
    const centerDistance = Math.hypot((x0 + x1) / 2 / width - 0.5, (y0 + y1) / 2 / height - 0.5)
    // Small highlights and paper away from the center are not reliable receipts.
    if (area < width * height * 0.08 || tail < area * 0.45 || centerDistance > 0.25) continue
    const score = tail / (1 + centerDistance * 8)
    if (score <= bestScore) continue
    bestScore = score
    best = { x0, y0, x1, y1 }
  }
  if (!best) return null
  const margin = Math.max(2, Math.ceil(Math.min(width, height) * 0.02))
  return {
    x0: Math.max(0, best.x0 - margin),
    y0: Math.max(0, best.y0 - margin),
    x1: Math.min(width, best.x1 + margin),
    y1: Math.min(height, best.y1 + margin)
  }
}
