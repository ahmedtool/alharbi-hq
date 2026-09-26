"use client";

import { LifeBuoy, Package } from "lucide-react";
import { PublicPagePreview } from "@/components/app/public-page-preview";

export default function RequestPreviewPage() {
  return (
    <PublicPagePreview
      path="/support/submit"
      title="صفحة طلب المشروع"
      description="معاينة مباشرة لنموذج الطلب كما يشوفه العملاء."
      shareTitle="أحمد الحربي | اطلب مشروع"
      shortcuts={[
        { href: "/support", icon: LifeBuoy, title: "الطلبات الواردة", hint: "كل الطلبات اللي أرسلها العملاء من النموذج" },
        { href: "/finance/products", icon: Package, title: "المنتجات والخدمات", hint: "الخدمات العامة اللي تطلع للعميل في «طلب خدمة/منتج»" },
      ]}
    />
  );
}
