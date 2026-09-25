
"use client";

import { PageHeader } from "@/components/app/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BlogManagerRemoved() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="تمت إزالة هذه الصفحة" description="تم استبدال نظام المدونة الديناميكي بنظام صفحات ثابتة." />
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh]">
          <div className="flex flex-col items-center gap-2 text-center">
              <h3 className="text-xl font-bold tracking-tight">
                  هذه الصفحة لم تعد قيد الاستخدام.
              </h3>
              <p className="text-sm text-muted-foreground">
                  يمكنك الآن بناء صفحات مدونتك بشكل ثابت ومباشر.
              </p>
               <Button asChild className="mt-4">
                  <Link href="/blog">
                      الانتقال إلى المدونة
                  </Link>
              </Button>
          </div>
      </div>
    </div>
  );
}
