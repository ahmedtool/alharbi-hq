"use client";

import { Hash } from "lucide-react";
import { PublicPagePreview } from "@/components/app/public-page-preview";

export default function BioPreviewPage() {
  return (
    <PublicPagePreview
      path="/bio"
      title="صفحة الروابط"
      description="معاينة مباشرة لصفحتك العامة كما يشوفها الزوار."
      shareTitle="أحمد الحربي | روابطي"
      shortcuts={[
        { href: "/numbered-links", icon: Hash, title: "إدارة الوصول بالرقم", hint: "الأرقام اللي يبحث عنها الزوار في الصفحة" },
      ]}
    />
  );
}
