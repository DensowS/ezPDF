const { app, BrowserWindow, dialog, ipcMain, protocol, net, Menu } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
app.setName('ezPDF');
app.setAppUserModelId('de.ezpdf.desktop');
protocol.registerSchemesAsPrivileged([
  { scheme: 'ezpdf', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
let window,
  ready = false,
  pending,
  dirty = false,
  allowClose = false;
const findPdf = (args) => args.find((arg) => /\.pdf$/i.test(arg) && !arg.startsWith('-'));
async function sendFile(file) {
  if (!file) return;
  if (!ready || dirty) {
    pending = file;
    if (dirty)
      dialog.showMessageBox(window, {
        type: 'info',
        message:
          'Bitte Änderungen zuerst speichern oder über „Öffnen“ verwerfen. Danach die Datei erneut öffnen.',
      });
    return;
  }
  try {
    const stat = await fs.stat(file);
    if (stat.size > 200 * 1024 * 1024) throw new Error('Datei ist größer als 200 MB.');
    const bytes = await fs.readFile(file);
    window.webContents.send('pdf:file', {
      name: path.basename(file),
      bytes: new Uint8Array(bytes),
    });
  } catch (error) {
    dialog.showErrorBox('PDF konnte nicht geöffnet werden', error.message);
  }
}
pending = findPdf(process.argv.slice(1));
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_, argv) => {
    if (window) {
      window.restore();
      window.focus();
      sendFile(findPdf(argv));
    }
  });
  app.whenReady().then(() => {
    const root = path.resolve(__dirname, '../dist');
    protocol.handle('ezpdf', (request) => {
      const url = new URL(request.url);
      const filename = path.resolve(
        root,
        '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
      );
      if (url.host !== 'app' || !filename.startsWith(root + path.sep))
        return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(filename).toString());
    });
    window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 1000,
      minHeight: 700,
      backgroundColor: '#101217',
      title: 'ezPDF',
      icon: path.join(__dirname, '../build/icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    Menu.setApplicationMenu(null);
    window.webContents.on('context-menu', (_event, params) => {
      if (params.isEditable || !params.selectionText.length || !params.editFlags.canCopy) return;
      Menu.buildFromTemplate([{ label: 'Kopieren', role: 'copy' }]).popup({ window });
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.webContents.session.setPermissionRequestHandler((_, __, callback) => callback(false));
    const valid = (event) =>
      event.sender === window.webContents && event.senderFrame?.url.startsWith('ezpdf://app/');
    ipcMain.handle('pdf:open', async (event) => {
      if (!valid(event)) throw new Error('Ungültiger Aufruf');
      const result = await dialog.showOpenDialog(window, {
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        properties: ['openFile'],
      });
      if (result.canceled) return null;
      const file = result.filePaths[0];
      if ((await fs.stat(file)).size > 200 * 1024 * 1024)
        throw new Error('Datei ist größer als 200 MB.');
      return { name: path.basename(file), bytes: new Uint8Array(await fs.readFile(file)) };
    });
    ipcMain.handle('pdf:save', async (event, name, bytes) => {
      if (!valid(event) || !(bytes instanceof Uint8Array) || bytes.length > 250 * 1024 * 1024)
        throw new Error('Ungültige PDF-Daten');
      const result = await dialog.showSaveDialog(window, {
        defaultPath: path.basename(String(name)),
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (result.canceled) return false;
      const target = /\.pdf$/i.test(result.filePath) ? result.filePath : result.filePath + '.pdf';
      const temp = target + '.ezpdf-' + Date.now() + '.tmp';
      try {
        await fs.writeFile(temp, bytes, { flag: 'wx' });
        await fs.rename(temp, target);
      } finally {
        await fs.rm(temp, { force: true });
      }
      return true;
    });
    ipcMain.handle('pdf:print', async (event) => {
      if (!valid(event)) throw new Error('Ungültiger Aufruf');
      return new Promise((resolve, reject) =>
        window.webContents.print(
          { silent: false, printBackground: true, margins: { marginType: 'none' } },
          (success, reason) => {
            if (success) resolve(true);
            else if (/cancel/i.test(reason)) resolve(false);
            else reject(new Error(reason || 'Druckauftrag fehlgeschlagen.'));
          },
        ),
      );
    });
    ipcMain.on('pdf:ready', (event) => {
      if (valid(event)) {
        ready = true;
        sendFile(pending);
        pending = null;
      }
    });
    ipcMain.on('pdf:dirty', (event, value) => {
      if (valid(event)) dirty = Boolean(value);
    });
    ipcMain.on('pdf:allow-close', (event) => {
      if (valid(event)) {
        allowClose = true;
        window.close();
      }
    });
    window.on('close', (event) => {
      if (dirty && !allowClose) {
        event.preventDefault();
        window.webContents.send('pdf:close-request');
      }
    });
    window.loadURL('ezpdf://app/');
  });
  app.on('window-all-closed', () => app.quit());
}
