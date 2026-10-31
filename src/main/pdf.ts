import { randomUUID } from 'node:crypto'
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'

export async function renderPDF(html: string): Promise<Buffer> {
  const source = join(app.getPath('temp'), `treasury-pdf-${randomUUID()}.html`)
  const print = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, javascript: false }
  })
  try {
    // Embedded fonts and watermark images can exceed Chromium's data URL limit.
    await writeFile(source, html, 'utf8')
    await print.loadFile(source)
    return await print.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
    })
  } finally {
    print.destroy()
    await unlink(source).catch(() => {})
  }
}
