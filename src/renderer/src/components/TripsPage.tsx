import type { TreasuryWorkspace } from '../hooks/useTreasuryWorkspace'
import DriverLedger from './DriverLedger'
import Icon from './Icon'
import ReceiptInspector from './ReceiptInspector'
import TripForm from './TripForm'
import TripHeader from './TripHeader'
import TripPreview from './TripPreview'
import TripsOverview from './TripsOverview'

type TripsPageProps = { workspace: TreasuryWorkspace }

export default function TripsPage({ workspace }: TripsPageProps) {
  const {
    data,
    setTripId,
    selected,
    setSelected,
    collapsed,
    setCollapsed,
    query,
    setQuery,
    filter,
    setFilter,
    editor,
    setEditor,
    draft,
    setDraft,
    preview,
    setPreview,
    image,
    viewerOpen,
    setViewerOpen,
    receiptTrigger,
    busy,
    setBusy,
    setMessage,
    trip,
    driver,
    receipt,
    receipts,
    averagePrice,
    overallAverage,
    overallTotal,
    reviewed,
    missingProfile,
    ready,
    updateTrip,
    updateDriver,
    updateReceipt,
    deleteTrip,
    deleteDriver,
    importFiles,
    createTrip
  } = workspace
  return (
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
      {workspace.importProgress && (
        <div className="import-bar" role="status">
          Reading {workspace.importProgress.name || 'receipt'} · {workspace.importProgress.status}
          {' · '}
          {Math.round(workspace.importProgress.progress * 100)}%
        </div>
      )}
      {editor && (
        <TripForm setEditor={setEditor} draft={draft} setDraft={setDraft} createTrip={createTrip} />
      )}
      {!trip && data.trips.length > 0 && (
        <TripsOverview
          data={data}
          setTripId={setTripId}
          setSelected={setSelected}
          setQuery={setQuery}
          setFilter={setFilter}
          setEditor={setEditor}
          setPreview={setPreview}
          busy={busy}
          overallAverage={overallAverage}
          overallTotal={overallTotal}
          deleteTrip={deleteTrip}
        />
      )}
      {!trip ? (
        data.trips.length === 0 ? (
          <div className="empty">
            <div className="empty-symbol">
              <Icon name="trips" />
            </div>
            <h1>Every trip starts here.</h1>
            <p>
              Create a trip, collect each driver’s gas receipts, and turn the reviewed expenses into
              a printable reimbursement record.
            </p>
            <button type="button" className="primary" onClick={() => setEditor(true)}>
              <Icon name="plus" />
              Create your first trip
            </button>
            <p className="muted">Works offline. Original receipts stay with your records.</p>
          </div>
        ) : null
      ) : (
        <>
          <TripHeader
            setSelected={setSelected}
            preview={preview}
            setPreview={setPreview}
            trip={trip}
          />
          {preview ? (
            <TripPreview
              data={data}
              busy={busy}
              setBusy={setBusy}
              setMessage={setMessage}
              trip={trip}
              receipts={receipts}
              reviewed={reviewed}
              missingProfile={missingProfile}
              ready={ready}
            />
          ) : (
            <div className={`workspace${receipt ? ' inspecting' : ''}`}>
              <DriverLedger
                selected={selected}
                setSelected={setSelected}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                query={query}
                setQuery={setQuery}
                filter={filter}
                setFilter={setFilter}
                busy={busy}
                trip={trip}
                receipts={receipts}
                averagePrice={averagePrice}
                reviewed={reviewed}
                updateTrip={updateTrip}
                updateDriver={updateDriver}
                deleteDriver={deleteDriver}
                importFiles={importFiles}
              />
              {receipt && driver && (
                <ReceiptInspector
                  selected={selected}
                  setSelected={setSelected}
                  image={image}
                  viewerOpen={viewerOpen}
                  setViewerOpen={setViewerOpen}
                  receiptTrigger={receiptTrigger}
                  driver={driver}
                  receipt={receipt}
                  updateReceipt={updateReceipt}
                />
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
