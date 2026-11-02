import type { Driver, Receipt } from '../../../preload/types'
import { driverTotal, formatMoney } from '../lib/receipts'
import Icon from './Icon'

export default function DriverRows({
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
  onDeleteReceipt,
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
  onDeleteReceipt: (receipt: Receipt) => void
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
              id={`driver-${d.id}`}
              aria-label={`Driver ${index + 1} name`}
              placeholder={`Driver ${index + 1} name`}
              value={d.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            <small>{d.receipts.length}</small>
          </div>
        </td>
        <td className="number">
          <strong>{formatMoney(driverTotal(d))}</strong>
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
              <td className="number">{r.total ? formatMoney(Number(r.total)) : '—'}</td>
              <td className="number">{r.price ? `$${Number(r.price).toFixed(3)}` : '—'}</td>
              <td>
                <span className={`status ${r.reviewed ? 'reviewed' : ''}`}>
                  {r.reviewed ? 'Reviewed' : 'Needs review'}
                </span>
              </td>
              <td className="receipt-actions">
                <button
                  type="button"
                  className="delete-receipt"
                  aria-label={`Remove receipt: ${r.name}`}
                  title="Remove receipt"
                  disabled={busy}
                  onClick={() => onDeleteReceipt(r)}
                >
                  <Icon name="trash" />
                </button>
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
