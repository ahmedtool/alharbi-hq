
"use client";

import { Button } from "@/components/ui/button";
import { Hand, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-6">
        <div className="space-y-4 max-w-md">
            <div className="flex justify-center">
                <Hand className="h-24 w-24 text-destructive opacity-50" />
            </div>
            <h1 className="text-6xl font-extrabold text-destructive">403</h1>
            <h2 className="text-2xl font-bold">الوصول مرفوض</h2>
            <p className="text-muted-foreground">
                عذرًا، ليس لديك الصلاحية اللازمة للوصول إلى هذه الصفحة أو هذا المحتوى.
            </p>
            <div className="flex gap-4 justify-center">
                <Button asChild>
                    <Link href="/">
                       <ArrowLeft className="ml-2 h-4 w-4" /> العودة للرئيسية
                    </Link>
                </Button>
            </div>
        </div>
         <div className="absolute bottom-8">
            <Image src="https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png" alt="Logo" width={32} height={32} />
        </div>
    </div>
  );
}
