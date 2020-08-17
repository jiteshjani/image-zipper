const path = require("path");
const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const compress_images = require("compress-images");

const APP_ENV = (process.env.NODE_ENV = "prod");
const isDev = APP_ENV === "dev";
const isMac = process.platform === "darwin";
if (!isDev) {
  process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
}

let mainWindow;
let aboutWindow;

const mainMenu = Menu.buildFromTemplate([
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    label: "File",
    submenu: [
      {
        label: "Open Images",
        accelerator: "CmdOrCtrl+O",
        click: function (menuItem, currentWindow) {
          currentWindow.webContents.send("browse:images");
        },
      },
      { type: "separator" },
      {
        label: "Close",
        accelerator: "CmdOrCtrl+Q",
        click: () => app.quit(),
      },
    ],
  },
  ...(isDev
    ? [
        {
          label: "Debug",
          submenu: [
            { role: "reload" },
            { role: "forcereload" },
            { type: "separator" },
            { role: "toggledevtools" },
          ],
        },
      ]
    : []),
  ...(!isMac
    ? [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              accelerator: "F1",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
]);

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: `ImageZipper v${app.getVersion()}`,
    width: 800,
    height: 650,
    resizable: isDev,
    icon: path.join(__dirname, "app", "assets", "icon.png"),
    backgroundColor: "#fafafa",
    webPreferences: {
      devTools: isDev,
      nodeIntegration: true,
      disableHtmlFullscreenWindowResize: !isDev,
      enableRemoteModule: true,
      worldSafeExecuteJavaScript: true,
    },
  });
  mainWindow.setMenu(mainMenu);
  mainWindow.loadFile(path.join(__dirname, "app", "index.html"));
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

const aboutMenu = Menu.buildFromTemplate([
  {
    label: "Close",
    accelerator: "Esc",
    click: function (menuItem, currentWindow) {
      currentWindow.close();
    },
  },
]);

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: "About ImageZipper",
    width: 400,
    height: 250,
    resizable: false,
    minimizable: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "app", "assets", "icon.png"),
    webPreferences: {
      devTools: isDev,
      nodeIntegration: false,
      disableHtmlFullscreenWindowResize: true,
      enableRemoteModule: true,
      worldSafeExecuteJavaScript: true,
    },
  });
  aboutWindow.setMenu(aboutMenu);
  aboutWindow.loadFile(path.join(__dirname, "app", "about.html"));
}

app.on("ready", () => {
  createMainWindow();
  mainWindow.on("ready", () => (mainWindow = null));
});

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows.length === 0) {
    createMainWindow();
  }
});

app.allowRendererProcessReuse = true;

ipcMain.on("image:minimize", (e, data) => {
  if (data.images.length) {
    for (let image of data.images) {
      let ext = path.extname(image).toLowerCase();
      if ([".jpg", ".png", ".gif", ".svg"].includes(ext)) {
        try {
          shrinkImages(image, data.outputPath, data.qualityValue);
        } catch (err) {
          sendLog(err.message, false, null);
        }
      } else {
        let error = `Unsupported image type: "${path.basename(image)}"`;
        sendLog(error, false, null);
      }
    }
    if (data.openDestination) {
      shell.openPath(data.outputPath);
    }
  }
});

function shrinkImages(imagePath, savePath, quality) {
  compress_images(
    imagePath.replace(/\\/g, "/"),
    savePath.replace(/\\/g, "/") + "/",
    {
      compress_force: true,
      statistic: true,
      pathLog: null,
      autoupdate: true,
    },
    false,
    { jpg: { engine: "mozjpeg", command: ["-quality", quality] } },
    {
      png: {
        engine: "pngquant",
        command: [`--quality=${quality}-${quality}`],
      },
    },
    { svg: { engine: "svgo", command: "--multipass" } },
    {
      gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
    },
    function (error, completed, statistic) {
      sendLog(error, completed, statistic);
    }
  );
}

function sendLog(error, completed, statistic) {
  let type = "error";
  let message = "Failed to convert specified image!";
  if (completed) {
    type = "info";
    message = `Image "${path.basename(
      statistic.input
    )}" compressed successfully!`;
  } else if (error) {
    message = error;
  }
  mainWindow.webContents.send("output:log", { type, message });
}

ipcMain.on("show:about", () => {
  createAboutWindow();
});
