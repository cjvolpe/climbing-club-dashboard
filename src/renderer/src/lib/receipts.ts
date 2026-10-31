import type { Data, Driver, Receipt, Trip } from '../../../preload/types'

export const emptyData: Data = {
  trips: [],
  profile: { organization: '', email: '', address: '', city: '', account: '' }
}

export const formatMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export const driverTotal = (d: Driver) =>
  d.receipts.reduce((n, r) => n + Math.round((Number(r.total) || 0) * 100), 0) / 100

export const averageGasPrice = (receipts: Receipt[]) => {
  const prices = receipts
    .filter((r) => !r.priceParseError && /^\d+(\.\d{1,3})?$/.test(r.price))
    .map((r) => Number(r.price))
    .filter((price) => Number.isFinite(price) && price > 0)
  return prices.length ? prices.reduce((total, price) => total + price, 0) / prices.length : null
}

export const formatGasPrice = (price: number | null) =>
  price === null ? '\u2014' : `$${price.toFixed(3)}`

export const formatTripDates = (trip: Trip) => {
  const format = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  return format(trip.start) + (trip.start === trip.end ? '' : ` \u2014 ${format(trip.end)}`)
}

export const isValidReceipt = (r: Receipt) =>
  /^\d+(\.\d{1,2})?$/.test(r.total) &&
  Number.isFinite(Number(r.total)) &&
  Number(r.total) > 0 &&
  /^\d+(\.\d{1,3})?$/.test(r.price) &&
  Number.isFinite(Number(r.price)) &&
  Number(r.price) > 0

export const id = () => crypto.randomUUID()

export const escapeHTML = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c
  )
