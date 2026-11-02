import { useEffect, useRef, useState } from 'react'
import type { OCRDiagnostics, OCRProgress } from '../../../preload/ocr-types'
import type { Receipt } from '../../../preload/types'
import OCRImage from './OCRImage'

export default function OCRInspector({
  receipt,
  image,
  updateReceipt
}: {
  receipt: Receipt
  image: string
  updateReceipt: (patch: Partial<Receipt>) => void
}) {
  const [diagnostics, setDiagnostics] = useState<OCRDiagnostics | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<Pick<OCRProgress, 'status' | 'progress'> | null>(null)
  const active = useRef(true)
  const request = useRef('')
  useEffect(() => {
    active.current = true
    const unsubscribe = window.api?.onOCRProgress?.((event) => {
      if (event.file === receipt.file && event.requestId === request.current) setProgress(event)
    })
    if (receipt.file && window.api?.readOCR) {
      window.api
        .readOCR(receipt.file)
        .then((result) => {
          if (active.current) setDiagnostics(result)
        })
        .catch((cause) => {
          if (active.current) setError(`Could not load OCR details. ${String(cause)}`)
        })
        .finally(() => {
          if (active.current) setLoading(false)
        })
    } else setLoading(false)
    return () => {
      active.current = false
      unsubscribe?.()
    }
  }, [receipt.file])

  async function scan() {
    if (!receipt.file || !window.api?.scanReceipt || running) return
    request.current = crypto.randomUUID()
    setRunning(true)
    setError('')
    setProgress({ status: 'Starting OCR', progress: 0 })
    try {
      const result = await window.api.scanReceipt(receipt.file, request.current)
      if (active.current) setDiagnostics(result)
    } catch (cause) {
      if (active.current) setError(`Could not scan or save OCR details. ${String(cause)}`)
    } finally {
      if (active.current) {
        setRunning(false)
        setProgress(null)
      }
    }
  }

  return (
    <details className="ocr-inspector">
      <summary>OCR inspector</summary>
      <div className="ocr-inspector-body">
        <p className="muted">
          Inspect what was read and why amounts were chosen. Rerunning OCR keeps your entered
          amounts until you apply a suggestion.
        </p>
        <p className="muted">
          Detection groups words into physical rows. Totals need a supported label and two decimal
          places. Price per gallon can use a gallon suffix, price label, or an unlabelled
          three-decimal amount. Digit and label confidence below 50% blocks selection; currency
          symbol confidence is informational. Conflicting amounts require manual entry.
        </p>
        <button
          type="button"
          disabled={loading || running || !receipt.file || !window.api?.scanReceipt}
          onClick={scan}
        >
          {running ? 'Reading receipt…' : diagnostics ? 'Run OCR again' : 'Run OCR'}
        </button>
        {loading && <p role="status">Loading saved OCR details…</p>}
        {progress && (
          <div role="status" className="ocr-progress">
            <p>
              {progress.status} · {Math.round(progress.progress * 100)}%
            </p>
            <progress max={1} value={progress.progress} aria-label={progress.status} />
          </div>
        )}
        {error && (
          <p className="ocr-error" role="alert">
            {error} You can still enter amounts manually.
          </p>
        )}
        {!loading && !diagnostics && !error && (
          <p className="muted">No saved OCR details. Run OCR to inspect this receipt.</p>
        )}
        {diagnostics && (
          <>
            <p className="ocr-result" role="status">
              {diagnostics.status === 'failed'
                ? 'OCR failed. Enter amounts manually or try again.'
                : diagnostics.status === 'no-text'
                  ? 'No text found. Try a clearer or upright image.'
                  : `Text recognized · ${Math.round(diagnostics.confidence)}% overall confidence`}
            </p>
            <p className="muted">
              {new Date(diagnostics.createdAt).toLocaleString()} ·{' '}
              {(diagnostics.durationMs / 1000).toFixed(1)}s
            </p>
            {diagnostics.error && <p className="ocr-error">{diagnostics.error}</p>}
            <OCRImage key={diagnostics.createdAt} original={image} diagnostics={diagnostics} />
            <h3>Amount suggestions</h3>
            {(['total', 'price'] as const).map((field) => (
              <div className="ocr-suggestion" key={field}>
                <strong>
                  {field === 'total' ? 'Total cost' : 'Price per gallon'}:{' '}
                  {diagnostics[field] ? `$${diagnostics[field]}` : 'Needs manual entry'}
                </strong>
                <p className="muted">{diagnostics.explanations[field]}</p>
                {diagnostics[field] && (
                  <button
                    type="button"
                    disabled={running || receipt[field] === diagnostics[field]}
                    onClick={() =>
                      updateReceipt({
                        [field]: diagnostics[field],
                        [field === 'total' ? 'totalParseError' : 'priceParseError']: false,
                        reviewed: false
                      })
                    }
                  >
                    Use OCR {field === 'total' ? 'total' : 'price'}
                  </button>
                )}
              </div>
            ))}
            <details className="ocr-section" open>
              <summary>Amount candidates ({diagnostics.candidates.length})</summary>
              {!diagnostics.candidates.length && (
                <p className="muted">No decimal amounts detected in the recognized text.</p>
              )}
              <ul className="ocr-candidates">
                {diagnostics.candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <strong>
                      {candidate.status === 'selected' ? 'Selected' : 'Rejected'} ·{' '}
                      {candidate.value}
                    </strong>
                    <p>{candidate.reason}</p>
                    <p className="muted">
                      Field:{' '}
                      {candidate.field === 'total'
                        ? 'Total cost'
                        : candidate.field === 'price'
                          ? 'Price per gallon'
                          : 'Unclassified'}
                      . {candidate.label ? `Label: ${candidate.label}. ` : ''}
                      {[
                        ['Digit', candidate.digitConfidence ?? candidate.confidence],
                        ['Label', candidate.labelConfidence],
                        ['Currency symbol', candidate.currencySymbolConfidence]
                      ].map(([label, confidence]) =>
                        typeof confidence === 'number'
                          ? `${label} confidence: ${Math.round(confidence)}%. `
                          : ''
                      )}
                    </p>
                    <blockquote>{candidate.source}</blockquote>
                  </li>
                ))}
              </ul>
            </details>
            <details className="ocr-section">
              <summary>Raw recognized text</summary>
              <pre className="ocr-text">{diagnostics.text || 'No text recognized.'}</pre>
            </details>
            <details className="ocr-section">
              <summary>Recognized words ({diagnostics.words.length})</summary>
              <p className="muted">Coordinates in image pixels: left, top → right, bottom.</p>
              <ul className="ocr-word-list">
                {diagnostics.words.map((word) => (
                  <li key={`${word.bbox.x0}-${word.bbox.y0}-${word.text}`}>
                    <strong>{word.text}</strong> · {Math.round(word.confidence)}%<br />
                    <span className="muted">
                      {word.bbox.x0}, {word.bbox.y0} → {word.bbox.x1}, {word.bbox.y1}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </div>
    </details>
  )
}
