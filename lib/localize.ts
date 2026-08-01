import { GEMINI_MODEL, getGemini } from "@/lib/gemini";
import { TRANSLATE_SYSTEM_PROMPT } from "@/lib/prompts";
import type { LocalizedText, TranslatedContent } from "@/types";

const localizedSchema = {
  type: "object",
  properties: { ko: { type: "string" }, ja: { type: "string" }, es: { type: "string" }, en: { type: "string" } },
  required: ["ko", "ja", "es", "en"],
  additionalProperties: false,
};

const translationSchema = {
  type: "object",
  properties: { headline: localizedSchema, body: localizedSchema },
  required: ["headline", "body"],
  additionalProperties: false,
};

function isLocalizedText(value: unknown): value is LocalizedText {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["ko", "ja", "es", "en"].every((key) => typeof item[key] === "string");
}

function isTranslatedContent(value: unknown): value is TranslatedContent {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return isLocalizedText(item.headline) && isLocalizedText(item.body);
}

export async function localizeContent(headline: string, body: string, model = GEMINI_MODEL) {
  const originalHeadline = headline.trim();
  const originalBody = body.trim();
  const response = await getGemini().models.generateContent({
    model,
    contents: `헤드라인:\n${originalHeadline}\n\n본문:\n${originalBody || "(본문 없음)"}`,
    config: {
      systemInstruction: TRANSLATE_SYSTEM_PROMPT,
      temperature: 0.3,
      maxOutputTokens: 1800,
      responseMimeType: "application/json",
      responseJsonSchema: translationSchema,
    },
  });
  if (!response.text) throw new Error("번역 결과가 비어 있습니다.");
  const result: unknown = JSON.parse(response.text);
  if (!isTranslatedContent(result)) throw new Error("번역 결과 형식이 올바르지 않습니다.");
  result.headline.ko = originalHeadline;
  result.body.ko = originalBody;
  return result;
}
