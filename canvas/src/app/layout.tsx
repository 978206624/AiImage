import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/layout/client-providers";

export const metadata: Metadata = {
  title: "CANVAS — AI 图像画廊",
  description: "AI 图像生成与展示平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
