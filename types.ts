export interface AnalysisResult {
  layout: string;
  subject: string;
  style: string;
  colorPalette: string[];
  channelName: string;
  originalText: string;
  bodyText: string;
  textTone: string;
  textPosition: string;
}

export interface LocalizedText {
  ko: string;
  ja: string;
  es: string;
  en: string;
}

export interface TranslatedContent {
  headline: LocalizedText;
  body: LocalizedText;
}

export interface GenerateResult {
  imagePrompt: string;
  newText: string;
  newBodyText: string;
  translations: TranslatedContent;
}

export interface DailyNewsResult {
  imagePromptEn: string;
  imagePromptKo: string;
  translations: TranslatedContent;
  source: {
    title: string;
    url: string;
    category: string;
  };
}

export interface ContentHistoryItem {
  id: string;
  createdAt: string;
  channelName: string;
  imagePromptEn: string;
  imagePromptKo: string;
  translations: TranslatedContent;
  source: DailyNewsResult["source"] | null;
}

export type ApiError = {
  error: string;
};
