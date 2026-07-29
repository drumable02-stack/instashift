import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { GENERATE_COPY_SYSTEM_PROMPT } from "@/lib/prompts";
import type { AnalysisResult } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { analysis, userConcept } = (await req.json()) as {
      analysis: AnalysisResult;
      userConcept?: string;
    };

    if (!analysis || typeof analysis.originalText !== "string") {
      return NextResponse.json({ error: "analysis가 필요합니다." }, { status: 400 });
    }

    const userPrompt = [
      `원본 텍스트: ${analysis.originalText || "(텍스트 없음)"}`,
      `원본 톤: ${analysis.textTone}`,
      `원본 이미지 주제: ${analysis.subject}`,
      `새 컨셉: ${userConcept?.trim() || "원본의 분위기를 살린 새로운 주제"}`,
    ].join("\n");
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4o",
      temperature: 0.8,
      messages: [
        { role: "system", content: GENERATE_COPY_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    const newText = completion.choices[0]?.message.content?.trim();
    if (!newText) throw new Error("생성된 카피가 비어 있습니다.");

    return NextResponse.json({ newText });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "카피 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
