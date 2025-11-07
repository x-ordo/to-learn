import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ToLearn | Personalized Finance Learning',
  description:
    'ToLearn is a finance education companion delivering adaptive practice through an AI tutor.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg'
  }
};

// Next.js App Router의 전역 레이아웃. 모든 페이지에 공통 메타/스타일을 적용합니다.
export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
