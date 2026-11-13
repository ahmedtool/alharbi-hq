"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Home } from "lucide-react";
import { logoAt } from "@/lib/brand";
import { isDesktopShell } from "@/lib/installed-app";

/**
 * Title bar for the installed desktop app (Windows/Mac, "window controls overlay"):
 * the app draws its own bar where the browser's would be, next to the system
 * minimise/close buttons. Hidden everywhere else by CSS (.wco-bar).
 */
export function TitleBar() {
  const router = useRouter();
  // Turn the bar on for the installed PWA window and for the Windows app.
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: window-controls-overlay)");
    const apply = () => document.documentElement.classList.toggle("app-titlebar", mq.matches || isDesktopShell());
    apply();
    mq.addEventListener?.("change", apply);
    // In the Windows app, keep the system window buttons the same colour as the page.
    const desk = (window as Window & { alharbiDesktop?: { setTitleBarTheme: (d: boolean) => void } }).alharbiDesktop;
    const sync = () => desk?.setTitleBarTheme(document.documentElement.classList.contains("dark"));
    sync();
    const obs = desk ? new MutationObserver(sync) : null;
    obs?.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { mq.removeEventListener?.("change", apply); obs?.disconnect(); };
  }, []);
  return (
    <div className="wco-bar no-print" aria-hidden={false}>
      <img src={logoAt(48)} alt="" width={18} height={18} className="h-[18px] w-[18px] rounded" />
      <span className="font-bold">أحمد الحربي</span>
      <span className="text-muted-foreground">· لوحة التحكم</span>
      <span className="wco-nodrag ms-2 flex items-center gap-0.5">
        <button type="button" onClick={() => router.back()} className="grid h-6 w-6 place-items-center rounded hover:bg-muted" title="رجوع"><ArrowRight className="h-3.5 w-3.5" /></button>
        <Link href="/dashboard" className="grid h-6 w-6 place-items-center rounded hover:bg-muted" title="الرئيسية"><Home className="h-3.5 w-3.5" /></Link>
      </span>
    </div>
  );
}
