import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import React from "react";
import "./globals.css";
import { logoAt } from "@/lib/brand";
import { Providers } from "./providers";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-plex-sans-arabic",
});

const TITLE = "أحمد الحربي | العمليات والتحول الرقمي";
const DESCRIPTION = "أحمد الحربي، العمليات والتحول الرقمي: أربط الإدارة بالتقنية والمنتجات الرقمية.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: logoAt(192), type: "image/png" }],
    apple: "/app-icon?size=180",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "أحمد الحربي",
    locale: "ar_SA",
    images: [logoAt(512)],
  },
  twitter: { card: "summary", images: [logoAt(512)] },
  // Installed on iPhone: full screen with its own name.
  appleWebApp: { capable: true, title: "أحمد الحربي", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
};

// Exported (not a hand-written <meta>) so Next doesn't add its own default
// viewport tag, which iOS would read instead. viewport-fit=cover gives the
// page the real safe-area insets (notch, home indicator); a fixed scale stops
// iOS zooming in when a field or dialog gets focus.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

const THEME_SCRIPT = `
(function() {
  try {
    var root = document.documentElement;
    if ((localStorage.getItem('theme') || 'light') === 'dark') root.classList.add('dark');
    // Status bar colour of the installed app follows the light/dark switch.
    var syncBar = function () {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', getComputedStyle(document.body).backgroundColor || '#ffffff');
    };
    new MutationObserver(syncBar).observe(root, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('DOMContentLoaded', syncBar);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${ibmPlexSansArabic.variable} font-body antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
