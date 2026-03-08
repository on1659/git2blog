import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "git2blog",
  description: "GitHub 커밋을 블로그 글로 변환하고 멀티플랫폼에 발행합니다",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Navbar />
        <main className="mx-auto px-6 py-12 lg:px-16" style={{ maxWidth: 1100 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
