import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { GENERATE_IMAGE_PROMPT_TEMPLATE } from "@/lib/prompts";
import type { AnalysisResult } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { originalImageBase64, analysis, userConcept } = (await req.json()) as {
      originalImageBase64: string;
      analysis: AnalysisResult;
      userConcept?: string;
    };

    if (!originalImageBase64 || !analysis) {
      return NextResponse.json(
        { error: "originalImageBase64, analysis가 필요합니다." },
        { status: 400 }
      );
    }

    const prompt = GENERATE_IMAGE_PROMPT_TEMPLATE(
      analysis.subject,
      analysis.style,
      analysis.layout,
      userConcept ?? "원본과 유사한 컨셉으로 자유롭게 교체"
    );

    // TODO: gpt-image-1 edit 엔드포인트 호출로 교체
    // 참고: images.edit는 File 형태의 이미지가 필요하므로
    // base64 → Buffer → File(Blob) 변환 로직이 필요합니다.
    //
    // const imageBuffer = Buffer.from(
    //   originalImageBase64.replace(/^data:image\/\w+;base64,/, ""),
    //   "base64"
    // );
    // const imageFile = await toFile(imageBuffer, "original.png", { type: "image/png" });
    //
    // const response = await openai.images.edit({
    //   model: "gpt-image-1",
    //   image: imageFile,
    //   prompt,
    // });
    // const newImageBase64 = response.data[0].b64_json;

    const newImageBase64 = ""; // TODO

    return NextResponse.json({ newImageBase64 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "이미지 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
