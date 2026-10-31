import type { Trip } from '../../../preload/types'
import type { TreasuryWorkspace } from '../hooks/useTreasuryWorkspace'
import { documentHTML } from '../lib/receipt-document'
import PDFPreview from './PDFPreview'

type TripPreviewProps = Pick<
  TreasuryWorkspace,
  | 'data'
  | 'busy'
  | 'setBusy'
  | 'setMessage'
  | 'trip'
  | 'receipts'
  | 'reviewed'
  | 'missingProfile'
  | 'ready'
> & { trip: Trip }

export default function TripPreview({
  data,
  busy,
  setBusy,
  setMessage,
  trip,
  receipts,
  reviewed,
  missingProfile,
  ready
}: TripPreviewProps) {
  return (
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
              if (!window.api) throw new Error('Open the desktop application to export.')
              const exported = await window.api.exportPDF(documentHTML(trip, data), trip.number)
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
  )
}
