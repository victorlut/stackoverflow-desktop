import { app, BrowserWindow, clipboard, ipcMain, screen, shell } from 'electron';
import { auth } from '../src/uitls/stackexchange-auth';
import { InvokeEnum } from '../src/interfaces/InvokeEnum';

let mainWindow: BrowserWindow | null;
let loaderWindow: BrowserWindow | null;
let overlayWindow: BrowserWindow | null;

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const LOADER_WINDOW_WEBPACK_ENTRY: string;
declare const LOADER_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// const assetsPath =
//   process.env.NODE_ENV === 'production'
//     ? process.resourcesPath
//     : app.getAppPath()

function createWindows() {
  const display = screen.getPrimaryDisplay();

  mainWindow = new BrowserWindow({
    // icon: path.join(assetsPath, 'assets', 'icon.png'),
    width: 1000,
    height: 600,
    show: false,
    title: 'StackOverflow',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 13 },
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  });

  loaderWindow = new BrowserWindow({
    width: 300,
    height: 350,
    show: true,
    title: 'StackOverflow starting...',
    frame: false,
    resizable: false,
    backgroundColor: '#2d3748',
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: LOADER_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  });

  overlayWindow = new BrowserWindow({
    title: 'Preview',
    alwaysOnTop: true,
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    show: false,
    transparent: true,
    roundedCorners: true, // TODO make it false, fix app quiting
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: false,
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: OVERLAY_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  loaderWindow.loadURL(LOADER_WINDOW_WEBPACK_ENTRY);
  overlayWindow.loadURL(OVERLAY_WINDOW_WEBPACK_ENTRY);

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.webContents.on('dom-ready', () => {
    auth((token, expires) => {
      mainWindow?.webContents.send('stackexchange:on-auth', {
        token: token,
        expires: expires
      });
    });
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (process.env.NODE_ENV === 'development' && url.includes('localhost')) {
      return;
    }

    event.preventDefault();

    shell.openExternal(url);
  });
}

async function registerListeners() {
  // Auth events
  // ===========
  ipcMain.on('stackexchange-logout', (event) => {
    mainWindow?.webContents.session.cookies.remove('https://stackexchange.com', 'acct').then(() => {
      event.reply('stackexchange-did-logout');

      mainWindow?.webContents.session.cookies.get({}).then((value) => {
        console.log(value);
      });
    });
  });

  // Overlay events
  // ==============

  ipcMain.handle(InvokeEnum.OPEN_CODE_IN_PREVIEW, (event, html: string) => {
    overlayWindow?.webContents.send('init-html', html);
    overlayWindow?.show();
  });

  ipcMain.handle(InvokeEnum.OPEN_IMAGE_IN_PREVIEW, (event, url: string) => {
    overlayWindow?.webContents.send('init-image', url);
    overlayWindow?.show();
  });

  ipcMain.handle(InvokeEnum.HIDE_OVERLAY, () => {
    overlayWindow?.hide();
  });

  // Misc events
  // ===========

  ipcMain.on('main-window-ready', (event) => {
    mainWindow?.show();
    loaderWindow?.hide();
  });

  ipcMain.on('online', (event) => {
    event.reply('online');
  });

  ipcMain.on('offline', (event) => {
    event.reply('offline');
  });

  ipcMain.handle(InvokeEnum.COPY_TO_CLIPBOARD, (event, text) => {
    clipboard.writeText(text);
  });
}

app
  .on('ready', createWindows)
  .whenReady()
  .then(registerListeners)
  .catch((e) => console.error(e));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// TODO Implement cmd+q
app.on('activate', () => {
  if (!mainWindow?.isVisible() && !loaderWindow?.isVisible()) {
    mainWindow?.show();
  }
});
