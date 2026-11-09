import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
const results = path.resolve('test-results');
await fs.mkdir(results, { recursive: true });
const synthetic = await PDFDocument.create();
const first = synthetic.addPage([595, 842]);
first.drawText('ezPDF test document', { x: 90, y: 750, size: 18 });
first.drawText('Find this needle on page one.', { x: 90, y: 700, size: 12 });
first.drawRectangle({
  x: 90,
  y: 600,
  width: 410,
  height: 26,
  color: rgb(235 / 255, 238 / 255, 240 / 255),
});
first.drawText('Name', { x: 90, y: 585, size: 9 });
const native = synthetic.getForm().createTextField('existing');
native.setText('Original');
native.addToPage(first, { x: 90, y: 500, width: 200, height: 26 });
synthetic
  .getForm()
  .createCheckBox('consent')
  .addToPage(first, { x: 90, y: 450, width: 18, height: 18 });
synthetic.addPage([595, 842]).drawText('Another needle on page two.', { x: 90, y: 700, size: 12 });
const fixture = path.join(results, 'fixture.pdf');
await fs.writeFile(fixture, await synthetic.save());
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({
  ...(process.env.EZPDF_EXECUTABLE ? { executablePath: process.env.EZPDF_EXECUTABLE } : {}),
  args: [
    ...(process.env.EZPDF_EXECUTABLE ? [] : [path.resolve('.')]),
    '--user-data-dir=' + path.join(results, 'profile-' + Date.now()),
  ],
  env,
});
try {
  const ui = await app.firstWindow();
  ui.setDefaultTimeout(15000);
  const errors = [];
  ui.on('pageerror', (error) => {
    console.log('PageError:', error.message, error.stack);
    errors.push(error.message);
  });
  assert.equal(await app.evaluate(({ app }) => app.getName()), 'ezPDF');
  await ui.getByRole('img', { name: 'ezPDF', exact: true }).waitFor();
  assert.equal(
    (await ui.locator('body').innerText()).trim(),
    'PDF öffnen\noder eine PDF hierher ziehen',
  );
  assert.equal(await ui.getByRole('button').count(), 1);
  await ui.screenshot({ path: path.join(results, 'welcome.png') });
  async function idle() {
    await ui.locator('.banner:not(.error)').waitFor({ state: 'hidden' });
    assert.equal(
      await ui.locator('.banner.error').count(),
      0,
      await ui.locator('body').innerText(),
    );
  }
  async function openFile(filename) {
    await app.evaluate(({ dialog }, filename) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filename] });
    }, filename);
    await ui.getByRole('button', { name: /^(PDF öffnen|Öffnen)$/ }).click();
    await ui.locator('.filename').getByText(path.basename(filename), { exact: true }).waitFor();
    await idle();
    assert.equal(await ui.locator('.app').getAttribute('data-mode'), 'view');
    assert.equal(await ui.locator('.field-overlay,.field-card,.edit-toolbar').count(), 0);
    await ui.locator('.page-paint canvas').first().waitFor();
  }
  async function edit() {
    await ui.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    await ui.locator('.edit-toolbar').waitFor();
    await idle();
  }
  await openFile(fixture);
  assert.equal(await ui.locator('.page-shell').count(), 2);
  await ui.screenshot({ path: path.join(results, 'viewer.png') });
  await ui.getByRole('button', { name: 'An Seitenbreite anpassen' }).click();
  assert.equal(await ui.getByLabel('Zoom', { exact: true }).inputValue(), 'width');
  await ui.getByRole('button', { name: 'Ganze Seite einpassen' }).click();
  await ui.getByRole('button', { name: 'Seitenübersicht umschalten' }).click();
  await ui.getByRole('button', { name: 'Zu Seite 2', exact: true }).click();
  assert.equal(await ui.getByRole('spinbutton', { name: 'Seite', exact: true }).inputValue(), '2');
  await ui.getByRole('button', { name: 'Zu Seite 1', exact: true }).click();
  await ui.getByRole('button', { name: 'Dokument durchsuchen' }).click();
  await ui.getByRole('textbox', { name: 'Suchtext' }).fill('needle');
  await ui.getByText('1 / 2', { exact: true }).waitFor();
  await ui.locator('mark.search-match.active').first().waitFor();
  await ui.getByRole('button', { name: 'Nächster Treffer' }).click();
  await ui.getByText('2 / 2', { exact: true }).waitFor();
  await ui.waitForFunction(() => document.querySelector('input[aria-label="Seite"]').value === '2');
  assert.equal(await ui.getByRole('spinbutton', { name: 'Seite', exact: true }).inputValue(), '2');
  await ui.getByRole('button', { name: 'Suche schließen' }).click();
  await ui.getByRole('button', { name: 'Zu Seite 1', exact: true }).click();
  const text = ui.locator('.textLayer > span').filter({ hasText: 'ezPDF test document' }).first();
  await text.dblclick();
  await ui.keyboard.press('Control+c');
  const selection = await ui.evaluate(() => getSelection()?.toString() || '');
  assert(selection.length > 0);
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), selection);
  await app.evaluate(({ Menu, clipboard }) => {
    clipboard.writeText('context-menu-test');
    globalThis.__ezpdfOriginalPopup = Menu.prototype.popup;
    Menu.prototype.popup = function (options) {
      globalThis.__ezpdfCopyMenu = this.items.map((item) => ({
        label: item.label,
        role: item.role,
      }));
      this.items[0].click({}, options.window, options.window.webContents);
    };
  });
  await text.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  const contextSelection = await ui.evaluate(() => getSelection().toString());
  const selectedRect = await ui.evaluate(() => {
    const rect = getSelection().getRangeAt(0).getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  await ui.mouse.click(selectedRect.x, selectedRect.y, { button: 'right' });
  await app.evaluate(async () => {
    for (let attempt = 0; attempt < 100 && !globalThis.__ezpdfCopyMenu; attempt++)
      await new Promise((resolve) => setTimeout(resolve, 10));
  });
  assert.deepEqual(await app.evaluate(() => globalThis.__ezpdfCopyMenu), [
    { label: 'Kopieren', role: 'copy' },
  ]);
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), contextSelection);
  await app.evaluate(({ Menu }) => {
    Menu.prototype.popup = globalThis.__ezpdfOriginalPopup;
  });
  await ui.evaluate(() => getSelection()?.removeAllRanges());
  await ui.getByRole('button', { name: 'Seitenübersicht umschalten' }).click();
  await edit();
  assert.equal(await ui.locator('.field-card').count(), 3);
  await ui.locator('.field-card input:not([type=checkbox])').first().fill('Erika Muster');
  await ui.locator('.field-card input[type=checkbox]').check();
  await ui.getByRole('button', { name: 'Name', exact: true }).click();
  await ui.getByRole('textbox', { name: 'Feldbeschriftung' }).fill('Vollständiger Name');
  await ui.getByRole('spinbutton', { name: 'Feld x', exact: true }).fill('100');
  await ui.getByRole('spinbutton', { name: 'Feld width', exact: true }).fill('380');
  const moveHandle = await ui
    .getByRole('button', { name: 'Feld verschieben', exact: true })
    .boundingBox();
  await ui.mouse.move(moveHandle.x + moveHandle.width / 2, moveHandle.y + moveHandle.height / 2);
  await ui.mouse.down();
  await ui.mouse.move(
    moveHandle.x + moveHandle.width / 2 + 10,
    moveHandle.y + moveHandle.height / 2 + 5,
  );
  await ui.mouse.up();
  assert(
    Number(await ui.getByRole('spinbutton', { name: 'Feld x', exact: true }).inputValue()) > 100,
  );
  await ui.getByRole('spinbutton', { name: 'Feld x', exact: true }).fill('100');
  const resizeHandle = await ui
    .getByRole('button', { name: 'Feldgröße ändern', exact: true })
    .boundingBox();
  await ui.mouse.move(resizeHandle.x + 4, resizeHandle.y + 4);
  await ui.mouse.down();
  await ui.mouse.move(resizeHandle.x + 16, resizeHandle.y + 4);
  await ui.mouse.up();
  assert(
    Number(await ui.getByRole('spinbutton', { name: 'Feld width', exact: true }).inputValue()) >
      380,
  );
  await ui.getByRole('spinbutton', { name: 'Feld width', exact: true }).fill('380');
  await ui.getByRole('button', { name: 'Nächste Seite' }).click();
  await ui.getByRole('button', { name: 'Text ergänzen', exact: true }).click();
  await ui.locator('.page-shell[data-page="1"] .paper').click({ position: { x: 120, y: 200 } });
  await ui.locator('.field-card input:not([type=checkbox])').last().fill('Zusatztext');
  await ui.getByRole('button', { name: 'Lesemodus', exact: true }).click();
  await ui.getByRole('dialog').waitFor();
  await ui.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  assert.equal(await ui.locator('.app').getAttribute('data-mode'), 'edit');
  const saved = path.join(results, 'saved.pdf');
  await app.evaluate(({ dialog }) => {
    dialog.showSaveDialog = async () => ({ canceled: true });
  });
  await ui.getByRole('button', { name: 'Speichern unter' }).click();
  await idle();
  assert.equal(await ui.locator('.dot').count(), 1);
  const printed = path.join(results, 'printed.pdf');
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.webContents.print = async (_options, callback) => {
      try {
        globalThis.__ezpdfPrinted = Array.from(
          await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true }),
        );
        callback(true);
      } catch (error) {
        callback(false, error.message);
      }
    };
  });
  await ui.getByRole('button', { name: 'Drucken', exact: true }).click();
  await ui.getByText('Dokument an den Druckdialog übergeben.', { exact: true }).waitFor();
  const printBytes = new Uint8Array(await app.evaluate(() => globalThis.__ezpdfPrinted));
  await fs.writeFile(printed, printBytes);
  const printout = await PDFDocument.load(printBytes);
  assert.equal(printout.getPageCount(), 2);
  assert.equal(await ui.locator('.dot').count(), 1, 'Printing must not clear unsaved edits');
  await app.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: target });
  }, saved);
  await ui.getByRole('button', { name: 'Speichern unter' }).click();
  await ui
    .getByText('PDF gespeichert. Die Formularfelder bleiben ausfüllbar.', { exact: true })
    .waitFor();
  await idle();
  const reopened = await PDFDocument.load(await fs.readFile(saved));
  assert.equal(reopened.getForm().getTextField('existing').getText(), 'Erika Muster');
  assert.equal(reopened.getForm().getCheckBox('consent').isChecked(), true);
  assert.equal(reopened.getForm().getFields().length, 4);
  const corrected = reopened
    .getForm()
    .getFields()
    .find((field) => field.getName().startsWith('ezPDF.gray'));
  assert.equal(
    corrected.acroField.dict.get(reopened.context.obj('TU')).decodeText(),
    'Vollständiger Name',
  );
  assert.equal(Math.round(corrected.acroField.getWidgets()[0].getRectangle().x), 100);
  await ui.locator('.field-card input:not([type=checkbox])').first().fill('Unwanted');
  await ui.getByRole('button', { name: 'Lesemodus', exact: true }).click();
  await ui.getByRole('button', { name: 'Verwerfen', exact: true }).click();
  assert.equal(await ui.locator('.field-overlay,.field-card').count(), 0);
  await edit();
  assert.equal(
    await ui.locator('.field-card input:not([type=checkbox])').first().inputValue(),
    'Erika Muster',
  );
  await ui.getByRole('button', { name: 'Lesemodus', exact: true }).click();
  await openFile(saved);
  await edit();
  assert.equal(await ui.locator('.field-card').count(), 4);
  if (process.env.EZPDF_SAMPLE) {
    await openFile(process.env.EZPDF_SAMPLE);
    await ui.screenshot({ path: path.join(results, 'example-viewer.png') });
    await edit();
    assert.equal(await ui.locator('.field-card').count(), 5);
    const labels = await ui.locator('.field-label').allTextContents();
    assert(labels[0].includes('Zuname'));
    assert(labels[1].includes('Abholadresse'));
    assert(labels[3].includes('Telefon'));
    assert(labels[4].includes('E-Mail'));
    await ui.locator('.field-card input').first().fill('Erika Muster');
    await ui.screenshot({ path: path.join(results, 'example-editor.png') });
    await ui.getByRole('button', { name: 'Lesemodus', exact: true }).click();
    await ui.getByRole('button', { name: 'Speichern', exact: true }).click();
    await ui.getByText('PDF gespeichert · Lesemodus', { exact: true }).waitFor();
    assert.equal(await ui.locator('.app').getAttribute('data-mode'), 'view');
    await edit();
    assert.equal(await ui.locator('.field-card').count(), 5);
  }
  const longPdf = await PDFDocument.create();
  for (let i = 0; i < 20; i++)
    longPdf.addPage([595, 842]).drawText(`Page ${i + 1}`, { x: 80, y: 750, size: 18 });
  const longFile = path.join(results, 'long.pdf');
  await fs.writeFile(longFile, await longPdf.save());
  await openFile(longFile);
  assert(
    (await ui.locator('.page-paint canvas').count()) < 10,
    'Viewer should not eagerly paint all pages',
  );
  await ui.getByRole('spinbutton', { name: 'Seite', exact: true }).fill('20');
  await ui.getByRole('spinbutton', { name: 'Seite', exact: true }).press('Enter');
  await ui.locator('[data-page="19"] .page-paint canvas').waitFor();
  assert(
    (await ui.locator('.page-paint canvas').count()) < 10,
    'Offscreen page canvases should be released',
  );
  await ui.getByRole('button', { name: 'Vergrößern', exact: true }).click({ clickCount: 3 });
  await ui.locator('[data-page="19"] .textLayer').waitFor();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1024, 640),
  );
  await openFile(fixture);
  await ui.getByRole('button', { name: 'Dokument durchsuchen' }).click();
  await ui.getByRole('textbox', { name: 'Suchtext' }).fill('needle');
  await ui.getByText('1 / 2', { exact: true }).waitFor();
  await ui.getByRole('button', { name: 'Nächster Treffer' }).click();
  await ui.getByText('2 / 2', { exact: true }).waitFor();
  await ui.waitForFunction(() => document.querySelector('input[aria-label="Seite"]').value === '2');
  assert.deepEqual(errors, []);
  console.log(
    'PASS: viewer isolation, text selection/copy, search, thumbnails, fit/zoom, explicit editor, field correction, cancel/discard/save, print to PDF, save and reopen.',
  );
} catch (error) {
  const ui = await app.firstWindow();
  console.log(await ui.locator('body').innerText());
  await ui.screenshot({ path: path.join(results, 'failure.png') });
  throw error;
} finally {
  await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await app.close().catch(() => {});
}
