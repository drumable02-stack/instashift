import { NextRequest, NextResponse } from "next/server";
import { GEMINI_MODEL, getGemini } from "@/lib/gemini";
import { GENERATE_COPY_SYSTEM_PROMPT } from "@/lib/prompts";
import type { AnalysisResult } from "@/types";

export const runtime = "nodejs";

const copySchema = {
  type: "object",
  properties: { newText: { type: "string" }, newBodyText: { type: "string" } },
  required: ["newText", "newBodyText"],
  additionalProperties: false,
};

export async function POST(req: NextRequest) {
  try {
    const { analysis, userConcept } = (await req.json()) as { analysis?: AnalysisResult; userConcept?: string };
    if (!analysis || typeof analysis.originalText !== "string" || typeof analysis.bodyText !== "string") {
      return NextResponse.json({ error: "analysis가 필요합니다." }, { status: 400 });
    }

    const prompt = [
      `채널명: ${analysis.channelName || "(채널명 없음)"}`,
      `원본 헤드라인: ${analysis.originalText || "(헤드라인 없음)"}`,
      `원본 본문: ${analysis.bodyText || "(본문 없음 — 새 콘셉트에 맞는 짧은 본문 작성)"}`,
      `원본 톤: ${analysis.textTone}`,
      `원본 이미지 주제: ${analysis.subject}`,
      `새 콘셉트: ${userConcept?.trim() || "원본의 분위기를 살린 새로운 주제"}`,
    ].join("\n\n");

    const response = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: GENERATE_COPY_SYSTEM_PROMPT,
        temperature: 0.8,
        responseMimeType: "application/json",
        responseJsonSchema: copySchema,
      },
    });
    if (!response.text) throw new Error("생성된 카피가 비어 있습니다.");
    const result = JSON.parse(response.text) as { newText?: unknown; newBodyText?: unknown };
    if (typeof result.newText !== "string" || typeof result.newBodyText !== "string") {
      throw new Error("카피 결과 형식이 올바르지 않습니다.");
    }
    return NextResponse.json({ newText: result.newText.trim(), newBodyText: result.newBodyText.trim() });
  } catch (err) {
    console.error("Gemini copy error", err);
    return NextResponse.json({ error: "카피 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
