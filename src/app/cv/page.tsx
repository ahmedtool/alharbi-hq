"use client";

import Link from "next/link";
import { PublicShell } from "@/components/app/public-shell";
import { PROFILE as P } from "@/app/_portfolio/profile";
import { logoAt } from "@/lib/brand";

const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** A one-page résumé built from the same profile data as the home page; prints cleanly to PDF. */
export default function CvPage() {
  const accounts = P.contact.links.filter((l) => l.url.startsWith("http"));
  const ventures = P.projects.filter((p) => p.link);

  return (
    <PublicShell active="cv">
      <div className="pf pf-bar cv">
        <article className="container cv-sheet">
          {/* Header */}
          <header className="cv-head">
            <img className="cv-avatar" src={logoAt(192)} alt="" width={84} height={84} />
            <div className="cv-id">
              <h1>{P.fullName}</h1>
              <p className="cv-role">{P.role}<span className="cv-role-en" lang="en" dir="ltr">{P.roleEn}</span></p>
              <ul className="cv-contact">
                <li><a href={`mailto:${P.contact.email}`} dir="ltr">{P.contact.email}</a></li>
                <li><a href="https://www.ahmedalharbi.com" dir="ltr">ahmedalharbi.com</a></li>
                {accounts.map((l) => <li key={l.label}><a href={l.url} target="_blank" rel="noopener" dir="ltr">{l.label}: {host(l.url).split("/").pop()}</a></li>)}
                <li>📍 {P.city}</li>
              </ul>
            </div>
            <div className="cv-actions no-print">
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>تحميل PDF</button>
              <Link href="/support/submit" className="btn btn-ghost">تواصل معي</Link>
            </div>
          </header>

          <p className="cv-summary">{P.about[0]}</p>

          <div className="cv-grid">
            <div className="cv-main">
              {/* Experience as a timeline */}
              <section className="cv-sec">
                <h2><span>٠١</span> الخبرة</h2>
                <ol className="cv-timeline">
                  {P.experience.map((e) => (
                    <li key={e.title}>
                      <div className="cv-tl-head">
                        <h3>{e.title}</h3>
                        {e.period && <span className="cv-tag">{e.period}</span>}
                      </div>
                      {e.place && <p className="cv-place">{e.place}</p>}
                      <ul>{e.points.map((x) => <li key={x}>{x}</li>)}</ul>
                    </li>
                  ))}
                  {ventures.map((p) => (
                    <li key={p.titleEn}>
                      <div className="cv-tl-head">
                        <h3>مؤسس · {p.brand ?? p.title}</h3>
                        <a className="cv-tag" href={p.link} target="_blank" rel="noopener" dir="ltr">{host(p.link)}</a>
                      </div>
                      <p className="cv-place">{p.label}</p>
                      <ul>
                        <li>{p.solution}</li>
                        <li>{p.result}</li>
                      </ul>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <aside className="cv-side">
              <section className="cv-sec">
                <h2><span>٠٢</span> التعليم</h2>
                {P.education.map((ed) => (
                  <div key={ed.title} className="cv-card">
                    <b>{ed.title}</b>
                    <small>{ed.place}</small>
                  </div>
                ))}
              </section>

              <section className="cv-sec">
                <h2><span>٠٣</span> المهارات</h2>
                <dl className="cv-skills">
                  {P.skills.map((g) => (
                    <div key={g.group}>
                      <dt>{g.group}</dt>
                      <dd>{g.items.join(" · ")}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="cv-sec">
                <h2><span>٠٤</span> الإنجازات</h2>
                <ul className="cv-wins">
                  {P.achievements.map((a) => <li key={a.label}><b>{a.value}</b>{a.label}</li>)}
                </ul>
              </section>

              <section className="cv-sec">
                <h2><span>٠٥</span> اللغات</h2>
                <ul className="cv-langs">
                  {P.languages.map((l) => <li key={l.name}><b>{l.name}</b><small>{l.level}</small></li>)}
                </ul>
              </section>
            </aside>
          </div>
        </article>
      </div>
    </PublicShell>
  );
}
