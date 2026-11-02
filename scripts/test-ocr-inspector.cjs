const { app, BrowserWindow, dialog, nativeImage } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const assert = require('node:assert/strict')

const root = path.resolve(__dirname, '..')
const review = path.join(root, '.impeccable/review')
app.setPath('userData', path.join(review, `ocr-workspace-${Date.now()}`))
app.disableHardwareAcceleration()
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
require(path.join(root, 'out/main/index.js'))

app.whenReady().then(async () => {
  try {
    await fs.mkdir(review, { recursive: true })
    let win
    for (let attempt = 0; attempt < 100; attempt++) {
      win = BrowserWindow.getAllWindows()[0]
      if (win && !win.webContents.isLoading()) break
      await pause(100)
    }
    const js = (script) => win.webContents.executeJavaScript(script)
    const until = async (script) => {
      for (let attempt = 0; attempt < 150; attempt++) {
        if (await js(script)) return
        await pause(100)
      }
      throw new Error(`Timed out: ${script}`)
    }
    await until("document.body.innerText.includes('Every trip starts here')")
    const source = new BrowserWindow({ show: false, width: 600, height: 660 })
    await source.loadURL(
      'data:text/html,' +
        encodeURIComponent(
          '<body style="margin:0;background:#243445;color:black;font:24px Arial"><section style="position:absolute;left:60px;top:30px;width:480px;height:600px;box-sizing:border-box;background:white;padding:30px">' +
            '<h2>EXAMPLE GAS</h2><p>Synthetic test receipt</p><hr>' +
            '<p>Price / gallon $3.459</p><p>Subtotal $40.00</p><h2>TOTAL $42.50</h2>' +
            '<p>Thank you</p></section></body>'
        )
    )
    const receiptSource = path.join(review, 'ocr-fixture.png')
    await fs.writeFile(receiptSource, (await source.webContents.capturePage()).toPNG())
    source.destroy()
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [receiptSource] })
    await js(
      'window.ocrEvents = []; window.stopOCR = window.api.onOCRProgress(e => window.ocrEvents.push(e)); true'
    )
    const [imported] = await js('window.api.importReceipts()')
    assert.equal(imported.total, '42.50')
    assert.equal(imported.price, '3.459')
    const diagnostics = await js(`window.api.readOCR(${JSON.stringify(imported.file)})`)
    assert.equal(diagnostics.status, 'recognized')
    assert.equal(typeof diagnostics.rotationRadians, 'number')
    assert.ok(diagnostics.words.length > 0)
    assert.ok(diagnostics.imageGrey.startsWith('data:image/'))
    assert.ok(diagnostics.imageBinary.startsWith('data:image/'))
    assert.ok(diagnostics.crop)
    assert.ok(diagnostics.crop.x > 0 && diagnostics.crop.y > 0)
    assert.ok(diagnostics.imageCropped.startsWith('data:image/png;base64,'))
    const croppedImage = nativeImage.createFromDataURL(diagnostics.imageCropped)
    assert.deepEqual(
      croppedImage.getSize(),
      {
        width: diagnostics.crop.width,
        height: diagnostics.crop.height
      },
      'Saved crop dimensions match the OCR input bounds'
    )
    const expectedCrop = nativeImage
      .createFromBuffer(await fs.readFile(receiptSource))
      .crop(diagnostics.crop)
    assert.ok(
      croppedImage.toBitmap().equals(expectedCrop.toBitmap()),
      'Saved cropped input contains the exact original pixels inside the crop'
    )
    assert.ok(diagnostics.candidates.some((candidate) => candidate.status === 'rejected'))
    assert.ok(await js('window.ocrEvents.some(e => e.requestId === "import" && e.progress > 0)'))
    const fixture = {
      trips: [
        {
          id: 'trip',
          name: 'OCR inspector test (synthetic)',
          start: '2026-10-31',
          end: '2026-10-31',
          location: 'Test location',
          number: '20261031-01',
          drivers: [
            {
              id: 'driver',
              name: 'Test driver',
              method: 'Zelle',
              receipts: [
                { ...imported, id: 'receipt', total: '99.00', price: '4.000', reviewed: true }
              ]
            }
          ]
        }
      ],
      profile: { organization: '', email: '', address: '', city: '', account: '' }
    }
    await js(`window.api.save(${JSON.stringify(fixture)})`)
    await win.loadFile(path.join(root, 'out/renderer/index.html'))
    await until("document.querySelector('.trip-link') !== null")
    await js("document.querySelector('.trip-link').click()")
    await until("document.querySelector('.receipt-row button') !== null")
    await js("document.querySelector('.receipt-row button').click()")
    await js("document.querySelector('.ocr-inspector').open = true")
    await until("document.querySelector('.ocr-result') !== null")
    await until("document.querySelector('.ocr-image-canvas svg rect') !== null")
    assert.equal(await js("document.querySelector('.ocr-tools select').value"), 'cropped')
    assert.match(
      await js("document.querySelector('.ocr-crop-status').textContent"),
      /Cropped before OCR/
    )
    assert.match(await js("document.querySelector('.ocr-inspector').innerText"), /Selected.*42.50/)
    await js("document.querySelectorAll('.ocr-section')[1].open = true")
    assert.match(await js("document.querySelector('.ocr-text').textContent"), /TOTAL/)
    await js("document.querySelectorAll('.ocr-section')[2].open = true")
    assert.ok(await js("document.querySelectorAll('.ocr-word-list li').length > 0"))
    // Exercise all image variants and zoom against actual engine output.
    for (const value of ['gray', 'binary', 'cropped', 'original']) {
      await js(
        `(() => { const select = document.querySelector('.ocr-tools select'); select.value = '${value}'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`
      )
      await until("document.querySelector('.ocr-image-canvas img').complete")
      assert.match(
        await js("document.querySelector('.ocr-image-canvas img').alt"),
        new RegExp(value)
      )
      assert.equal(
        await js("Number(document.querySelector('.ocr-image-canvas rect').getAttribute('x'))"),
        diagnostics.words[0].bbox.x0 + (value === 'original' ? diagnostics.crop.x : 0)
      )
      assert.equal(
        await js("Number(document.querySelector('.ocr-image-canvas rect').getAttribute('y'))"),
        diagnostics.words[0].bbox.y0 + (value === 'original' ? diagnostics.crop.y : 0)
      )
    }
    await js(
      "(() => { const select = document.querySelectorAll('.ocr-tools select')[1]; select.value = '2'; select.dispatchEvent(new Event('change', { bubbles: true })); })()"
    )
    assert.equal(await js("document.querySelector('.ocr-image-canvas').style.width"), '200%')
    await js("document.querySelector('.ocr-box-toggle input').click()")
    assert.equal(await js("document.querySelector('.ocr-image-canvas svg')"), null)
    await js("document.querySelector('.ocr-box-toggle input').click()")
    await js("document.querySelector('.ocr-inspector-body > button').click()")
    await until("!document.querySelector('.ocr-inspector-body > button').disabled")
    let saved = (await js('window.api.load()')).data.trips[0].drivers[0].receipts[0]
    assert.equal(saved.total, '99.00', 'Rerun does not overwrite manual amounts')
    assert.equal(saved.reviewed, true, 'Rerun does not change review state')
    await js("document.querySelector('.ocr-suggestion button').click()")
    await until("document.querySelector('.inspector input[type=number]').value === '42.50'")
    await pause(300)
    saved = (await js('window.api.load()')).data.trips[0].drivers[0].receipts[0]
    assert.equal(saved.total, '42.50')
    assert.equal(saved.price, '4.000', 'Applying total leaves price untouched')
    assert.equal(saved.reviewed, false)
    assert.equal(saved.totalParseError, false)
    for (const method of ['readOCR', 'scanReceipt']) {
      await assert.rejects(js(`window.api.${method}('../treasury.json', 'test')`))
    }
    // Capture the full expanded inspector at desktop and narrow widths.
    win.setMinimumSize(0, 0)
    for (const [width, height, name] of [
      [1440, 1000, 'ocr-desktop.png'],
      [390, 844, 'ocr-mobile.png']
    ]) {
      win.setContentSize(width, height)
      await pause(150)
      assert.equal(await js('document.documentElement.scrollWidth <= window.innerWidth'), true)
      const pageHeight = await js('document.documentElement.scrollHeight')
      win.setContentSize(width, pageHeight)
      await pause(100)
      await fs.writeFile(path.join(review, name), (await win.webContents.capturePage()).toPNG())
    }
    const storage = (await js('window.api.load()')).folder
    const storedImage = path.join(storage, imported.file)
    const openSavedDiagnostics = async () => {
      await win.loadFile(path.join(root, 'out/renderer/index.html'))
      await until("document.querySelector('.trip-link') !== null")
      await js("document.querySelector('.trip-link').click()")
      await until("document.querySelector('.receipt-row button') !== null")
      await js("document.querySelector('.receipt-row button').click()")
      await js("document.querySelector('.ocr-inspector').open = true")
      await until("document.querySelector('.ocr-crop-status') !== null")
    }
    // Older scans saved crop coordinates without saving the cropped image itself.
    await fs.writeFile(
      `${storedImage}.ocr.json`,
      JSON.stringify({ ...diagnostics, imageCropped: undefined })
    )
    await openSavedDiagnostics()
    assert.match(
      await js("document.querySelector('.ocr-crop-status').textContent"),
      /cropped image was not saved/
    )
    assert.match(
      await js("document.querySelector('.ocr-crop-status').textContent"),
      /Run OCR again/
    )
    assert.equal(await js("document.querySelector('.ocr-tools select').value"), 'original')
    assert.equal(await js("document.querySelector('option[value=cropped]').disabled"), true)
    // A genuinely dark source has no detectable paper region: retain the full input.
    const dark = await js(
      "(() => { const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 660; const context = canvas.getContext('2d'); context.fillStyle = '#243445'; context.fillRect(0, 0, 600, 660); return canvas.toDataURL('image/png').split(',')[1]; })()"
    )
    await fs.writeFile(storedImage, Buffer.from(dark, 'base64'))
    const uncropped = await js(
      `window.api.scanReceipt(${JSON.stringify(imported.file)}, 'uncropped-test')`
    )
    assert.equal(uncropped.status, 'no-text')
    assert.equal(uncropped.crop, undefined)
    assert.equal(uncropped.imageCropped, null)
    await openSavedDiagnostics()
    assert.match(
      await js("document.querySelector('.ocr-crop-status').textContent"),
      /full image was used/
    )
    assert.equal(
      await js("document.querySelector('.ocr-crop-status').getAttribute('role')"),
      'alert'
    )
    assert.equal(await js("document.querySelector('.ocr-tools select').value"), 'original')
    await fs.writeFile(
      path.join(review, 'ocr-uncropped.png'),
      (await win.webContents.capturePage()).toPNG()
    )
    // Older diagnostics may contain no crop metadata; flag that explicitly.
    await fs.writeFile(
      `${storedImage}.ocr.json`,
      JSON.stringify({ ...diagnostics, crop: undefined, imageCropped: null })
    )
    await win.loadFile(path.join(root, 'out/renderer/index.html'))
    await until("document.querySelector('.trip-link') !== null")
    await js("document.querySelector('.trip-link').click()")
    await until("document.querySelector('.receipt-row button') !== null")
    await js("document.querySelector('.receipt-row button').click()")
    await until("document.querySelector('.ocr-crop-status') !== null")
    assert.match(
      await js("document.querySelector('.ocr-crop-status').textContent"),
      /Not cropped: no crop recorded/
    )
    assert.equal(
      await js("document.querySelector('.ocr-crop-status').getAttribute('role')"),
      'alert'
    )
    assert.equal(await js("document.querySelector('option[value=cropped]').disabled"), true)
    const blank = await js(
      "(() => { const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 660; const context = canvas.getContext('2d'); context.fillStyle = 'white'; context.fillRect(0, 0, 600, 660); return canvas.toDataURL('image/png').split(',')[1]; })()"
    )
    await fs.writeFile(storedImage, Buffer.from(blank, 'base64'))
    const noText = await js(
      `window.api.scanReceipt(${JSON.stringify(imported.file)}, 'blank-test')`
    )
    assert.equal(noText.status, 'no-text')
    assert.equal(noText.total, '')
    assert.equal(noText.price, '')
    // Receipts imported before diagnostics existed can still be inspected and rescanned.
    await fs.unlink(`${storedImage}.ocr.json`)
    await win.loadFile(path.join(root, 'out/renderer/index.html'))
    await until("document.querySelector('.trip-link') !== null")
    await js("document.querySelector('.trip-link').click()")
    await until("document.querySelector('.receipt-row button') !== null")
    await js("document.querySelector('.receipt-row button').click()")
    await until(
      "document.querySelector('.ocr-inspector-body > button')?.textContent === 'Run OCR' && !document.querySelector('.ocr-inspector-body > button').disabled"
    )
    assert.match(
      await js("document.querySelector('.ocr-inspector').textContent"),
      /No saved OCR details/
    )
    await js("document.querySelector('.ocr-inspector-body > button').click()")
    await until("document.querySelector('.ocr-result')?.textContent.includes('No text found')")
    saved = (await js('window.api.load()')).data.trips[0].drivers[0].receipts[0]
    assert.equal(saved.total, '42.50')
    assert.equal(saved.price, '4.000')
    // A corrupt source records a real engine failure without losing entered values.
    await fs.writeFile(storedImage, 'invalid image')
    const failed = await js(
      `window.api.scanReceipt(${JSON.stringify(imported.file)}, 'failed-test')`
    )
    assert.equal(failed.status, 'failed')
    assert.ok(failed.error)
    assert.equal(failed.imageCropped, undefined)
    await win.loadFile(path.join(root, 'out/renderer/index.html'))
    await until("document.querySelector('.trip-link') !== null")
    await js("document.querySelector('.trip-link').click()")
    await until("document.querySelector('.receipt-row button') !== null")
    await js("document.querySelector('.receipt-row button').click()")
    await until("document.querySelector('.ocr-result') !== null")
    assert.match(await js("document.querySelector('.ocr-result').textContent"), /OCR failed/)
    // Deletion during a queued scan must not leave an orphan diagnostics file.
    await fs.copyFile(receiptSource, storedImage)
    await js(
      `window.pendingScan = window.api.scanReceipt(${JSON.stringify(imported.file)}, 'delete-test'); true`
    )
    fixture.trips[0].drivers[0].receipts = []
    await js(`window.api.save(${JSON.stringify(fixture)})`)
    await js('window.pendingScan')
    await assert.rejects(fs.access(`${storedImage}.ocr.json`))
    assert.equal(await js(`window.api.readOCR(${JSON.stringify(imported.file)})`), null)
    console.log(
      'PASS: exact cropped input, image dimensions, cropped/original overlays, actual no-crop alert, legacy crop recovery, real OCR import, progress, rerun, apply, failures, path checks, cleanup, responsive screenshots'
    )
    app.exit(0)
  } catch (error) {
    console.error(error)
    app.exit(1)
  }
})
