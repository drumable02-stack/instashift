import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/prompts";
import type { AnalysisResult } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json(); // image: base64 data URL

    if (!image) {
      return NextResponse.json({ error: "image가 필요합니다." }, { status: 400 });
    }

    // TODO: gpt-4o vision 호출로 교체
    // 참고 형태:
    // const completion = await openai.chat.completions.create({
    //   model: "gpt-4o",
    //   messages: [
    //     { role: "system", content: ANALYZE_SYSTEM_PROMPT },
    //     {
    //       role: "user",
    //       content: [
    //         { type: "text", text: "이 이미지를 분석해줘." },
    //         { type: "image_url", image_url: { url: image } },
    //       ],
    //     },
    //   ],
    //   response_format: { type: "json_object" },
    // });
    // const result: AnalysisResult = JSON.parse(completion.choices[0].message.content!);

    const result: AnalysisResult = {
      layout: "TODO",
      subject: "TODO",
      style: "TODO",
      colorPalette: [],
      originalText: "TODO",
      textTone: "TODO",
      textPosition: "TODO",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
