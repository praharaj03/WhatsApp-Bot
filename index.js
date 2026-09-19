//code by InsideHeartz
// github.com/fdciabdul
// please don't sell this fucking scripts

// jika menjualnya ya boleh boleh ajasi , tapi hasilnya bagi bagi dong kan saya gadapet apa apa kwkwkw
const fs = require("fs");
const moment = require("moment");
const qrcode = require("qrcode-terminal");
const { Client, MessageMedia } = require("whatsapp-web.js");
const { createLLMClient } = require("./llm");

const bot = createLLMClient();

const SESSION_FILE_PATH = "./session.json";

let sessionCfg;

if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = require(SESSION_FILE_PATH);
}

client = new Client({
    puppeteer: {
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        headless: true,
        args: [
      "--log-level=3",
      "--no-default-browser-check",
      "--disable-infobars",
      "--disable-web-security",
      "--disable-site-isolation-trials",
      "--no-experiments",
      "--ignore-gpu-blacklist",
      "--ignore-certificate-errors",
      "--ignore-certificate-errors-spki-list",
      "--disable-extensions",
      "--disable-default-apps",
      "--enable-features=NetworkService",
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--no-first-run",
      "--no-zygote"
    ]
    },
    session: sessionCfg
});

client.initialize();

// ======================= Begin initialize WAbot

client.on("qr", qr => {
  qrcode.generate(qr, {
    small: true
  });
  console.log(`[ ${moment().format("HH:mm:ss")} ] Please Scan QR with app!`);
});

client.on("authenticated", session => {
  console.log(`[ ${moment().format("HH:mm:ss")} ] Authenticated Success!`);
  // console.log(session);
  sessionCfg = session;
  fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
    if (err) {
      console.error(err);
    }
  });
});

client.on("auth_failure", msg => {
  // Fired if session restore was unsuccessfull
  console.log(
    `[ ${moment().format("HH:mm:ss")} ] AUTHENTICATION FAILURE \n ${msg}`
  );
});

client.on("ready", () => {
  console.log(`[ ${moment().format("HH:mm:ss")} ] Whatsapp bot ready!`);
  if (typeof monitor !== "undefined") {
    monitor.moods(bot.listMoods());
    monitor.llmInfo({
      provider: bot.getProvider(),
      model: bot.getModel(),
      mood: bot.getMoodName(),
      moodLabel: bot.getMoodLabel()
    });
  }
});

client.on("disconnected", reason => {
  console.log("Client was logged out", reason);
});

// ======================= WaBot Listen on message

client.on("message", async msg => {
  const chat = await msg.getChat();
  const users = await msg.getContact()
  const dariGC = msg['author']
  const dariPC = msg['from']
  console.log(`[ ${moment().format("HH:mm:ss")} ]  => New Message : ${msg.body}
	`)

  if (msg.fromMe) return;
  if (msg.type === "ciphertext") return;

  const text = (msg.body || "").trim();
  if (!text) return;

  if (text === "!mood" || text === "!moods") {
    const lines = Object.entries(bot.listMoods())
      .map(([key, m]) => `${m.emoji} *${key}* - ${m.label}`)
      .join("\n");
    return msg.reply(
      `Abhi mood: *${bot.getMoodName()}* (${bot.getMoodLabel()})\n\nMood change karne ke liye:\n${lines}\n\nExample: *!mood romantic*`
    );
  }

  const moodMatch = text.match(/^!mood\s+(.+)$/i);
  if (moodMatch) {
    const name = moodMatch[1].trim().toLowerCase();
    const ok = bot.setMoodName(name);
    return msg.reply(
      ok
        ? `Mood change ho gaya 😎 → *${bot.getMoodLabel()}* ${bot.listMoods()[name].emoji}`
        : `Arre! Mood "${name}" nahi mila. Try: ${Object.keys(bot.listMoods()).join(", ")}`
    );
  }

  if (text === "!reset") {
    bot.resetChat(msg.from);
    return msg.reply("Conversation reset ho gaya 👍");
  }

  if (text === "!usage" || text === "!quota") {
    const u = bot.getUsage();
    return msg.reply(
      `Usage stats:\nMessages: ${u.messages}\nPrompt tokens: ${u.promptTokens}\nCompletion tokens: ${u.completionTokens}\nTotal tokens: ${u.totalTokens}`
    );
  }

  chat.sendStateTyping();

  try {
    const answer = await bot.reply(msg.from, text);
    if (answer && answer.trim()) {
      await msg.reply(answer.trim());
      monitor.llmUsage(bot.getUsage());
      monitor.llmInfo({
        provider: bot.getProvider(),
        model: bot.getModel(),
        mood: bot.getMoodName(),
        moodLabel: bot.getMoodLabel()
      });
    }
  } catch (error) {
    console.error("[LLM] error:", error);
    monitor.error(error);
    msg.reply(
      "Oopss! Thoda technical problem aa gaya 😅. Try again in a moment ya!"
    );
  }
});