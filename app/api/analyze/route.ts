import { NextRequest, NextResponse } from "next/server";
import { GEMINI_MODEL, getGemini, parseImageDataUrl } from "@/lib/gemini";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/prompts";
import type { AnalysisResult } from "@/types";

export const runtime = "nodejs";

const analysisSchema = {
  type: "object",
  properties: {
    layout: { type: "string" },
    subject: { type: "string" },
    style: { type: "string" },
    colorPalette: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    channelName: { type: "string" },
    originalText: { type: "string" },
    bodyText: { type: "string" },
    textTone: { type: "string" },
    textPosition: { type: "string" },
  },
  required: ["layout", "subject", "style", "colorPalette", "channelName", "originalText", "bodyText", "textTone", "textPosition"],
  additionalProperties: false,
};

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    ["layout", "subject", "style", "channelName", "originalText", "bodyText", "textTone", "textPosition"].every(
      (key) => typeof result[key] === "string"
    ) &&
    Array.isArray(result.colorPalette) &&
    result.colorPalette.every((color) => typeof color === "string")
  );
}

export async function POST(req: NextRequest) {
  try {
    const { image } = (await req.json()) as { image?: string };
    const imagePart = typeof image === "string" ? parseImageDataUrl(image) : null;
    if (!imagePart) {
      return NextResponse.json({ error: "PNG, JPG 또는 WEBP 이미지가 필요합니다." }, { status: 400 });
    }

    const response = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { inlineData: imagePart },
        { text: "이 게시물 이미지를 재창작에 필요한 수준으로 분석해줘." },
      ],
      config: {
        systemInstruction: ANALYZE_SYSTEM_PROMPT,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: analysisSchema,
      },
    });

    if (!response.text) throw new Error("분석 결과가 비어 있습니다.");
    const result: unknown = JSON.parse(response.text);
    if (!isAnalysisResult(result)) throw new Error("분석 결과 형식이 올바르지 않습니다.");
    return NextResponse.json(result);
  } catch (err) {
    console.error("Gemini analyze error", err);
    return NextResponse.json({ error: "이미지 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
