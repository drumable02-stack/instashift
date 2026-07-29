"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import type { AnalysisResult, ApiError, TranslatedCopy } from "@/types";

type Step = "upload" | "analyzing" | "confirm" | "generating" | "result";
type Lang = keyof TranslatedCopy;

const LANG_LABELS: Record<Lang, string> = {
  ko: "한국어",
  ja: "日本語",
  es: "Español",
  en: "English",
};

const MAX_FILE_BYTES = 20 * 1024 * 1024;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as T | ApiError | null;
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "요청을 처리하지 못했습니다.";
    throw new Error(message);
  }
  return data as T;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [userConcept, setUserConcept] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslatedCopy | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>("ko");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const busy = step === "analyzing" || step === "generating";

  function readFile(file?: File) {
    if (!file) return;
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("PNG, JPG, WEBP 이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("이미지는 20MB 이하여야 합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setFileName(file.name);
    };
    reader.onerror = () => setError("이미지를 읽지 못했습니다. 다른 파일을 선택해주세요.");
    reader.readAsDataURL(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    readFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    readFile(event.dataTransfer.files?.[0]);
  }

  async function handleAnalyze() {
    if (!imageBase64) return;
    setStep("analyzing");
    setError(null);
    try {
      const result = await postJson<AnalysisResult>("/api/analyze", { image: imageBase64 });
      setAnalysis(result);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
      setStep("upload");
    }
  }

  async function handleGenerate() {
    if (!analysis || !imageBase64) return;
    setStep("generating");
    setError(null);
    try {
      const [{ newText }, { newImageBase64 }] = await Promise.all([
        postJson<{ newText: string }>("/api/generate-copy", { analysis, userConcept }),
        postJson<{ newImageBase64: string }>("/api/generate-image", {
          originalImageBase64: imageBase64,
          analysis,
          userConcept,
        }),
      ]);
      const localized = await postJson<TranslatedCopy>("/api/translate", { text: newText });
      setNewImage(newImageBase64);
      setTranslations(localized);
      setActiveLang("ko");
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 중 오류가 발생했습니다.");
      setStep("confirm");
    }
  }

  function handleReset() {
    setStep("upload");
    setImageBase64(null);
    setFileName("");
    setUserConcept("");
    setAnalysis(null);
    setNewImage(null);
    setTranslations(null);
    setError(null);
    setCopied(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleCopy() {
    if (!translations) return;
    await navigator.clipboard.writeText(translations[activeLang]);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadImage() {
    if (!newImage) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${newImage}`;
    link.download = "instashift-result.png";
    link.click();
  }

  return (
    <main>
      <div className="shell">
        <header className="brand">
          <div className="logo">IS</div>
          <div>
            <h1>InstaShift</h1>
            <p>좋아하는 레퍼런스를, 나만의 콘텐츠로.</p>
          </div>
        </header>

        <nav className="steps" aria-label="진행 단계">
          {[
            ["1", "레퍼런스"],
            ["2", "분석 확인"],
            ["3", "새 콘텐츠"],
          ].map(([number, label], index) => {
            const current = step === "upload" || step === "analyzing" ? 0 : step === "confirm" || step === "generating" ? 1 : 2;
            return (
              <div className={`step ${index <= current ? "active" : ""}`} key={number}>
                <span>{index < current ? "✓" : number}</span>
                <strong>{label}</strong>
              </div>
            );
          })}
        </nav>

        {error && (
          <div className="alert" role="alert">
            <span>!</span>
            <p>{error}</p>
            <button onClick={() => setError(null)} aria-label="오류 닫기">×</button>
          </div>
        )}

        {step === "upload" && (
          <section className="card upload-layout">
            <div>
              <p className="eyebrow">STEP 01</p>
              <h2>레퍼런스 이미지를 올려주세요</h2>
              <p className="description">게시물 캡처나 디자인 시안을 분석해 구도와 분위기는 살리고, 새로운 콘셉트로 재해석합니다.</p>
              <div
                className={`dropzone ${imageBase64 ? "has-image" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
                }}
              >
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} hidden />
                {imageBase64 ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageBase64} alt="업로드 미리보기" />
                    <div className="file-label"><strong>{fileName}</strong><span>클릭해서 변경</span></div>
                  </>
                ) : (
                  <>
                    <div className="upload-icon">↥</div>
                    <strong>이미지를 끌어다 놓거나 클릭하세요</strong>
                    <span>PNG, JPG, WEBP · 최대 20MB</span>
                  </>
                )}
              </div>
            </div>
            <div className="concept-panel">
              <label htmlFor="concept">어떤 콘텐츠로 바꿀까요? <span>선택</span></label>
              <textarea
                id="concept"
                maxLength={300}
                placeholder="예: 커피 대신 여름 향수로 바꾸고, 시원한 휴양지 분위기로 만들어줘"
                value={userConcept}
                onChange={(event) => setUserConcept(event.target.value)}
              />
              <small>{userConcept.length}/300</small>
              <button className="primary" disabled={!imageBase64} onClick={handleAnalyze}>레퍼런스 분석하기 <span>→</span></button>
              <p className="privacy">업로드한 이미지는 콘텐츠 생성에만 사용됩니다.</p>
            </div>
          </section>
        )}

        {step === "analyzing" && <Loading title="이미지를 읽고 있어요" detail="구도, 피사체, 색감과 카피의 톤을 분석하는 중입니다." />}

        {step === "confirm" && analysis && (
          <section className="card">
            <div className="section-heading">
              <div><p className="eyebrow">STEP 02</p><h2>분석한 내용을 확인해주세요</h2></div>
              <button className="ghost" onClick={() => setStep("upload")}>← 이미지 변경</button>
            </div>
            <div className="analysis-layout">
              <div className="reference">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageBase64!} alt="분석할 원본" />
              </div>
              <div className="analysis-grid">
                <Info label="레이아웃" value={analysis.layout} />
                <Info label="주요 피사체" value={analysis.subject} />
                <Info label="비주얼 스타일" value={analysis.style} />
                <Info label="텍스트 톤" value={analysis.textTone} />
                <Info label="텍스트 위치" value={analysis.textPosition} />
                <div className="info"><span>대표 색상</span><div className="palette">{analysis.colorPalette.map((color) => <i key={color} style={{ background: color }} title={color} />)}</div></div>
                <Info label="원본 카피" value={analysis.originalText || "이미지에서 텍스트를 찾지 못했어요."} wide />
              </div>
            </div>
            {userConcept && <div className="concept-summary"><span>새 콘셉트</span><p>{userConcept}</p></div>}
            <div className="actions">
              <button className="secondary" onClick={() => setStep("upload")}>수정하기</button>
              <button className="primary" onClick={handleGenerate}>이대로 새 콘텐츠 만들기 <span>→</span></button>
            </div>
          </section>
        )}

        {step === "generating" && <Loading title="새 콘텐츠를 만들고 있어요" detail="이미지와 카피를 생성하고 4개 언어로 자연스럽게 옮기는 중입니다." />}

        {step === "result" && translations && (
          <section className="card">
            <div className="section-heading">
              <div><p className="eyebrow">STEP 03</p><h2>새 콘텐츠가 완성됐어요</h2></div>
              <button className="ghost" onClick={handleReset}>처음부터 다시</button>
            </div>
            <div className="result-layout">
              <div className="comparison">
                <figure>
                  <figcaption>원본 레퍼런스</figcaption>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageBase64!} alt="원본 레퍼런스" />
                </figure>
                <figure className="generated">
                  <figcaption>InstaShift 결과 <span>NEW</span></figcaption>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/png;base64,${newImage}`} alt="생성된 새 콘텐츠" />
                  <button onClick={downloadImage}>이미지 다운로드 ↓</button>
                </figure>
              </div>
              <div className="copy-panel">
                <h3>로컬라이즈된 카피</h3>
                <div className="tabs" role="tablist">
                  {(Object.keys(LANG_LABELS) as Lang[]).map((lang) => (
                    <button role="tab" aria-selected={activeLang === lang} className={activeLang === lang ? "active" : ""} key={lang} onClick={() => setActiveLang(lang)}>
                      {LANG_LABELS[lang]}
                    </button>
                  ))}
                </div>
                <div className="copy-box"><p>{translations[activeLang]}</p><button onClick={handleCopy}>{copied ? "복사했어요 ✓" : "카피 복사"}</button></div>
                <p className="tip">언어권별 SNS 문체와 뉘앙스에 맞게 번역했어요.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`info ${wide ? "wide" : ""}`}><span>{label}</span><p>{value}</p></div>;
}

function Loading({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="card loading" aria-live="polite">
      <div className="loader"><i /><i /><i /></div>
      <h2>{title}</h2>
      <p>{detail}</p>
      <div className="progress"><span /></div>
      <small>잠시만 기다려주세요. 보통 1분 안에 완료됩니다.</small>
    </section>
  );
}
