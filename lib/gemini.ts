import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | undefined;

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

export function getGemini() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export function parseImageDataUrl(image: string) {
  const match = image.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}
