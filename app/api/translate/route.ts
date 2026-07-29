import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { TRANSLATE_SYSTEM_PROMPT } from "@/lib/prompts";
import type { TranslatedCopy } from "@/types";

export const runtime = "nodejs";

function isTranslatedCopy(value: unknown): value is TranslatedCopy {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return ["ko", "ja", "es", "en"].every((key) => typeof result[key] === "string");
}

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text: string };

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text가 필요합니다." }, { status: 400 });
    }

    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4o",
      temperature: 0.3,
      messages: [
        { role: "system", content: TRANSLATE_SYSTEM_PROMPT },
        { role: "user", content: text.trim() },
      ],
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message.content;
    if (!content) throw new Error("번역 결과가 비어 있습니다.");
    const result: unknown = JSON.parse(content);
    if (!isTranslatedCopy(result)) throw new Error("번역 결과 형식이 올바르지 않습니다.");
    result.ko = text.trim();

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "번역 중 오류가 발생했습니다." }, { status: 500 });
  }
}
