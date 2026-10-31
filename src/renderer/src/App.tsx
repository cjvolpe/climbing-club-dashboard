import { useEffect, useRef, useState } from 'react'
import type { Data, Driver, Receipt, Trip } from '../../preload/types'
import cursiveFont from './assets/fonts/Allura-Regular.ttf?inline'

const empty: Data = {
  trips: [],
  profile: { organization: '', email: '', address: '', city: '', account: '' }
}
const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const sum = (d: Driver) =>
  d.receipts.reduce((n, r) => n + Math.round((Number(r.total) || 0) * 100), 0) / 100
const averageGasPrice = (receipts: Receipt[]) => {
  const prices = receipts
    .filter((r) => !r.priceParseError && /^\d+(\.\d{1,3})?$/.test(r.price))
    .map((r) => Number(r.price))
    .filter((price) => Number.isFinite(price) && price > 0)
  return prices.length ? prices.reduce((total, price) => total + price, 0) / prices.length : null
}
const gasPrice = (price: number | null) => (price === null ? '\u2014' : `$${price.toFixed(3)}`)
const tripDates = (trip: Trip) => {
  const format = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  return format(trip.start) + (trip.start === trip.end ? '' : ` \u2014 ${format(trip.end)}`)
}
const valid = (r: Receipt) =>
  /^\d+(\.\d{1,2})?$/.test(r.total) &&
  Number.isFinite(Number(r.total)) &&
  Number(r.total) > 0 &&
  /^\d+(\.\d{1,3})?$/.test(r.price) &&
  Number.isFinite(Number(r.price)) &&
  Number(r.price) > 0
const id = () => crypto.randomUUID()
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c
  )
function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    trips: 'M5 5h14v15H5z M8 3v4 M16 3v4 M5 10h14',
    profile: 'M4 21v-3a8 8 0 0 1 16 0v3 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    storage: 'M4 6c0-4 16-4 16 0s-16 4-16 0v12c0 4 16 4 16 0V6 M4 12c0 4 16 4 16 0',
    plus: 'M12 4v16 M4 12h16',
    minus: 'M4 12h16',
    trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
    pdf: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
    mountain: 'M2 20 9 6l4 7 3-5 6 12H2 M6 12l3 2 3-2',
    close: 'M5 5l14 14 M19 5 5 19',
    back: 'M15 5l-7 7 7 7',
    check: 'M5 12l4 4L19 6'
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.trips} />
    </svg>
  )
}
function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  error = false
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  error?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={error ? 'text' : type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        placeholder={error ? 'The receipt could not be parsed' : undefined}
        aria-invalid={error || undefined}
        title={error ? 'The receipt could not be parsed. Enter the correct amount.' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        min={type === 'number' ? '0.001' : undefined}
        step={type === 'number' ? 'any' : undefined}
      />
    </label>
  )
}
function documentHTML(trip: Trip, data: Data) {
  const p = data.profile
  const watermarkBackground = p.icon
    ? `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="816" height="1056" viewBox="0 0 816 1056"><image href="${esc(p.icon)}" x="122" y="158" width="572" height="740" preserveAspectRatio="xMidYMid meet"/></svg>`
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
      ? '<img class="receipt-watermark" src="' + esc(p.icon) + '" alt="" aria-hidden="true">'
      : '') +
    (p.icon
      ? `<div class="preview-watermark" aria-hidden="true" style="background-image:url(&quot;${esc(watermarkBackground)}&quot;)"></div>`
      : '') +
    '<div class="pdf-content"><header class="document-header"><h1 class="trip-title">' +
    esc(trip.name) +
    ' Receipt of Sales</h1>' +
    '<div class="header-details"><p class="trip-details"><strong>Location:</strong> ' +
    esc(trip.location) +
    '<br><strong>Trip date:</strong> ' +
    esc(pdfDate(trip.start)) +
    (trip.start === trip.end ? '' : ' &ndash; ' + esc(pdfDate(trip.end))) +
    '<br><strong>Receipt number:</strong> ' +
    esc(trip.number) +
    '<br><strong>Created:</strong> ' +
    new Date().toLocaleDateString('en-US') +
    '</p><p class="profile-details">' +
    esc(p.organization) +
    '<br>' +
    esc(p.address) +
    '<br>' +
    esc(p.city) +
    '<br>' +
    esc(p.email) +
    '<br><strong>Truist account:</strong> ' +
    esc(p.account) +
    '</p></div><hr></header>' +
    trip.drivers
      .map(
        (d, index) =>
          (index === trip.drivers.length - 1 ? '<div class="final-payment">' : '') +
          '<section class="driver-payment"><table class="payment-item"><colgroup><col style="width:58%"><col style="width:16%"><col style="width:26%"></colgroup><thead><tr><th>Item Description</th><th class="quantity">Quantity</th><th class="num">Price</th></tr></thead><tbody><tr><td>' +
          esc(d.name) +
          ' Gas Reimbursement</td><td class="quantity">1</td><td class="num">' +
          money(sum(d)) +
          '</td></tr></tbody></table><table class="payment-totals"><tbody><tr><th scope="row">Total</th><td class="num">' +
          money(sum(d)) +
          '</td></tr><tr><th scope="row">Amount Paid</th><td class="num">' +
          money(sum(d)) +
          '</td></tr><tr><th scope="row">Amount</th><td class="num">' +
          money(0) +
          '</td></tr></tbody></table><div class="payment-signature"><span>Signature</span><div class="signature">' +
          esc(d.name) +
          '</div></div><div class="payment-method"><span>Payment Method</span><span>' +
          esc(d.method) +
          '</span></div></section>' +
          (index === trip.drivers.length - 1
            ? '<h2 class="trip-total">Total: ' +
              money(trip.drivers.reduce((n, driver) => n + sum(driver), 0)) +
              '</h2></div>'
            : '')
      )
      .join('') +
    (trip.drivers.length ? '' : '<h2 class="trip-total">Total: ' + money(0) + '</h2>') +
    '</div></body></html>'
  )
}
function PDFPreview({ html }: { html: string }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    let objectURL = ''
    setUrl('')
    setError('')
    async function render() {
      try {
        if (!window.api) throw new Error('Open the desktop application to preview PDF pages.')
        const base64 = await window.api.previewPDF(html)
        if (cancelled) return
        const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
        objectURL = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
        setUrl(objectURL)
      } catch (e) {
        if (!cancelled) setError(`PDF preview unavailable. ${String(e)}`)
      }
    }
    void render()
    return () => {
      cancelled = true
      if (objectURL) URL.revokeObjectURL(objectURL)
    }
  }, [html])
  if (error) return <p role="alert">{error}</p>
  if (!url) return <p role="status">Preparing PDF pages…</p>
  return (
    <iframe
      title="Printable trip receipt"
      src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
    />
  )
}
function ReceiptViewer({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (!size.width || !size.height) return
    dialog.current?.showModal()
    return () => dialog.current?.close()
  }, [size.width, size.height])
  const changeZoom = (amount: number) =>
    setZoom((current) => Math.min(4, Math.max(1, Math.round((current + amount) * 100) / 100)))
  return (
    <dialog
      ref={dialog}
      className="receipt-viewer"
      aria-label={`Receipt: ${name}`}
      onCancel={onClose}
    >
      <button
        type="button"
        className="receipt-viewer-close"
        aria-label="Close receipt"
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
      <div
        className="receipt-viewer-scroll"
        onWheel={(event) => {
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            changeZoom(event.deltaY < 0 ? 0.25 : -0.25)
          }
        }}
      >
        <div
          className="receipt-viewer-canvas"
          style={{
            width: size.width * zoom,
            height: size.height * zoom
          }}
        >
          <img
            src={src}
            alt={`Original receipt: ${name}`}
            onLoad={(event) => {
              const image = event.currentTarget
              const scale = Math.min(
                (window.innerWidth - 112) / image.naturalWidth,
                (window.innerHeight - 176) / image.naturalHeight,
                1
              )
              setSize({ width: image.naturalWidth * scale, height: image.naturalHeight * scale })
            }}
          />
        </div>
      </div>
      <div className="receipt-viewer-tools" role="group" aria-label="Receipt zoom">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={zoom === 1}
          onClick={() => changeZoom(-0.25)}
        >
          <Icon name="minus" />
        </button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom === 4}
          onClick={() => changeZoom(0.25)}
        >
          <Icon name="plus" />
        </button>
        <button type="button" onClick={() => setZoom(1)}>
          Fit
        </button>
      </div>
    </dialog>
  )
}
export default function App() {
  const [data, setData] = useState<Data>(empty)
  const [loaded, setLoaded] = useState(false)
  const [folder, setFolder] = useState('')
  const [page, setPage] = useState('Trips')
  const [tripId, setTripId] = useState('')
  const [selected, setSelected] = useState('')
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(false)
  const [editor, setEditor] = useState(false)
  const [draft, setDraft] = useState({ name: '', start: '', end: '', location: '', count: '1' })
  const [preview, setPreview] = useState(false)
  const [image, setImage] = useState('')
  const [viewerOpen, setViewerOpen] = useState(false)
  const receiptTrigger = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saveState, setSaveState] = useState('Loading records…')
  const serial = useRef(Promise.resolve())
  const trip = data.trips.find((t) => t.id === tripId)
  const driver = trip?.drivers.find((d) => d.receipts.some((r) => r.id === selected))
  const receipt = driver?.receipts.find((r) => r.id === selected)
  const receipts = trip?.drivers.flatMap((d) => d.receipts) || []
  const averagePrice = averageGasPrice(receipts)
  const allReceipts = data.trips.flatMap((t) => t.drivers.flatMap((d) => d.receipts))
  const overallAverage = averageGasPrice(allReceipts)
  const overallTotal =
    data.trips.reduce(
      (total, t) =>
        total + t.drivers.reduce((subtotal, d) => subtotal + Math.round(sum(d) * 100), 0),
      0
    ) / 100
  const reviewed = receipts.filter((r) => r.reviewed && valid(r)).length
  const missingProfile = (['organization', 'email', 'address', 'city', 'account'] as const).some(
    (key) => !data.profile[key].trim()
  )
  const ready =
    !!trip &&
    trip.drivers.length > 0 &&
    trip.drivers.every(
      (d) =>
        d.name.trim() && d.receipts.length > 0 && d.receipts.every((r) => r.reviewed && valid(r))
    ) &&
    !missingProfile
  useEffect(() => {
    if (!window.api) {
      setLoaded(true)
      setSaveState('Browser preview · changes are not stored')
      return
    }
    window.api
      .load()
      .then((result) => {
        if (result.data) setData(result.data)
        setFolder(result.folder)
        setLoaded(true)
        setSaveState('All changes saved')
      })
      .catch((e) => {
        setMessage(
          'Storage could not be opened. Restore access to your assigned folder and reload. ' +
            e.message
        )
        setSaveState('Storage unavailable')
      })
  }, [])
  useEffect(() => {
    if (!loaded || !window.api) return
    setSaveState('Saving…')
    serial.current = serial.current
      .catch(() => {})
      .then(() => window.api.save(data))
      .then(() => setSaveState('All changes saved'))
      .catch((e) => {
        setSaveState('Changes not saved')
        setMessage(
          'Could not save. Your work remains open. Restore storage access, then use Retry save. ' +
            e.message
        )
      })
  }, [data, loaded])
  useEffect(() => {
    setImage('')
    setViewerOpen(false)
    let active = true
    if (receipt?.file && window.api)
      window.api
        .readReceipt(receipt.file)
        .then((src) => {
          if (active) setImage(src)
        })
        .catch(() =>
          setMessage('Original image unavailable. Restore access to the receipts folder.')
        )
    return () => {
      active = false
    }
  }, [receipt?.file])
  function updateTrip(fn: (t: Trip) => Trip) {
    if (trip)
      setData((current) => ({
        ...current,
        trips: current.trips.map((t) => (t.id === trip.id ? fn(t) : t))
      }))
  }
  function updateDriver(did: string, fn: (d: Driver) => Driver) {
    updateTrip((t) => ({ ...t, drivers: t.drivers.map((d) => (d.id === did ? fn(d) : d)) }))
  }
  function updateReceipt(patch: Partial<Receipt>) {
    if (driver && receipt)
      updateDriver(driver.id, (d) => ({
        ...d,
        receipts: d.receipts.map((r) => (r.id === receipt.id ? { ...r, ...patch } : r))
      }))
  }
  async function deleteTrip(target: Trip) {
    if (busy) return
    setBusy(true)
    try {
      const confirmed =
        typeof window.api?.confirmDeleteTrip === 'function'
          ? await window.api.confirmDeleteTrip(target.name)
          : window.confirm(
              `Delete ${target.name} and its drivers and receipts? Continue to final confirmation?`
            ) &&
            window.confirm(
              `Permanently delete ${target.name} and all its receipt data and images? This cannot be undone.`
            )
      if (!confirmed) return
      setData((current) => ({
        ...current,
        trips: current.trips.filter((t) => t.id !== target.id)
      }))
      if (tripId === target.id) {
        setTripId('')
        setSelected('')
        setImage('')
        setViewerOpen(false)
        setPreview(false)
        setEditor(false)
        setCollapsed([])
        setQuery('')
        setFilter(false)
      }
    } catch (error) {
      setMessage(`Could not delete trip. ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }
  async function deleteDriver(d: Driver, index: number) {
    if (busy) return
    setBusy(true)
    try {
      const name = d.name.trim() || `Driver ${index + 1}`
      const confirmed = window.api
        ? await window.api.confirmDeleteDriver(name)
        : window.confirm(
            `Delete ${name} and all their receipts and images from this trip? This cannot be undone.`
          )
      if (!confirmed) return
      updateTrip((t) => ({ ...t, drivers: t.drivers.filter((item) => item.id !== d.id) }))
      if (d.receipts.some((r) => r.id === selected)) {
        setSelected('')
        setImage('')
        setViewerOpen(false)
      }
      setCollapsed((current) => current.filter((did) => did !== d.id))
    } catch (error) {
      setMessage(`Could not delete driver. ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }
  async function importFiles(did: string) {
    if (!window.api) {
      setMessage('Open the Electron application to import and store receipt images.')
      return
    }
    setBusy(true)
    try {
      const files = await window.api.importReceipts()
      const items = files.map((f) => ({ ...f, id: id(), reviewed: false }))
      if (items.length) {
        updateDriver(did, (d) => ({ ...d, receipts: [...d.receipts, ...items] }))
        setSelected(items[0].id)
      }
    } catch (e) {
      setMessage(`Receipt import failed. Check folder access and try again. ${String(e)}`)
    } finally {
      setBusy(false)
    }
  }
  function createTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim() || !draft.location.trim()) {
      setMessage('Enter an event name and location before creating the trip.')
      return
    }
    if (draft.end < draft.start) {
      setMessage('Trip end date must be on or after its start date.')
      return
    }
    const prefix = draft.start.replaceAll('-', '')
    const sequence =
      Math.max(
        0,
        ...data.trips
          .filter((t) => t.number.startsWith(`${prefix}-`))
          .map((t) => Number(t.number.split('-')[1]))
      ) + 1
    const t: Trip = {
      id: id(),
      name: draft.name.trim(),
      start: draft.start,
      end: draft.end,
      location: draft.location.trim(),
      number: `${prefix}-${String(sequence).padStart(2, '0')}`,
      drivers: Array.from({ length: Math.min(100, Math.max(1, Number(draft.count))) }, () => ({
        id: id(),
        name: '',
        method: 'Zelle',
        receipts: []
      }))
    }
    setData({ ...data, trips: [...data.trips, t] })
    setDraft({ name: '', start: '', end: '', location: '', count: '1' })
    setTripId(t.id)
    setEditor(false)
    setSelected('')
  }
  return (
    <div className="app">
      <header className="app-header">
        <span className="brand-mark">
          <Icon name="mountain" />
        </span>
        <strong>Climbing Club Dashboard</strong>
        <span className="local-label">
          <i /> Offline workspace
        </span>
      </header>
      <div className="shell">
        <nav className="sidebar" aria-label="Main navigation">
          {['Trips', 'Profile', 'Storage'].map((p) => (
            <button
              type="button"
              key={p}
              className={page === p ? 'nav active' : 'nav'}
              onClick={() => {
                setPage(p)
                if (p === 'Trips') {
                  setTripId('')
                  setEditor(false)
                }
                setSelected('')
                setPreview(false)
              }}
            >
              <Icon name={p.toLowerCase()} />
              {p}
            </button>
          ))}
          <div className="sidebar-note">
            A clear record.
            <br />A smoother handoff.
          </div>
        </nav>
        <main>
          {message && (
            <div className="notice" role="alert">
              <span>{message}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setMessage('')}
              >
                <Icon name="close" />
              </button>
            </div>
          )}
          {!loaded && (
            <div className="empty">
              <h1>Opening your workspace</h1>
              <p>Your records stay on your assigned drive.</p>
              <button type="button" onClick={() => location.reload()}>
                Retry loading
              </button>
            </div>
          )}
          {loaded && page === 'Trips' && (
            <>
              <div className="trip-switch">
                {trip ? (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setTripId('')
                      setSelected('')
                      setPreview(false)
                      setEditor(false)
                    }}
                  >
                    <Icon name="back" /> All trips
                  </button>
                ) : (
                  <h1>Trips</h1>
                )}
                {trip && (
                  <label>
                    Trip
                    <select
                      value={trip.id}
                      onChange={(e) => {
                        setTripId(e.target.value)
                        setSelected('')
                        setPreview(false)
                        setEditor(false)
                        setQuery('')
                        setFilter(false)
                      }}
                    >
                      {data.trips.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {trip && (
                  <button
                    type="button"
                    className="delete-trip"
                    aria-label={`Delete trip: ${trip.name}`}
                    title="Delete trip"
                    disabled={busy}
                    onClick={() => deleteTrip(trip)}
                  >
                    <Icon name="trash" />
                  </button>
                )}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setEditor(!editor)
                    setPreview(false)
                  }}
                >
                  <Icon name="plus" />
                  New trip
                </button>
              </div>
              {editor && (
                <form className="setup" onSubmit={createTrip}>
                  <h2>New trip</h2>
                  <div className="form-grid">
                    <Field
                      label="Event name"
                      value={draft.name}
                      onChange={(name) => setDraft({ ...draft, name })}
                      required
                    />
                    <Field
                      label="Location"
                      value={draft.location}
                      onChange={(location) => setDraft({ ...draft, location })}
                      required
                    />
                    <Field
                      label="Start date"
                      type="date"
                      value={draft.start}
                      onChange={(start) => setDraft({ ...draft, start })}
                      required
                    />
                    <Field
                      label="End date"
                      type="date"
                      value={draft.end}
                      onChange={(end) => setDraft({ ...draft, end })}
                      required
                    />
                    <label className="field">
                      <span>Number of drivers</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={draft.count}
                        onChange={(e) => setDraft({ ...draft, count: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="actions">
                    <button className="primary" type="submit">
                      Create trip
                    </button>
                    <button type="button" onClick={() => setEditor(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {!trip && data.trips.length > 0 && (
                <section className="ledger trips-overview" aria-label="Trips overview">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Trip name</th>
                          <th scope="col">Trip dates</th>
                          <th scope="col" className="number">
                            Drivers
                          </th>
                          <th scope="col" className="number">
                            Total gas cost
                          </th>
                          <th scope="col" className="number">
                            Avg price / gal
                          </th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.trips.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <button
                                type="button"
                                className="text-button trip-link"
                                onClick={() => {
                                  setTripId(t.id)
                                  setSelected('')
                                  setPreview(false)
                                  setEditor(false)
                                  setQuery('')
                                  setFilter(false)
                                }}
                              >
                                {t.name}
                              </button>
                            </td>
                            <td className="trip-dates">{tripDates(t)}</td>
                            <td className="number">{t.drivers.length}</td>
                            <td className="number">
                              {money(t.drivers.reduce((total, d) => total + sum(d), 0))}
                            </td>
                            <td className="number">
                              {gasPrice(averageGasPrice(t.drivers.flatMap((d) => d.receipts)))}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="delete-trip"
                                disabled={busy}
                                aria-label={`Delete trip: ${t.name}`}
                                title="Delete trip"
                                onClick={() => deleteTrip(t)}
                              >
                                <Icon name="trash" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="ledger-summary">
                    <span>
                      {data.trips.length} {data.trips.length === 1 ? 'trip' : 'trips'}
                    </span>
                    <div>
                      <span className="summary-amount">
                        <span>Average price / gallon</span>
                        <strong>{gasPrice(overallAverage)}</strong>
                      </span>
                      <span className="summary-amount">
                        <span>Total gas cost</span>
                        <strong>{money(overallTotal)}</strong>
                      </span>
                    </div>
                  </div>
                  <p className="overview-note muted">
                    Average of recorded receipt prices. Missing or invalid prices are excluded.
                  </p>
                </section>
              )}
              {!trip ? (
                data.trips.length === 0 ? (
                  <div className="empty">
                    <div className="empty-symbol">
                      <Icon name="trips" />
                    </div>
                    <h1>Every trip starts here.</h1>
                    <p>
                      Create a trip, collect each driver’s gas receipts, and turn the reviewed
                      expenses into a printable reimbursement record.
                    </p>
                    <button type="button" className="primary" onClick={() => setEditor(true)}>
                      <Icon name="plus" />
                      Create your first trip
                    </button>
                    <p className="muted">
                      Works offline. Original receipts stay with your records.
                    </p>
                  </div>
                ) : null
              ) : (
                <>
                  <div className="trip-header">
                    <div>
                      <h1>{trip.name}</h1>
                      <p>
                        {new Date(`${trip.start}T12:00:00`).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {trip.start !== trip.end && (
                          <>
                            {' — '}
                            {new Date(`${trip.end}T12:00:00`).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </>
                        )}
                        <span className="separator">·</span>
                        {trip.location}
                      </p>
                    </div>
                    <div className="actions">
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setPreview(!preview)
                          setSelected('')
                        }}
                      >
                        <Icon name="pdf" />
                        {preview ? 'Back to receipts' : 'Preview PDF'}
                      </button>
                    </div>
                  </div>
                  {preview ? (
                    <div className="preview">
                      <div className="preview-toolbar">
                        <div>
                          <h2>Print preview</h2>
                          <p>US Letter · Receipt {trip.number}</p>
                        </div>
                        <button
                          className="primary"
                          type="button"
                          disabled={!ready || busy}
                          onClick={async () => {
                            if (!ready || busy) return
                            setBusy(true)
                            try {
                              if (!window.api)
                                throw new Error('Open the desktop application to export.')
                              const exported = await window.api.exportPDF(
                                documentHTML(trip, data),
                                trip.number
                              )
                              if (exported) setMessage('PDF exported successfully.')
                            } catch (e) {
                              setMessage(`PDF export failed. ${String(e)}`)
                            } finally {
                              setBusy(false)
                            }
                          }}
                        >
                          {busy ? 'Exporting…' : 'Export PDF'}
                        </button>
                      </div>
                      {!ready && (
                        <div className="readiness">
                          Before export: {missingProfile ? 'complete all Profile fields; ' : ''}
                          {trip.drivers.some((d) => !d.name.trim() || !d.receipts.length)
                            ? 'name every driver and add their receipts; '
                            : ''}
                          {reviewed !== receipts.length || !receipts.length
                            ? 'enter valid amounts and mark every receipt reviewed.'
                            : ''}
                        </div>
                      )}
                      <PDFPreview html={documentHTML(trip, data)} />
                    </div>
                  ) : (
                    <div className={`workspace${receipt ? ' inspecting' : ''}`}>
                      <section className="ledger" aria-label="Drivers and receipts">
                        <div className="ledger-tools">
                          <div>
                            <strong>Drivers & receipts</strong>
                            <span>
                              {reviewed} of {receipts.length} reviewed
                            </span>
                          </div>
                          <div className="filters">
                            <input
                              aria-label="Search drivers and receipts"
                              placeholder="Find a driver or receipt"
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                            />
                            <label>
                              <input
                                type="checkbox"
                                checked={filter}
                                onChange={(e) => setFilter(e.target.checked)}
                              />
                              Needs review
                            </label>
                          </div>
                        </div>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Driver / receipt</th>
                                <th className="number">Total cost</th>
                                <th className="number">Price / gal</th>
                                <th>Status</th>
                                <th className="reimbursement-heading">Reimbursement</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trip.drivers.map((d, index) => {
                                const visible = d.receipts.filter(
                                  (r) =>
                                    (!filter || !r.reviewed) &&
                                    `${d.name} ${r.name}`
                                      .toLowerCase()
                                      .includes(query.toLowerCase())
                                )
                                if (
                                  query &&
                                  !visible.length &&
                                  !d.name.toLowerCase().includes(query.toLowerCase())
                                )
                                  return null
                                return (
                                  <DriverRows
                                    key={d.id}
                                    driver={d}
                                    index={index}
                                    visible={visible}
                                    collapsed={collapsed.includes(d.id)}
                                    selected={selected}
                                    onToggle={() =>
                                      setCollapsed(
                                        collapsed.includes(d.id)
                                          ? collapsed.filter((x) => x !== d.id)
                                          : [...collapsed, d.id]
                                      )
                                    }
                                    onSelect={setSelected}
                                    onChange={(patch) =>
                                      updateDriver(d.id, (current) => ({ ...current, ...patch }))
                                    }
                                    onImport={() => importFiles(d.id)}
                                    onDelete={() => deleteDriver(d, index)}
                                    busy={busy}
                                  />
                                )
                              })}
                            </tbody>
                          </table>
                          {!trip.drivers.length && (
                            <p className="empty-table">Add a driver to collect receipts.</p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-button add-driver"
                          onClick={() =>
                            updateTrip((t) => ({
                              ...t,
                              drivers: [
                                ...t.drivers,
                                { id: id(), name: '', method: 'Zelle', receipts: [] }
                              ]
                            }))
                          }
                        >
                          <Icon name="plus" />
                          Add driver
                        </button>
                        <div className="ledger-summary">
                          <span>
                            {trip.drivers.length} drivers<span className="separator">·</span>
                            {receipts.length} receipts
                          </span>
                          <div>
                            <span className="summary-amount">
                              <span>Avg cost / gal</span>
                              <strong>
                                {averagePrice === null ? '—' : `$${averagePrice.toFixed(3)}`}
                              </strong>
                            </span>
                            <span className="summary-amount">
                              <span>Trip total</span>
                              <strong>{money(trip.drivers.reduce((n, d) => n + sum(d), 0))}</strong>
                            </span>
                          </div>
                        </div>
                      </section>
                      {receipt && driver && (
                        <aside className="inspector">
                          <div className="inspector-heading">
                            <div>
                              <h2>{driver.name || 'Unnamed driver'}</h2>
                              <p>{receipt.name}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const previous = selected
                                setSelected('')
                                requestAnimationFrame(() =>
                                  document.getElementById(`receipt-${previous}`)?.focus()
                                )
                              }}
                            >
                              <Icon name="back" />
                              <span>Back to drivers</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            className="receipt-image"
                            ref={receiptTrigger}
                            disabled={!image}
                            aria-label={`Enlarge receipt: ${receipt.name}`}
                            aria-haspopup="dialog"
                            onClick={() => setViewerOpen(true)}
                          >
                            {image ? (
                              <div className="original-image">
                                <img src={image} alt={`Original receipt: ${receipt.name}`} />
                              </div>
                            ) : (
                              <span>Loading original receipt?</span>
                            )}
                          </button>
                          {viewerOpen && image && (
                            <ReceiptViewer
                              src={image}
                              name={receipt.name}
                              onClose={() => {
                                setViewerOpen(false)
                                requestAnimationFrame(() => receiptTrigger.current?.focus())
                              }}
                            />
                          )}
                          <div className="manual-note">
                            {receipt.totalParseError || receipt.priceParseError
                              ? 'Enter the missing amounts, then confirm them against the original.'
                              : receipt.reviewed
                                ? 'Amounts confirmed against the original.'
                                : 'Needs confirmation. Check both amounts against the original.'}
                          </div>
                          <Field
                            label="Total cost (USD)"
                            type="number"
                            value={receipt.total}
                            error={receipt.totalParseError}
                            required
                            onChange={(total) =>
                              updateReceipt({
                                total,
                                totalParseError: !total.trim(),
                                reviewed: false
                              })
                            }
                          />
                          <Field
                            label="Price per gallon (USD)"
                            type="number"
                            value={receipt.price}
                            error={receipt.priceParseError}
                            required
                            onChange={(price) =>
                              updateReceipt({
                                price,
                                priceParseError: !price.trim(),
                                reviewed: false
                              })
                            }
                          />
                          <button
                            type="button"
                            className="primary review-button"
                            disabled={!valid(receipt)}
                            onClick={() => updateReceipt({ reviewed: !receipt.reviewed })}
                          >
                            <Icon name="check" />
                            {receipt.reviewed ? 'Reviewed · reopen review' : 'Confirm amounts'}
                          </button>
                          <p className="muted">
                            Check both amounts against the original before marking this receipt
                            reviewed.
                          </p>
                        </aside>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {loaded && page === 'Profile' && (
            <section className="settings">
              <h1>Club profile</h1>
              <p>These details appear on every trip receipt. Changes save automatically.</p>
              <div className="profile-watermark-upload">
                {data.profile.icon && (
                  <img src={data.profile.icon} alt="Current receipt watermark" />
                )}
                <label className="field">
                  <span>Receipt watermark (optional)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-describedby="profile-watermark-help"
                    onChange={async (event) => {
                      const file = event.currentTarget.files?.[0]
                      event.currentTarget.value = ''
                      if (!file) return
                      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                        setMessage('Choose a PNG, JPEG, or WebP image for the receipt watermark.')
                        return
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setMessage('The receipt watermark must be 5 MB or smaller.')
                        return
                      }
                      try {
                        const image = await createImageBitmap(file)
                        const scale = Math.min(1, 1200 / Math.max(image.width, image.height))
                        const canvas = document.createElement('canvas')
                        canvas.width = Math.max(1, Math.round(image.width * scale))
                        canvas.height = Math.max(1, Math.round(image.height * scale))
                        const context = canvas.getContext('2d', { alpha: true })
                        if (!context) throw new Error('Image processing unavailable')
                        context.clearRect(0, 0, canvas.width, canvas.height)
                        context.drawImage(image, 0, 0, canvas.width, canvas.height)
                        image.close()
                        const icon = canvas.toDataURL('image/png')
                        setData((current) => ({
                          ...current,
                          profile: { ...current.profile, icon }
                        }))
                        setMessage('Receipt watermark updated.')
                      } catch {
                        setMessage(
                          'This image could not be opened. Try another PNG, JPEG, or WebP image.'
                        )
                      }
                    }}
                  />
                  <small id="profile-watermark-help">
                    PNG, JPEG, or WebP, up to 5 MB. Appears faintly behind the content on every PDF
                    page.
                  </small>
                </label>
                {data.profile.icon && (
                  <button
                    type="button"
                    onClick={() =>
                      setData((current) => ({
                        ...current,
                        profile: { ...current.profile, icon: undefined }
                      }))
                    }
                  >
                    Remove watermark
                  </button>
                )}
              </div>
              <div className="form-grid">
                {(
                  [
                    ['organization', 'Organization name'],
                    ['email', 'Email'],
                    ['address', 'Street address'],
                    ['city', 'City, state & ZIP'],
                    ['account', 'Truist account number']
                  ] as const
                ).map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    type={key === 'email' ? 'email' : 'text'}
                    value={data.profile[key]}
                    onChange={(value) =>
                      setData({ ...data, profile: { ...data.profile, [key]: value } })
                    }
                  />
                ))}
              </div>
              <p className="muted">
                Account details are stored locally with your records. Choose a trusted storage
                folder.
              </p>
            </section>
          )}
          {loaded && page === 'Storage' && (
            <section className="settings">
              <h1>Storage</h1>
              <p>Keep original receipt images and treasury data together on your assigned drive.</p>
              <div className="storage-detail">
                <Icon name="storage" />
                <div>
                  <h2>Workspace folder</h2>
                  <code>{folder || 'Desktop storage is available in the Electron app.'}</code>
                </div>
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.api) return
                    setBusy(true)
                    try {
                      await serial.current
                      await window.api.save(data)
                      const next = await window.api.chooseFolder()
                      if (next) {
                        setFolder(next)
                        setMessage(
                          'Workspace copied to the selected folder. Future changes will save there.'
                        )
                      }
                    } catch (e) {
                      setMessage(
                        `Could not move storage. Your original records are unchanged. ${String(e)}`
                      )
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Choose assigned folder
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await window.api.save(data)
                      setSaveState('All changes saved')
                      setMessage('Records saved successfully.')
                    } catch (e) {
                      setMessage(`Save failed. Check storage access. ${String(e)}`)
                    }
                  }}
                >
                  Retry save
                </button>
              </div>
              <h2>Built for officer handoffs</h2>
              <p>
                The folder contains treasury.json and a receipts folder. Back up the entire folder
                together. Choosing a new folder copies your current workspace and keeps the previous
                copy.
              </p>
              <h2>Offline receipt review</h2>
              <p>
                Import PNG, JPEG, or WebP images. Enter the total cost and price per gallon from the
                original, then mark the receipt reviewed. No receipt images are sent to an external
                service.
              </p>
              <h2>PDF numbering</h2>
              <p>
                Receipt numbers use the trip start date and a sequence. A trip keeps its number on
                every export. PDFs use US Letter paper and exclude original images.
              </p>
            </section>
          )}
        </main>
      </div>
      <footer>
        <span>
          <i />
          Offline mode
        </span>
        <span>{saveState}</span>
        <span className="footer-right">Your receipts. Your records. On your drive.</span>
      </footer>
    </div>
  )
}
function DriverRows({
  driver: d,
  index,
  visible,
  collapsed,
  selected,
  onToggle,
  onSelect,
  onChange,
  onImport,
  onDelete,
  busy
}: {
  driver: Driver
  index: number
  visible: Receipt[]
  collapsed: boolean
  selected: string
  onToggle: () => void
  onSelect: (id: string) => void
  onChange: (patch: Partial<Driver>) => void
  onImport: () => void
  onDelete: () => void
  busy: boolean
}) {
  return (
    <>
      <tr className="driver-row">
        <td>
          <div className="driver-name">
            <button
              type="button"
              className={`chevron ${collapsed ? '' : 'expanded'}`}
              aria-label={`${collapsed ? 'Expand' : 'Collapse'} driver ${index + 1}`}
              aria-expanded={!collapsed}
              onClick={onToggle}
            >
              <Icon name="back" />
            </button>
            <input
              aria-label={`Driver ${index + 1} name`}
              placeholder={`Driver ${index + 1} name`}
              value={d.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            <small>{d.receipts.length}</small>
          </div>
        </td>
        <td className="number">
          <strong>{money(sum(d))}</strong>
        </td>
        <td />
        <td>
          <span
            className={
              'status ' +
              (d.receipts.length && d.receipts.every((r) => r.reviewed) ? 'reviewed' : '')
            }
          >
            {d.receipts.length && d.receipts.every((r) => r.reviewed) ? 'Reviewed' : 'Needs review'}
          </span>
        </td>
        <td>
          <div className="driver-actions">
            <select
              aria-label={`Reimbursement for ${d.name || `driver ${index + 1}`}`}
              value={d.method}
              onChange={(e) => onChange({ method: e.target.value })}
            >
              {['Zelle', 'CashApp', 'Check'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <button
              type="button"
              className="delete-driver"
              aria-label={`Delete ${d.name || `driver ${index + 1}`}`}
              title="Delete driver"
              disabled={busy}
              onClick={onDelete}
            >
              <Icon name="trash" />
            </button>
          </div>
        </td>
      </tr>
      {!collapsed && (
        <>
          {visible.map((r, i) => (
            <tr key={r.id} className={`receipt-row ${selected === r.id ? 'selected' : ''}`}>
              <td>
                <button type="button" id={`receipt-${r.id}`} onClick={() => onSelect(r.id)}>
                  <Icon name="pdf" />
                  <span>
                    {r.name}
                    <small>Receipt {i + 1}</small>
                  </span>
                </button>
              </td>
              <td className="number">{r.total ? money(Number(r.total)) : '—'}</td>
              <td className="number">{r.price ? `$${Number(r.price).toFixed(3)}` : '—'}</td>
              <td colSpan={2}>
                <span className={`status ${r.reviewed ? 'reviewed' : ''}`}>
                  {r.reviewed ? 'Reviewed' : 'Needs review'}
                </span>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} className="empty-driver">
              {!d.receipts.length && <span>No receipts yet.</span>}
              <button
                type="button"
                className="text-button"
                aria-label={`Add receipts for ${d.name || `driver ${index + 1}`}`}
                disabled={busy}
                onClick={onImport}
              >
                <Icon name="plus" />
                Add receipts
              </button>
            </td>
          </tr>
        </>
      )}
    </>
  )
}
