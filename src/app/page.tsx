"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PROFILE } from "./_portfolio/profile";
import { logoAt } from "@/lib/brand";
import { IslandHeader } from "@/components/app/island-header";
import "./portfolio.css";

const P = PROFILE;
const arNum = (n: number) => n.toLocaleString("ar-SA");

/** Splits text into words that slide up from behind a mask. */
function MaskedWords({ text, baseDelay = 1 }: { text: string; baseDelay?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <React.Fragment key={i}>
          {i > 0 && " "}
          <span className="w">
            <span style={{ ["--d" as string]: i + baseDelay }}>{w}</span>
          </span>
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * A number whose digits roll into place like an odometer (each digit spins
 * from ٠ to its value, staggered). Rolls again whenever `runKey` changes.
 */
function Odometer({ value, runKey, run }: { value: number; runKey: number; run: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    if (!run) return;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(r);
  }, [runKey, run]);
  const text = arNum(value);
  const digits = "٠١٢٣٤٥٦٧٨٩";
  let n = 0;
  return (
    <span className="odo" aria-label={text}>
      {[...text].map((ch, i) => {
        const d = digits.indexOf(ch);
        if (d < 0) return <span key={i} className="odo-sep" aria-hidden="true">{ch}</span>;
        const k = n++;
        return (
          <span key={i} className="odo-col" aria-hidden="true">
            {/* The final digit (invisible) sizes the column, so spacing matches normal text. */}
            <span className="odo-size">{ch}</span>
            <span className="odo-strip" style={{ transform: `translateY(${on ? -d * 10 : 0}%)`, transitionDelay: `${k * 90}ms` }}>
              {[...digits].map((g) => <span key={g}>{g}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * The key figures in one dark card: the current figure rolls in like an
 * odometer, and tabs at the bottom switch figures (automatically every 6s
 * while on screen, with a filling progress line, until the visitor picks one).
 */
function StatsCard({ items }: { items: { value: number; label: string; unit: string; title: string; desc: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { setVisible(e.isIntersecting); if (e.isIntersecting) setSeen(true); }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!auto || !visible) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % items.length), 6000);
    return () => clearTimeout(t);
  }, [auto, visible, active, items.length]);
  const m = items[active];
  return (
    <div className="stats-card" ref={ref}>
      <div className="stats-glow" aria-hidden="true" />
      <div key={active} className="stats-body">
        <div className="stats-figure">
          <b>+<Odometer value={m.value} runKey={active} run={seen} /></b>
          <span>{m.unit}</span>
        </div>
        <h3>{m.title}</h3>
        <p>{m.desc}</p>
      </div>
      <div className="stats-tabs" role="tablist">
        {items.map((it, i) => (
          <button key={it.label} type="button" role="tab" aria-selected={i === active} className={i === active ? "on" : ""} onClick={() => { setAuto(false); setActive(i); }}>
            <span>{it.label}</span>
            <i>{i === active && auto && visible && <em key={active} />}</i>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * A short animated "launch" of a project's site, drawn from its own logo and
 * copy rather than a screenshot or iframe (sites often forbid being embedded):
 * the address is typed into a browser bar, the page builds itself up, and a
 * cursor clicks the call to action. Loops while the project is on screen.
 */
function SiteDemo({ url, logo, name, tagline, chips }: { url: string; logo: string; name: string; tagline?: string; chips: string[] }) {
  const host = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return (
    <div className="demo" aria-hidden="true">
      <div className="demo-bar">
        <span className="dots"><i /><i /><i /></span>
        <span className="demo-url" dir="ltr"><span className="lock">🔒</span><span className="type" style={{ ["--n" as string]: host.length }}>{host}</span><span className="caret" /></span>
      </div>
      <div className="demo-page">
        <img className="demo-logo" src={logo} alt="" width={72} height={72} />
        <b className="demo-name">{name}</b>
        {tagline && <span className="demo-tag">{tagline}</span>}
        <ul className="demo-chips">
          {chips.slice(0, 3).map((c, i) => <li key={c} style={{ ["--i" as string]: i }}>{c}</li>)}
        </ul>
        <span className="demo-cta">
          زيارة الموقع
          <svg className="demo-cursor" viewBox="0 0 24 24" width="22" height="22"><path d="M5 3l14 8-6.2 1.4L10 19z" fill="#111" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" /></svg>
        </span>
      </div>
    </div>
  );
}

/**
 * Horizontal slider, one item per slide (swipe on phones, arrows/dots
 * elsewhere). Advances on its own every `interval` ms while in view, until
 * the visitor touches it.
 */
function Slider({ count, interval = 9000, className = "", children }: { count: number; interval?: number; className?: string; children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);

  const slides = () => Array.from(trackRef.current?.children ?? []) as HTMLElement[];
  const go = (i: number) => {
    const track = trackRef.current;
    const target = slides()[(i + count) % count];
    if (!track || !target) return;
    // Scroll by the on-screen offset so it works the same in RTL and LTR.
    track.scrollBy({ left: target.getBoundingClientRect().left - track.getBoundingClientRect().left, behavior: "smooth" });
  };
  const userGo = (i: number) => { setAuto(false); go(i); };

  // Which slide is showing.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) setActive(slides().indexOf(e.target as HTMLElement));
    }), { root: track, threshold: 0.6 });
    slides().forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Autoplay only while the slider is on screen.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(track);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!auto || !visible || hover || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(active + 1), interval);
    return () => clearTimeout(t);
  }, [auto, visible, hover, active]);

  return (
    <div className={`slider ${className}`} style={{ ["--interval" as string]: `${interval}ms` }} aria-roledescription="عرض شرائح" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="slider-track" ref={trackRef} onPointerDown={() => setAuto(false)} onWheel={(e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setAuto(false); }}>
        {children}
      </div>
      <div className="slider-nav">
        <button type="button" className="icon-btn" onClick={() => userGo(active - 1)} aria-label="السابق">→</button>
        <div className="slider-dots">
          {Array.from({ length: count }, (_, i) => (
            <button key={i} type="button" className={i === active ? "on" : ""} onClick={() => userGo(i)} aria-label={`الشريحة ${i + 1}`} aria-current={i === active}>
              {i === active && auto && visible && !hover && <i key={active} />}
            </button>
          ))}
        </div>
        <span className="slider-count">{arNum(active + 1)} / {arNum(count)}</span>
        <button type="button" className="icon-btn" onClick={() => userGo(active + 1)} aria-label="التالي">←</button>
      </div>
    </div>
  );
}

/** Adds the staggered-appearance classes to a list item. */
const st = (i: number) => ({ className: "st", style: { ["--i" as string]: i } as React.CSSProperties });

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [intro, setIntro] = useState<"hidden" | "play" | "lift">("hidden");

  // Intro screen once per visit, then the hero entrance.
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = sessionStorage.getItem("intro-seen") === "1"; sessionStorage.setItem("intro-seen", "1"); } catch {}
    if (seen || reduce) {
      requestAnimationFrame(() => requestAnimationFrame(() => setLoaded(true)));
      return;
    }
    setIntro("play");
    const t1 = setTimeout(() => { setIntro("lift"); setLoaded(true); }, 1500);
    const t2 = setTimeout(() => setIntro("hidden"), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Reveal sections and projects as they scroll into view.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll(".reveal, .project");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Thin reading-progress bar.
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => removeEventListener("scroll", onScroll);
  }, []);

  const words = [...P.interests, ...P.skills.map((g) => g.group)];
  const nav = [
    { href: "#work", label: "وش أبني" },
    { href: "#impact", label: "أرقامي" },
    { href: "#about", label: "نبذة" },
    { href: "#experience", label: "خبراتي" },
    { href: "#skills", label: "مهاراتي" },
  ];

  return (
    <div className="pf" ref={rootRef}>
      <div className={loaded ? "loaded" : undefined}>
        {intro !== "hidden" && (
          <div className={`intro play ${intro === "lift" ? "lift" : ""}`} aria-hidden="true">
            <img className="intro-logo" src={logoAt(192)} alt="" width={72} height={72} />
            <div className="intro-name"><MaskedWords text={P.name} baseDelay={0} /></div>
            <div className="intro-line" />
          </div>
        )}


        <IslandHeader name={P.name} items={nav} cta={{ href: "#contact", label: "تواصل معي" }} progressRef={progressRef} />

        <main id="main">
          {/* الواجهة */}
          <section className="hero pf-hero">
            <div className="container">
              <div className="eyebrow name-en intro-anim" style={{ ["--d" as string]: 0 }}>{P.nameEn}</div>
              <h1 className="hero-title"><MaskedWords text={P.name} /></h1>
              <div className="pf-role intro-anim" style={{ ["--d" as string]: 5 }}>{P.role} <span aria-hidden="true">·</span> <span lang="en" dir="ltr">{P.roleEn}</span></div>
              <div className="hero-sub intro-anim" style={{ ["--d" as string]: 7 }}>
                <div>
                  <p>{P.intro}</p>
                  <p className="intro-en" lang="en" dir="ltr">{P.introEn}</p>
                </div>
                <div className="hero-cta">
                  <a href="#work" className="btn btn-primary">وش أبني</a>
                  <a href="#contact" className="btn btn-ghost">تواصل معي</a>
                </div>
              </div>
              <div className="facts intro-anim" style={{ ["--d" as string]: 9 }}>
                <span>{P.fullName}</span>
                <span>📍 {P.city}</span>
                {P.available && <span className="avail"><i /> متاح للتعاون</span>}
              </div>
            </div>
          </section>

          {/* شريط الكلمات المتحرك */}
          <div className="marquee" aria-hidden="true">
            <div className="marquee-track">
              {[...words, ...words].map((w, i) => <span key={i}>{w}</span>)}
            </div>
          </div>

          {/* الأعمال */}
          <section id="work" className="reveal">
            <div className="container">
              <div className="sec-head">
                <div><div className="eyebrow">٠١ · What I Build</div><h2>وش أبني</h2></div>
                <p>كل مشروع مشكلة تشغيلية تحولت لحل رقمي.</p>
              </div>
              <Slider count={P.projects.length}>
                {P.projects.map((p, i) => (
                  <article key={p.titleEn} className="project slide" aria-roledescription="شريحة" aria-label={`${i + 1} من ${P.projects.length}: ${p.title}`}>
                    {p.link && p.logo ? (
                      <a className={`project-cover has-demo ${p.bg}`} href={p.link} target="_blank" rel="noopener" aria-label={`زيارة ${p.titleEn}`}>
                        <SiteDemo url={p.link} logo={p.logo} name={p.brand ?? p.title} tagline={p.tagline} chips={p.points} />
                      </a>
                    ) : (
                      <div className={`project-cover ${p.bg}`}>
                        {p.logo && <img className="cover-logo" src={p.logo} alt={`شعار ${p.title}`} width={120} height={120} />}
                        <span className="cover-ar">{p.title}</span>
                        <span className="cover-en" lang="en">{p.titleEn}</span>
                      </div>
                    )}
                    <div className="project-body">
                      <span className="chip">{p.label}</span>
                      <h3>{p.title} <small lang="en">{p.titleEn}</small></h3>
                      <dl className="case">
                        <div><dt>المشكلة</dt><dd>{p.problem}</dd></div>
                        <div><dt>الحل</dt><dd>{p.solution}</dd></div>
                        <div><dt>النتيجة</dt><dd>{p.result}</dd></div>
                      </dl>
                      <div className="tags">{p.tags.map((t) => <span key={t} className="chip sky">{t}</span>)}</div>
                      {p.link && <a className="btn btn-ghost" href={p.link} target="_blank" rel="noopener">زيارة الموقع ↗</a>}
                    </div>
                  </article>
                ))}
              </Slider>
            </div>
          </section>

          {/* الأرقام والعملاء */}
          <section id="impact" className="soft reveal">
            <div className="container">
              <div className="sec-head">
                <div><div className="eyebrow">٠٢ · Impact</div><h2>أرقامي</h2></div>
                <p>الأرقام شهادة على الإنجاز.</p>
              </div>
              <div className="impact-grid">
                <StatsCard items={P.impact} />
                <div className="clients-card">
                  <div>
                    <h3>انضم لقائمة عملائي</h3>
                    <p>ما أبني مشاريع وبس، أبني شراكات نجاح.</p>
                  </div>
                  {/* Logos slide past on a loop. The list is repeated 4 times and the row moves by
                      half its length, so it wraps seamlessly and never shows an empty gap. */}
                  <div className="logo-marquee">
                    <ul className="logo-track">
                      {Array.from({ length: 4 }, () => P.clients).flat().map((c, i) => (
                        <li key={i} aria-hidden={i >= P.clients.length}>
                          <img src={c.logo} alt={i < P.clients.length ? `شعار ${c.name}` : ""} width={96} height={64} loading="lazy" />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link className="btn btn-primary" href="/support/submit">كن عميلي التالي</Link>
                </div>
              </div>
            </div>
          </section>

          {/* النبذة والإنجازات */}
          <section id="about" className="reveal">
            <div className="container split">
              <div className="split-head"><div className="eyebrow">٠٣</div><h2>نبذة عني</h2></div>
              <div>
                <div className="pf-about">{P.about.map((t) => <p key={t}>{t}</p>)}</div>
                <div className="stats">
                  {P.achievements.map((s, i) => <div key={s.label} {...st(i)}><b>{s.value}</b><span>{s.label}</span></div>)}
                </div>
              </div>
            </div>
          </section>

          {/* الخبرات */}
          <section id="experience" className="soft reveal">
            <div className="container split">
              <div className="split-head"><div className="eyebrow">٠٤</div><h2>الخبرات والتعليم</h2></div>
              <ol className="timeline">
                {P.experience.map((e, i) => (
                  <li key={e.title} {...st(i)}>
                    <span className="period">{e.period}</span>
                    <div>
                      <h3>{e.title}{e.place && <small> · {e.place}</small>}</h3>
                      {e.points.length > 0 && <ul>{e.points.map((x, k) => <li key={x} {...st(k + 2)}>{x}</li>)}</ul>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* المهارات */}
          <section id="skills" className="reveal">
            <div className="container">
              <div className="sec-head"><div><div className="eyebrow">٠٥</div><h2>مهاراتي</h2></div></div>
              <ul className="skill-rows">
                {P.skills.map((g, i) => (
                  <li key={g.group} className="st" style={{ ["--i" as string]: i }}>
                    <span className="num">٠{arNum(i + 1)}</span>
                    <h3>{g.group}</h3>
                    <div className="skill-chips">{g.items.map((x) => <span key={x} className="chip">{x}</span>)}</div>
                  </li>
                ))}
              </ul>
              <p className="langs-line">
                <b>اللغات:</b> {P.languages.map((l) => `${l.name} (${l.level})`).join(" · ")}
              </p>
            </div>
          </section>

          {/* التواصل */}
          <section id="contact" className="soft reveal">
            <div className="container contact">
              <div className="eyebrow">٠٦ · تواصل معي</div>
              <h2>عندك فكرة أو فرصة؟<br />خلنا نتكلم.</h2>
              <a className="contact-email" href={`mailto:${P.contact.email}`}>{P.contact.email}</a>
              <div className="contact-links">
                <Link className="btn btn-primary" href="/support/submit">اطلب مشروع</Link>
                {P.contact.links.map((l, i) => (
                  <a key={l.label} className="btn btn-ghost st" style={{ ["--i" as string]: i }} href={l.url}
                    {...(l.url.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="mini-foot">
          <div className="container mini-foot-row">
            <a href="#" className="mini-brand"><img src={logoAt(96)} alt="" width={28} height={28} /><span>{P.name}</span></a>
            <nav className="mini-links" aria-label="حساباتي">
              {P.contact.links.map((l) => (
                <a key={l.label} href={l.url} {...(l.url.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>{l.label}</a>
              ))}
              <a href={`mailto:${P.contact.email}`}>الإيميل</a>
            </nav>
            <span className="mini-copy">© {new Date().getFullYear()} · <Link href="/admin">لوحة التحكم</Link></span>
          </div>
        </footer>
      </div>
    </div>
  );
}
