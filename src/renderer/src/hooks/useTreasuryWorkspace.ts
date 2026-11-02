import { useEffect, useRef, useState } from 'react'
import type { OCRProgress } from '../../../preload/ocr-types'
import type { Data, Driver, Receipt, Trip } from '../../../preload/types'
import { averageGasPrice, driverTotal, emptyData, id, isValidReceipt } from '../lib/receipts'

export function useTreasuryWorkspace() {
  const [data, setData] = useState<Data>(emptyData)
  const [loaded, setLoaded] = useState(false)
  const [folder, setFolder] = useState('')
  const [page, setPage] = useState('Trips')
  const [tripId, setTripId] = useState('')
  const [selected, setSelected] = useState('')
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(false)
  const [editor, setEditor] = useState(false)
  const [draft, setDraft] = useState({ name: '', start: '', end: '', location: '', count: '1' })
  const [preview, setPreview] = useState(false)
  const [image, setImage] = useState('')
  const [viewerOpen, setViewerOpen] = useState(false)
  const receiptTrigger = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [importProgress, setImportProgress] = useState<OCRProgress | null>(null)
  const [message, setMessage] = useState('')
  const [saveState, setSaveState] = useState('Loading records…')
  const serial = useRef(Promise.resolve())
  const trip = data.trips.find((t) => t.id === tripId)
  const driver = trip?.drivers.find((d) => d.receipts.some((r) => r.id === selected))
  const receipt = driver?.receipts.find((r) => r.id === selected)
  const receipts = trip?.drivers.flatMap((d) => d.receipts) || []
  const excludeDiesel = data.excludeDiesel ?? data.trips.some((t) => t.excludeDiesel)
  const averagePrice = averageGasPrice(receipts, excludeDiesel)
  const allReceipts = data.trips.flatMap((t) => t.drivers.flatMap((d) => d.receipts))
  const overallAverage = averageGasPrice(allReceipts, excludeDiesel)
  function setExcludeDiesel(value: boolean) {
    setData((current) => ({ ...current, excludeDiesel: value }))
  }
  const overallTotal =
    data.trips.reduce(
      (total, t) =>
        total + t.drivers.reduce((subtotal, d) => subtotal + Math.round(driverTotal(d) * 100), 0),
      0
    ) / 100
  const reviewed = receipts.filter((r) => r.reviewed && isValidReceipt(r)).length
  const missingProfile = (['organization', 'email', 'address', 'city', 'account'] as const).some(
    (key) => !data.profile[key].trim()
  )
  const ready =
    !!trip &&
    trip.drivers.length > 0 &&
    trip.drivers.every(
      (d) =>
        d.name.trim() &&
        d.receipts.length > 0 &&
        d.receipts.every((r) => r.reviewed && isValidReceipt(r))
    ) &&
    !missingProfile
  useEffect(() => {
    if (!window.api) {
      setLoaded(true)
      setSaveState('Browser preview · changes are not stored')
      return
    }
    window.api
      .load()
      .then((result) => {
        if (result.data) setData(result.data)
        setFolder(result.folder)
        setLoaded(true)
        setSaveState('All changes saved')
      })
      .catch((e) => {
        setMessage(
          'Storage could not be opened. Restore access to your assigned folder and reload. ' +
            e.message
        )
        setSaveState('Storage unavailable')
      })
  }, [])
  useEffect(() => {
    if (!loaded || !window.api) return
    setSaveState('Saving…')
    serial.current = serial.current
      .catch(() => {})
      .then(() => window.api.save(data))
      .then(() => setSaveState('All changes saved'))
      .catch((e) => {
        setSaveState('Changes not saved')
        setMessage(
          'Could not save. Your work remains open. Restore storage access, then use Retry save. ' +
            e.message
        )
      })
  }, [data, loaded])
  useEffect(() => {
    setImage('')
    setViewerOpen(false)
    let active = true
    if (receipt?.file && window.api)
      window.api
        .readReceipt(receipt.file)
        .then((src) => {
          if (active) setImage(src)
        })
        .catch(() =>
          setMessage('Original image unavailable. Restore access to the receipts folder.')
        )
    return () => {
      active = false
    }
  }, [receipt?.file])
  function updateTrip(fn: (t: Trip) => Trip) {
    if (trip)
      setData((current) => ({
        ...current,
        trips: current.trips.map((t) => (t.id === trip.id ? fn(t) : t))
      }))
  }
  function updateDriver(did: string, fn: (d: Driver) => Driver) {
    updateTrip((t) => ({ ...t, drivers: t.drivers.map((d) => (d.id === did ? fn(d) : d)) }))
  }
  function updateReceipt(patch: Partial<Receipt>) {
    if (driver && receipt)
      updateDriver(driver.id, (d) => ({
        ...d,
        receipts: d.receipts.map((r) => (r.id === receipt.id ? { ...r, ...patch } : r))
      }))
  }
  async function deleteReceipt(targetDriver: Driver, targetReceipt: Receipt) {
    if (busy) return
    setBusy(true)
    try {
      const confirmed = window.api
        ? await window.api.confirmDeleteReceipt(targetReceipt.name)
        : window.confirm(
            `Remove ${targetReceipt.name} from this driver? The receipt data and stored image will be permanently removed. This cannot be undone.`
          )
      if (!confirmed) return
      updateDriver(targetDriver.id, (current) => ({
        ...current,
        receipts: current.receipts.filter((item) => item.id !== targetReceipt.id)
      }))
      if (selected === targetReceipt.id) {
        setSelected('')
        setImage('')
        setViewerOpen(false)
      }
      requestAnimationFrame(() => document.getElementById(`driver-${targetDriver.id}`)?.focus())
    } catch (error) {
      setMessage(`Could not remove receipt. ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }
  async function deleteTrip(target: Trip) {
    if (busy) return
    setBusy(true)
    try {
      const confirmed =
        typeof window.api?.confirmDeleteTrip === 'function'
          ? await window.api.confirmDeleteTrip(target.name)
          : window.confirm(
              `Delete ${target.name} and its drivers and receipts? Continue to final confirmation?`
            ) &&
            window.confirm(
              `Permanently delete ${target.name} and all its receipt data and images? This cannot be undone.`
            )
      if (!confirmed) return
      setData((current) => ({
        ...current,
        trips: current.trips.filter((t) => t.id !== target.id)
      }))
      if (tripId === target.id) {
        setTripId('')
        setSelected('')
        setImage('')
        setViewerOpen(false)
        setPreview(false)
        setEditor(false)
        setCollapsed([])
        setQuery('')
        setFilter(false)
      }
    } catch (error) {
      setMessage(`Could not delete trip. ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }
  async function deleteDriver(d: Driver, index: number) {
    if (busy) return
    setBusy(true)
    try {
      const name = d.name.trim() || `Driver ${index + 1}`
      const confirmed = window.api
        ? await window.api.confirmDeleteDriver(name)
        : window.confirm(
            `Delete ${name} and all their receipts and images from this trip? This cannot be undone.`
          )
      if (!confirmed) return
      updateTrip((t) => ({ ...t, drivers: t.drivers.filter((item) => item.id !== d.id) }))
      if (d.receipts.some((r) => r.id === selected)) {
        setSelected('')
        setImage('')
        setViewerOpen(false)
      }
      setCollapsed((current) => current.filter((did) => did !== d.id))
    } catch (error) {
      setMessage(`Could not delete driver. ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }
  async function importFiles(did: string) {
    if (!window.api) {
      setMessage('Open the Electron application to import and store receipt images.')
      return
    }
    setBusy(true)
    const unsubscribe = window.api.onOCRProgress?.((event) => {
      if (event.requestId === 'import') setImportProgress(event)
    })
    try {
      const files = await window.api.importReceipts()
      const items = files.map((f) => ({ ...f, id: id(), reviewed: false }))
      if (items.length) {
        updateDriver(did, (d) => ({ ...d, receipts: [...d.receipts, ...items] }))
        setSelected(items[0].id)
      }
    } catch (e) {
      setMessage(`Receipt import failed. Check folder access and try again. ${String(e)}`)
    } finally {
      unsubscribe?.()
      setImportProgress(null)
      setBusy(false)
    }
  }
  function createTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim() || !draft.location.trim()) {
      setMessage('Enter an event name and location before creating the trip.')
      return
    }
    if (draft.end < draft.start) {
      setMessage('Trip end date must be on or after its start date.')
      return
    }
    const prefix = draft.start.replaceAll('-', '')
    const sequence =
      Math.max(
        0,
        ...data.trips
          .filter((t) => t.number.startsWith(`${prefix}-`))
          .map((t) => Number(t.number.split('-')[1]))
      ) + 1
    const t: Trip = {
      id: id(),
      name: draft.name.trim(),
      start: draft.start,
      end: draft.end,
      location: draft.location.trim(),
      number: `${prefix}-${String(sequence).padStart(2, '0')}`,
      drivers: Array.from({ length: Math.min(100, Math.max(1, Number(draft.count))) }, () => ({
        id: id(),
        name: '',
        method: 'Zelle',
        receipts: []
      }))
    }
    setData({ ...data, trips: [...data.trips, t] })
    setDraft({ name: '', start: '', end: '', location: '', count: '1' })
    setTripId(t.id)
    setEditor(false)
    setSelected('')
  }

  return {
    data,
    setData,
    loaded,
    folder,
    setFolder,
    page,
    setPage,
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
    importProgress,
    setBusy,
    message,
    setMessage,
    saveState,
    setSaveState,
    serial,
    trip,
    driver,
    receipt,
    receipts,
    averagePrice,
    excludeDiesel,
    setExcludeDiesel,
    overallAverage,
    overallTotal,
    reviewed,
    missingProfile,
    ready,
    updateTrip,
    updateDriver,
    updateReceipt,
    deleteReceipt,
    deleteTrip,
    deleteDriver,
    importFiles,
    createTrip
  }
}

export type TreasuryWorkspace = ReturnType<typeof useTreasuryWorkspace>
