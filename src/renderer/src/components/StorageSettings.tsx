import type { TreasuryWorkspace } from '../hooks/useTreasuryWorkspace'
import Icon from './Icon'

type StorageSettingsProps = Pick<
  TreasuryWorkspace,
  'data' | 'folder' | 'setFolder' | 'busy' | 'setBusy' | 'setMessage' | 'setSaveState' | 'serial'
>

export default function StorageSettings({
  data,
  folder,
  setFolder,
  busy,
  setBusy,
  setMessage,
  setSaveState,
  serial
}: StorageSettingsProps) {
  return (
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
        The folder contains treasury.json and a receipts folder. Back up the entire folder together.
        Choosing a new folder copies your current workspace and keeps the previous copy.
      </p>
      <h2>Offline receipt review</h2>
      <p>
        Import PNG, JPEG, or WebP images. Enter the total cost and price per gallon from the
        original, then mark the receipt reviewed. No receipt images are sent to an external service.
      </p>
      <h2>PDF numbering</h2>
      <p>
        Receipt numbers use the trip start date and a sequence. A trip keeps its number on every
        export. PDFs use US Letter paper and exclude original images.
      </p>
    </section>
  )
}
