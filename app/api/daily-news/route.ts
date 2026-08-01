import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { getGemini } from "@/lib/gemini";
import { localizeContent } from "@/lib/localize";
import { DAILY_NEWS_SYSTEM_PROMPT } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const GEMINI_NEWS_MODEL = process.env.GEMINI_NEWS_MODEL ?? "gemini-3.6-flash";
const REQUIRED_IMAGE_DIRECTION_EN = `

MANDATORY INSTAGRAM FORMAT
- 4:5 vertical aspect ratio (standard Instagram feed ratio).
- A simple composition centered on one dominant subject, presented as one natural-looking photograph or one cohesive illustration with generous negative space.
- No infographic, text labels, arrows, callout boxes, charts, diagrams, multi-panel layouts, collages, or explanatory UI elements.
- Reserve a visually quiet, slightly darkened or softly blurred area near the lower-left for a later bold, large white headline. Do not render the headline itself.
- Reserve a small area near the upper-left or lower edge for a circular profile icon and the account-name placeholder [채널명 입력]. The user must replace this placeholder before using the prompt. Do not render a real account name.
`.trim();
const REQUIRED_IMAGE_DIRECTION_KO = `

필수 인스타그램 형식
- 4:5 세로 비율(인스타그램 피드 표준 비율).
- 단일 피사체 중심의 심플한 구도, 넉넉한 여백, 사진처럼 자연스러운 한 장의 이미지 또는 응집된 일러스트.
- 텍스트 라벨, 화살표, 설명 박스, 차트, 다이어그램, 다중 패널, 콜라주 등 인포그래픽 요소 금지.
- 나중에 굵고 큰 흰색 헤드라인을 얹을 수 있도록 하단 좌측에 비어 있고 약간 어둡거나 부드럽게 블러 처리된 영역 확보. 실제 헤드라인은 렌더링하지 않음.
- 좌측 상단 또는 하단 가장자리에 작은 원형 프로필 아이콘과 계정명 자리 [채널명 입력] 확보. 사용 전 실제 채널명으로 교체하며 이미지에는 실제 계정명을 렌더링하지 않음.
`.trim();

const FEEDS = [
  ["World", "https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko"],
  ["Science", "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=ko&gl=KR&ceid=KR:ko"],
  ["Technology", "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko"],
  ["Health", "https://news.google.com/rss/headlines/section/topic/HEALTH?hl=ko&gl=KR&ceid=KR:ko"],
  ["Business", "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko"],
] as const;

type NewsItem = { category: string; title: string; summary: string; url: string; publishedAt: string };
const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

function stripHtml(value: unknown, maxLength = 500) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

async function fetchFeed(category: string, url: string): Promise<NewsItem[]> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`${category} RSS 요청 실패: ${response.status}`);
  const xml = await response.text();
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  return items.slice(0, 10).map((item: Record<string, unknown>) => ({
    category,
    title: stripHtml(item.title, 180),
    summary: stripHtml(item.description, 360),
    url: String(item.link ?? ""),
    publishedAt: String(item.pubDate ?? ""),
  })).filter((item: NewsItem) => item.title && item.url);
}

const selectionSchema = {
  type: "object",
  properties: {
    selectedIndex: { type: "integer", minimum: 0, maximum: 49 },
    headline: { type: "string" }, body: { type: "string" },
    imagePromptEn: { type: "string" }, imagePromptKo: { type: "string" },
  },
  required: ["selectedIndex", "headline", "body", "imagePromptEn", "imagePromptKo"],
  additionalProperties: false,
};

export async function POST(req: NextRequest) {
  try {
    const requestBody = (await req.json().catch(() => ({}))) as { excludeUrls?: unknown };
    const excludeUrls = Array.isArray(requestBody.excludeUrls)
      ? requestBody.excludeUrls.filter((url): url is string => typeof url === "string").slice(0, 50)
      : [];
    const settled = await Promise.allSettled(FEEDS.map(([category, url]) => fetchFeed(category, url)));
    const items = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (!items.length) throw new Error("뉴스 RSS에서 항목을 가져오지 못했습니다.");
    const availableItems = items.filter((item) => !excludeUrls.includes(item.url));
    if (!availableItems.length) throw new Error("아직 사용하지 않은 뉴스가 없습니다.");

    const response = await getGemini().models.generateContent({
      model: GEMINI_NEWS_MODEL,
      contents: JSON.stringify({
        excludedArticleUrls: excludeUrls,
        instruction: "excludedArticleUrls에 포함된 기사는 절대 선택하지 마.",
        candidates: availableItems.map((item, index) => ({ index, category: item.category, title: item.title, summary: item.summary, url: item.url })),
      }),
      config: {
        systemInstruction: DAILY_NEWS_SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 4000,
        responseMimeType: "application/json",
        responseJsonSchema: selectionSchema,
      },
    });
    if (!response.text) throw new Error("뉴스 선정 결과가 비어 있습니다.");
    const selected = JSON.parse(response.text) as Record<string, unknown>;
    for (const key of ["headline", "body", "imagePromptEn", "imagePromptKo"]) {
      if (typeof selected[key] !== "string" || !selected[key]) throw new Error("뉴스 선정 결과 형식이 올바르지 않습니다.");
    }
    const selectedIndex = selected.selectedIndex;
    if (typeof selectedIndex !== "number" || !Number.isInteger(selectedIndex) || !availableItems[selectedIndex]) {
      throw new Error("선정된 뉴스의 원본 항목을 확인할 수 없습니다.");
    }
    const source = availableItems[selectedIndex];
    const translations = await localizeContent(selected.headline as string, selected.body as string, GEMINI_NEWS_MODEL);
    return NextResponse.json({
      imagePromptEn: `${selected.imagePromptEn}\n\n${REQUIRED_IMAGE_DIRECTION_EN}`,
      imagePromptKo: `${selected.imagePromptKo}\n\n${REQUIRED_IMAGE_DIRECTION_KO}`,
      translations,
      source: { title: source.title, url: source.url, category: source.category },
    });
  } catch (err) {
    console.error("Daily news error", err);
    const detail = err instanceof Error ? err.message : String(err);
    const isQuotaError = detail.includes("429") || detail.includes("RESOURCE_EXHAUSTED");
    const isRssError = detail.includes("RSS") || detail.includes("뉴스 RSS");
    return NextResponse.json(
      {
        error: isQuotaError
          ? "Gemini 뉴스 생성 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요."
          : isRssError
            ? "Google 뉴스 피드를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
            : "오늘의 뉴스를 구성하지 못했습니다. 다시 시도해주세요.",
        ...(process.env.NODE_ENV === "development" && { detail }),
      },
      { status: isQuotaError ? 429 : isRssError ? 502 : 500 }
    );
  }
}
