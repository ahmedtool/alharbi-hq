
import React from 'react';
import Image from "next/image";

export const metadata = {
  title: 'أحمد الحربي | Bio',
  description: 'جميع روابطي في مكان واحد. تواصل معي واكتشف أعمالي.',
};

export default function BioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground text-center min-h-screen">
      <main>{children}</main>
      <footer className="py-6 container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} أحمد الحربي. جميع الحقوق محفوظة.</p>
          </div>
      </footer>
    </div>
  );
}
