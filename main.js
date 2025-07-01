const { app, BrowserWindow } = require('electron')
const path = require('path')

let mainWindow

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Load your HTML file
  mainWindow.loadFile('index.html')

  // DevTools for debugging (remove in production)
  mainWindow.webContents.openDevTools()
})