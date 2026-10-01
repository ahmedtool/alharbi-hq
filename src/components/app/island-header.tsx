"use client";

import Link from "next/link";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { logoAt } from "@/lib/brand";

export type IslandItem = { href: string; label: string };

type Props = {
  name: string;
  logoHref?: string;
  items: IslandItem[];
  /** Highlight this href; without it, in-page "#id" links follow the section on screen. */
  active?: string;
  cta?: IslandItem;
  /** Element whose transform shows reading progress (scaleX 0..1); set by the page. */
  progressRef?: React.Ref<HTMLSpanElement>;
};

const isHash = (href: string) => href.startsWith("#");

/**
 * Floating "island" header: a frosted pill that shrinks once the page scrolls,
 * with a highlight that glides to the current link (following the section on
 * screen for in-page links), a reading-progress line, a theme switch and a
 * call to action. On phones the links open in a sheet under the pill.
 */
export function IslandHeader({ name, logoHref = "#", items, active, cta, progressRef }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState<string | undefined>(active);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  // Shrink after the first bit of scrolling.
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  // Follow the section on screen for in-page links.
  useEffect(() => {
    if (active) return;
    const ids = items.filter((i) => isHash(i.href)).map((i) => i.href.slice(1));
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setCurrent("#" + e.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    els.forEach((el) => io.observe(el));
    const onTop = () => { if (window.scrollY < 200) setCurrent(undefined); };
    addEventListener("scroll", onTop, { passive: true });
    return () => { io.disconnect(); removeEventListener("scroll", onTop); };
  }, [active, items]);

  // Move the highlight under the current link.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>(`a[data-href="${current}"]`);
    if (!nav || !link) { setPill(null); return; }
    setPill({ left: link.offsetLeft, width: link.offsetWidth });
  }, [current, compact]);

  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    setDark(next);
  };

  const close = () => setOpen(false);
  const A = ({ item, className, style }: { item: IslandItem; className?: string; style?: React.CSSProperties }) =>
    isHash(item.href)
      ? <a href={item.href} data-href={item.href} className={className} style={style} onClick={close}>{item.label}</a>
      : <Link href={item.href} data-href={item.href} className={className} style={style} onClick={close}>{item.label}</Link>;

  return (
    <header className={`island-wrap ${compact ? "compact" : ""} ${open ? "open" : ""}`}>
      <a className="skip" href="#main">تخطَّ إلى المحتوى</a>
      <div className="island-bar">
        <Link href={logoHref} className="island-logo" aria-label={`${name} - الرئيسية`} onClick={close}>
          <img src={logoAt(96)} alt="" width={40} height={40} />
          <span className="island-name">{name}</span>
        </Link>

        <nav className="island-nav" ref={navRef} aria-label="التنقل">
          <span className="island-pill" aria-hidden="true" style={pill ? { left: pill.left, width: pill.width, opacity: 1 } : { opacity: 0 }} />
          {items.map((it) => <A key={it.href} item={it} className={current === it.href ? "on" : ""} />)}
        </nav>

        <div className="island-actions">
          <button type="button" className="island-icon" onClick={toggleTheme} aria-label="تبديل الوضع الليلي">
            {dark ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            )}
          </button>
          {cta && <A item={{ ...cta, label: cta.label }} className="island-cta" />}
          <button type="button" className="island-icon island-burger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="القائمة">
            <i /><i />
          </button>
        </div>

        {progressRef && <span className="island-progress" ref={progressRef} aria-hidden="true" />}
      </div>

      <nav className="island-sheet" aria-label="القائمة" aria-hidden={!open}>
        {items.map((it, i) => <A key={it.href} item={it} className={current === it.href ? "on" : ""} style={{ ["--i" as string]: i }} />)}
        {cta && <A item={cta} className="island-sheet-cta" style={{ ["--i" as string]: items.length }} />}
      </nav>
    </header>
  );
}
