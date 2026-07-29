import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { GENERATE_COPY_SYSTEM_PROMPT } from "@/lib/prompts";
import type { AnalysisResult } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { analysis, userConcept } = (await req.json()) as {
      analysis: AnalysisResult;
      userConcept?: string;
    };

    if (!analysis) {
      return NextResponse.json({ error: "analysis가 필요합니다." }, { status: 400 });
    }

    // TODO: GPT 호출로 교체
    // const userPrompt = `
    //   원본 텍스트: ${analysis.originalText}
    //   원본 톤: ${analysis.textTone}
    //   교체 컨셉: ${userConcept ?? "원본과 유사한 컨셉으로 자유롭게"}
    // `;
    // const completion = await openai.chat.completions.create({
    //   model: "gpt-4o",
    //   messages: [
    //     { role: "system", content: GENERATE_COPY_SYSTEM_PROMPT },
    //     { role: "user", content: userPrompt },
    //   ],
    // });
    // const newText = completion.choices[0].message.content!;

    const newText = "TODO: 생성된 카피";

    return NextResponse.json({ newText });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "카피 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
