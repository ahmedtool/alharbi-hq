"use client";

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { collection, getDocs } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Download, Printer } from "lucide-react";

/* Model --------------------------------------------------------------------- */
interface Transaction { id: string; description: string; amount: number; type: "income" | "expense"; category: string; date: string }
interface InvoiceLite { id: string; clientName?: string; clientCompany?: string; total?: number; status?: string; invoiceDate?: string; dueDate?: string; paidAt?: string }

// Same validated pair as the finance overview (blue = income, orange = expenses).
const chartVars = "[--inc:#2a78d6] [--exp:#eb6834] dark:[--inc:#3987e5] dark:[--exp:#d95926]";
const n = (x: number) => new Intl.NumberFormat("ar-SA").format(Math.round(x || 0));
const day = (iso?: string) => { if (!iso) return null; const d = new Date(iso.length > 10 ? iso : iso + "T00:00:00"); return isNaN(d.getTime()) ? null : d; };
const monthName = (m: number) => new Date(2026, m, 1).toLocaleDateString("ar-SA-u-ca-gregory", { month: "long" });
const sum = (l: { amount: number }[]) => l.reduce((s, t) => s + t.amount, 0);
const change = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null);

function Delta({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null || !isFinite(value)) return <span className="text-[11px] text-muted-foreground">ما فيه مقارنة</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{n(Math.abs(value))}٪ عن السنة اللي قبل
    </span>
  );
}

/** Horizontal bar list for one measure (single hue = magnitude). */
function BarList({ rows, color, total, empty }: { rows: [string, number][]; color: string; total: number; empty: string }) {
  const max = rows[0]?.[1] || 1;
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.slice(0, 7).map(([k, v]) => (
        <li key={k} className="space-y-1">
          <div className="flex justify-between gap-3 text-xs"><span className="truncate">{k}</span><span className="whitespace-nowrap font-bold">{n(v)} ريال · {n((v / (total || 1)) * 100)}٪</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", color)} style={{ width: `${(v / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

const Section = ({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-2xl border bg-card p-5 break-inside-avoid", className)}>
    <div className="mb-4"><h3 className="font-bold">{title}</h3>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
    {children}
  </section>
);

/* Page ---------------------------------------------------------------------- */
export default function ReportsPage() {
  const [txs, setTxs] = React.useState<Transaction[]>([]);
  const [invoices, setInvoices] = React.useState<InvoiceLite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [year, setYear] = React.useState(new Date().getFullYear());

  React.useEffect(() => {
    Promise.all([getDocs(collection(db, "transactions")), getDocs(collection(db, "invoices"))])
      .then(([t, i]) => {
        setTxs(t.docs.map((d) => ({ ...(d.data() as Omit<Transaction, "id">), id: d.id, amount: Number(d.data().amount) || 0 })));
        setInvoices(i.docs.map((d) => ({ ...(d.data() as Omit<InvoiceLite, "id">), id: d.id })));
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const years = React.useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    txs.forEach((t) => { const d = day(t.date); if (d) set.add(d.getFullYear()); });
    return [...set].sort((a, b) => b - a);
  }, [txs]);

  const inYear = (y: number) => txs.filter((t) => day(t.date)?.getFullYear() === y);
  const cur = inYear(year);
  const prev = inYear(year - 1);
  const inc = cur.filter((t) => t.type === "income"), exp = cur.filter((t) => t.type === "expense");
  const income = sum(inc), expenses = sum(exp), net = income - expenses;
  const pIncome = sum(prev.filter((t) => t.type === "income")), pExpenses = sum(prev.filter((t) => t.type === "expense"));

  const isCurrentYear = year === new Date().getFullYear();
  const monthsSoFar = isCurrentYear ? new Date().getMonth() + 1 : 12;
  const months = Array.from({ length: 12 }, (_, m) => {
    const list = cur.filter((t) => day(t.date)?.getMonth() === m);
    const i = sum(list.filter((t) => t.type === "income")), e = sum(list.filter((t) => t.type === "expense"));
    return { m, income: i, expense: e, net: i - e, future: isCurrentYear && m > new Date().getMonth() };
  });
  let running = 0;
  const monthRows = months.map((r) => ({ ...r, cumulative: (running += r.net) }));
  const maxMonth = Math.max(1, ...months.map((r) => Math.max(r.income, r.expense)));
  const best = [...months].filter((r) => !r.future).sort((a, b) => b.net - a.net)[0];

  const group = (list: Transaction[]) => Object.entries(list.reduce<Record<string, number>>((m, t) => { const k = t.category || "أخرى"; m[k] = (m[k] || 0) + t.amount; return m; }, {})).sort((a, b) => b[1] - a[1]);

  // Invoices issued this year
  const yInv = invoices.filter((i) => day(i.invoiceDate)?.getFullYear() === year);
  const paid = yInv.filter((i) => i.status === "paid");
  const clients = Object.entries(paid.reduce<Record<string, number>>((m, i) => { const k = i.clientCompany || i.clientName || "بدون اسم"; m[k] = (m[k] || 0) + (Number(i.total) || 0); return m; }, {})).sort((a, b) => b[1] - a[1]);
  const payDays = paid.map((i) => { const a = day(i.invoiceDate), b = day(i.paidAt); return a && b ? Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000)) : null; }).filter((x): x is number => x !== null);
  const avgPayDays = payDays.length ? payDays.reduce((s, x) => s + x, 0) / payDays.length : null;
  const outstanding = yInv.filter((i) => i.status !== "paid").reduce((s, i) => s + (Number(i.total) || 0), 0);

  const exportCsv = () => {
    const rows = [["التاريخ", "النوع", "التصنيف", "الوصف", "المبلغ"], ...[...cur].sort((a, b) => (a.date || "").localeCompare(b.date || "")).map((t) => [
      (t.date || "").slice(0, 10), t.type === "income" ? "دخل" : "مصروف", t.category, t.description, String(t.amount),
    ])];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `المالية-${year}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };
  const print = () => { const old = document.title; document.title = `التقرير المالي ${year}`; window.print(); document.title = old; };

  return (
    <div className={cn("contract-page p-4 sm:p-6 lg:p-8 text-right", chartVars)}>
      <div className="no-print">
        <PageHeader title="التقارير" description="صورة سنتك المالية: شهر بشهر، من وين الدخل، ووين يروح.">
          <Button variant="outline" onClick={exportCsv} disabled={!cur.length}><Download className="me-2 h-4 w-4" /> CSV</Button>
          <Button onClick={print}><Printer className="me-2 h-4 w-4" /> طباعة / PDF</Button>
        </PageHeader>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-muted p-1">
            {years.map((y) => (
              <button key={y} type="button" onClick={() => setYear(y)}
                className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", year === y ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {new Intl.NumberFormat("ar-SA", { useGrouping: false }).format(y)}
              </button>
            ))}
          </div>
          <Link href="/finance" className="text-sm text-muted-foreground hover:text-foreground">المعاملات في صفحة المالية ←</Link>
        </div>
      </div>

      {/* print-only heading */}
      <div className="mb-6 hidden border-b-2 border-foreground pb-3 print:block">
        <p className="text-2xl font-bold">التقرير المالي لسنة {new Intl.NumberFormat("ar-SA", { useGrouping: false }).format(year)}</p>
        <p className="text-xs">أحمد الحربي · ahmedalharbi.com</p>
      </div>

      {loading ? (
        <div className="space-y-4"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <div className="rounded-2xl border bg-foreground p-4 text-background">
              <p className="text-xs opacity-80">صافي الربح</p>
              <p className="mt-1 text-xl font-bold md:text-2xl">{n(net)} <span className="saudi-riyal">&#xea;</span></p>
              <p className="text-[11px] opacity-80">{income > 0 ? `هامش ${n((net / income) * 100)}٪` : "ما فيه دخل"}</p>
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><i className="h-2 w-2 rounded-sm bg-[var(--inc)]" />الدخل</p>
              <p className="mt-1 text-xl font-bold md:text-2xl">{n(income)} <span className="saudi-riyal">&#xea;</span></p>
              <Delta value={change(income, pIncome)} />
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><i className="h-2 w-2 rounded-sm bg-[var(--exp)]" />المصاريف</p>
              <p className="mt-1 text-xl font-bold md:text-2xl">{n(expenses)} <span className="saudi-riyal">&#xea;</span></p>
              <Delta value={change(expenses, pExpenses)} invert />
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">متوسط الدخل الشهري</p>
              <p className="mt-1 text-xl font-bold md:text-2xl">{n(income / monthsSoFar)} <span className="saudi-riyal">&#xea;</span></p>
              <p className="text-[11px] text-muted-foreground">{best && best.net > 0 ? `أفضل شهر: ${monthName(best.m)}` : `على ${n(monthsSoFar)} شهر`}</p>
            </div>
          </div>

          <Section title="شهر بشهر" sub="الدخل والمصاريف والصافي، والتراكمي من بداية السنة">
            <div className="hidden items-center gap-4 pb-3 text-xs text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--inc)]" /> الدخل</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--exp)]" /> المصاريف</span>
            </div>
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full text-xs sm:min-w-[560px] sm:text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 text-start font-semibold">الشهر</th>
                    <th className="hidden w-[38%] py-2 text-start font-semibold sm:table-cell" />
                    <th className="py-2 text-end font-semibold">الدخل</th>
                    <th className="py-2 text-end font-semibold">المصاريف</th>
                    <th className="py-2 text-end font-semibold">الصافي</th>
                    <th className="py-2 text-end font-semibold">التراكمي</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map((r) => (
                    <tr key={r.m} className={cn("border-b last:border-0", r.future && "opacity-40")}>
                      <td className="py-2.5 font-semibold">{monthName(r.m)}</td>
                      <td className="hidden py-2.5 pe-4 sm:table-cell">
                        <div className="space-y-1" title={`الدخل ${n(r.income)} · المصاريف ${n(r.expense)}`}>
                          <div className="h-2 rounded-full bg-[var(--inc)]" style={{ width: `${(r.income / maxMonth) * 100}%`, minWidth: r.income ? 4 : 0 }} />
                          <div className="h-2 rounded-full bg-[var(--exp)]" style={{ width: `${(r.expense / maxMonth) * 100}%`, minWidth: r.expense ? 4 : 0 }} />
                        </div>
                      </td>
                      <td className="py-2.5 text-end tabular-nums">{r.income ? n(r.income) : "—"}</td>
                      <td className="py-2.5 text-end tabular-nums">{r.expense ? n(r.expense) : "—"}</td>
                      <td className={cn("py-2.5 text-end font-bold tabular-nums", r.net < 0 && "text-destructive")}>{r.income || r.expense ? n(r.net) : "—"}</td>
                      <td className={cn("py-2.5 text-end tabular-nums text-muted-foreground", r.cumulative < 0 && "text-destructive")}>{r.future ? "" : n(r.cumulative)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-foreground font-bold">
                    <td className="py-2.5">المجموع</td><td className="hidden sm:table-cell" />
                    <td className="py-2.5 text-end tabular-nums">{n(income)}</td>
                    <td className="py-2.5 text-end tabular-nums">{n(expenses)}</td>
                    <td className={cn("py-2.5 text-end tabular-nums", net < 0 && "text-destructive")}>{n(net)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="من وين الدخل" sub="حسب التصنيف">
              <BarList rows={group(inc)} color="bg-[var(--inc)]" total={income} empty="ما فيه دخل بهالسنة." />
            </Section>
            <Section title="وين تروح المصاريف" sub="حسب التصنيف">
              <BarList rows={group(exp)} color="bg-[var(--exp)]" total={expenses} empty="ما فيه مصاريف بهالسنة." />
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="أكبر العملاء" sub="من الفواتير المدفوعة بهالسنة">
              <BarList rows={clients} color="bg-[var(--inc)]" total={clients.reduce((s, [, v]) => s + v, 0)} empty="ما فيه فواتير مدفوعة بهالسنة." />
            </Section>
            <Section title="التحصيل" sub="الفواتير اللي صدرت بهالسنة">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "فواتير صدرت", value: n(yInv.length) },
                  { label: "انحصّلت", value: `${n(paid.length)}${yInv.length ? ` (${n((paid.length / yInv.length) * 100)}٪)` : ""}` },
                  { label: "باقي عند العملاء", value: `${n(outstanding)} ريال` },
                  { label: "متوسط مدة السداد", value: avgPayDays === null ? "—" : `${n(avgPayDays)} يوم` },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-muted/60 p-3">
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className="mt-0.5 text-lg font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
              {avgPayDays === null && paid.length > 0 && <p className="mt-3 text-[11px] text-muted-foreground">مدة السداد تنحسب للفواتير اللي تسجّل دفعها من زر «تم الدفع».</p>}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
