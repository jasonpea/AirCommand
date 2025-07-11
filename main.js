const { app, BrowserWindow, ipcMain } = require('electron');
const { PythonShell } = require('python-shell'); 
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // IPC handler
  ipcMain.on('process-gestures', (_, data) => {
    PythonShell.run(
      path.join(__dirname, 'gesture_detector.py'),
      { 
        args: [JSON.stringify(data)],
        pythonPath: 'python3' 
      },
      (err) => err && console.error("Python error:", err)
    );
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools(); // debug
});