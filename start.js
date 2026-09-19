require('dotenv').config();

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'index.js');
let source = fs.readFileSync(sourcePath, 'utf8');

// Upgrade the legacy session configuration to LocalAuth.
source = source.replace(
  'const { Client, MessageMedia } = require("whatsapp-web.js");',
  'const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");'
);

source = source.replace(
  /const SESSION_FILE_PATH = "\\.\/session\\.json";[\\s\\S]*?client = new Client\\(\\{/,
  'client = new Client({'
);

source = source.replace(
  /\n\s*session: sessionCfg\s*\n\s*\}\);/,
  '\n    authStrategy: new LocalAuth({ clientId: "insideheartz-bot" })\n});'
);

source = source.replace(
  "executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',",
  "executablePath: process.env.CHROME_PATH || require('puppeteer').executablePath(),"
);

// Do not pin an old WhatsApp Web build. A stale webVersion can prevent ready.
source = source.replace(
  "client = new Client({",
  "const client = new Client({"
);
source = source.replace(/\n\s*webVersion: process\.env\.WA_WEB_VERSION \|\| '[^']+',/, '');
source = source.replace(/\n\s*webVersionCache: \{[\s\S]*?\n\s*\},/, '');

// Register listeners before initialization.
const initializeToken = 'client.initialize();';
const firstInitialize = source.indexOf(initializeToken);
if (firstInitialize !== -1) {
  source = source.slice(0, firstInitialize) + '// initialization moved to the end by start.js' + source.slice(firstInitialize + initializeToken.length);
}

source = source.replace("const dariGC = msg['author']", "const dariGC = msg['author'] || msg['from']");

source += `

function initializeClient(attempt) {
  console.log('[START] Initializing WhatsApp client (attempt ' + attempt + ')...');
  client.initialize().catch((error) => {
    console.error('[START] Initialization failed:', error);
    if (attempt < 3) {
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
