const { app, BrowserWindow, Tray, Menu, nativeImage, screen } = require("electron");
const path = require("path");
const { initDatabase } = require("./database");
const { registerIpcHandlers } = require("./ipc");
const { startEngine, stopEngine, setMainWindow } = require("./nudgeManager");
const { getSetting } = require("./database");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try { if (require("electron-squirrel-startup")) app.quit(); } catch {}

// Windows: set AppUserModelId so native notifications display correctly
if (process.platform === "win32") {
  app.setAppUserModelId("com.productghost.app");
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

const isDev = !app.isPackaged;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 700,
    minHeight: 500,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: process.platform === "win32" ? {
      color: "#09090b",
      symbolColor: "#a1a1aa",
      height: 40,
    } : undefined,
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Always load from built dist files for reliability
  mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.once("ready-to-show", () => {
    const onboarded = getSetting("onboarding_complete");
    if (onboarded === "true") {
      // Don't auto-show — lives in tray
    } else {
      mainWindow.show();
    }
  });

  setMainWindow(mainWindow);
  return mainWindow;
}

function createTray() {
  // Create a simple ghost icon using nativeImage
  const iconSize = process.platform === "darwin" ? 18 : 24;
  const icon = createGhostIcon(iconSize);

  tray = new Tray(icon);
  tray.setToolTip("ProductGhost — Your silent PM coach");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "👻 ProductGhost",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Open Dashboard",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Trigger Nudge Now",
      click: async () => {
        const { triggerManualNudge } = require("./nudgeManager");
        await triggerManualNudge();
      },
    },
    { type: "separator" },
    {
      id: "toggle",
      label: "Enabled",
      type: "checkbox",
      checked: getSetting("enabled") !== "false",
      click: (menuItem) => {
        const { setSetting } = require("./database");
        const newVal = menuItem.checked ? "true" : "false";
        setSetting("enabled", newVal);
        if (newVal === "true") startEngine();
        else stopEngine();
        updateTrayIcon(menuItem.checked);
      },
    },
    { type: "separator" },
    {
      label: "Quit ProductGhost",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createGhostIcon(size) {
  // Create a proper 16x16 or 24x24 RGBA icon with a ghost shape
  const s = size;
  const buf = Buffer.alloc(s * s * 4);
  const cx = s / 2, cy = s / 2;

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const idx = (y * s + x) * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Ghost body: oval shape
      const inHead = dist < s * 0.38 && y < s * 0.65;
      const inBody = Math.abs(dx) < s * 0.35 && y >= s * 0.35 && y < s * 0.85;
      const inWavy = Math.abs(dx) < s * 0.35 && y >= s * 0.75 && y < s * 0.92 &&
                     Math.sin(x * 1.2) * s * 0.06 + s * 0.82 > y;
      const inGhost = inHead || inBody || inWavy;

      // Eyes
      const eyeL = Math.sqrt((x - cx + s*0.12)*(x - cx + s*0.12) + (y - cy + s*0.05)*(y - cy + s*0.05)) < s * 0.08;
      const eyeR = Math.sqrt((x - cx - s*0.12)*(x - cx - s*0.12) + (y - cy + s*0.05)*(y - cy + s*0.05)) < s * 0.08;

      if ((eyeL || eyeR) && inGhost) {
        buf[idx] = 255; buf[idx+1] = 255; buf[idx+2] = 255; buf[idx+3] = 255;
      } else if (inGhost) {
        buf[idx] = 139; buf[idx+1] = 92; buf[idx+2] = 246; buf[idx+3] = 255; // #8b5cf6
      } else {
        buf[idx] = 0; buf[idx+1] = 0; buf[idx+2] = 0; buf[idx+3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(buf, { width: s, height: s });
}

function updateTrayIcon(enabled) {
  tray.setToolTip(
    enabled
      ? "ProductGhost — Active"
      : "ProductGhost — Paused"
  );
}

// ── App Lifecycle ──────────────────────────────────────────────────

app.whenReady().then(() => {
  // Initialize database first
  initDatabase();

  // Register IPC handlers
  registerIpcHandlers();

  // Create window and tray
  createMainWindow();
  createTray();

  // Start the capture/nudge engine
  const enabled = getSetting("enabled");
  if (enabled !== "false") {
    startEngine();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  stopEngine();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Don't quit — keep running in tray
  }
});
