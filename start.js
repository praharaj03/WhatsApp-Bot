require('dotenv').config();

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'index.js');
let source = fs.readFileSync(sourcePath, 'utf8');

// Use the current WhatsApp Web.js authentication strategy instead of the removed
// legacy session option. Keep the original command handlers intact.
source = source.replace(
  'const { Client, MessageMedia } = require("whatsapp-web.js");',
  'const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");\nconst { createMonitor } = require("./monitor");\nconst monitor = createMonitor();'
);

source = source.replace(/const SESSION_FILE_PATH = "\\.\/session\\.json";[\\s\\S]*?client = new Client\(\{/, 'client = new Client({');
source = source.replace(/\n\s*session: sessionCfg\s*\n\s*\}\);/, '\n      authStrategy: new LocalAuth({ clientId: "insideheartz-bot" })\n});');
source = source.replace(
  "executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',",
  "executablePath: process.env.CHROME_PATH || require('puppeteer').executablePath(),"
);
source = source.replace(
  "client = new Client({",
  "const client = new Client({\n    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',\n    webVersion: process.env.WA_WEB_VERSION || '2.3000.1047947458-alpha',\n    webVersionCache: {\n      type: 'remote',\n      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html',\n      strict: false\n    },"
);

// The original file initializes before registering listeners. Move initialization
// to the end so qr/ready/message events cannot be missed.
const initializeToken = 'client.initialize();';
const firstInitialize = source.indexOf(initializeToken);
if (firstInitialize !== -1) {
  source = source.slice(0, firstInitialize) + '// initialization moved to the end by start.js' + source.slice(firstInitialize + initializeToken.length);
}

// Avoid crashes caused by private-chat messages where author is undefined.
source = source.replace("const dariGC = msg['author']", "const dariGC = msg['author'] || msg['from']");

source = source.replace(
  'console.log(`[ ${moment().format("HH:mm:ss")} ] Please Scan QR with app!`);',
  'monitor.event("qr", { status: "awaiting_qr", authenticated: false, ready: false, connected: false });\n  console.log(`[ ${moment().format("HH:mm:ss")} ] Please Scan QR with app!`);'
);
source = source.replace(
  'client.on("qr", qr => {',
  'client.on("loading_screen", (percent, message) => {\n  monitor.event("loading", { status: "loading", loading: { percent, message } });\n});\n\nclient.on("change_state", state => {\n  monitor.event("change_state", { whatsappState: state, connected: state === "CONNECTED" });\n});\n\nclient.on("qr", qr => {'
);
source = source.replace(
  'console.log(`[ ${moment().format("HH:mm:ss")} ] Authenticated Success!`);',
  `monitor.event("authenticated", { status: "authenticated", authenticated: true, connected: false });
  setTimeout(() => {
    if (!monitor.state.ready && monitor.state.lastEvent === "authenticated") {
      const reason = "WhatsApp authenticated but did not become ready within 90 seconds. Restarting client to recover...";
      console.warn('[WATCHDOG] ' + reason);
      monitor.error(new Error(reason));
      client.destroy().catch(() => {});
      setTimeout(() => {
        monitor.event('restarting', { status: 'restarting', authenticated: false, ready: false, connected: false, lastError: null });
        initializeClient(0);
      }, 3000);
    }
  }, 90000);
  console.log(\`[ \${moment().format("HH:mm:ss")} ] Authenticated Success!\`);`
);
source = source.replace(
  'console.log(\n    `[ ${moment().format("HH:mm:ss")} ] AUTHENTICATION FAILURE \\n ${msg}`\n  );',
  'monitor.event("auth_failure", { status: "auth_failure", authenticated: false, ready: false, connected: false, lastError: String(msg) });\n  console.log(\n    `[ ${moment().format("HH:mm:ss")} ] AUTHENTICATION FAILURE \\n ${msg}`\n  );'
);
source = source.replace(
  'console.log(`[ ${moment().format("HH:mm:ss")} ] Whatsapp bot ready!`);',
  'monitor.event("ready", { status: "ready", authenticated: true, ready: true, connected: true, lastError: null });\n  console.log(`[ ${moment().format("HH:mm:ss")} ] Whatsapp bot ready!`);'
);
source = source.replace(
  'console.log("Client was logged out", reason);',
  'monitor.event("disconnected", { status: "disconnected", ready: false, connected: false, lastError: String(reason) });\n  console.log("Client was logged out", reason);'
);
source = source.replace(
  'console.log(`[ ${moment().format("HH:mm:ss")} ]  => New Message : ${msg.body}',
  'monitor.message();\n\tconsole.log(`[ ${moment().format("HH:mm:ss")} ]  => New Message : ${msg.body}'
);

source += `\n\nfunction initializeClient(attempt) {
  console.log('[START] Initializing WhatsApp client (attempt ' + attempt + ')...');
  client.initialize().catch((error) => {
    monitor.error(error);
    console.error('[START] Initialization failed:', error);
    if (attempt < 3) {
      monitor.event('retrying', { status: 'retrying', ready: false, connected: false, lastError: null });
      setTimeout(() => initializeClient(attempt + 1), 5000);
    } else {
      process.exitCode = 1;
    }
  });
}

initializeClient(1);
`;

const runtimePath = path.join(__dirname, '.index-runtime.js');
fs.writeFileSync(runtimePath, source, 'utf8');
require(runtimePath);
