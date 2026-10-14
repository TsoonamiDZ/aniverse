import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { KeepAlive } from "@/components/anime/keep-alive";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aniverse · مشاهدة الأنمي والأنميات مترجمة",
  description:
    "مكتبة أنمي ضخمة بآلاف الأنميات وعشرات الآلاف من الحلقات وروابط المشاهدة المباشرة بجودات متعددة (1080p / 720p / 480p). تصفّح، ابحث، وشاهد أنمياتك المفضلة.",
  keywords: [
    "أنمي",
    "أنميات",
    "موقع أنمي",
    "مشاهدة أنمي",
    "أنمي مترجم",
    "حلقات أنمي",
    "anime",
  ],
  authors: [{ name: "Aniverse" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-64.png", type: "image/png", sizes: "64x64" },
    ],
    apple: [{ url: "/favicon-180.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Aniverse · مشاهدة الأنمي والأنميات مترجمة",
    description:
      "مكتبة أنمي ضخمة بآلاف الأنميات والحلقات وروابط المشاهدة المباشرة بجودات متعددة.",
    siteName: "Aniverse",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${cairo.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <KeepAlive />
          <Toaster position="bottom-center" richColors closeButton dir="rtl" />
        </Providers>
      </body>
    </html>
  );
}
