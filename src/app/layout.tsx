import type { Metadata, Viewport } from "next";
import { Doto, Inter_Tight, Pinyon_Script } from "next/font/google";
import { Dialogs } from "@/components/Dialogs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import "./globals.css";

// Free fallbacks; preload is off so Apple devices (native Helvetica Neue) and visitors
// with the Adobe kit never download them.
const grotesk = Inter_Tight({ variable: "--font-grotesk", subsets: ["latin"], preload: false, weight: ["400", "500"] });
const pinyon = Pinyon_Script({ variable: "--font-pinyon", subsets: ["latin"], preload: false, weight: "400" });
const doto = Doto({ variable: "--font-doto", subsets: ["latin"], weight: ["800", "900"] });

const siteUrl = process.env.PUBLIC_URL || "https://glaivedle.lol";
// Optional Adobe Fonts web project with Helvetica Neue LT Pro + P22 Zaner Pro (licensed, so not bundled)
const adobeKit = process.env.ADOBE_FONTS_KIT?.match(/^[a-z0-9]{5,12}$/i)?.[0];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "glaivedle", template: "%s – glaivedle" },
  description: "Guess the glaive song of the day. Classic, lyrics, audio and cover – new puzzles daily. Fan-made & open source.",
  applicationName: "glaivedle",
  openGraph: { title: "glaivedle", description: "Guess the glaive song of the day.", type: "website", siteName: "glaivedle" },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#d5d5d5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${grotesk.variable} ${pinyon.variable} ${doto.variable}`}>
      <head>
        <link rel="preload" href="/fonts/P22ZanerFour.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {adobeKit && <link rel="stylesheet" href={`https://use.typekit.net/${adobeKit}.css`} />}
      </head>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <Header />
          <main className="w-full flex-1 px-[var(--margin)] pb-16">{children}</main>
          <Footer />
          <Dialogs />
        </Providers>
      </body>
    </html>
  );
}
