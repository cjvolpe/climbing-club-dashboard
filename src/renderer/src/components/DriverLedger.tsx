import type { Trip } from '../../../preload/types'
import type { TreasuryWorkspace } from '../hooks/useTreasuryWorkspace'
import { driverTotal, formatMoney, id } from '../lib/receipts'
import DriverRows from './DriverRows'
import Icon from './Icon'

type DriverLedgerProps = Pick<
  TreasuryWorkspace,
  | 'selected'
  | 'setSelected'
  | 'collapsed'
  | 'setCollapsed'
  | 'query'
  | 'setQuery'
  | 'filter'
  | 'setFilter'
  | 'busy'
  | 'trip'
  | 'receipts'
  | 'averagePrice'
  | 'excludeDiesel'
  | 'setExcludeDiesel'
  | 'reviewed'
  | 'updateTrip'
  | 'updateDriver'
  | 'deleteDriver'
  | 'deleteReceipt'
  | 'importFiles'
> & { trip: Trip }

export default function DriverLedger({
  selected,
  setSelected,
  collapsed,
  setCollapsed,
  query,
  setQuery,
  filter,
  setFilter,
  busy,
  trip,
  receipts,
  averagePrice,
  excludeDiesel,
  setExcludeDiesel,
  reviewed,
  updateTrip,
  updateDriver,
  deleteDriver,
  deleteReceipt,
  importFiles
}: DriverLedgerProps) {
  return (
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
          <label title="Applies to all trips">
            <input
              type="checkbox"
              checked={excludeDiesel}
              onChange={(e) => setExcludeDiesel(e.target.checked)}
            />
            Exclude diesel from average
          </label>
          <label>
            <input type="checkbox" checked={filter} onChange={(e) => setFilter(e.target.checked)} />
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
                  `${d.name} ${r.name}`.toLowerCase().includes(query.toLowerCase())
              )
              if (query && !visible.length && !d.name.toLowerCase().includes(query.toLowerCase()))
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
                  onChange={(patch) => updateDriver(d.id, (current) => ({ ...current, ...patch }))}
                  onImport={() => importFiles(d.id)}
                  onDelete={() => deleteDriver(d, index)}
                  onDeleteReceipt={(receipt) => deleteReceipt(d, receipt)}
                  busy={busy}
                />
              )
            })}
          </tbody>
        </table>
        {!trip.drivers.length && <p className="empty-table">Add a driver to collect receipts.</p>}
      </div>
      <button
        type="button"
        className="text-button add-driver"
        onClick={() =>
          updateTrip((t) => ({
            ...t,
            drivers: [...t.drivers, { id: id(), name: '', method: 'Zelle', receipts: [] }]
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
            <span>Avg cost / gal{excludeDiesel ? ' (excludes diesel)' : ''}</span>
            <strong>{averagePrice === null ? '—' : `$${averagePrice.toFixed(3)}`}</strong>
          </span>
          <span className="summary-amount">
            <span>Trip total</span>
            <strong>{formatMoney(trip.drivers.reduce((n, d) => n + driverTotal(d), 0))}</strong>
          </span>
        </div>
      </div>
    </section>
  )
}
