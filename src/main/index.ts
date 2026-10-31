import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import type { Data, TreasuryAPI } from '../preload/types'
import { recognizeReceipt } from './receipt-ocr'

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
    const path = resolve(folder, file)
    const within = relative(join(folder, 'receipts'), path)
    if (!within || within.startsWith('..') || isAbsolute(within))
      throw new Error('Invalid receipt path')
    try {
      await unlink(path)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
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
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false }
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
  ipcMain.handle('treasury:import', async () => {
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
      let amounts = { total: '', price: '' }
      try {
        amounts = await recognizeReceipt(await readFile(join(folder, file)))
      } catch {
        // Preserve the original and allow manual entry even when OCR fails.
      }
      receipts.push({
        name: basename(source),
        file,
        ...amounts,
        totalParseError: !amounts.total,
        priceParseError: !amounts.price
      })
    }
    return receipts
  })
  ipcMain.handle('treasury:read', async (_, file: string) => {
    const path = resolve(folder, file)
    const within = relative(join(folder, 'receipts'), path)
    if (within.startsWith('..') || isAbsolute(within) || !within)
      throw new Error('Invalid receipt path')
    const mime =
      extname(file).toLowerCase() === '.png'
        ? 'image/png'
        : extname(file).toLowerCase() === '.webp'
          ? 'image/webp'
          : 'image/jpeg'
    return `data:${mime};base64,${(await readFile(path)).toString('base64')}`
  })
  ipcMain.handle('treasury:pdf', async (_, html: string, name: string) => {
    const choice = await dialog.showSaveDialog({
      defaultPath: `${name}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (choice.canceled || !choice.filePath) return false
    const print = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, javascript: false }
    })
    try {
      await print.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      const pdf = await print.webContents.printToPDF({
        printBackground: true,
        pageSize: 'Letter',
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
      })
      await writeFile(choice.filePath, pdf)
      return true
    } finally {
      print.destroy()
    }
  })
  createWindow()
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow()
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
