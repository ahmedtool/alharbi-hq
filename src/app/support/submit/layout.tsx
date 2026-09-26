import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أحمد الحربي | اطلب مشروع',
  description: 'عندك فكرة، طلب خدمة، أو فرصة تعاون؟ أرسل طلبك وأرد عليك بأقرب وقت.',
};

// Public page: no sidebar or auth-protected components.
export default function SubmitTicketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
