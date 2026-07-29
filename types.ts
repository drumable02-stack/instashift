export interface AnalysisResult {
  layout: string;
  subject: string;
  style: string;
  colorPalette: string[];
  originalText: string;
  textTone: string;
  textPosition: string;
}

export interface TranslatedCopy {
  ko: string;
  ja: string;
  es: string;
  en: string;
}

export interface GenerateResult {
  newImageBase64: string;
  newTextKo: string;
  translations: TranslatedCopy;
}
