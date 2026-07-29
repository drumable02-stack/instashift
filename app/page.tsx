"use client";

import { useState } from "react";
import type { AnalysisResult, TranslatedCopy } from "@/types";

type Step = "upload" | "analyzing" | "confirm" | "generating" | "result";
type Lang = "ko" | "ja" | "es" | "en";

const LANG_LABELS: Record<Lang, string> = {
  ko: "한국어",
  ja: "日本語",
  es: "Español",
  en: "English",
};

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [userConcept, setUserConcept] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslatedCopy | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>("ko");
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imageBase64) return;
    setStep("analyzing");
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64 }),
      });
      if (!res.ok) throw new Error("분석 실패");
      const data: AnalysisResult = await res.json();
      setAnalysis(data);
      setStep("confirm");
    } catch (err) {
      console.error(err);
      setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setStep("upload");
    }
  }

  async function handleGenerate() {
    if (!analysis || !imageBase64) return;
    setStep("generating");
    setError(null);
    try {
      // 1) 카피 생성
      const copyRes = await fetch("/api/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, userConcept }),
      });
      const { newText } = await copyRes.json();

      // 2) 이미지 생성
      const imageRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalImageBase64: imageBase64,
          analysis,
          userConcept,
        }),
      });
      const { newImageBase64 } = await imageRes.json();

      // 3) 번역
      const translateRes = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText }),
      });
      const translationData: TranslatedCopy = await translateRes.json();

      setNewImage(newImageBase64);
      setTranslations(translationData);
      setStep("result");
    } catch (err) {
      console.error(err);
      setError("생성 중 오류가 발생했습니다. 다시 시도해주세요.");
      setStep("confirm");
    }
  }

  function handleReset() {
    setStep("upload");
    setImageBase64(null);
    setUserConcept("");
    setAnalysis(null);
    setNewImage(null);
    setTranslations(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-2xl font-bold">InstaShift</h1>
        <p className="mb-8 text-neutral-500">
          인스타 캡쳐본을 올리면 동일한 컨셉으로 새 콘텐츠를 만들어드려요.
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* STEP 1: 업로드 */}
        {step === "upload" && (
          <div className="space-y-4">
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {imageBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageBase64} alt="업로드 미리보기" className="max-w-xs rounded-lg border" />
            )}
            <textarea
              className="w-full rounded-lg border p-3 text-sm"
              placeholder="교체할 컨셉을 입력해주세요 (선택). 예: 상품을 화장품으로 바꿔주세요"
              value={userConcept}
              onChange={(e) => setUserConcept(e.target.value)}
            />
            <button
              disabled={!imageBase64}
              onClick={handleAnalyze}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              분석 시작
            </button>
          </div>
        )}

        {step === "analyzing" && <p>이미지를 분석하고 있어요...</p>}

        {/* STEP 2: 분석 결과 확인 */}
        {step === "confirm" && analysis && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-white p-4 text-sm">
              <p><b>레이아웃</b>: {analysis.layout}</p>
              <p><b>피사체</b>: {analysis.subject}</p>
              <p><b>스타일</b>: {analysis.style}</p>
              <p><b>원본 텍스트</b>: {analysis.originalText}</p>
              <p><b>톤</b>: {analysis.textTone}</p>
            </div>
            <button
              onClick={handleGenerate}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white"
            >
              이대로 재생성하기
            </button>
          </div>
        )}

        {step === "generating" && <p>새 콘텐츠를 생성하고 있어요...</p>}

        {/* STEP 3: 결과 */}
        {step === "result" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-sm text-neutral-500">원본</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imageBase64 && <img src={imageBase64} alt="원본" className="rounded-lg border" />}
              </div>
              <div>
                <p className="mb-2 text-sm text-neutral-500">새 콘텐츠</p>
                {newImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${newImage}`}
                    alt="생성된 이미지"
                    className="rounded-lg border"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg border text-sm text-neutral-400">
                    이미지 생성 로직 TODO
                  </div>
                )}
              </div>
            </div>

            {translations && (
              <div>
                <div className="mb-2 flex gap-2">
                  {(Object.keys(LANG_LABELS) as Lang[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`rounded-full px-3 py-1 text-xs ${
                        activeLang === lang ? "bg-black text-white" : "bg-neutral-200"
                      }`}
                    >
                      {LANG_LABELS[lang]}
                    </button>
                  ))}
                </div>
                <div className="rounded-lg border bg-white p-4 text-sm">
                  {translations[activeLang]}
                </div>
              </div>
            )}

            <button
              onClick={handleReset}
              className="rounded-lg border px-5 py-2.5 text-sm font-medium"
            >
              처음부터 다시
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
