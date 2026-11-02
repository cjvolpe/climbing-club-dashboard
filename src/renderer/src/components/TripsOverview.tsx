import type { TreasuryWorkspace } from '../hooks/useTreasuryWorkspace'
import {
  averageGasPrice,
  driverTotal,
  formatGasPrice,
  formatMoney,
  formatTripDates
} from '../lib/receipts'
import Icon from './Icon'

type TripsOverviewProps = Pick<
  TreasuryWorkspace,
  | 'data'
  | 'setTripId'
  | 'setSelected'
  | 'setQuery'
  | 'setFilter'
  | 'setEditor'
  | 'setPreview'
  | 'busy'
  | 'overallAverage'
  | 'excludeDiesel'
  | 'setExcludeDiesel'
  | 'overallTotal'
  | 'deleteTrip'
>

export default function TripsOverview({
  data,
  setTripId,
  setSelected,
  setQuery,
  setFilter,
  setEditor,
  setPreview,
  busy,
  overallAverage,
  excludeDiesel,
  setExcludeDiesel,
  overallTotal,
  deleteTrip
}: TripsOverviewProps) {
  return (
    <section className="ledger trips-overview" aria-label="Trips overview">
      <div className="ledger-tools">
        <strong>All trips</strong>
        <div className="filters">
          <label title="Applies to all trips">
            <input
              type="checkbox"
              checked={excludeDiesel}
              onChange={(e) => setExcludeDiesel(e.target.checked)}
            />
            Exclude diesel from average
          </label>
        </div>
      </div>
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
                <td className="trip-dates">{formatTripDates(t)}</td>
                <td className="number">{t.drivers.length}</td>
                <td className="number">
                  {formatMoney(t.drivers.reduce((total, d) => total + driverTotal(d), 0))}
                </td>
                <td className="number">
                  {formatGasPrice(
                    averageGasPrice(
                      t.drivers.flatMap((d) => d.receipts),
                      excludeDiesel
                    )
                  )}
                  {excludeDiesel && <small className="fuel-average-note">Excludes diesel</small>}
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
            <strong>{formatGasPrice(overallAverage)}</strong>
          </span>
          <span className="summary-amount">
            <span>Total gas cost</span>
            <strong>{formatMoney(overallTotal)}</strong>
          </span>
        </div>
      </div>
      <p className="overview-note muted">
        Average of recorded receipt prices. Missing or invalid prices are excluded.
        {excludeDiesel && ' Diesel is excluded from averages across all trips.'}
      </p>
    </section>
  )
}
