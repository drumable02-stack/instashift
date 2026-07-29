import OpenAI from "openai";

let client: OpenAI | undefined;

// 빌드 시점에는 키를 요구하지 않고, 실제 API 요청 시에만 초기화합니다.
export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}
