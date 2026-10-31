import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

export default function ReceiptViewer({
  src,
  name,
  onClose
}: {
  src: string
  name: string
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (!size.width || !size.height) return
    dialog.current?.showModal()
    return () => dialog.current?.close()
  }, [size.width, size.height])
  const changeZoom = (amount: number) =>
    setZoom((current) => Math.min(4, Math.max(1, Math.round((current + amount) * 100) / 100)))
  return (
    <dialog
      ref={dialog}
      className="receipt-viewer"
      aria-label={`Receipt: ${name}`}
      onCancel={onClose}
    >
      <button
        type="button"
        className="receipt-viewer-close"
        aria-label="Close receipt"
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
      <div
        className="receipt-viewer-scroll"
        onWheel={(event) => {
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            changeZoom(event.deltaY < 0 ? 0.25 : -0.25)
          }
        }}
      >
        <div
          className="receipt-viewer-canvas"
          style={{
            width: size.width * zoom,
            height: size.height * zoom
          }}
        >
          <img
            src={src}
            alt={`Original receipt: ${name}`}
            onLoad={(event) => {
              const image = event.currentTarget
              const scale = Math.min(
                (window.innerWidth - 112) / image.naturalWidth,
                (window.innerHeight - 176) / image.naturalHeight,
                1
              )
              setSize({ width: image.naturalWidth * scale, height: image.naturalHeight * scale })
            }}
          />
        </div>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: A fieldset adds browser styles to the existing zoom toolbar. */}
      <div className="receipt-viewer-tools" role="group" aria-label="Receipt zoom">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={zoom === 1}
          onClick={() => changeZoom(-0.25)}
        >
          <Icon name="minus" />
        </button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom === 4}
          onClick={() => changeZoom(0.25)}
        >
          <Icon name="plus" />
        </button>
        <button type="button" onClick={() => setZoom(1)}>
          Fit
        </button>
      </div>
    </dialog>
  )
}
