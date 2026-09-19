const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'index.js');
let source = fs.readFileSync(sourcePath, 'utf8');

// Use the current WhatsApp Web.js authentication strategy instead of the removed
// legacy session option. Keep the original command handlers intact.
source = source.replace(
  'const { Client, MessageMedia } = require("whatsapp-web.js");',
  'const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");'
);

source = source.replace(/const SESSION_FILE_PATH = "\\.\/session\\.json";[\\s\\S]*?client = new Client\(\{/, 'client = new Client({');
source = source.replace(/\n\s*session: sessionCfg\s*\n\s*\}\);/, '\n      authStrategy: new LocalAuth({ clientId: "insideheartz-bot" })\n});');

// The original file initializes before registering listeners. Move initialization
// to the end so qr/ready/message events cannot be missed.
const initializeToken = 'client.initialize();';
const firstInitialize = source.indexOf(initializeToken);
if (firstInitialize !== -1) {
  source = source.slice(0, firstInitialize) + '// initialization moved to the end by start.js' + source.slice(firstInitialize + initializeToken.length);
}

// Avoid crashes caused by private-chat messages where author is undefined.
source = source.replace("const dariGC = msg['author']", "const dariGC = msg['author'] || msg['from']");

source += `\n\nconsole.log('[START] Initializing WhatsApp client...');\nclient.initialize().catch((error) => {\n  console.error('[START] Initialization failed:', error);\n  process.exitCode = 1;\n});\n`;

const runtimePath = path.join(__dirname, '.index-runtime.js');
fs.writeFileSync(runtimePath, source, 'utf8');
require(runtimePath);
