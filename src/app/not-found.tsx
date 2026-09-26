
"use client";

import { Button } from "@/components/ui/button";
import { SearchX, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-6">
        <div className="space-y-4 max-w-md">
            <div className="flex justify-center">
                <SearchX className="h-24 w-24 text-primary opacity-30" />
            </div>
            <h1 className="text-6xl font-extrabold text-primary">404</h1>
            <h2 className="text-2xl font-bold">الصفحة غير موجودة</h2>
            <p className="text-muted-foreground">
                عذرًا، يبدو أن الصفحة التي تبحث عنها قد تم نقلها أو حذفها، أو ربما لم تكن موجودة أصلاً.
            </p>
            <div className="flex gap-4 justify-center">
                <Button asChild>
                    <Link href="/">
                       <ArrowRight className="ml-2 h-4 w-4" /> العودة للرئيسية
                    </Link>
                </Button>
            </div>
        </div>
         <div className="absolute bottom-8">
            <Image src="https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png" alt="Logo" width={32} height={32} priority />
        </div>
    </div>
  );
}
