const { app, BrowserWindow, dialog } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '../..')
app.setPath('userData', path.join(__dirname, 'test-workspace-' + Date.now()))
app.disableHardwareAcceleration()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fixture = {
  trips: [
    {
      id: 'trip-test',
      name: 'Fall climbing trip (test fixture)',
      start: '2026-10-30',
      end: '2026-11-01',
      location: 'New River Gorge',
      number: '20261030-01',
      drivers: [
        {
          id: 'driver-test',
          name: 'Alex Morgan',
          method: 'Zelle',
          receipts: [
            {
              id: 'receipt-test',
              name: 'Test gas receipt',
              total: '42.50',
              price: '3.459',
              reviewed: false
            }
          ]
        }
      ]
    }
  ],
  profile: {
    organization: 'Example Climbing Club',
    email: 'test@example.org',
    address: '123 Example Street',
    city: 'Chapel Hill, NC 27514',
    account: 'TEST-0000'
  }
}
require(path.join(root, 'out/main/index.js'))
app.whenReady().then(async () => {
  try {
    let win
    for (let i = 0; i < 100; i++) {
      win = BrowserWindow.getAllWindows()[0]
      if (win && !win.webContents.isLoading()) break
      await sleep(100)
    }
    const js = (script) => win.webContents.executeJavaScript(script)
    for (let i = 0; i < 100; i++) {
      if (await js("document.body.innerText.includes('Every trip starts here')")) break
      await sleep(100)
    }
    assert.match(await js('document.body.innerText'), /Every trip starts here/)
    await js("document.querySelector('.empty .primary').click()")
    await sleep(100)
    assert.match(await js('document.body.innerText'), /Event name/)
    await js("document.querySelector('.setup button[type=button]').click()")
    const original = new BrowserWindow({ show: false, width: 420, height: 540 })
    await original.loadURL(
      'data:text/html,' +
        encodeURIComponent(
          '<body style="background:#f4f1e9;color:#222;font:18px monospace;padding:30px;text-align:center"><h2>EXAMPLE GAS</h2><p>TEST RECEIPT</p><hr><p>October 30, 2026</p><p>Regular unleaded</p><p>Price / gallon $3.459</p><hr><h2>Total $42.50</h2><p>Synthetic test fixture</p></body>'
        )
    )
    const source = path.join(__dirname, 'fixture-receipt.png')
    await fs.writeFile(source, (await original.webContents.capturePage()).toPNG())
    original.destroy()
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] })
    const imported = await js('window.api.importReceipts()')
    assert.equal(imported.length, 1)
    assert.equal(imported[0].total, '42.50')
    assert.equal(imported[0].price, '3.459')
    assert.equal(imported[0].totalParseError, false)
    assert.equal(imported[0].priceParseError, false)
    fixture.trips[0].drivers[0].receipts[0].file = imported[0].file
    await js('window.api.save(' + JSON.stringify(fixture) + ')')
    await win.webContents.reload()
    await sleep(600)
    assert.match(await js('document.body.innerText'), /42.50/)
    await js("document.querySelector('.receipt-row button').click()")
    await sleep(150)
    assert.match(await js('document.body.innerText'), /Needs confirmation/)
    await js("document.querySelector('.review-button').click()")
    await sleep(300)
    const saved = await js('window.api.load()')
    assert.equal(saved.data.trips[0].drivers[0].receipts[0].reviewed, true)
    await js("document.querySelector('.receipt-image').click()")
    await sleep(100)
    assert.equal(await js("document.querySelector('.receipt-viewer').open"), true)
    await js("document.querySelector('[aria-label=\"Zoom in\"]').click()")
    assert.equal(await js("document.querySelector('.receipt-viewer output').value"), '125%')
    await sleep(150)
    await fs.writeFile(path.join(__dirname, 'receipt-viewer.png'), (await win.webContents.capturePage()).toPNG())
    await js("document.querySelector('.receipt-viewer-close').click()")
    assert.equal(await js("document.querySelector('.receipt-viewer')"), null)
    await sleep(80)
    assert.equal(await js("document.activeElement.className"), 'receipt-image')
    win.setMinimumSize(0, 0)
    async function capture(width, height, name, full = true) {
      win.setContentSize(width, height)
      await sleep(100)
      if (full) {
        const content = await js('document.documentElement.scrollHeight')
        if (content > height) {
          win.setContentSize(width, content)
          await sleep(100)
        }
      }
      assert.equal(await js('window.innerWidth'), width)
      await fs.writeFile(path.join(__dirname, name), (await win.webContents.capturePage()).toPNG())
    }
    await capture(1774, 887, 'hero-repro.png', false)
    await capture(1440, 900, 'desktop.png')
    await capture(390, 844, 'mobile.png')
    assert.equal(await js('document.documentElement.scrollWidth <= window.innerWidth'), true)
    await js("document.querySelector('.inspector-heading button').click()")
    await js(
      "Array.from(document.querySelectorAll('.trip-header button')).find(b=>b.textContent.includes('Preview PDF')).click()"
    )
    await sleep(200)
    assert.equal(await js("document.querySelector('.preview-toolbar button').disabled"), false)
    await js("document.querySelector('.trip-header button.primary').click()")
    await js("document.querySelector('.add-driver').click()")
    await js("Array.from(document.querySelectorAll('.trip-header button')).find(b=>b.textContent.includes('Preview PDF')).click()")
    await sleep(100)
    assert.equal(await js("document.querySelector('.preview-toolbar button').disabled"), true)
    await js("document.querySelector('.trip-header button.primary').click()")
    dialog.showMessageBox = async () => ({ response: 1 })
    await js("document.querySelectorAll('.delete-driver')[1].click()")
    await sleep(150)
    await js("Array.from(document.querySelectorAll('.trip-header button')).find(b=>b.textContent.includes('Preview PDF')).click()")
    await sleep(100)
    assert.equal(await js("document.querySelector('.preview-toolbar button').disabled"), false)
    const frameHTML = await js("document.querySelector('iframe').srcdoc")
    assert.match(frameHTML, /42.50/)
    assert.match(frameHTML, /class="signature"/)
    dialog.showSaveDialog = async () => ({
      canceled: false,
      filePath: path.join(__dirname, 'test-receipt.pdf')
    })
    assert.equal(await js('window.api.exportPDF(' + JSON.stringify(frameHTML) + ',"test")'), true)
    const pdf = await fs.readFile(path.join(__dirname, 'test-receipt.pdf'))
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF')
    assert.equal(pdf.includes(Buffer.from('Allura')), true, 'PDF embeds the bundled cursive font')
    const proof = new BrowserWindow({ show: false, width: 850, height: 1100 })
    await proof.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(frameHTML))
    assert.equal(
      await proof.webContents.executeJavaScript(
        "document.fonts.load('30px Allura').then(f=>f.length)"
      ),
      1
    )
    await fs.writeFile(
      path.join(__dirname, 'pdf-preview.png'),
      (await proof.webContents.capturePage()).toPNG()
    )
    proof.destroy()
    await js("document.querySelectorAll('.nav')[1].click()")
    await sleep(100)
    assert.match(await js('document.body.innerText'), /Club profile/)
    await js("document.querySelectorAll('.nav')[2].click()")
    await sleep(100)
    assert.match(await js('document.body.innerText'), /Workspace folder/)
    await assert.rejects(js("window.api.readReceipt('../treasury.json')"))
    fixture.trips[0].drivers[0].receipts[0].total = ''
    fixture.trips[0].drivers[0].receipts[0].price = ''
    fixture.trips[0].drivers[0].receipts[0].totalParseError = true
    fixture.trips[0].drivers[0].receipts[0].priceParseError = true
    await js('window.api.save(' + JSON.stringify(fixture) + ')')
    await win.webContents.reload()
    await sleep(500)
    await js("document.querySelector('.receipt-row button').click()")
    await sleep(100)
    assert.equal(
      await js(
        'document.querySelectorAll(\'input[placeholder="The receipt could not be parsed"]\').length'
      ),
      2
    )
    assert.equal(await js("document.querySelector('.review-button').disabled"), true)
    await capture(390, 844, 'ocr-errors.png')
    dialog.showMessageBox = async (_win, options) => {
      assert.equal(options.defaultId, 0)
      assert.match(options.detail, /stored receipt images/)
      return { response: 0 }
    }
    await js("document.querySelector('.delete-driver').click()")
    await sleep(150)
    assert.equal(await js("document.querySelectorAll('.driver-row').length"), 1)
    await fs.access(path.join(app.getPath('userData'), 'Treasury', imported[0].file))
    dialog.showMessageBox = async () => ({ response: 1 })
    await js("document.querySelector('.delete-driver').click()")
    await sleep(500)
    assert.equal(await js("document.querySelectorAll('.driver-row').length"), 0)
    assert.equal(await js("document.querySelector('.receipt-image') === null"), true)
    assert.equal((await js('window.api.load()')).data.trips[0].drivers.length, 0)
    await assert.rejects(fs.access(path.join(app.getPath('userData'), 'Treasury', imported[0].file)))
    await win.webContents.reload()
    await sleep(500)
    assert.equal(await js("document.querySelectorAll('.driver-row').length"), 0)
    console.log('PASS: driver deletion cancellation, confirmation, image cleanup, and persistence.')
    await js("Array.from(document.querySelectorAll('.trip-header button')).find(b=>b.textContent.includes('Preview PDF')).click()")
    await sleep(100)
    assert.equal(await js("document.querySelector('.preview-toolbar button').disabled"), true)
    console.log('PASS: PDF readiness updates after deleting incomplete and last drivers.')
    console.log(
      'PASS: empty state, setup form, saved trip reload, review persistence, mobile overflow, preview readiness, real PDF export, profile, storage, traversal rejection.'
    )
    app.exit(0)
  } catch (e) {
    console.error(e)
    app.exit(1)
  }
})
