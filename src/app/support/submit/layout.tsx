
import React from 'react';

// This layout is for the public-facing ticket submission page.
// It should not include the main sidebar or any auth-protected components.
export default function SubmitTicketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted min-h-screen">
      {children}
    </div>
  );
}

    