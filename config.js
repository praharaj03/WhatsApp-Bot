module.exports = {
	chrome: process.env.CHROME_PATH || "PATH_CHROME",
	ffmpeg: process.env.FFMPEG_PATH || "PATH_FFMPEG",
        genius: process.env.GENIUS_TOKEN || "GENIUS_TOKEN",
	llm: {
		provider: process.env.LLM_PROVIDER || "groq",
		groqApiKey: process.env.GROQ_API_KEY || "",
		model: process.env.LLM_MODEL || "llama-3.3-70b-versatile",
		moodName: process.env.LLM_MOOD || "default",
		historyLimit: Number(process.env.LLM_HISTORY_LIMIT) || 10,
		temperature: Number(process.env.LLM_TEMPERATURE) || 0.8,
		maxTokens: Number(process.env.LLM_MAX_TOKENS) || 1024
	}
}