import type { Trip } from '../../../preload/types'
import type { TreasuryWorkspace } from '../hooks/useTreasuryWorkspace'
import Icon from './Icon'

type TripHeaderProps = Pick<
  TreasuryWorkspace,
  'setSelected' | 'preview' | 'setPreview' | 'trip'
> & { trip: Trip }

export default function TripHeader({ setSelected, preview, setPreview, trip }: TripHeaderProps) {
  return (
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
  )
}
