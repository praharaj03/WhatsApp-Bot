module.exports = {
	chrome: "PATH_CHROME",
	ffmpeg: "PATH_FFMPEG",
        genius: "GENIUS_TOKEN",
	llm: {
		provider: "groq",
		groqApiKey: process.env.GROQ_API_KEY || "",
		model: "llama-3.3-70b-versatile",
		moodName: "default",
		historyLimit: 10,
		temperature: 0.8,
		maxTokens: 1024
	}
}