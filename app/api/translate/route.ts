import { NextRequest, NextResponse } from "next/server";
import { localizeContent } from "@/lib/localize";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { headline, body } = (await req.json()) as { headline?: string; body?: string };
    if (typeof headline !== "string" || !headline.trim() || typeof body !== "string") {
      return NextResponse.json({ error: "headline과 body가 필요합니다." }, { status: 400 });
    }
    return NextResponse.json(await localizeContent(headline, body));
  } catch (err) {
    console.error("Gemini translate error", err);
    return NextResponse.json({ error: "번역 중 오류가 발생했습니다." }, { status: 500 });
  }
}
