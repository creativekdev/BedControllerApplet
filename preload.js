const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listPorts: () => ipcRenderer.invoke('list-ports'),
  connectPort: (port, baudRate) => ipcRenderer.send('connect-port', port, baudRate),
  sendCommand: (command) => ipcRenderer.send('send-command', command),
  onLogData: (callback) => ipcRenderer.on('log-data', (event, data) => callback(data)),
  onConnectionStatus: (callback) => ipcRenderer.on('connection-status', (event, status) => callback(status))  // New event for connection status
});
