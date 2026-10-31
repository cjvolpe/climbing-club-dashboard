import type { TreasuryWorkspace } from '../hooks/useTreasuryWorkspace'
import Field from './Field'

type TripFormProps = Pick<TreasuryWorkspace, 'setEditor' | 'draft' | 'setDraft' | 'createTrip'>

export default function TripForm({ setEditor, draft, setDraft, createTrip }: TripFormProps) {
  return (
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
  )
}
