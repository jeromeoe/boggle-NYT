import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Moggle.org — Free Online Word Game",
  description:
    "Moggle.org is a free online word game — find as many words as possible on the letter grid before time runs out. A fun alternative to Boggle, Scrabble, word search, and crossword puzzles.",
  keywords: [
    "word game",
    "online word game",
    "boggl",
    "scrabbl",
    "word search",
    "crossword",
    "letter grid game",
    "vocabulary game",
    "word puzzle",
    "moggle",
  ],
  openGraph: {
    title: "Moggle.org — Free Online Word Game",
    description:
      "Find words in the letter grid — a competitive word game inspired by classics like Boggle and Scrabble. Play free online.",
    siteName: "Moggle.org",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moggle.org — Free Online Word Game",
    description:
      "Find words in the letter grid — a competitive word game inspired by classics like Boggle and Scrabble.",
  },
};

// Inlined so the theme is applied before the first paint — otherwise
// the user would see a flash of the light palette before React hydrates.
const themeInitScript = `(function(){try{var t=localStorage.getItem('boggle.pref.theme');var m=localStorage.getItem('boggle.pref.reducedMotion');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}else if((t==='system'||t===null)&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','dark');}if(m!=='false'){document.documentElement.setAttribute('data-reduced-motion','true');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased font-sans bg-background text-foreground`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
