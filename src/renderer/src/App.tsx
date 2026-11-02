import Icon from './components/Icon'
import ProfileSettings from './components/ProfileSettings'
import StorageSettings from './components/StorageSettings'
import TripsPage from './components/TripsPage'
import { useTreasuryWorkspace } from './hooks/useTreasuryWorkspace'

export default function App() {
  const workspace = useTreasuryWorkspace()
  const {
    data,
    setData,
    loaded,
    folder,
    setFolder,
    page,
    setPage,
    setTripId,
    setSelected,
    setEditor,
    setPreview,
    busy,
    setBusy,
    message,
    setMessage,
    saveState,
    setSaveState,
    serial
  } = workspace
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
                if (p === 'Trips') {
                  setTripId('')
                  setEditor(false)
                }
                setSelected('')
                setPreview(false)
              }}
            >
              <Icon name={p.toLowerCase()} />
              {p}
            </button>
          ))}
          <div className="sidebar-note">
            Climb Time,
            <br />Grind Time
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
          {loaded && page === 'Trips' && <TripsPage workspace={workspace} />}
          {loaded && page === 'Profile' && (
            <ProfileSettings data={data} setData={setData} setMessage={setMessage} />
          )}
          {loaded && page === 'Storage' && (
            <StorageSettings
              data={data}
              folder={folder}
              setFolder={setFolder}
              busy={busy}
              setBusy={setBusy}
              setMessage={setMessage}
              setSaveState={setSaveState}
              serial={serial}
            />
          )}
        </main>
      </div>
      <footer>
        <span>
          <i />
          Offline mode
        </span>
        <span>{saveState}</span>
        <span className="footer-right">UNC Chapel Hill Climbing Club. Stay Sendy</span>
      </footer>
    </div>
  )
}
