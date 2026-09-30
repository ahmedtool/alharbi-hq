"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PROFILE } from "./_portfolio/profile";
import { logoAt } from "@/lib/brand";
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

/** Counts up to `to` the first time it scrolls into view. */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { setN(to); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - start) / 1800, 1);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}>{arNum(n)}</span>;
}

/** Screenshot of a site's current home page at desktop size (1280x800), from WordPress.com's mShots. */
const siteShot = (url: string) =>
  `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=1280&h=800&vpw=1280&vph=800`;

/**
 * A soft-edged window showing a site's current look, for project covers. Sites
 * often forbid being embedded, so this is an up-to-date screenshot rather than
 * an iframe. Until the screenshot is ready (the service first returns a small
 * placeholder) or if it fails, the project logo is shown instead.
 */
function SitePreview({ url, logo, title }: { url: string; logo?: string; title: string }) {
  const [ready, setReady] = useState(false);
  // The service answers with a small "generating" placeholder while it takes a
  // fresh capture, so ask again a few times until the real screenshot arrives.
  const [attempt, setAttempt] = useState(0);
  const retry = () => { if (attempt < 6) setTimeout(() => setAttempt((a) => a + 1), 4000 + attempt * 2000); };
  const host = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return (
    <div className="site-frame" aria-hidden="true">
      <div className="site-bar">
        <span className="dots"><i /><i /><i /></span>
        <span className="site-url" lang="en" dir="ltr">{host}</span>
      </div>
      <div className="site-screen">
        <img
          className={`site-shot ${ready ? "ready" : ""}`}
          src={siteShot(url) + (attempt ? `&r=${attempt}` : "")}
          alt=""
          loading="lazy"
          onLoad={(e) => {
            const ok = e.currentTarget.naturalWidth > 600;
            setReady(ok);
            if (!ok) retry();
          }}
          onError={retry}
        />
        {!ready && (
          <div className="site-fallback">
            {logo && <img src={logo} alt="" width={96} height={96} />}
            <span lang="en">{title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Adds the staggered-appearance classes to a list item. */
const st = (i: number) => ({ className: "st", style: { ["--i" as string]: i } as React.CSSProperties });

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [intro, setIntro] = useState<"hidden" | "play" | "lift">("hidden");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);

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

  // Dark mode shares the dashboard's setting (localStorage "theme" + html.dark).
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    setDark(next);
  };

  const words = [...P.interests, ...P.skills.map((g) => g.group)];
  const nav = [
    { href: "#work", label: "وش أبني" },
    { href: "#impact", label: "أرقامي" },
    { href: "#about", label: "نبذة" },
    { href: "#experience", label: "خبراتي" },
    { href: "#skills", label: "مهاراتي" },
    { href: "#contact", label: "تواصل معي" },
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

        <div className="progress" ref={progressRef} aria-hidden="true" />

        <div className="pf-sticky">
          <a className="skip" href="#main">تخطَّ إلى المحتوى</a>
          <header className="site-header">
            <div className="container nav">
              <a href="#" className="logo" aria-label={`${P.name} - الرئيسية`}>
                <img className="logo-img" src={logoAt(96)} alt="" width={36} height={36} />
                <span>{P.name}<small lang="en">{P.nameEn}</small></span>
              </a>
              <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
                <a href="#" className="active" onClick={() => setMenuOpen(false)}>الرئيسية</a>
                {nav.map((n) => <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</a>)}
              </nav>
              <div className="nav-actions">
                <button className="icon-btn" onClick={toggleTheme} aria-label="تبديل الوضع الليلي">{dark ? "☀️" : "🌙"}</button>
                <button className="icon-btn menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="القائمة">☰</button>
              </div>
            </div>
          </header>
        </div>

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
              <div className="projects">
                {P.projects.map((p, i) => (
                  <article key={p.titleEn} className={`project st ${i === 0 ? "lead" : ""}`} style={{ ["--i" as string]: i }}>
                    {p.preview ? (
                      <a className={`project-cover has-site ${p.bg}`} href={p.link || p.preview} target="_blank" rel="noopener" aria-label={`زيارة ${p.titleEn}`}>
                        <span className="live-pill"><i /> الواجهة الحالية</span>
                        <SitePreview url={p.preview} logo={p.logo} title={p.titleEn} />
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
                      <ul className="points">{p.points.map((x, k) => <li key={x} {...st(k + 2)}>{x}</li>)}</ul>
                      <div className="tags">{p.tags.map((t) => <span key={t} className="chip sky">{t}</span>)}</div>
                      {p.link && <a className="btn btn-ghost" href={p.link} target="_blank" rel="noopener">زيارة الموقع ↗</a>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* الأرقام والعملاء */}
          <section id="impact" className="soft reveal">
            <div className="container">
              <div className="sec-head">
                <div><div className="eyebrow">٠٢ · Impact</div><h2>أرقامي</h2></div>
                <p>الأرقام شهادة على الإنجاز.</p>
              </div>
              <div className="impact">
                {P.impact.map((m, i) => (
                  <div key={m.title} className="impact-item st" style={{ ["--i" as string]: i }}>
                    <div className="impact-num"><b>+<CountUp to={m.value} /></b><span>{m.unit}</span></div>
                    <h3>{m.title}</h3>
                    <p>{m.desc}</p>
                  </div>
                ))}
              </div>
              <div className="clients">
                <div>
                  <h3>انضم لقائمة عملائي</h3>
                  <p>ما أبني مشاريع وبس، أبني شراكات نجاح.</p>
                </div>
                <Link className="btn btn-primary" href="/support/submit">كن عميلي التالي</Link>
                <ul className="clients-logos">
                  {P.clients.map((c, i) => (
                    <li key={c.logo} {...st(i + 2)}><img src={c.logo} alt={`شعار ${c.name}`} width={72} height={72} loading="lazy" /></li>
                  ))}
                </ul>
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
              <div className="skills">
                {P.skills.map((g, i) => (
                  <div key={g.group} className="skill-group st" style={{ ["--i" as string]: i }}>
                    <span className="num">٠{arNum(i + 1)}</span>
                    <h3>{g.group}</h3>
                    <ul>{g.items.map((x, k) => <li key={x} {...st(k + 2)}>{x}</li>)}</ul>
                  </div>
                ))}
              </div>
              <div className="extras">
                <div>
                  <h3>اللغات</h3>
                  <ul className="langs">{P.languages.map((l, i) => <li key={l.name} {...st(i)}><b>{l.name}</b><span>{l.level}</span></li>)}</ul>
                </div>
                <div>
                  <h3>اهتماماتي</h3>
                  <div className="interests">{P.interests.map((x, i) => <span key={x} className="pill st" style={{ ["--i" as string]: i }}>{x}</span>)}</div>
                </div>
              </div>
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

        <footer className="site-footer">
          <div className="container">
            <div className="foot-grid">
              <div>
                <a href="#" className="logo"><img className="logo-img" src={logoAt(96)} alt="" width={36} height={36} /><span>{P.name}</span></a>
                <p style={{ marginTop: 12, maxWidth: 380 }}>{P.intro}</p>
              </div>
              <div>
                <h5>روابط</h5>
                <ul>
                  {nav.map((n) => <li key={n.href}><a href={n.href}>{n.label}</a></li>)}
                  <li><Link href="/bio">صفحة روابطي</Link></li>
                </ul>
              </div>
              <div>
                <h5>حساباتي</h5>
                <ul>
                  {P.contact.links.filter((l) => l.url.startsWith("http")).map((l) => (
                    <li key={l.label}><a href={l.url} target="_blank" rel="noopener">{l.label} ↗</a></li>
                  ))}
                  <li><a href={`mailto:${P.contact.email}`}>الإيميل</a></li>
                </ul>
              </div>
            </div>
            <div className="copy">
              <span>© {new Date().getFullYear()} {P.name}</span>
              <Link href="/admin">لوحة التحكم</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
