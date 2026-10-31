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
const valid = (r: Receipt) =>
  /^\d+(\.\d{1,2})?$/.test(r.total) &&
  Number.isFinite(Number(r.total)) &&
  Number(r.total) > 0 &&
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
  required = false
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
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
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>Trip receipt</title><style>@font-face{font-family:Allura;src:url("' +
    cursiveFont +
    '") format("truetype")}html{color-scheme:light}body{font:14px Arial,sans-serif;color:#162333;background:white;margin:28px}h1{font-size:28px}h2{font-size:19px;margin-top:30px}p{line-height:1.6}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{text-align:left;padding:10px;border-bottom:1px solid #cbd2d9;overflow-wrap:anywhere}.num{text-align:right}.signature{font-family:Allura,cursive;font-size:30px}section{break-inside:avoid}small{color:#526071}</style></head><body>' +
    '<h1>' +
    esc(p.organization) +
    '</h1><p>' +
    esc(p.address) +
    '<br>' +
    esc(p.city) +
    '<br>' +
    esc(p.email) +
    '<br>Truist account: ' +
    esc(p.account) +
    '</p><hr><h2>' +
    esc(trip.name) +
    '</h2><p>' +
    esc(trip.location) +
    ' · ' +
    esc(trip.start) +
    ' – ' +
    esc(trip.end) +
    '<br>Receipt ' +
    esc(trip.number) +
    ' · Created ' +
    new Date().toLocaleDateString('en-US') +
    '</p>' +
    trip.drivers
      .map(
        (d) =>
          '<section><h2>' +
          esc(d.name) +
          '</h2><p>Reimbursement: ' +
          esc(d.method) +
          '</p><table><thead><tr><th>Receipt</th><th class="num">Price / gallon</th><th class="num">Total cost</th></tr></thead><tbody>' +
          d.receipts
            .map(
              (r, i) =>
                '<tr><td>' +
                String(i + 1) +
                '. ' +
                esc(r.name) +
                '</td><td class="num">$' +
                Number(r.price).toFixed(3) +
                '</td><td class="num">' +
                money(Number(r.total)) +
                '</td></tr>'
            )
            .join('') +
          '</tbody><tfoot><tr><th>Driver total</th><th></th><th class="num">' +
          money(sum(d)) +
          '</th></tr></tfoot></table><div class="signature">' +
          esc(d.name) +
          '</div><small>Generated name in cursive; not a captured signature.</small></section>'
      )
      .join('') +
    '<h2>Trip total: ' +
    money(trip.drivers.reduce((n, d) => n + sum(d), 0)) +
    '</h2></body></html>'
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
  const [zoomed, setZoomed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saveState, setSaveState] = useState('Loading records…')
  const [importDriver, setImportDriver] = useState('')
  const serial = useRef(Promise.resolve())
  const trip = data.trips.find((t) => t.id === tripId) || data.trips[0]
  const driver = trip?.drivers.find((d) => d.receipts.some((r) => r.id === selected))
  const receipt = driver?.receipts.find((r) => r.id === selected)
  const receipts = trip?.drivers.flatMap((d) => d.receipts) || []
  const reviewed = receipts.filter((r) => r.reviewed && valid(r)).length
  const missingProfile = Object.values(data.profile).some((v) => !v.trim())
  const ready =
    !!trip &&
    receipts.length > 0 &&
    reviewed === receipts.length &&
    trip.drivers.every((d) => d.name.trim() && d.receipts.length > 0) &&
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
    setZoomed(false)
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
  async function importFiles(did: string) {
    if (!window.api) {
      setMessage('Open the Electron application to import and store receipt images.')
      return
    }
    setBusy(true)
    try {
      const files = await window.api.importReceipts()
      const items = files.map((f) => ({ ...f, id: id(), total: '', price: '', reviewed: false }))
      if (items.length) {
        updateDriver(did, (d) => ({ ...d, receipts: [...d.receipts, ...items] }))
        setSelected(items[0].id)
        setImportDriver('')
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
                <label>
                  Trip
                  <select
                    value={trip?.id || ''}
                    onChange={(e) => {
                      setTripId(e.target.value)
                      setSelected('')
                      setPreview(false)
                    }}
                  >
                    {!data.trips.length && <option>No trips yet</option>}
                    {data.trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
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
              {!trip ? (
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
                  <p className="muted">Works offline. Original receipts stay with your records.</p>
                </div>
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
                        })}{' '}
                        —{' '}
                        {new Date(`${trip.end}T12:00:00`).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        <span className="separator">·</span>
                        {trip.location}
                      </p>
                    </div>
                    <div className="actions">
                      <button
                        type="button"
                        onClick={() =>
                          setImportDriver(importDriver ? '' : trip.drivers[0]?.id || '')
                        }
                        disabled={busy}
                      >
                        <Icon name="plus" />
                        Add receipts
                      </button>
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
                  {importDriver && (
                    <div className="import-bar">
                      <label>
                        Add receipts for
                        <select
                          value={importDriver}
                          onChange={(e) => setImportDriver(e.target.value)}
                        >
                          {trip.drivers.map((d, i) => (
                            <option key={d.id} value={d.id}>
                              {d.name || `Driver ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="primary"
                        disabled={busy}
                        onClick={() => importFiles(importDriver)}
                      >
                        {busy ? 'Importing…' : 'Choose images'}
                      </button>
                      <button type="button" onClick={() => setImportDriver('')}>
                        Cancel
                      </button>
                      <small>PNG, JPG, WebP · enter values manually</small>
                    </div>
                  )}
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
                      <iframe
                        title="Printable trip receipt"
                        srcDoc={documentHTML(trip, data)}
                        sandbox=""
                      />
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
                                <th>Reimbursement</th>
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
                            <span>Trip total</span>
                            <strong>{money(trip.drivers.reduce((n, d) => n + sum(d), 0))}</strong>
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
                            className="text-button zoom-control"
                            disabled={!image}
                            aria-pressed={zoomed}
                            onClick={() => setZoomed(!zoomed)}
                          >
                            {zoomed ? 'Fit original to view' : 'Enlarge original'}
                          </button>
                          <section
                            className={`receipt-image${zoomed ? ' zoomed' : ''}`}
                            tabIndex={zoomed ? 0 : undefined}
                            aria-label="Original receipt; enlarge and scroll to inspect"
                          >
                            {image ? (
                              <div className="original-image">
                                <img src={image} alt={`Original receipt: ${receipt.name}`} />
                              </div>
                            ) : (
                              <p>Loading original receipt…</p>
                            )}
                          </section>
                          <div className="manual-note">
                            Manual review required. Automatic extraction is not configured.
                          </div>
                          <Field
                            label="Total cost (USD)"
                            type="number"
                            value={receipt.total}
                            onChange={(total) => updateReceipt({ total, reviewed: false })}
                          />
                          <Field
                            label="Price per gallon (USD)"
                            type="number"
                            value={receipt.price}
                            onChange={(price) => updateReceipt({ price, reviewed: false })}
                          />
                          <label className="field">
                            <span>Reimbursement method</span>
                            <select
                              value={driver.method}
                              onChange={(e) =>
                                updateDriver(driver.id, (d) => ({ ...d, method: e.target.value }))
                              }
                            >
                              {['Zelle', 'CashApp', 'Check'].map((m) => (
                                <option key={m}>{m}</option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            className="primary review-button"
                            disabled={!valid(receipt)}
                            onClick={() => updateReceipt({ reviewed: !receipt.reviewed })}
                          >
                            <Icon name="check" />
                            {receipt.reviewed ? 'Reviewed · reopen review' : 'Mark as reviewed'}
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
  onImport
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
          <select
            aria-label={`Reimbursement for ${d.name || `driver ${index + 1}`}`}
            value={d.method}
            onChange={(e) => onChange({ method: e.target.value })}
          >
            {['Zelle', 'CashApp', 'Check'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
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
          {!d.receipts.length && (
            <tr>
              <td colSpan={5} className="empty-driver">
                <span>No receipts yet.</span>
                <button type="button" className="text-button" onClick={onImport}>
                  Add receipt images
                </button>
              </td>
            </tr>
          )}
        </>
      )}
    </>
  )
}
