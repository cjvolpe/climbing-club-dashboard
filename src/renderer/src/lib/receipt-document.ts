import type { Data, Trip } from '../../../preload/types'
import cursiveFont from '../assets/fonts/Allura-Regular.ttf?inline'
import { driverTotal, escapeHTML, formatMoney } from './receipts'

export function documentHTML(trip: Trip, data: Data) {
  const p = data.profile
  const watermarkBackground = p.icon
    ? `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="816" height="1056" viewBox="0 0 816 1056"><image href="${escapeHTML(p.icon)}" x="122" y="158" width="572" height="740" preserveAspectRatio="xMidYMid meet"/></svg>`
      )}`
    : ''
  const pdfDate = (date: string) => {
    const [year, month, day] = date.split('-')
    return `${month}-${day}-${year}`
  }
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>Trip receipt</title><style>@font-face{font-family:Allura;src:url("' +
    cursiveFont +
    '") format("truetype")}html{color-scheme:light}body{font:14px Arial,sans-serif;color:#162333;background:white;margin:28px}h1{font-size:28px}h2{font-size:19px;margin-top:30px}p{line-height:1.6}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{text-align:left;padding:10px;border-bottom:1px solid #cbd2d9;overflow-wrap:anywhere}.num{text-align:right}.signature{font-family:Allura,cursive;font-size:30px}section{break-inside:avoid}small{color:#526071}.driver-payment{margin:28px 0 64px}.driver-payment table{table-layout:fixed}.driver-payment th,.driver-payment td{border:0;padding:4px 0;font-weight:normal;vertical-align:top}.payment-item{margin:0 0 12px}.payment-item thead th{text-align:center;padding-bottom:8px}.payment-item thead .num{text-align:right}.quantity{text-align:center}.payment-totals{width:52%;margin:0 0 20px auto;border-top:1px solid #162333}.payment-totals th{width:55%}.payment-signature{display:grid;grid-template-columns:1fr 1fr;align-items:end;gap:24px;width:58%;margin-left:auto}.payment-signature .signature{text-align:center;border-bottom:1px solid #162333;font-size:26px;overflow-wrap:anywhere}.payment-method{display:grid;grid-template-columns:40% 1fr;gap:16px;margin-top:20px;overflow-wrap:anywhere}</style></head><body>' +
    '<style>.trip-title{grid-column:2;grid-row:1;font-size:32px;text-align:center;margin:0;min-height:72px;overflow-wrap:anywhere}.document-header{display:grid;grid-template-columns:1fr 1.3fr 1fr;column-gap:16px;row-gap:24px;align-items:start;break-inside:avoid;position:relative}.receipt-watermark{position:fixed;inset:0;width:100%;height:100%;box-sizing:border-box;padding:15%;object-fit:contain;background:transparent;mix-blend-mode:multiply;opacity:0.08;pointer-events:none;z-index:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pdf-content{position:relative;z-index:1;display:flex;flex-direction:column;min-height:calc(10in - 56px)}.final-payment{display:flex;flex-direction:column;flex:1;break-inside:avoid}.final-payment .driver-payment{margin-bottom:0}.trip-total{width:40%;margin:auto 0 0 auto;padding-top:30px;text-align:center;break-inside:avoid}@media screen{body{position:relative}.receipt-watermark{display:none}.preview-watermark{position:absolute;inset:0;opacity:0.08;pointer-events:none;background-repeat:repeat-y;background-position:top center;background-size:100% auto;z-index:0}}@media print{.preview-watermark{display:none}}.header-details{display:contents}.header-details p{margin:0;min-width:0;overflow-wrap:anywhere}.trip-details{grid-column:1 / -1;grid-row:2;text-align:left}.profile-details{grid-column:3;grid-row:1;text-align:right}.document-header hr{grid-column:1 / -1;width:100%;border:0;border-top:1px solid #cbd2d9;margin:0}</style>' +
    (p.icon
      ? `<img class="receipt-watermark" src="${escapeHTML(p.icon)}" alt="" aria-hidden="true">`
      : '') +
    (p.icon
      ? `<div class="preview-watermark" aria-hidden="true" style="background-image:url(&quot;${escapeHTML(watermarkBackground)}&quot;)"></div>`
      : '') +
    '<div class="pdf-content"><header class="document-header"><h1 class="trip-title">' +
    escapeHTML(trip.name) +
    ' Receipt of Sales</h1>' +
    '<div class="header-details"><p class="trip-details"><strong>Location:</strong> ' +
    escapeHTML(trip.location) +
    '<br><strong>Trip date:</strong> ' +
    escapeHTML(pdfDate(trip.start)) +
    (trip.start === trip.end ? '' : ` &ndash; ${escapeHTML(pdfDate(trip.end))}`) +
    '<br><strong>Receipt number:</strong> ' +
    escapeHTML(trip.number) +
    '<br><strong>Created:</strong> ' +
    new Date().toLocaleDateString('en-US') +
    '</p><p class="profile-details">' +
    escapeHTML(p.organization) +
    '<br>' +
    escapeHTML(p.address) +
    '<br>' +
    escapeHTML(p.city) +
    '<br>' +
    escapeHTML(p.email) +
    '<br><strong>Truist account:</strong> ' +
    escapeHTML(p.account) +
    '</p></div><hr></header>' +
    trip.drivers
      .map(
        (d, index) =>
          (index === trip.drivers.length - 1 ? '<div class="final-payment">' : '') +
          '<section class="driver-payment"><table class="payment-item"><colgroup><col style="width:58%"><col style="width:16%"><col style="width:26%"></colgroup><thead><tr><th>Item Description</th><th class="quantity">Quantity</th><th class="num">Price</th></tr></thead><tbody><tr><td>' +
          escapeHTML(d.name) +
          ' Gas Reimbursement</td><td class="quantity">1</td><td class="num">' +
          formatMoney(driverTotal(d)) +
          '</td></tr></tbody></table><table class="payment-totals"><tbody><tr><th scope="row">Total</th><td class="num">' +
          formatMoney(driverTotal(d)) +
          '</td></tr><tr><th scope="row">Amount Paid</th><td class="num">' +
          formatMoney(driverTotal(d)) +
          '</td></tr><tr><th scope="row">Amount</th><td class="num">' +
          formatMoney(0) +
          '</td></tr></tbody></table><div class="payment-signature"><span>Signature</span><div class="signature">' +
          escapeHTML(d.name) +
          '</div></div><div class="payment-method"><span>Payment Method</span><span>' +
          escapeHTML(d.method) +
          '</span></div></section>' +
          (index === trip.drivers.length - 1
            ? '<h2 class="trip-total">Total: ' +
              formatMoney(trip.drivers.reduce((n, driver) => n + driverTotal(driver), 0)) +
              '</h2></div>'
            : '')
      )
      .join('') +
    (trip.drivers.length ? '' : `<h2 class="trip-total">Total: ${formatMoney(0)}</h2>`) +
    '</div></body></html>'
  )
}
