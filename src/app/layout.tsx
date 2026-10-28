import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";
import { InscriptionFont } from "@/components/InscriptionFont";
import { THEME_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "包装视觉顾问 Packaging Advisor",
  description: "上传产品照片，得到三个可交给设计师的包装方向。 Upload a product photo and get three packaging directions.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F1EA" },
    { media: "(prefers-color-scheme: dark)", color: "#141513" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by the script before paint, so React must not fight it
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <InscriptionFont />
        {children}
      </body>
    </html>
  );
}
