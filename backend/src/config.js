import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 3001,
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "",
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 20000,
};

// Fail fast with a clear message instead of a confusing error on first request.
export function assertConfig() {
  const missing = [];
  if (!config.geminiApiKey) missing.push("GEMINI_API_KEY");
  if (!config.geminiModel) missing.push("GEMINI_MODEL");
  if (missing.length) {
    console.error(`Missing in backend/.env: ${missing.join(", ")}`);
    process.exit(1);
  }
}
