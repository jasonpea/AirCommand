const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let pythonProcess = null;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // IPC handler with proper data validation
  ipcMain.on('process-gestures', (_, data) => {
    console.log('Starting gesture detection...');
    
    // kill previous process if exists
    if (pythonProcess) {
      pythonProcess.kill('SIGTERM');
    }

    const scriptPath = path.join(__dirname, 'gesture_detector.py');
    
    pythonProcess = spawn('python3', [
      scriptPath,
      JSON.stringify(data || {hands: []})
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DISPLAY: ':0' // not needed but good to have for linux systems
      }
    });

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.log(`PYTHON: ${output}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`PYTHON ERROR: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
    });
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();
});

app.on('will-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM');
  }
});