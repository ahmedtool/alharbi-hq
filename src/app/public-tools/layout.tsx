
import React from 'react';
import Image from "next/image";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PublicToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground text-right min-h-screen">
        <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Image src="https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png" alt="شعار أحمد الحربي" width={32} height={32} />
                <h1 className="text-lg font-bold">أحمد الحربي</h1>
            </div>
             <Button asChild variant="outline">
                <Link href="/">
                    <ArrowLeft className="ml-2 h-4 w-4" />
                    العودة للرئيسية
                </Link>
            </Button>
        </header>

        <main>{children}</main>

        <footer className="bg-muted/50 py-8 mt-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} أحمد الحربي. جميع الحقوق محفوظة.</p>
            </div>
        </footer>
    </div>
  );
}
