const { app, BrowserWindow, ipcMain, session } = require('electron');
const { PythonShell } = require('python-shell');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  // permissions for electron
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      console.log('Granting media permissions');
      callback(true);
    } else {
      callback(false);
    }
  });

  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // Debug Python path
  const { execSync } = require('child_process');
  try {
    const pythonPath = execSync('which python3').toString().trim();
    console.log('Detected Python path:', pythonPath);
  } catch (e) {
    console.error('Python not found:', e);
  }

  // IPC handler for gesture processing
  ipcMain.on('process-gestures', (_, data) => {
    console.log('\n--- Starting gesture detection ---');
    console.log('Received data from renderer:', data);

    if (!data) {
      console.warn('No data received, sending empty object');
      data = { hands: [] };
    }

    const options = {
      mode: 'text',
      pythonPath: '/usr/bin/python3', 
      pythonOptions: ['-u'], 
      scriptPath: __dirname,
      args: [JSON.stringify(data)]
    };

    console.log('Launching Python script with options:', options);

    const pyshell = new PythonShell('gesture_detector.py', options);

    pyshell.on('message', (message) => {
      console.log('PYTHON OUTPUT:', message);
    });

    pyshell.on('stderr', (error) => {
      console.error('PYTHON ERROR:', error);
    });

    pyshell.on('close', (code) => {
      console.log(`Python script exited with code ${code}`);
    });
  });

  mainWindow.loadFile('index.html');
  
  // Open dev tools and console by default
  mainWindow.webContents.openDevTools({ mode: 'bottom' });
  console.log('Electron app ready');
});

// Handle camera resource cleanup
app.on('will-quit', () => {
  console.log('App quitting - releasing resources');
});