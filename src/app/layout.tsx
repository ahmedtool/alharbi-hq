
"use client";

import { RegisterServiceWorker } from "@/components/app/register-sw";
import './globals.css';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import Body from './body';
import { DirectionProvider } from '@radix-ui/react-direction';
import { logoAt } from '@/lib/brand';
import useClient from '@/hooks/use-client';


const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-ibm-plex-sans-arabic',
});

// While we can't export metadata from a client component, we can add this for reference
// It should be moved to a higher-level server component if possible.
// export const metadata: Metadata = {
//   title: 'أحمد الحربي',
//   description: 'أحمد الحربي، العمليات والتحول الرقمي: أربط الإدارة بالتقنية والمنتجات الرقمية.',
//   manifest: '/manifest.json',
// };

// export const viewport: Viewport = {
//   themeColor: '#09090b',
//   initialScale: 1,
//   maximumScale: 1,
//   userScalable: false,
// }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isClient = useClient();

  return (
    <html lang="ar" suppressHydrationWarning dir="rtl">
        <head>
          <title>أحمد الحربي | العمليات والتحول الرقمي</title>
          <meta name="description" content="أحمد الحربي، العمليات والتحول الرقمي: أربط الإدارة بالتقنية والمنتجات الرقمية." />
          <meta property="og:title" content="أحمد الحربي | العمليات والتحول الرقمي" />
          <meta property="og:description" content="أحمد الحربي، العمليات والتحول الرقمي: أربط الإدارة بالتقنية والمنتجات الرقمية." />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="أحمد الحربي" />
          <meta property="og:locale" content="ar_SA" />
          <link rel="icon" type="image/png" sizes="32x32" href={logoAt(32)} />
          <link rel="icon" type="image/png" sizes="192x192" href={logoAt(192)} />
          <link rel="apple-touch-icon" href="/app-icon?size=180" />
          <meta property="og:image" content={logoAt(512)} />
          <meta name="twitter:image" content={logoAt(512)} />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#ffffff" />
          {/* Installed on iPhone: full screen, own name, status bar over the page. */}
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content="أحمد الحربي" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        </head>
        <body className={`${ibmPlexSansArabic.variable} font-body antialiased`}>
            <script
              key="theme-script"
              dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    try {
                      const theme = localStorage.getItem('theme') || 'light';
                      var root = document.documentElement;
                      if (theme === 'dark') {
                        root.classList.add('dark');
                      }
                      // Status bar colour of the installed app follows the light/dark switch.
                      var syncBar = function () {
                        var meta = document.querySelector('meta[name="theme-color"]');
                        if (meta) meta.setAttribute('content', getComputedStyle(document.body).backgroundColor || '#ffffff');
                      };
                      new MutationObserver(syncBar).observe(root, { attributes: true, attributeFilter: ['class'] });
                      document.addEventListener('DOMContentLoaded', syncBar);
                    } catch (e) {}
                  })();
                `,
              }}
            />
            {/* الموقع عربي: كل مكونات Radix (القوائم، الاختيارات، التمرير...) تشتغل من اليمين لليسار */}
            <DirectionProvider dir="rtl">
              <Body>{children}</Body>
              <RegisterServiceWorker />
              {isClient && <Toaster />}
            </DirectionProvider>
        </body>
    </html>
  );
}
