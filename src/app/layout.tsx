import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WAIN — وين",
  description: "شوفها. اسألها. لقّها. دليلك الخليجي للأكل بلهجتك.",
};

export const viewport: Viewport = {
  themeColor: "#0b0907",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0B0907]">{children}</body>
    </html>
  );
}
