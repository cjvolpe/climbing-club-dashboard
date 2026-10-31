import { useEffect, useState } from 'react'

export default function PDFPreview({ html }: { html: string }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    let objectURL = ''
    setUrl('')
    setError('')
    async function render() {
      try {
        if (!window.api) throw new Error('Open the desktop application to preview PDF pages.')
        const base64 = await window.api.previewPDF(html)
        if (cancelled) return
        const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
        objectURL = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
        setUrl(objectURL)
      } catch (e) {
        if (!cancelled) setError(`PDF preview unavailable. ${String(e)}`)
      }
    }
    void render()
    return () => {
      cancelled = true
      if (objectURL) URL.revokeObjectURL(objectURL)
    }
  }, [html])
  if (error) return <p role="alert">{error}</p>
  if (!url) return <p role="status">Preparing PDF pages…</p>
  return (
    <iframe
      title="Printable trip receipt"
      src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
    />
  )
}
