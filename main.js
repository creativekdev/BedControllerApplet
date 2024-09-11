const { app, BrowserWindow, ipcMain } = require('electron');
const SerialPort = require('serialport');
const path = require('path');
let mainWindow;
let currentPort;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('src/index.html');
}

app.whenReady().then(createWindow);

ipcMain.handle('list-ports', async () => {
  return await SerialPort.list();
});

ipcMain.on('connect-port', (event, portInfo, baudRate) => {
  currentPort = new SerialPort(portInfo, { baudRate: parseInt(baudRate), autoOpen: false });

  currentPort.open((err) => {
    if (err) {
      console.error('Error opening port:', err.message);
      event.reply('connection-error', err.message);
    } else {
      console.log('Port opened:', portInfo);
      event.reply('connection-success', `Connected to ${portInfo}`);
    }
  });

  currentPort.on('data', (data) => {
    const status = data.toString();
    mainWindow.webContents.send('log-data', `Received Status: ${status}`);
  });
});

ipcMain.on('send-command', (event, command) => {
  if (currentPort && currentPort.isOpen) {
    currentPort.write(command + '\n', (err) => {
      if (err) {
        console.error('Error writing to port:', err.message);
        event.reply('command-error', err.message);
      } else {
        console.log(`Sent Command: ${command}`);
        event.reply('command-success', `Sent Command: ${command}`);
      }
    });
  } else {
    console.error('Port is not open');
  }
});
