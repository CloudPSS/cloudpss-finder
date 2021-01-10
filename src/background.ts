"use strict";

import { BrowserWindow, Menu, app, protocol } from "electron";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import os, { NetworkInterfaceInfo } from "os";

import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import dgram from "dgram";
import { execAsyncSystemCommand } from "@/utils/exec-system-command";
import { ipcMain } from "electron";

const isDevelopment = process.env.NODE_ENV !== "production";
/** 主服务器地址 */
const multicastIp = "239.114.51.4";
/**创建socket连接 */
const socketServer = dgram.createSocket("udp4");
// socketServer.bind(8848, () => {
//   socketServer.addMembership(multicastIp, localIp);
//   socketServer.addMembership(multicastIp, vpnIp);
// });

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } }
]);

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: (process.env
        .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      webSecurity: false
    }
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
    if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    win.loadURL("app://./index.html");
  }
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS);
    } catch (e) {
      console.error("Vue Devtools failed to install:", e.toString());
    }
  }
  createWindow();
});

Menu.setApplicationMenu(null);

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", data => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}
ipcMain.on("getNetworkInterfaces", event => {
  // event.reply("returnNetworkInterfaces", os.networkInterfaces());
  const args =  os.networkInterfaces();
  let ipList:string[] = [];
  for (const key in args) {
    const ip = ((args[key] as NetworkInterfaceInfo[] ).find(
      item => item.family === "IPv4"
    ) as os.NetworkInterfaceInfoIPv4).address
    ;
    ipList.push(ip)
  }
  socketServer.bind(8848, () => {
    ipList.forEach(x=>{
      socketServer.addMembership(multicastIp,x);
    })
  
  });
  socketServer.on("message", (msg, remoteInfo) => {
    console.log(`ip:${remoteInfo.address}`, msg.toString());
    event.reply("returnNetworkInterfaces", {ip:remoteInfo.address,...JSON.parse(msg.toString())});
  });
  console.log(args);
  
});



ipcMain.on("getMac", async (event, arg) => {
  console.log(arg);
  const result = (await execAsyncSystemCommand(` arp -a ${arg}`)).toString(
    "utf-8"
  );
  event.reply(`returnMac${arg}`, result);
});
