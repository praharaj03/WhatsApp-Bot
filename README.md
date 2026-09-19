<h1 align="center">Inside Heartz AI WhatsApp Bot</h1>

<h3 align="center">An AI-powered WhatsApp chatbot built with <a href="https://github.com/wwebjs/whatsapp-web.js">whatsapp-web.js</a> and a live control dashboard</h3>

<div align="center">

  <img src="https://img.shields.io/badge/whatsapp--web.js-1.34.7-green?style=flat&logo=npm" alt="shield.png">
  <img src="https://img.shields.io/badge/license-GNU%20GPL%20v3-green" alt="shield.png">

</div>

The bot answers WhatsApp messages with real LLM responses, supports configurable *moods*, per-chat conversation history, token/usage tracking, and a beautiful black liquid-glass monitoring dashboard.

---

## Features

- 🤖 **AI chat replies** powered by Groq (`llama-3.3-70b-versatile`) out of the box
  - Also supports OpenAI, Gemini, Anthropic, and local Ollama — switch via `LLM_PROVIDER`
- 🎭 **Moods** — change the assistant's personality on the fly (`default 😊`, `professional 💼`, `casual 🍃`, `angry 😤`, `romantic ❤️`, `vulgar 🔥`)
- 🧠 **Per-chat memory** — keeps conversation context per chat (configurable `LLM_HISTORY_LIMIT`)
- 📊 **Live dashboard** — `http://127.0.0.1:3000` with status, token usage bars, uptime, and a click-to-change mood picker
- 🔐 **Session persistence** — `LocalAuth` keeps you logged in; no QR scan on every restart
- ♻️ **Auto-retry & watchdog** — restarts the client if initialization fails or hangs
- 🔎 **Usage tracking** — check token consumption with `!usage`

## Requirements

- Node.js **18+**
- Google Chrome (set `CHROME_PATH` in `.env` if it's not in the default location)
- A Groq API key (free) from https://console.groq.com

## Installation

```bash
git clone https://github.com/praharaj03/WhatsApp-Bot.git
cd WhatsApp-Bot
npm install
```

Copy the environment template and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GROQ_API_KEY=gsk_your_key_here
```

## Usage

```bash
npm start
```

First run: the terminal prints a **QR code** — scan it from WhatsApp (phone) via **Linked Devices**. After that the session is saved and the bot auto-restarts without scanning.

Open the dashboard at **http://127.0.0.1:3000** to watch status, token usage, and switch moods from the browser.

## Commands

| Command | Description |
| --- | --- |
| `!mood` / `!moods` | Show current mood and list all available moods |
| `!mood <name>` | Change mood, e.g. `!mood romantic` |
| `!reset` | Clear that chat's conversation history |
| `!usage` / `!quota` | Show token usage stats |
| _any other text_ | The AI replies |

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | — | Groq API key (required) |
| `LLM_PROVIDER` | `groq` | `groq`, `openai`, `gemini`, `anthropic`, `ollama` |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Model to use for the selected provider |
| `LLM_MOOD` | `default` | Initial mood |
| `LLM_HISTORY_LIMIT` | `10` | Messages of context kept per chat |
| `LLM_TEMPERATURE` | `0.8` | Creativity of responses |
| `LLM_MAX_TOKENS` | `1024` | Max completion tokens |
| `CHROME_PATH` | auto-detected | Path to the Chrome executable |
| `BOT_DASHBOARD_PORT` | `3000` | Dashboard port |
| `WA_WEB_VERSION` | current build | Pin a specific WhatsApp Web build |

## Project Structure

```
start.js      Entry point — loads .env, builds the runtime from index.js, applies fixes
index.js      WhatsApp client: QR/login, auth watchdog, message handling
llm.js        LLM client: providers, moods, conversation history, token usage
monitor.js    Dashboard server + state (black liquid-glass UI)
config.js     Reads configuration from environment variables
```

## Disclaimer

This is an unofficial, community bot built with `whatsapp-web.js`. Use responsibly — sending spam or bulk messages can get your WhatsApp account **banned**. The author is not responsible for how you use it.