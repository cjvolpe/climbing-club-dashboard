import type { Driver, Receipt } from '../../../preload/types'
import type { TreasuryWorkspace } from '../hooks/useTreasuryWorkspace'
import { isValidReceipt } from '../lib/receipts'
import Field from './Field'
import Icon from './Icon'
import OCRInspector from './OCRInspector'
import ReceiptViewer from './ReceiptViewer'

type ReceiptInspectorProps = Pick<
  TreasuryWorkspace,
  | 'selected'
  | 'setSelected'
  | 'image'
  | 'viewerOpen'
  | 'setViewerOpen'
  | 'receiptTrigger'
  | 'driver'
  | 'receipt'
  | 'updateReceipt'
> & { receipt: Receipt; driver: Driver }

export default function ReceiptInspector({
  selected,
  setSelected,
  image,
  viewerOpen,
  setViewerOpen,
  receiptTrigger,
  driver,
  receipt,
  updateReceipt
}: ReceiptInspectorProps) {
  return (
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
            requestAnimationFrame(() => document.getElementById(`receipt-${previous}`)?.focus())
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
        disabled={!isValidReceipt(receipt)}
        onClick={() => updateReceipt({ reviewed: !receipt.reviewed })}
      >
        <Icon name="check" />
        {receipt.reviewed ? 'Reviewed · reopen review' : 'Confirm amounts'}
      </button>
      <p className="muted">
        Check both amounts against the original before marking this receipt reviewed.
      </p>
      {(import.meta.env.DEV || import.meta.env.MODE === 'test') && (
        <OCRInspector
          key={`${receipt.id}-${receipt.file}`}
          receipt={receipt}
          image={image}
          updateReceipt={updateReceipt}
        />
      )}
    </aside>
  )
}
