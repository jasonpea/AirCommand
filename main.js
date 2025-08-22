const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let pythonProcess = null;

app.whenReady().then(() => {
    const { systemPreferences } = require('electron');
    systemPreferences.askForMediaAccess('camera');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    ipcMain.on('process-gestures', (_, data) => {
        if (pythonProcess) {
            pythonProcess.kill('SIGTERM');
        }

        const scriptPath = path.join(__dirname, 'gesture_detector.py');
        
        pythonProcess = spawn('python3', [
            scriptPath,
            JSON.stringify(data || {hands: []})
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            console.log('Python:', output);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error('Python Error:', data.toString());
        });
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools(); // Keep for debugging
});

app.on('will-quit', () => {
    if (pythonProcess) {
        pythonProcess.kill('SIGTERM');
    }
});