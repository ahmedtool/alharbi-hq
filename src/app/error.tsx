
'use client'

import { Button } from "@/components/ui/button";
import { ServerCrash, RefreshCw, Loader2 } from "lucide-react";
import Image from "next/image";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-6">
        <div className="space-y-4 max-w-md">
            <div className="flex justify-center">
                <ServerCrash className="h-24 w-24 text-destructive opacity-50" />
            </div>
            <h1 className="text-6xl font-extrabold text-destructive">500</h1>
            <h2 className="text-2xl font-bold">حدث خطأ في الخادم</h2>
            <p className="text-muted-foreground">
                نعتذر، حدث خطأ غير متوقع أثناء معالجة طلبك. فريقنا يعمل على إصلاحه.
            </p>
             <pre className="mt-4 text-xs text-left text-muted-foreground bg-muted p-2 rounded-md overflow-x-auto">
                <code>{error.message}</code>
             </pre>
            <Button onClick={() => reset()}>
                <RefreshCw className="ml-2 h-4 w-4" />
                إعادة المحاولة
            </Button>
        </div>
        <div className="absolute bottom-8">
            <Image src="https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png" alt="Logo" width={32} height={32} priority />
        </div>
    </div>
  )
}
