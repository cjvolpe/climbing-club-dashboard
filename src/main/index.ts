import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import type { Data, TreasuryAPI } from '../preload/types'
import { renderPDF } from './pdf'
import { readDiagnostics, receiptPath, removeReceipt, scanReceipt } from './receipt-diagnostics'

let folder: string
const config = () => join(app.getPath('userData'), 'treasury-storage.json')
async function save(data: Data): Promise<void> {
  await mkdir(folder, { recursive: true })
  const target = join(folder, 'treasury.json')
  let previous: Data | null = null
  try {
    previous = JSON.parse(await readFile(target, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const files = (records: Data) =>
    records.trips.flatMap((trip) =>
      trip.drivers.flatMap((driver) =>
        driver.receipts.flatMap((receipt) => (receipt.file ? [receipt.file] : []))
      )
    )
  const retained = new Set(files(data))
  await writeFile(`${target}.tmp`, JSON.stringify(data, null, 2))
  const { rename } = await import('node:fs/promises')
  await rename(`${target}.tmp`, target)
  for (const file of new Set(previous ? files(previous) : [])) {
    if (retained.has(file)) continue
    await removeReceipt(folder, file)
  }
}
function createWindow(): void {
  const win = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 600,
    minHeight: 600,
    backgroundColor: '#0e1b2a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      plugins: true
    }
  })
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  if (is.dev && process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}
app.whenReady().then(async () => {
  folder = join(app.getPath('userData'), 'Treasury')
  try {
    folder = JSON.parse(await readFile(config(), 'utf8')).folder
  } catch {}
  ipcMain.handle('treasury:load', async () => {
    await mkdir(folder, { recursive: true })
    try {
      return { data: JSON.parse(await readFile(join(folder, 'treasury.json'), 'utf8')), folder }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return { data: null, folder }
    }
  })
  ipcMain.handle('treasury:save', (_, data: Data) => save(data))
  ipcMain.handle('treasury:confirm-delete-receipt', async (event, name: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = {
      type: 'warning' as const,
      buttons: ['Cancel', 'Remove receipt'],
      defaultId: 0,
      cancelId: 0,
      title: 'Remove receipt',
      message: `Remove ${name} from this driver?`,
      detail:
        'This permanently removes the receipt data and stored image. This cannot be undone.',
      noLink: true
    }
    const result = win
      ? await dialog.showMessageBox(win, options)
      : await dialog.showMessageBox(options)
    return result.response === 1
  })
  ipcMain.handle('treasury:confirm-delete-trip', async (event, name: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    for (const final of [false, true]) {
      const options = {
        type: 'warning' as const,
        buttons: ['Cancel', final ? 'Permanently delete trip' : 'Continue to final confirmation'],
        defaultId: 0,
        cancelId: 0,
        title: final ? 'Final confirmation' : 'Delete trip',
        message: final ? `Permanently delete ${name}?` : `Delete ${name}?`,
        detail: final
          ? 'This cannot be undone. The trip, all drivers, receipt data, and stored receipt images will be removed from this workspace.'
          : 'Deleting this trip also removes its drivers and receipts. You will need to confirm once more before anything is deleted.',
        noLink: true
      }
      const result = win
        ? await dialog.showMessageBox(win, options)
        : await dialog.showMessageBox(options)
      if (result.response !== 1) return false
    }
    return true
  })
  ipcMain.handle('treasury:confirm-delete-driver', async (event, name: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = {
      type: 'warning' as const,
      buttons: ['Cancel', 'Delete driver'],
      defaultId: 0,
      cancelId: 0,
      title: 'Delete driver',
      message: `Delete ${name} from this trip?`,
      detail:
        'This permanently removes the driver, their receipts, and their stored receipt images. This cannot be undone.',
      noLink: true
    }
    const result = win
      ? await dialog.showMessageBox(win, options)
      : await dialog.showMessageBox(options)
    return result.response === 1
  })
  ipcMain.handle('treasury:folder', async () => {
    const choice = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    if (choice.canceled) return null
    const next = choice.filePaths[0]
    if (resolve(next) === resolve(folder)) return folder
    const child = relative(folder, next)
    if (!child.startsWith('..') && !isAbsolute(child))
      throw new Error('Choose a folder outside the current workspace.')
    if ((await readdir(next)).length)
      throw new Error('Choose an empty folder so existing files stay untouched.')
    const { cp } = await import('node:fs/promises')
    await mkdir(next, { recursive: true })
    await cp(folder, next, { recursive: true })
    await writeFile(config(), JSON.stringify({ folder: next }))
    folder = next
    return folder
  })
  ipcMain.handle('treasury:ocr-read', (_, file: string) => readDiagnostics(folder, file))
  ipcMain.handle('treasury:ocr-scan', (event, file: string, requestId: string) =>
    scanReceipt(folder, file, (progress) => {
      if (!event.sender.isDestroyed())
        event.sender.send('treasury:ocr-progress', { ...progress, file, requestId })
    })
  )
  ipcMain.handle('treasury:import', async (event) => {
    const choice = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Receipt images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    })
    if (choice.canceled) return []
    await mkdir(join(folder, 'receipts'), { recursive: true })
    const receipts: Awaited<ReturnType<TreasuryAPI['importReceipts']>> = []
    for (const source of choice.filePaths) {
      const file = join('receipts', randomUUID() + extname(source).toLowerCase())
      await copyFile(source, join(folder, file))
      const { total, price } = await scanReceipt(folder, file, (progress) => {
        if (!event.sender.isDestroyed())
          event.sender.send('treasury:ocr-progress', {
            ...progress,
            file,
            requestId: 'import',
            name: basename(source)
          })
      })
      receipts.push({
        name: basename(source),
        file,
        total,
        price,
        totalParseError: !total,
        priceParseError: !price
      })
    }
    return receipts
  })
  ipcMain.handle('treasury:read', async (_, file: string) => {
    const path = receiptPath(folder, file)
    const mime =
      extname(file).toLowerCase() === '.png'
        ? 'image/png'
        : extname(file).toLowerCase() === '.webp'
          ? 'image/webp'
          : 'image/jpeg'
    return `data:${mime};base64,${(await readFile(path)).toString('base64')}`
  })
  ipcMain.handle('treasury:preview-pdf', async (_, html: string) =>
    (await renderPDF(html)).toString('base64')
  )
  ipcMain.handle('treasury:pdf', async (_, html: string, name: string) => {
    let choice = await dialog.showSaveDialog({
      defaultPath: `${name}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (choice.canceled || !choice.filePath) return false
    const pdf = await renderPDF(html)
    while (!choice.canceled && choice.filePath) {
      try {
        await writeFile(choice.filePath, pdf)
        return true
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        if (code !== 'EBUSY' && code !== 'EACCES' && code !== 'EPERM') throw error
        const result = await dialog.showMessageBox({
          type: 'warning',
          title: 'Unable to save PDF',
          message: `Cannot write to ${basename(choice.filePath)}.`,
          detail:
            'The file may be open in a PDF viewer or another application, or the folder may not allow writing. Close the file and retry, or choose another filename or folder.',
          buttons: ['Retry', 'Save As…', 'Cancel'],
          defaultId: 0,
          cancelId: 2,
          noLink: true
        })
        if (result.response === 2) return false
        if (result.response === 1) {
          choice = await dialog.showSaveDialog({
            defaultPath: choice.filePath,
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
          })
        }
      }
    }
    return false
  })
  createWindow()
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow()
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
