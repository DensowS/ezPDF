const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  open: () => ipcRenderer.invoke('pdf:open'),
  save: (name, bytes) => ipcRenderer.invoke('pdf:save', name, bytes),
  ready: () => ipcRenderer.send('pdf:ready'),
  onFile: (callback) => {
    const listener = (_, file) => callback(file);
    ipcRenderer.on('pdf:file', listener);
    return () => ipcRenderer.removeListener('pdf:file', listener);
  },
  onClose: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('pdf:close-request', listener);
    return () => ipcRenderer.removeListener('pdf:close-request', listener);
  },
  allowClose: () => ipcRenderer.send('pdf:allow-close'),
  setDirty: (dirty) => ipcRenderer.send('pdf:dirty', dirty),
});
