// Windows app for the Ahmed Alharbi dashboard.
// It opens the live dashboard in its own window (no browser UI), keeps the
// system window buttons over the page's own title bar, and sends any outside
// link (WhatsApp, email, other sites) to the normal browser.
const { app, BrowserWindow, shell, ipcMain, Menu, screen } = require("electron");
const path = require("path");
const fs = require("fs");

const SITE = "https://www.ahmedalharbi.com";
const START = `${SITE}/dashboard`;
const TITLEBAR_HEIGHT = 33;
const stateFile = () => path.join(app.getPath("userData"), "window.json");

app.setAppUserModelId("com.ahmedalharbi.dashboard");
if (!app.requestSingleInstanceLock()) app.quit();

let win;

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    // Ignore a saved position that is now off every screen (e.g. a monitor was unplugged).
    const visible = screen.getAllDisplays().some(({ workArea: a }) =>
      s.x < a.x + a.width && s.x + s.width > a.x && s.y < a.y + a.height && s.y + s.height > a.y);
    return visible ? s : { width: s.width, height: s.height, maximized: s.maximized };
  } catch { return { width: 1280, height: 820 }; }
}
function saveState() {
  if (!win) return;
  try { fs.writeFileSync(stateFile(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() })); } catch {}
}

const isOurs = (url) => { try { return new URL(url).origin === SITE || new URL(url).hostname === "ahmedalharbi.com"; } catch { return false; } };

function createWindow() {
  const state = loadState();
  win = new BrowserWindow({
    ...state,
    minWidth: 380,
    minHeight: 500,
    show: false,
    backgroundColor: "#ffffff",
    title: "أحمد الحربي",
    icon: path.join(__dirname, "build", "icon.png"),
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#ffffff", symbolColor: "#111111", height: TITLEBAR_HEIGHT },
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
    },
  });
  if (state.maximized) win.maximize();
  Menu.setApplicationMenu(null);

  // The site switches to its "app" layout when it sees this in the user agent.
  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} AlharbiDesktop/${app.getVersion()}`);

  win.once("ready-to-show", () => win.show());
  win.on("close", saveState);

  // Outside links open in the default browser; our own pages stay in the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isOurs(url)) return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true } };
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!isOurs(url)) { e.preventDefault(); shell.openExternal(url); }
  });

  // No connection: show a small page with a retry button instead of a blank window.
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMain) => {
    if (isMain && code !== -3) win.loadFile(path.join(__dirname, "offline.html"), { query: { to: url || START } });
  });

  // Keyboard: Ctrl+R reload, F11 full screen, Ctrl+= / Ctrl+- / Ctrl+0 zoom, Alt+Left back.
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown") return;
    const wc = win.webContents;
    if ((i.control && i.key.toLowerCase() === "r") || i.key === "F5") { wc.reload(); e.preventDefault(); }
    else if (i.key === "F11") { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (i.control && (i.key === "=" || i.key === "+")) { wc.setZoomLevel(wc.getZoomLevel() + 0.5); e.preventDefault(); }
    else if (i.control && i.key === "-") { wc.setZoomLevel(wc.getZoomLevel() - 0.5); e.preventDefault(); }
    else if (i.control && i.key === "0") { wc.setZoomLevel(0); e.preventDefault(); }
    else if (i.alt && i.key === "ArrowLeft" && wc.navigationHistory.canGoBack()) { wc.navigationHistory.goBack(); e.preventDefault(); }
  });

  win.loadURL(START);
}

// The page tells us when it switches between light and dark, so the window buttons match.
ipcMain.on("titlebar-theme", (_e, dark) => {
  if (!win || process.platform !== "win32") return;
  try { win.setTitleBarOverlay({ color: dark ? "#0a0a0a" : "#ffffff", symbolColor: dark ? "#f5f5f5" : "#111111", height: TITLEBAR_HEIGHT }); } catch {}
  win.setBackgroundColor(dark ? "#0a0a0a" : "#ffffff");
});
ipcMain.on("retry", () => win && win.loadURL(START));

app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
