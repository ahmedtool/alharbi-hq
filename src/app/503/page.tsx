
"use client";

import { Button } from "@/components/ui/button";
import { HardHat, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-6">
        <div className="space-y-4 max-w-md">
            <div className="flex justify-center">
                <HardHat className="h-24 w-24 text-amber-500 opacity-50" />
            </div>
            <h1 className="text-6xl font-extrabold text-amber-500">503</h1>
            <h2 className="text-2xl font-bold">الموقع تحت الصيانة</h2>
            <p className="text-muted-foreground">
                نحن نقوم حاليًا ببعض التحديثات والتحسينات على الموقع. سنعود قريبًا! شكرًا لصبركم.
            </p>
             <Button asChild variant="outline">
                <Link href="/">
                   <ArrowRight className="ml-2 h-4 w-4" /> العودة للرئيسية
                </Link>
            </Button>
        </div>
         <div className="absolute bottom-8">
            <Image src="https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png" alt="Logo" width={32} height={32} />
        </div>
    </div>
  );
}
