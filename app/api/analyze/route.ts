import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/prompts";
import type { AnalysisResult } from "@/types";

export const runtime = "nodejs";

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    ["layout", "subject", "style", "originalText", "textTone", "textPosition"].every(
      (key) => typeof result[key] === "string"
    ) &&
    Array.isArray(result.colorPalette) &&
    result.colorPalette.every((color) => typeof color === "string")
  );
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json(); // image: base64 data URL

    if (typeof image !== "string" || !/^data:image\/(png|jpe?g|webp);base64,/i.test(image)) {
      return NextResponse.json({ error: "image가 필요합니다." }, { status: 400 });
    }

    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4o",
      temperature: 0.2,
      messages: [
        { role: "system", content: ANALYZE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "이 게시물 이미지를 재창작에 필요한 수준으로 분석해줘." },
            { type: "image_url", image_url: { url: image, detail: "high" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message.content;
    if (!content) throw new Error("분석 결과가 비어 있습니다.");
    const result: unknown = JSON.parse(content);
    if (!isAnalysisResult(result)) throw new Error("분석 결과 형식이 올바르지 않습니다.");

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
