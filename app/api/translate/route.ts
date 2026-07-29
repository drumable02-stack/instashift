import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { TRANSLATE_SYSTEM_PROMPT } from "@/lib/prompts";
import type { TranslatedCopy } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text: string };

    if (!text) {
      return NextResponse.json({ error: "text가 필요합니다." }, { status: 400 });
    }

    // TODO: GPT 호출로 교체
    // const completion = await openai.chat.completions.create({
    //   model: "gpt-4o",
    //   messages: [
    //     { role: "system", content: TRANSLATE_SYSTEM_PROMPT },
    //     { role: "user", content: text },
    //   ],
    //   response_format: { type: "json_object" },
    // });
    // const result: TranslatedCopy = JSON.parse(completion.choices[0].message.content!);

    const result: TranslatedCopy = {
      ko: text,
      ja: "TODO",
      es: "TODO",
      en: "TODO",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "번역 중 오류가 발생했습니다." }, { status: 500 });
  }
}
