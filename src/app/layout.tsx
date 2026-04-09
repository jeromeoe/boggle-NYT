import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
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
  title: "Boggle Web",
  description: "A premium, standalone word game experience.",
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
      </body>
    </html>
  );
}
