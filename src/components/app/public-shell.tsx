"use client";

import Link from "next/link";
import React from "react";
import { logoAt } from "@/lib/brand";
import { IslandHeader } from "@/components/app/island-header";
import "@/app/portfolio.css";

const ITEMS = [
  { href: "/", label: "الرئيسية" },
  { href: "/cv", label: "السيرة الذاتية" },
  { href: "/bio", label: "روابطي" },
  { href: "/support/submit", label: "اطلب مشروع" },
];

/**
 * هيدر وفوتر الصفحات العامة (الروابط، طلب مشروع) بنفس هوية الصفحة الرئيسية.
 * المحتوى نفسه يبقى خارج نطاق .pf عشان مكونات النماذج تحتفظ بتنسيقها.
 */
export function PublicShell({ active, children }: { active?: "bio" | "request" | "cv"; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="pf pf-island">
        <IslandHeader name="أحمد الحربي" logoHref="/" items={ITEMS} active={active === "bio" ? "/bio" : active === "cv" ? "/cv" : "/support/submit"} />
      </div>

      <div className="flex-1 page-enter">{children}</div>

      <div className="pf pf-bar">
        <footer className="mini-foot">
          <div className="container mini-foot-row">
            <Link href="/" className="mini-brand"><img src={logoAt(96)} alt="" width={28} height={28} /><span>أحمد الحربي</span></Link>
            <span className="mini-copy">© {new Date().getFullYear()} · <Link href="/">ahmedalharbi.com</Link></span>
          </div>
        </footer>
      </div>
    </div>
  );
}
