const { app, BrowserWindow, ipcMain } = require('electron');
const {SerialPort, SerialPortMock } = require('serialport');
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
  console.log('list-ports IPC triggered');  // Confirm the IPC event is called
  
  try {


    const ports = await SerialPort.list();
    return ports;
  } catch (err) {
    return { error: err.message };
  }

});

ipcMain.on('connect-port', (event, portPath, baudRate) => {
  console.log('connect-port IPC triggered'); 
  try {
    currentPort = new SerialPort({ path:portPath, baudRate: Number(baudRate) });
    console.log('initialized:' + currentPort); 

/*    currentPort.on('data', (data) => {
      event.sender.send('serial-data', data.toString());
    });*/

    return { success: true, message: `Connected to ${path}` };
  } catch (err) {
    console.log('Exception:' + err.message); 

    return { success: false, message: err.message };
  }
});

ipcMain.on('send-command', (event, command) => {
  console.log('send-command:' + command); 

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



