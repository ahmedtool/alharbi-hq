
import React, { Suspense } from 'react';
import { InvoiceForm } from './invoice-form';
import { Loader2 } from 'lucide-react';

export default function InvoiceGeneratorPage() {
  return (
    <Suspense fallback={
        <div className="flex justify-center items-center h-[80vh]">
            <Loader2 className="h-10 w-10 animate-spin" />
        </div>
    }>
      <InvoiceForm />
    </Suspense>
  );
}
