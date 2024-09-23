const { app, BrowserWindow, ipcMain } = require('electron');
const { SerialPort } = require('serialport');
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
}

app.whenReady().then(createWindow);

// List available serial ports
ipcMain.handle('list-ports', async () => {
  console.log('list-ports IPC triggered');  
  try {
    const ports = await SerialPort.list();
    return ports;
  } catch (err) {
    return { error: err.message };
  }
});

// Connect to the serial port
ipcMain.on('connect-port', (event, portPath, baudRate) => {
  console.log(`Attempting to connect to ${portPath} at baud rate ${baudRate}`);

  // Close the previous port if it's open
  if (currentPort && currentPort.isOpen) {
    currentPort.close((err) => {
      if (err) {
        console.error('Error closing previous port:', err.message);
      } else {
        console.log('Previous port closed');
      }
    });
  }

  try {
    // Open the new serial port
    currentPort = new SerialPort({ path: portPath, baudRate: Number(baudRate) }, (err) => {
      if (err) {
        console.error('Error opening port:', err.message);
        event.sender.send('connection-status', { success: false, message: `Error opening port: ${err.message}` });
        return;
      }

      console.log(`Port opened successfully on ${portPath}`);
      event.sender.send('connection-status', { success: true, message: `Connected to ${portPath}` });

      // Handle incoming serial data
      currentPort.on('data', (data) => {
        console.log('Data received:', data.toString()); // Add log for debugging
        event.sender.send('log-data', data.toString());
      });

      // Handle port error
      currentPort.on('error', (err) => {
        console.error('Port error:', err.message);
        event.sender.send('log-data', `Port Error: ${err.message}`);
      });
    });
  } catch (err) {
    console.log('Exception:', err.message);
    event.sender.send('connection-status', { success: false, message: err.message });
  }
});

// Send a command to the serial port
ipcMain.on('send-command', (event, command) => {
  console.log('send-command:', command);

  if (currentPort && currentPort.isOpen) {
    currentPort.write(command, (err) => {
      if (err) {
        event.reply('log-data', `Error sending command: ${err.message}`);
        event.reply('command-error', err.message);
      } else {
        event.reply('log-data', `Command sent successfully: ${command}`);
        event.reply('command-success', `Sent Command: ${command}`);
      }
    });
  } else {
    event.reply('log-data', 'Error: Port is not open.');
    event.reply('command-error', 'Port is not open');
  }
});

// Handle application shutdown
app.on('window-all-closed', () => {
  if (currentPort && currentPort.isOpen) {
    currentPort.close(() => {
      console.log('Serial port closed on app shutdown');
    });
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
