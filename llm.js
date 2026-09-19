const fetch = require("node-fetch");

const PROVIDERS = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile"
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini"
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash"
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-haiku-latest"
  },
  ollama: {
    baseUrl: "http://localhost:11434",
    defaultModel: "llama3.2"
  }
};

const PROVIDER_KEY_ENV = {
  groq: "GROQ_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GOOGLE_API_KEY",
  anthropic: "ANTHROPIC_API_KEY"
};

const MOOD_PRESETS = {
  default: {
    label: "Default",
    emoji: "😊",
    prompt:
      "You are InsideBot, a friendly Indian WhatsApp assistant. Always reply in Hinglish (a mix of Hindi and English), unless the user writes in another language. Be warm, helpful, and concise. Use Indian slang and emojis naturally."
  },
  prof: {
    label: "Professional",
    emoji: "💼",
    prompt:
      "You are InsideBot, a polished professional assistant. Behave like a courteous executive. Reply in clean Hinglish with a formal, structured, and to-the-point tone. Use respectful words like 'aap' and stay professional."
  },
  casual: {
    label: "Casual",
    emoji: "🍃",
    prompt:
      "You are InsideBot, a chilled-out desi buddy. Talk like a close friend — relaxed, full of masti, using casual Hinglish and fun emojis. Use 'tu/tere' vibes, be playful but not rude."
  },
  angry: {
    label: "Angry",
    emoji: "😤",
    prompt:
      "You are InsideBot but in a bad mood — gussa! Reply in Hinglish with a sulky, annoyed, taunting tone. Keep scolding playfully, use 'argh/uf', but still actually help the user and never genuinely attack them."
  },
  romantic: {
    label: "Romantic",
    emoji: "❤️",
    prompt:
      "You are InsideBot, a romantic and flirty desi partner. Reply with sweet, soft, loving Hinglish lines. Compliment warmly, use words like 'jaan', 'baby', 'pyaar' and make the conversation feel warm and cute."
  },
  vulgar: {
    label: "Vulgar",
    emoji: "🔥",
    prompt:
      "You are InsideBot in full desi 'gaali' mode. Reply with raw, over-the-top casual Hinglish full of mild abuses and edgy humor. Keep it entertaining and funny — never truly offensive or hateful."
  }
};

function loadConfig() {
  let fileCfg = {};
  try {
    fileCfg = require("./config.js") || {};
  } catch (e) {}
  const cfg = fileCfg.llm || {};

  const apiKeys = {
    groq: process.env.GROQ_API_KEY || cfg.groqApiKey || null,
    openai: process.env.OPENAI_API_KEY || cfg.openaiApiKey || null,
    gemini: process.env.GOOGLE_API_KEY || cfg.googleApiKey || null,
    anthropic: process.env.ANTHROPIC_API_KEY || cfg.anthropicApiKey || null
  };

  let provider = process.env.LLM_PROVIDER || cfg.provider || null;
  if (!provider) {
    const available = Object.keys(PROVIDERS).filter(
      (p) => p === "ollama" || apiKeys[p]
    );
    provider = available[0] || null;
  }

  const moodName = (process.env.BOT_MOOD_NAME || cfg.moodName || "default").toLowerCase();
  const preset = MOOD_PRESETS[moodName] || MOOD_PRESETS.default;

  return {
    provider,
    apiKeys,
    model: process.env.LLM_MODEL || cfg.model || null,
    moodName,
    moodDefault:
      process.env.BOT_MOOD || preset.prompt ||
      MOOD_PRESETS.default.prompt,
    historyLimit: Number(process.env.LLM_HISTORY || cfg.historyLimit || 10),
    temperature: Number(process.env.LLM_TEMPERATURE || cfg.temperature || 0.8),
    maxTokens: Number(process.env.LLM_MAX_TOKENS || cfg.maxTokens || 1024)
  };
}

class LLMClient {
  constructor(opts) {
    this.config = opts;
    this.history = {};
    this.moodName = this.config.moodName || "default";
    const preset = MOOD_PRESETS[this.moodName] || MOOD_PRESETS.default;
    this.mood = this.config.moodDefault || preset.prompt;
    this.moodLabel = preset.label;
    this.usage = { messages: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    this.lastUsage = null;
  }

  listMoods() {
    return MOOD_PRESETS;
  }

  getMoodName() {
    return this.moodName;
  }

  getMoodLabel() {
    return MOOD_PRESETS[this.moodName] ? MOOD_PRESETS[this.moodName].label : this.moodLabel;
  }

  setMoodName(name) {
    const key = String(name || "").toLowerCase();
    const preset = MOOD_PRESETS[key];
    if (!preset) return false;
    this.moodName = key;
    this.mood = preset.prompt;
    this.moodLabel = preset.label;
    return true;
  }

  setMood(mood) {
    this.mood = mood;
    return this.mood;
  }

  getMood() {
    return this.mood;
  }

  getProvider() {
    return this.config.provider;
  }

  getModel() {
    return this.config.model || (PROVIDERS[this.config.provider] && PROVIDERS[this.config.provider].defaultModel) || null;
  }

  getUsage() {
    return this.usage;
  }

  getLastUsage() {
    return this.lastUsage;
  }

  resetChat(chatId) {
    delete this.history[chatId];
  }

  async reply(chatId, text) {
    const provider = PROVIDERS[this.config.provider];
    if (!provider) {
      throw new Error(
        "LLM_PROVIDER belum disetel atau tidak ada API key yang terkonfigurasi. " +
          "Set GROQ_API_KEY (atau provider lain) lalu restart."
      );
    }

    const messages = this.history[chatId] || [];
    messages.push({ role: "user", content: text });
    if (messages.length > this.config.historyLimit * 2) {
      messages.splice(0, messages.length - this.config.historyLimit * 2);
    }

    const model = this.config.model || provider.defaultModel;
    const raw = await this.callProvider(provider, model, messages);
    messages.push({ role: "assistant", content: raw });
    this.history[chatId] = messages;

    const u = this.lastUsage || {};
    this.usage.messages += 1;
    this.usage.promptTokens += u.promptTokens || 0;
    this.usage.completionTokens += u.completionTokens || 0;
    this.usage.totalTokens += u.totalTokens || 0;
    return raw;
  }

  async callProvider(provider, model, messages) {
    switch (this.config.provider) {
      case "groq":
      case "openai":
        return this.openAiCompatible(provider, model, messages);
      case "gemini":
        return this.gemini(provider, model, messages);
      case "anthropic":
        return this.anthropic(provider, model, messages);
      case "ollama":
        return this.ollama(provider, model, messages);
      default:
        throw new Error("Provider tidak dikenal: " + this.config.provider);
    }
  }

  async openAiCompatible(provider, model, messages) {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKeys[this.config.provider]}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: this.mood }, ...messages],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`[${this.config.provider}] ${res.status} ${JSON.stringify(data)}`);
    }
    const usage = data.usage || {};
    this.lastUsage = {
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0
    };
    return (data.choices && data.choices[0] && data.choices[0].message.content) || "";
  }

  async gemini(provider, model, messages) {
    const key = this.config.apiKeys.gemini;
    const system = { parts: [{ text: this.mood }] };
    const res = await fetch(
      `${provider.baseUrl}/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: system,
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          }))
        })
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`[gemini] ${res.status} ${JSON.stringify(data)}`);
    }
    const um = data.usageMetadata || {};
    this.lastUsage = {
      promptTokens: um.promptTokenCount || 0,
      completionTokens: um.candidatesTokenCount || 0,
      totalTokens: um.totalTokenCount || 0
    };
    return (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0].text
    ) || "";
  }

  async anthropic(provider, model, messages) {
    const res = await fetch(`${provider.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKeys.anthropic,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        system: this.mood,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`[anthropic] ${res.status} ${JSON.stringify(data)}`);
    }
    const u = data.usage || {};
    this.lastUsage = {
      promptTokens: u.input_tokens || 0,
      completionTokens: u.output_tokens || 0,
      totalTokens: (u.input_tokens || 0) + (u.output_tokens || 0)
    };
    return (
      data.content &&
      data.content.map((c) => c.text || "").join("")
    ) || "";
  }

  async ollama(provider, model, messages) {
    const res = await fetch(`${provider.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: this.mood }, ...messages],
        stream: false,
        options: { temperature: this.config.temperature, num_predict: this.config.maxTokens }
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`[ollama] ${res.status} ${JSON.stringify(data)}`);
    }
    this.lastUsage = {
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    };
    return (data.message && data.message.content) || "";
  }
}

function createLLMClient(opts) {
  return new LLMClient(opts || loadConfig());
}

module.exports = { createLLMClient, loadConfig, MOOD_PRESETS };