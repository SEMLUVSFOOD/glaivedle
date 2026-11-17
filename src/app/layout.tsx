import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, UnifrakturMaguntia } from "next/font/google";
import { Dialogs } from "@/components/Dialogs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});
const unifraktur = UnifrakturMaguntia({ variable: "--font-unifraktur", subsets: ["latin"], weight: "400" });

const siteUrl = process.env.PUBLIC_URL || "https://glaivedle.lol";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "glaivedle — the daily glaive song game", template: "%s · glaivedle" },
  description:
    "Guess the glaive song of the day. Classic stats, lyrics, audio intros and cover art — new puzzles every day. Fan-made & open source.",
  applicationName: "glaivedle",
  openGraph: {
    title: "glaivedle",
    description: "Guess the glaive song of the day — classic, lyrics, audio & cover modes.",
    type: "website",
    siteName: "glaivedle",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#140d08",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable} ${unifraktur.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-10 sm:px-6">{children}</main>
          <Footer />
          <Dialogs />
        </Providers>
      </body>
    </html>
  );
}
