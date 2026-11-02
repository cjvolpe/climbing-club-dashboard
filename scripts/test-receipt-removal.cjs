const { app, BrowserWindow, dialog } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const assert = require('node:assert/strict')

const root = path.resolve(__dirname, '..')
const review = path.join(root, '.impeccable/review')
const userData = path.join(review, `removal-workspace-${Date.now()}`)
app.setPath('userData', userData)
app.disableHardwareAcceleration()
const pause = () => new Promise((resolve) => setTimeout(resolve, 100))
require(path.join(root, 'out/main/index.js'))

app.whenReady().then(async () => {
  try {
    let win
    for (let attempt = 0; attempt < 100; attempt++) {
      win = BrowserWindow.getAllWindows()[0]
      if (win && !win.webContents.isLoading()) break
      await pause()
    }
    const js = (script) => win.webContents.executeJavaScript(script)
    const until = async (script) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await js(script)) return
        await pause()
      }
      throw new Error(`Timed out: ${script}`)
    }
    await until("document.body.innerText.includes('Every trip starts here')")
    const receipt = (id, total) => ({ id, name: id, total, price: '3.459', reviewed: true })
    const fixture = {
      trips: [
        {
          id: 'trip',
          name: 'Receipt removal test',
          start: '2026-11-02',
          end: '2026-11-02',
          location: 'Test',
          number: '20261102-01',
          drivers: [
            {
              id: 'first',
              name: 'First driver',
              method: 'Zelle',
              receipts: [
                { ...receipt('remove-me', '42.50'), file: 'receipts/remove.png' },
                receipt('keep-me', '10.25')
              ]
            },
            {
              id: 'second',
              name: 'Other driver',
              method: 'Zelle',
              receipts: [receipt('other', '20.00')]
            }
          ]
        }
      ],
      profile: { organization: '', email: '', address: '', city: '', account: '' }
    }
    const folder = path.join(userData, 'Treasury')
    await fs.mkdir(path.join(folder, 'receipts'), { recursive: true })
    await fs.writeFile(
      path.join(folder, 'receipts/remove.png'),
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=',
        'base64'
      )
    )
    await fs.writeFile(path.join(folder, 'receipts/remove.png.ocr.json'), '{}')
    await js(`window.api.save(${JSON.stringify(fixture)})`)
    win.webContents.reload()
    await until("document.querySelector('.trip-link')")
    await js("document.querySelector('.trip-link').click()")
    await until("document.getElementById('receipt-remove-me')")
    await until("document.querySelector('.delete-receipt')")
    assert.equal(await js("document.querySelector('.inspector') === null"), true)
    assert.equal(await js("document.querySelectorAll('.receipt-row .delete-receipt').length"), 3)
    assert.equal(await js("document.querySelector('.driver-row .number').innerText"), '$52.75')
    assert.match(await js("document.querySelector('.ledger-summary').innerText"), /\$72\.75/)
    await js("document.querySelector('.delete-receipt').scrollIntoView({ block: 'center' })")
    await fs.writeFile(
      path.join(review, 'receipt-removal-before.png'),
      (await win.webContents.capturePage()).toPNG()
    )
    dialog.showMessageBox = async () => ({ response: 0 })
    await js("document.querySelector('.delete-receipt').click()")
    await until("!document.querySelector('.delete-receipt').disabled")
    assert.equal((await js('window.api.load()')).data.trips[0].drivers[0].receipts.length, 2)
    dialog.showMessageBox = async () => ({ response: 1 })
    await js("document.querySelector('.delete-receipt').click()")
    await until(
      "!document.querySelector('.inspector') && document.body.innerText.includes('All changes saved')"
    )
    assert.equal(await js("document.querySelector('.driver-row .number').innerText"), '$10.25')
    assert.match(await js("document.querySelector('.ledger-summary').innerText"), /\$30\.25/)
    await until("document.activeElement.id === 'driver-first'")
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        await fs.access(path.join(folder, 'receipts/remove.png.ocr.json'))
        await pause()
      } catch {
        break
      }
    }
    await assert.rejects(fs.access(path.join(folder, 'receipts/remove.png')))
    await assert.rejects(fs.access(path.join(folder, 'receipts/remove.png.ocr.json')))
    await js("document.getElementById('receipt-keep-me').click()")
    await until("document.querySelector('.delete-receipt')")
    await js("document.querySelector('.delete-receipt').click()")
    await until(
      "!document.querySelector('.inspector') && document.body.innerText.includes('All changes saved')"
    )
    assert.equal(await js("document.querySelector('.driver-row .number').innerText"), '$0.00')
    assert.match(await js("document.querySelector('.ledger-summary').innerText"), /\$20\.00/)
    win.webContents.reload()
    await until("document.querySelector('.trip-link')")
    const saved = (await js('window.api.load()')).data
    assert.equal(saved.trips[0].drivers[0].receipts.length, 0)
    assert.equal(saved.trips[0].drivers[1].receipts[0].total, '20.00')
    console.log(
      'Receipt removal passed: cancellation, totals, last receipt, focus, image cleanup, and reload persistence.'
    )
    app.exit(0)
  } catch (error) {
    console.error(error)
    app.exit(1)
  }
})
