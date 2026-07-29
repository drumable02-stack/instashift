import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { GENERATE_IMAGE_PROMPT_TEMPLATE } from "@/lib/prompts";
import type { AnalysisResult } from "@/types";
import { toFile } from "openai/uploads";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const { originalImageBase64, analysis, userConcept } = (await req.json()) as {
      originalImageBase64: string;
      analysis: AnalysisResult;
      userConcept?: string;
    };

    if (
      typeof originalImageBase64 !== "string" ||
      !/^data:image\/(png|jpe?g|webp);base64,/i.test(originalImageBase64) ||
      !analysis
    ) {
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

    const match = originalImageBase64.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
    if (!match) {
      return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400 });
    }
    const imageBuffer = Buffer.from(match[2], "base64");
    if (!imageBuffer.length || imageBuffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "이미지는 20MB 이하여야 합니다." }, { status: 400 });
    }
    const extension = match[1].includes("jpeg") || match[1].includes("jpg") ? "jpg" : match[1].split("/")[1];
    const imageFile = await toFile(imageBuffer, `original.${extension}`, { type: match[1] });
    const response = await getOpenAI().images.edit({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
      image: imageFile,
      prompt,
      size: "1024x1024",
      quality: "medium",
    });
    const newImageBase64 = response.data?.[0]?.b64_json;
    if (!newImageBase64) throw new Error("생성된 이미지가 비어 있습니다.");

    return NextResponse.json({ newImageBase64 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "이미지 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
