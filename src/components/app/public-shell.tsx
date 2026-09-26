"use client";

import Link from "next/link";
import React from "react";
import { logoAt } from "@/lib/brand";
import "@/app/portfolio.css";

/**
 * هيدر وفوتر الصفحات العامة (الروابط، طلب مشروع) بنفس هوية الصفحة الرئيسية.
 * المحتوى نفسه يبقى خارج نطاق .pf عشان مكونات النماذج تحتفظ بتنسيقها.
 */
export function PublicShell({ active, children }: { active?: "bio" | "request"; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="pf pf-bar pf-sticky">
        <header className="site-header">
          <div className="container nav">
            <Link href="/" className="logo" aria-label="أحمد الحربي - الرئيسية">
              <img className="logo-img" src={logoAt(96)} alt="" width={36} height={36} />
              <span>أحمد الحربي<small lang="en">Ahmed Alharbi</small></span>
            </Link>
            <nav className="pub-nav">
              <Link href="/" className="pub-home">الرئيسية</Link>
              <Link href="/bio" className={active === "bio" ? "active" : ""}>روابطي</Link>
              <Link href="/support/submit" className={active === "request" ? "active" : ""}>اطلب مشروع</Link>
            </nav>
          </div>
        </header>
      </div>

      <div className="flex-1 page-enter">{children}</div>

      <div className="pf pf-bar">
        <footer className="site-footer">
          <div className="container">
            <div className="copy">
              <span>© {new Date().getFullYear()} أحمد الحربي</span>
              <Link href="/">ahmedalharbi.com</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
