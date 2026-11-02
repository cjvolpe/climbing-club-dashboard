import { useState } from 'react'
import type { OCRDiagnostics } from '../../../preload/ocr-types'

export default function OCRImage({
  original,
  diagnostics
}: {
  original: string
  diagnostics: OCRDiagnostics
}) {
  const [view, setView] = useState(diagnostics.imageCropped ? 'cropped' : 'original')
  const [boxes, setBoxes] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const src =
    view === 'cropped'
      ? diagnostics.imageCropped
      : view === 'gray'
        ? diagnostics.imageGrey
        : view === 'binary'
          ? diagnostics.imageBinary
          : original
  return (
    <div className="ocr-image-section">
      {diagnostics.crop ? (
        <p className="ocr-crop-status" role="status">
          <strong>Cropped before OCR.</strong> {diagnostics.crop.width} × {diagnostics.crop.height}{' '}
          px at ({diagnostics.crop.x}, {diagnostics.crop.y}) in the original.
          {!diagnostics.imageCropped &&
            ' The cropped image was not saved with this scan. Run OCR again to view it.'}
        </p>
      ) : (
        <p className="ocr-crop-status manual-note" role="alert">
          <strong>Not cropped: no crop recorded for this scan.</strong>{' '}
          {diagnostics.status === 'failed'
            ? 'No cropped input is available for this failed scan.'
            : 'The full image was used for OCR. For older scans, run OCR again to check for a crop.'}
        </p>
      )}
      <div className="ocr-tools">
        <label>
          Image
          <select value={view} onChange={(event) => setView(event.target.value)}>
            <option value="original">Original</option>
            <option value="cropped" disabled={!diagnostics.imageCropped}>
              Cropped OCR input
            </option>
            <option value="gray" disabled={!diagnostics.imageGrey}>
              Grayscale
            </option>
            <option value="binary" disabled={!diagnostics.imageBinary}>
              Black and white
            </option>
          </select>
        </label>
        <label>
          Zoom
          <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
            <option value={1}>Fit width</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
        </label>
        <label className="ocr-box-toggle">
          <input
            type="checkbox"
            checked={boxes}
            onChange={(event) => setBoxes(event.target.checked)}
          />
          Word boxes
        </label>
      </div>
      <section
        className="ocr-image-scroll"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Enlarged images need keyboard scrolling.
        tabIndex={0}
        aria-label="OCR image; scroll to inspect enlarged text"
      >
        {src ? (
          <div className="ocr-image-canvas" style={{ width: `${zoom * 100}%` }}>
            <img
              src={src}
              alt={`${view} receipt used for OCR inspection`}
              onLoad={(event) => {
                setSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight
                })
              }}
            />
            {boxes && size.width > 0 &&
              (!diagnostics.rotationRadians || view === 'gray' || view === 'binary') && (
              <svg
                viewBox={`0 0 ${size.width} ${size.height}`}
                role="img"
                aria-label="Recognized word locations, colored by OCR confidence"
              >
                <title>
                  Hover over a box to see its text and confidence. A text list is available below.
                </title>
                {diagnostics.words.map((word) => (
                  <rect
                    key={`${word.bbox.x0}-${word.bbox.y0}-${word.text}`}
                    x={word.bbox.x0 + (view === 'original' ? diagnostics.crop?.x || 0 : 0)}
                    y={word.bbox.y0 + (view === 'original' ? diagnostics.crop?.y || 0 : 0)}
                    width={word.bbox.x1 - word.bbox.x0}
                    height={word.bbox.y1 - word.bbox.y0}
                    className={
                      word.confidence < 50
                        ? 'ocr-low'
                        : word.confidence < 80
                          ? 'ocr-medium'
                          : 'ocr-high'
                    }
                  >
                    <title>{`${word.text} — ${Math.round(word.confidence)}% confidence`}</title>
                  </rect>
                ))}
              </svg>
            )}
          </div>
        ) : (
          <p className="muted">This image is unavailable. Try running OCR again.</p>
        )}
      </section>
      <p className="muted ocr-legend">
        Word confidence: green ≥80%, amber 50–79%, red &lt;50%. Hover over boxes for text.
        Confidence is an engine score, not a guarantee.
      </p>
    </div>
  )
}
