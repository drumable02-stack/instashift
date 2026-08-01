"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import type { AnalysisResult, ApiError, ContentHistoryItem, DailyNewsResult, LocalizedText, TranslatedContent } from "@/types";

type Step = "upload" | "analyzing" | "confirm" | "generating" | "result";
type Lang = keyof LocalizedText;

const LANG_LABELS: Record<Lang, string> = { ko: "한국어", ja: "日本語", es: "Español", en: "English" };
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const HISTORY_KEY = "instashift-content-history-v1";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as T | ApiError | null;
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
      ? data.error : "요청을 처리하지 못했습니다.";
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
  const [imagePromptEn, setImagePromptEn] = useState("");
  const [imagePromptKo, setImagePromptKo] = useState("");
  const [translations, setTranslations] = useState<TranslatedContent | null>(null);
  const [newsSource, setNewsSource] = useState<DailyNewsResult["source"] | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>("ko");
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resultChannelName, setResultChannelName] = useState("");
  const [usedNewsUrls, setUsedNewsUrls] = useState<string[]>([]);
  const [history, setHistory] = useState<ContentHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as unknown;
      if (Array.isArray(saved)) setHistory(saved as ContentHistoryItem[]);
    } catch { localStorage.removeItem(HISTORY_KEY); }
  }, []);

  function saveHistory(item: ContentHistoryItem) {
    setHistory((current) => {
      const next = [item, ...current].slice(0, 50);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }

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
    reader.onload = () => { setImageBase64(reader.result as string); setFileName(file.name); };
    reader.onerror = () => setError("이미지를 읽지 못했습니다. 다른 파일을 선택해주세요.");
    reader.readAsDataURL(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) { readFile(event.target.files?.[0]); }
  function handleDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); readFile(event.dataTransfer.files?.[0]); }

  async function handleAnalyze() {
    if (!imageBase64) return;
    setStep("analyzing"); setError(null); setNewsSource(null);
    try {
      setAnalysis(await postJson<AnalysisResult>("/api/analyze", { image: imageBase64 }));
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
      setStep("upload");
    }
  }

  async function handleDailyNews() {
    setStep("generating"); setError(null); setAnalysis(null); setImageBase64(null);
    try {
      const result = await postJson<DailyNewsResult>("/api/daily-news", { excludeUrls: usedNewsUrls });
      setImagePromptEn(result.imagePromptEn);
      setImagePromptKo(result.imagePromptKo);
      setTranslations(result.translations);
      setNewsSource(result.source);
      setResultChannelName("오늘의 세계 뉴스");
      setUsedNewsUrls((current) => current.includes(result.source.url) ? current : [...current, result.source.url]);
      saveHistory({
        id: crypto.randomUUID(), createdAt: new Date().toISOString(), channelName: "오늘의 세계 뉴스",
        imagePromptEn: result.imagePromptEn, imagePromptKo: result.imagePromptKo,
        translations: result.translations, source: result.source,
      });
      setActiveLang("ko");
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오늘의 뉴스를 불러오지 못했습니다.");
      setStep("upload");
    }
  }

  async function handleGenerate() {
    if (!analysis) return;
    setStep("generating"); setError(null);
    try {
      const [copy, promptResult] = await Promise.all([
        postJson<{ newText: string; newBodyText: string }>("/api/generate-copy", { analysis, userConcept }),
        postJson<{ imagePrompt: string }>("/api/generate-image", { analysis, userConcept }),
      ]);
      const localized = await postJson<TranslatedContent>("/api/translate", {
        headline: copy.newText,
        body: copy.newBodyText,
      });
      setImagePromptEn(promptResult.imagePrompt);
      setImagePromptKo("");
      setTranslations(localized);
      setResultChannelName(analysis.channelName);
      saveHistory({
        id: crypto.randomUUID(), createdAt: new Date().toISOString(), channelName: analysis.channelName,
        imagePromptEn: promptResult.imagePrompt, imagePromptKo: "", translations: localized, source: null,
      });
      setActiveLang("ko");
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 중 오류가 발생했습니다.");
      setStep("confirm");
    }
  }

  function handleReset() {
    setStep("upload"); setImageBase64(null); setFileName(""); setUserConcept("");
    setAnalysis(null); setImagePromptEn(""); setImagePromptKo(""); setTranslations(null); setNewsSource(null); setResultChannelName(""); setError(null); setCopiedKey(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleStartOver() {
    if (newsSource) { void handleDailyNews(); return; }
    handleReset();
  }

  function openHistoryItem(item: ContentHistoryItem) {
    setAnalysis(null); setImageBase64(null); setNewsSource(item.source); setResultChannelName(item.channelName);
    setImagePromptEn(item.imagePromptEn); setImagePromptKo(item.imagePromptKo);
    setTranslations(item.translations); setActiveLang("ko"); setHistoryOpen(false); setStep("result");
  }

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1600);
  }

  return (
    <main><div className="shell">
      <header className="brand"><div className="logo">IS</div><div><h1>InstaShift</h1><p>좋아하는 레퍼런스를, 나만의 콘텐츠로.</p></div><button className="history-button" onClick={() => setHistoryOpen(true)}>기록 보기 <span>{history.length}</span></button></header>
      <nav className="steps" aria-label="진행 단계">
        {[["1", "레퍼런스"], ["2", "분석 확인"], ["3", "새 콘텐츠"]].map(([number, label], index) => {
          const current = step === "upload" || step === "analyzing" ? 0 : step === "confirm" || step === "generating" ? 1 : 2;
          return <div className={`step ${index <= current ? "active" : ""}`} key={number}><span>{index < current ? "✓" : number}</span><strong>{label}</strong></div>;
        })}
      </nav>

      {error && <div className="alert" role="alert"><span>!</span><p>{error}</p><button onClick={() => setError(null)} aria-label="오류 닫기">×</button></div>}

      {step === "upload" && <>
        <button className="daily-news-banner" onClick={handleDailyNews}>
          <span className="news-icon">◎</span><span><strong>오늘의 세계 뉴스로 만들기</strong><small>이미지 없이 오늘 가장 흥미로운 글로벌 뉴스로 콘텐츠를 자동 생성해요</small></span><b>바로 만들기 →</b>
        </button>
        <section className="card upload-layout">
        <div><p className="eyebrow">STEP 01</p><h2>레퍼런스 이미지를 올려주세요</h2>
          <p className="description">게시물 캡처나 디자인 시안을 분석해 구도와 분위기, 헤드라인과 본문을 새 콘셉트로 재해석합니다.</p>
          <div className={`dropzone ${imageBase64 ? "has-image" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} hidden />
            {imageBase64 ? <><img src={imageBase64} alt="업로드 미리보기" /><div className="file-label"><strong>{fileName}</strong><span>클릭해서 변경</span></div></> : <><div className="upload-icon">↥</div><strong>이미지를 끌어다 놓거나 클릭하세요</strong><span>PNG, JPG, WEBP · 최대 20MB</span></>}
          </div>
        </div>
        <div className="concept-panel"><label htmlFor="concept">어떤 콘텐츠로 바꿀까요? <span>선택</span></label>
          <textarea id="concept" maxLength={300} placeholder="예: 커피 대신 여름 향수로 바꾸고, 시원한 휴양지 분위기로 만들어줘" value={userConcept} onChange={(event) => setUserConcept(event.target.value)} />
          <small>{userConcept.length}/300</small><button className="primary" disabled={!imageBase64} onClick={handleAnalyze}>레퍼런스 분석하기 <span>→</span></button><p className="privacy">업로드한 이미지는 콘텐츠 생성에만 사용됩니다.</p>
        </div>
        </section>
      </>}

      {step === "analyzing" && <Loading title="이미지를 읽고 있어요" detail="구도, 계정명, 헤드라인과 본문을 분리해 분석하는 중입니다." />}

      {step === "confirm" && analysis && <section className="card">
        <div className="section-heading"><div><p className="eyebrow">STEP 02</p><h2>분석한 내용을 확인해주세요</h2></div><button className="ghost" onClick={() => setStep("upload")}>← 이미지 변경</button></div>
        <div className="analysis-layout">
          <div className="reference"><img src={imageBase64!} alt="분석할 원본" /></div>
          <div className="analysis-grid">
            <Info label="레이아웃" value={analysis.layout} /><Info label="주요 피사체" value={analysis.subject} /><Info label="비주얼 스타일" value={analysis.style} /><Info label="텍스트 톤" value={analysis.textTone} /><Info label="텍스트 위치" value={analysis.textPosition} />
            <div className="info"><span>대표 색상</span><div className="palette">{analysis.colorPalette.map((color) => <i key={color} style={{ background: color }} title={color} />)}</div></div>
            <div className="info wide editable-info"><label htmlFor="channelName">채널명</label><input id="channelName" value={analysis.channelName} placeholder="@계정명 또는 채널명" onChange={(event) => setAnalysis({ ...analysis, channelName: event.target.value })} /></div>
            <Info label="원본 헤드라인" value={analysis.originalText || "헤드라인을 찾지 못했어요."} wide />
            <Info label="원본 본문" value={analysis.bodyText || "본문을 찾지 못했어요."} wide />
          </div>
        </div>
        {userConcept && <div className="concept-summary"><span>새 콘셉트</span><p>{userConcept}</p></div>}
        <div className="actions"><button className="secondary" onClick={() => setStep("upload")}>수정하기</button><button className="primary" onClick={handleGenerate}>이대로 새 콘텐츠 만들기 <span>→</span></button></div>
      </section>}

      {step === "generating" && <Loading title="새 콘텐츠를 만들고 있어요" detail="이미지 프롬프트와 헤드라인·본문을 만들고 4개 언어로 옮기는 중입니다." />}

      {step === "result" && translations && <section className="card">
        <div className="section-heading"><div><p className="eyebrow">STEP 03</p><h2>새 콘텐츠가 완성됐어요</h2></div><button className="ghost" onClick={handleStartOver}>{newsSource ? "다른 뉴스로 다시 만들기" : "처음부터 다시"}</button></div>
        <div className="result-layout">
          <div className="result-visual-column">
            {imageBase64 ? <figure><figcaption>원본 레퍼런스</figcaption><img src={imageBase64} alt="원본 레퍼런스" /></figure> : newsSource && <div className="news-source-card"><span>TODAY&apos;S PICK · {newsSource.category}</span><h3>{newsSource.title}</h3><a href={newsSource.url} target="_blank" rel="noreferrer">원문 기사 보기 ↗</a></div>}
            <PromptBlock eyebrow="ENGLISH PROMPT" title="영어 프롬프트" value={imagePromptEn} copied={copiedKey === "prompt-en"} onCopy={() => copyText("prompt-en", imagePromptEn)} note="프롬프트 내 [채널명 입력] 부분을 실제 채널명으로 바꿔서 사용하세요" />
            {imagePromptKo && <PromptBlock eyebrow="KOREAN TRANSLATION" title="한글 번역" value={imagePromptKo} copied={copiedKey === "prompt-ko"} onCopy={() => copyText("prompt-ko", imagePromptKo)} />}
          </div>
          <div className="copy-panel"><h3>로컬라이즈된 콘텐츠</h3>
            {resultChannelName && <p className="channel-badge">{resultChannelName}</p>}
            <div className="tabs" role="tablist">{(Object.keys(LANG_LABELS) as Lang[]).map((lang) => <button role="tab" aria-selected={activeLang === lang} className={activeLang === lang ? "active" : ""} key={lang} onClick={() => setActiveLang(lang)}>{LANG_LABELS[lang]}</button>)}</div>
            <ResultText title="헤드라인" value={translations.headline[activeLang]} buttonLabel="헤드라인 복사" copied={copiedKey === `headline-${activeLang}`} onCopy={() => copyText(`headline-${activeLang}`, translations.headline[activeLang])} />
            <ResultText title="본문" value={translations.body[activeLang]} buttonLabel="본문 복사" copied={copiedKey === `body-${activeLang}`} onCopy={() => copyText(`body-${activeLang}`, translations.body[activeLang])} body />
            <p className="tip">채널의 톤과 언어권별 SNS 문체에 맞게 현지화했어요.</p>
          </div>
        </div>
      </section>}
      {historyOpen && <div className="history-backdrop" onClick={() => setHistoryOpen(false)}>
        <aside className="history-drawer" onClick={(event) => event.stopPropagation()}>
          <div className="history-heading"><div><p className="eyebrow">LOCAL HISTORY</p><h2>생성 기록</h2></div><button onClick={() => setHistoryOpen(false)} aria-label="기록 닫기">×</button></div>
          <p className="history-notice">이 기록은 현재 컴퓨터의 이 브라우저에만 저장됩니다.</p>
          <div className="history-list">
            {history.length ? history.map((item) => <button className="history-item" key={item.id} onClick={() => openHistoryItem(item)}>
              <span>{item.source ? `${item.source.category} NEWS` : "REFERENCE"} · {new Date(item.createdAt).toLocaleString("ko-KR")}</span>
              <strong>{item.translations.headline.ko}</strong>
              <small>{item.source?.title || item.channelName || "저장된 콘텐츠"}</small>
            </button>) : <div className="history-empty">아직 저장된 콘텐츠가 없습니다.</div>}
          </div>
        </aside>
      </div>}
    </div></main>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`info ${wide ? "wide" : ""}`}><span>{label}</span><p>{value}</p></div>;
}
function ResultText({ title, value, buttonLabel, copied, onCopy, body = false }: { title: string; value: string; buttonLabel: string; copied: boolean; onCopy: () => void; body?: boolean }) {
  return <div className={`copy-box result-copy-box ${body ? "body-copy" : ""}`}><span>{title}</span><p>{value || "내용이 없습니다."}</p><button onClick={onCopy}>{copied ? "복사했어요 ✓" : buttonLabel}</button></div>;
}
function PromptBlock({ eyebrow, title, value, copied, onCopy, note }: { eyebrow: string; title: string; value: string; copied: boolean; onCopy: () => void; note?: string }) {
  return <div className="image-prompt-panel"><div className="panel-title"><div><span>{eyebrow}</span><h3>{title}</h3></div><button onClick={onCopy}>{copied ? "복사했어요 ✓" : "복사"}</button></div><pre>{value}</pre>{note && <p className="prompt-note">{note}</p>}</div>;
}
function Loading({ title, detail }: { title: string; detail: string }) {
  return <section className="card loading" aria-live="polite"><div className="loader"><i /><i /><i /></div><h2>{title}</h2><p>{detail}</p><div className="progress"><span /></div><small>잠시만 기다려주세요. 보통 1분 안에 완료됩니다.</small></section>;
}
