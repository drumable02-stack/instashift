# InstaShift

인스타그램 레퍼런스 이미지 또는 오늘의 세계 뉴스를 바탕으로 헤드라인, 본문 캡션, 이미지 생성 프롬프트와 다국어 번역을 만드는 Next.js 애플리케이션입니다.

## 로컬 실행

```bash
pnpm install
cp .env.example .env.local
pnpm run dev
```

Windows PowerShell에서는 `.env.example`을 `.env.local`로 복사한 뒤 값을 입력하세요.

```powershell
Copy-Item .env.example .env.local
pnpm run dev
```

## 환경변수

`.env.local`에 다음 값을 설정합니다.

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
GEMINI_NEWS_MODEL=gemini-3.6-flash
```

- `GEMINI_API_KEY`는 이미지 분석, 카피 생성, 번역, 오늘의 뉴스 생성에 필요합니다.
- 모델 변수는 선택 사항이며, 설정하지 않으면 애플리케이션의 기본 모델을 사용합니다.
- 실제 API 키가 포함된 `.env.local`은 Git에 커밋하지 마세요.

## 주요 기능

- 레퍼런스 이미지의 레이아웃, 피사체, 스타일, 색상, 채널명과 텍스트 분석
- 새로운 콘셉트에 맞춘 헤드라인과 긴 본문 캡션 생성
- 한국어, 일본어, 스페인어, 영어 번역
- 4:5 인스타그램 이미지 생성용 영문·한글 프롬프트 제공
- Google 뉴스 RSS와 Gemini를 활용한 오늘의 세계 뉴스 콘텐츠 생성
- 브라우저 localStorage 기반 생성 기록 저장

## 배포 방법

1. GitHub 저장소를 Vercel의 **Add New Project**에서 가져옵니다.
2. Framework Preset은 `Next.js`를 선택하고 Build Command는 기본값인 `pnpm run build`를 사용합니다.
3. Vercel 프로젝트의 **Settings → Environment Variables**에서 로컬 `.env.local`과 같은 환경변수를 등록합니다.
4. 최소한 `GEMINI_API_KEY`를 Production, Preview, Development 환경에 등록하세요. 필요하면 `GEMINI_MODEL`, `GEMINI_NEWS_MODEL`도 동일하게 등록합니다.
5. 저장 후 배포를 실행합니다. 환경변수를 새로 추가하거나 변경했다면 기존 배포를 Redeploy해야 반영됩니다.

환경변수가 없어도 프로젝트 빌드는 완료되지만, 배포된 앱에서 Gemini를 호출하는 기능은 `GEMINI_API_KEY`가 없으면 오류를 반환합니다. 키는 클라이언트 코드에 넣지 말고 반드시 Vercel 환경변수로 관리하세요.

## 프로젝트 구조

```text
app/
  page.tsx
  api/
    analyze/route.ts
    generate-copy/route.ts
    generate-image/route.ts
    translate/route.ts
    daily-news/route.ts
lib/
  gemini.ts
  localize.ts
  prompts.ts
types.ts
```
