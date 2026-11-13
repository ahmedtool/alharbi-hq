// Small, safe bridge for the page: it can only report its theme and ask to retry.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("alharbiDesktop", {
  setTitleBarTheme: (dark) => ipcRenderer.send("titlebar-theme", !!dark),
  retry: () => ipcRenderer.send("retry"),
});
