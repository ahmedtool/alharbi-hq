import React from 'react';

export const metadata = {
  title: 'أحمد الحربي | روابطي',
  description: 'كل روابطي في مكان واحد: موقعي، طلب مشروع، وحساباتي.',
};

export default function BioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
