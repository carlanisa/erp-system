import { api } from './api'

/**
 * Fetch a PDF from the backend (which requires bearer auth) and open it in a new browser tab.
 * Browser's PDF viewer then provides built-in Print / Save buttons — much more reliable than
 * window.print() on a React page (which fights with our @media print CSS).
 */
export async function openPdf(url: string, filename = 'document.pdf'): Promise<void> {
  const r = await api.get(url, { responseType: 'blob' })
  const blob = new Blob([r.data], { type: 'application/pdf' })
  const blobUrl = URL.createObjectURL(blob)

  // Try to open in a new tab. If popup is blocked, fall back to direct download.
  const win = window.open(blobUrl, '_blank')
  if (!win) {
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.click()
  }
  // Revoke after a delay so the new tab has time to load
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}

/**
 * Same as openPdf but triggers the browser's print dialog automatically once the PDF loads.
 */
export async function openPdfAndPrint(url: string, filename = 'document.pdf'): Promise<void> {
  const r = await api.get(url, { responseType: 'blob' })
  const blob = new Blob([r.data], { type: 'application/pdf' })
  const blobUrl = URL.createObjectURL(blob)

  const win = window.open(blobUrl, '_blank')
  if (!win) {
    // Popup blocked — just download
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.click()
    return
  }
  // Once the new tab loads the PDF, trigger its print dialog
  win.addEventListener('load', () => {
    try { win.print() } catch {}
  })
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}
