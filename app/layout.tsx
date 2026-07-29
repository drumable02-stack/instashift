import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "InstaShift",
  description: "인스타 콘텐츠를 새로운 컨셉으로 재생성하는 프로토타입",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
