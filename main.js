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

  
  ipcMain.on('process-gestures', (_, data) => {
    if (pythonProcess) {
      pythonProcess.kill('SIGKILL');
    }
  
    pythonProcess = spawn('python3', [
      path.join(__dirname, 'gesture_detector.py'),
      JSON.stringify(data || {hands: []})
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });
  
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output === "PEACE_DETECTED") {
        require('child_process').exec('open -a Spotify');
      } else if (output === "THUMBSUP_DETECTED") {
        require('child_process').exec('open -a "System Preferences"');
      }
    });
  
    pythonProcess.stderr.on('data', (data) => {
      console.error('Python Error:', data.toString());
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