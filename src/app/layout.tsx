
"use client";

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
//   description: 'مركز القيادة حقك.',
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
          <title>أحمد الحربي</title>
          <meta name="description" content="مركز القيادة حقك." />
          <link rel="icon" type="image/png" sizes="32x32" href={logoAt(32)} />
          <link rel="icon" type="image/png" sizes="192x192" href={logoAt(192)} />
          <link rel="apple-touch-icon" href={logoAt(180)} />
          <meta property="og:image" content={logoAt(512)} />
          <meta name="twitter:image" content={logoAt(512)} />
          <meta name="manifest" content="/manifest.json" />
          <meta name="theme-color" content="#09090b" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        </head>
        <body className={`${ibmPlexSansArabic.variable} font-body antialiased`}>
            <script
              key="theme-script"
              dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    try {
                      const theme = localStorage.getItem('theme') || 'light';
                      if (theme === 'dark') {
                        document.documentElement.classList.add('dark');
                      }
                    } catch (e) {}
                  })();
                `,
              }}
            />
            {/* الموقع عربي: كل مكونات Radix (القوائم، الاختيارات، التمرير...) تشتغل من اليمين لليسار */}
            <DirectionProvider dir="rtl">
              <Body>{children}</Body>
              {isClient && <Toaster />}
            </DirectionProvider>
        </body>
    </html>
  );
}
