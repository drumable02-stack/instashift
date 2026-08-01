import { NextRequest, NextResponse } from "next/server";
import { GENERATE_IMAGE_PROMPT_TEMPLATE } from "@/lib/prompts";
import type { AnalysisResult } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { analysis, userConcept } = (await req.json()) as { analysis?: AnalysisResult; userConcept?: string };
    if (!analysis) return NextResponse.json({ error: "analysis가 필요합니다." }, { status: 400 });

    const imagePrompt = GENERATE_IMAGE_PROMPT_TEMPLATE(
      analysis.subject,
      analysis.style,
      analysis.layout,
      analysis.colorPalette,
      analysis.textPosition,
      userConcept?.trim() || "원본의 분위기를 살린 새로운 주제로 재해석"
    ).trim();
    return NextResponse.json({ imagePrompt });
  } catch (err) {
    console.error("Image prompt error", err);
    return NextResponse.json({ error: "이미지 프롬프트 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
