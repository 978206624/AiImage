import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClientProviders } from "@/components/layout/client-providers";

const fontDisplay = localFont({
  src: "../../public/fonts/CrimsonPro-wght.ttf",
  weight: "200 900",
  variable: "--font-display",
  display: "swap",
});

const fontMono = localFont({
  src: "../../public/fonts/JetBrainsMono-wght.ttf",
  weight: "100 800",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mira 拟境 — AI 图像画廊",
  description: "Mira（拟境）AI 图像生成与展示平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${fontDisplay.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
