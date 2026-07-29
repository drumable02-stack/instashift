# InstaShift Starter (프로토타입 스켈레톤)

이 프로젝트는 `InstaShift_기획서(PRD).md`를 기반으로 한 Next.js 스타터 코드입니다.
개발 담당(ChatGPT)은 이 스켈레톤을 기반으로 기능을 완성해주세요.

## 실행 방법

```bash
npm install
cp .env.example .env.local   # 그리고 OPENAI_API_KEY 값 입력
npm run dev
```

## 폴더 구조

```
app/
  page.tsx              # 메인 UI (업로드 → 분석확인 → 결과 3단계)
  layout.tsx
  globals.css
  api/
    analyze/route.ts        # Vision 분석 API
    generate-copy/route.ts  # 카피 생성 API
    generate-image/route.ts # 이미지 재생성 API
    translate/route.ts      # 4개국어 번역 API
lib/
  openai.ts              # OpenAI 클라이언트 초기화
  prompts.ts              # 프롬프트 템플릿 (기획서 7번 섹션 참고해서 다듬기)
types.ts                  # 공용 타입 정의
```

## TODO (완성해야 할 부분)

- [ ] `app/api/analyze/route.ts` — GPT-4o vision 호출 로직 완성
- [ ] `app/api/generate-copy/route.ts` — 카피 생성 로직 완성
- [ ] `app/api/generate-image/route.ts` — gpt-image-1 edit 호출 로직 완성
- [ ] `app/api/translate/route.ts` — 4개국어 번역 로직 완성
- [ ] `app/page.tsx` — 3단계 UI 완성 (현재는 기본 골격만 있음)
- [ ] 로딩/에러 상태 UI 보강
- [ ] (선택) 텍스트를 이미지에 합성하는 기능은 v0.2 범위이므로 필요시에만

각 파일 안에 `// TODO:` 주석으로 구현 지점을 표시해두었습니다.
프롬프트는 기획서의 "7. 프롬프트 설계 가이드" 섹션을 반드시 참고해서 작성해주세요.
