import OpenAI from "openai";

// 서버 사이드에서만 사용 (API Route 내부에서 import)
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
