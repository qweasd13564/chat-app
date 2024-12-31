import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000')
    win.webContents.openDevTools()
  } else {
    win.loadFile('dist/index.html')
  }

  // 文件拖放处理
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  // 处理文件上传
  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      const stats = fs.statSync(filePath)
      
      // 检查文件大小
      if (stats.size > 25 * 1024 * 1024) {
        return { error: '文件大小不能超过25MB' }
      }

      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size
      }
    }
    return null
  })

  // 处理文件保存
  ipcMain.handle('save-file', async (event, { fileName, data }) => {
    const result = await dialog.showSaveDialog(win, {
      defaultPath: fileName
    })
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, Buffer.from(data))
      return true
    }
    return false
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})