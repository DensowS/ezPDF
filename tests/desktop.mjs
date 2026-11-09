import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
const results = path.resolve('test-results');
await fs.mkdir(results, { recursive: true });
const synthetic = await PDFDocument.create();
const page = synthetic.addPage([595, 842]);
page.drawRectangle({
  x: 90,
  y: 600,
  width: 410,
  height: 26,
  color: rgb(235 / 255, 238 / 255, 240 / 255),
});
page.drawText('Name', { x: 90, y: 585, size: 9 });
const native = synthetic.getForm().createTextField('existing');
native.setText('Original');
native.addToPage(page, { x: 90, y: 500, width: 200, height: 26 });
const check = synthetic.getForm().createCheckBox('consent');
check.addToPage(page, { x: 90, y: 450, width: 18, height: 18 });
synthetic.addPage([595, 842]);
const fixture = path.join(results, 'fixture.pdf');
await fs.writeFile(fixture, await synthetic.save());
const desktopEnv = { ...process.env };
delete desktopEnv.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({
  ...(process.env.EZPDF_EXECUTABLE ? { executablePath: process.env.EZPDF_EXECUTABLE } : {}),
  args: [
    ...(process.env.EZPDF_EXECUTABLE ? [] : [path.resolve('.')]),
    '--user-data-dir=' + path.join(results, 'profile-' + Date.now()),
  ],
  env: desktopEnv,
});
try {
  const ui = await app.firstWindow();
  ui.setDefaultTimeout(12000);
  ui.on('console', (msg) => {
    if (msg.type() === 'error') console.log('Renderer:', msg.text());
  });
  const errors = [];
  ui.on('pageerror', (e) => errors.push(e.message));
  await ui.getByText('Deine PDFs.').waitFor();
  await ui.screenshot({ path: path.join(results, 'welcome.png') });
  async function openFile(filename) {
    await app.evaluate(({ dialog }, filename) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filename] });
    }, filename);
    await ui.getByRole('button', { name: 'Öffnen', exact: true }).click();
    await ui
      .getByText(/Felder erkannt\. Bitte Zuordnung prüfen/)
      .waitFor()
      .catch(async (error) => {
        console.log(await ui.locator('body').innerText());
        await ui.screenshot({ path: path.join(results, 'failure.png') });
        throw error;
      });
    await ui.locator('.banner').waitFor({ state: 'hidden' });
  }
  await openFile(fixture);
  assert.equal(await ui.locator('.field-card').count(), 3);
  await ui.locator('.field-card input:not([type=checkbox])').first().fill('Erika Muster');
  await ui.locator('.field-card input[type=checkbox]').check();
  await ui.getByRole('button', { name: 'Nächste Seite' }).click();
  await ui.getByRole('button', { name: 'Text ergänzen' }).click();
  await ui.locator('.paper').click({ position: { x: 150, y: 200 } });
  await ui.locator('.field-card input:not([type=checkbox])').last().fill('Zusatztext');
  const saved = path.join(results, 'saved.pdf');
  await app.evaluate(({ dialog }) => {
    dialog.showSaveDialog = async () => ({ canceled: true });
  });
  await ui.getByRole('button', { name: 'Speichern unter' }).click();
  await ui.locator('.banner').waitFor({ state: 'hidden' });
  assert.equal(await ui.locator('.dot').count(), 1, 'Canceled save must keep the dirty state');
  await app.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: target });
  }, saved);
  await ui.getByRole('button', { name: 'Speichern unter' }).click();
  await ui.getByText('PDF gespeichert. Die Formularfelder bleiben ausfüllbar.').waitFor();
  const reopened = await PDFDocument.load(await fs.readFile(saved));
  assert.equal(reopened.getPageCount(), 2);
  assert.equal(reopened.getForm().getTextField('existing').getText(), 'Erika Muster');
  assert.equal(reopened.getForm().getCheckBox('consent').isChecked(), true);
  assert.equal(reopened.getForm().getFields().length, 4);
  assert(
    reopened
      .getForm()
      .getFields()
      .some((f) => 'getText' in f && f.getText() === 'Zusatztext'),
  );
  await openFile(saved);
  assert.equal(await ui.locator('.field-card').count(), 4);
  if (process.env.EZPDF_SAMPLE) {
    await openFile(process.env.EZPDF_SAMPLE);
    const cards = ui.locator('.field-card');
    assert.equal(await cards.count(), 5, 'Example must detect all five gray fields');
    const labels = await ui.locator('.field-title label').allTextContents();
    assert(labels[0].includes('Zuname'));
    assert(labels[1].includes('Abholadresse'));
    assert(labels[3].includes('Telefon'));
    assert(labels[4].includes('E-Mail'));
    await cards.first().locator('input').fill('Erika Muster');
    await cards.nth(1).locator('input').fill('Musterstraße 12, 20095 Hamburg');
    await cards.nth(3).locator('input').fill('040 123456');
    await ui.screenshot({ path: path.join(results, 'example.png'), fullPage: true });
    await ui.getByRole('button', { name: 'Speichern unter' }).click();
    await ui.getByText('PDF gespeichert. Die Formularfelder bleiben ausfüllbar.').waitFor();
    const result = await PDFDocument.load(await fs.readFile(saved));
    assert.equal(result.getForm().getFields().length, 5);
    assert(
      result
        .getForm()
        .getFields()
        .some((f) => 'getText' in f && f.getText() === 'Erika Muster'),
    );
    await openFile(saved);
    assert.equal(
      await ui.locator('.field-card').count(),
      5,
      'Reopening must not duplicate detected fields',
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: desktop rendering, native fields, gray detection, captions, text placement, multipage, save and reopen.',
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
