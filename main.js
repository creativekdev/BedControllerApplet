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
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.webContents.openDevTools();  // Open DevTools

}

app.whenReady().then(createWindow);

ipcMain.handle('list-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports;
  } catch (error) {
    console.error('Error listing ports:', error);
    return [];
  }
});

ipcMain.on('connect-port', (event, portPath, baudRate) => {
  currentPort = new SerialPort(portPath, {
    baudRate: parseInt(baudRate),
    autoOpen: false
  });

  currentPort.open((err) => {
    if (err) {
      console.error('Error opening port:', err.message);
      event.reply('connection-error', err.message);
    } else {
      event.reply('connection-success', `Connected to ${portPath}`);
    }
  });

  currentPort.on('data', (data) => {
    mainWindow.webContents.send('log-data', data.toString());
  });
});

ipcMain.on('send-command', (event, command) => {
  if (currentPort && currentPort.isOpen) {
    currentPort.write(command + '\n', (err) => {
      if (err) {
        event.reply('command-error', err.message);
      } else {
        event.reply('command-success', `Sent Command: ${command}`);
      }
    });
  } else {
    event.reply('command-error', 'Port is not open');
  }
});



