import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AppFrame } from "@/components/layout/AppFrame";
import { SITE_URL } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Moggle.org — Free Online Word Game",
    template: "%s | Moggle.org",
  },
  applicationName: "Moggle.org",
  description:
    "Play a free daily word-grid game online. Find as many words as you can before time runs out—no account required.",
  keywords: [
    "word game",
    "online word game",
    "daily word game",
    "word grid game",
    "letter grid game",
    "vocabulary game",
    "timed word game",
    "moggle",
  ],
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Moggle.org — Free Online Word Game",
    description:
      "Find words in a letter grid before time runs out. Play the daily challenge or start a free round now.",
    url: "/",
    siteName: "Moggle.org",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moggle.org — Free Online Word Game",
    description:
      "Find words in a letter grid before time runs out. Play the daily challenge or start a free round now.",
  },
};

// Inlined so the theme is applied before the first paint — otherwise
// the user would see a flash of the light palette before React hydrates.
const themeInitScript = `(function(){try{var t=localStorage.getItem('boggle.pref.theme');var m=localStorage.getItem('boggle.pref.reducedMotion');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}else if((t==='system'||t===null)&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','dark');}if(m==='true'){document.documentElement.setAttribute('data-reduced-motion','true');}}catch(e){}})();`;

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Moggle.org",
              url: SITE_URL,
              applicationCategory: "GameApplication",
              operatingSystem: "Any",
              description: "A free online daily word-grid game with timed and relaxed modes.",
              isAccessibleForFree: true,
            }),
          }}
        />
        <AppFrame>{children}</AppFrame>
        <Analytics />
      </body>
    </html>
  );
}
