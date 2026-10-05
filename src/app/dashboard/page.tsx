"use client";

import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { collection, getDocs } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { navLinks } from "@/lib/nav";
import {
  AlertTriangle, ArrowUpLeft, Briefcase, CalendarClock, CheckCircle2, Circle, FileDigit, FileText, LifeBuoy, PlusCircle, Receipt, Repeat, Wallet,
} from "lucide-react";
import { PRIORITY, dueInfo, type Task } from "@/app/tasks/model";
import { computeProgress, daysUntil, kindOf, stageOf, CLIENT_STAGES, type Project } from "@/app/projects/model";
import { toDate } from "@/app/support/model";

interface Tx { amount: number; type: "income" | "expense"; date: string }
interface Inv { id: string; invoiceNumber?: string; clientName?: string; clientCompany?: string; total?: number; status?: string; dueDate?: string }
interface Ticket { id: string; subject: string; customerName: string; status: string; updatedAt: unknown }
interface Sub { id: string; serviceName: string; amount: number; renewalDate: string; cycle?: "monthly" | "yearly"; status?: string }

const n = (x: number) => new Intl.NumberFormat("ar-SA").format(Math.round(x || 0));
const todayStart = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
const nextRenewal = (s: Sub) => {
  let d = toDate(s.renewalDate);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  for (let i = 0; d < todayStart() && i < 600; i++) { d = new Date(d); if (s.cycle === "yearly") d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1); }
  return d;
};

type Alert = { key: string; href: string; icon: React.ElementType; text: string; meta?: string; urgent?: boolean };

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [txs, setTxs] = React.useState<Tx[]>([]);
  const [invoices, setInvoices] = React.useState<Inv[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [subs, setSubs] = React.useState<Sub[]>([]);
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const get = <T,>(c: string) => getDocs(collection(db, c)).then((s) => s.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as T)).catch(() => [] as T[]);
    Promise.all([get<Tx>("transactions"), get<Inv>("invoices"), get<Task>("tasks"), get<Project>("projects"), get<Ticket>("support_tickets"), get<Sub>("subscriptions")])
      .then(([t, i, ta, p, ti, s]) => { setTxs(t); setInvoices(i); setTasks(ta.map((x) => ({ ...x, subTasks: x.subTasks || [] }))); setProjects(p); setTickets(ti); setSubs(s); })
      .finally(() => setLoading(false));
  }, []);

  // Money this month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthTx = txs.filter((t) => { const d = toDate(t.date); return d && d >= monthStart; });
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const receivable = unpaid.reduce((s, i) => s + (Number(i.total) || 0), 0);

  // Tasks
  const open = tasks.filter((t) => t.status !== "done");
  const withDue = open.map((t) => ({ t, due: dueInfo(t.dueDate) }));
  const lateTasks = withDue.filter((x) => x.due?.tone === "late");
  const todayTasks = withDue.filter((x) => x.due?.tone === "today");
  const focus = [...withDue]
    .sort((a, b) => (a.due?.days ?? 999) - (b.due?.days ?? 999) || ["high", "medium", "low"].indexOf(a.t.priority) - ["high", "medium", "low"].indexOf(b.t.priority))
    .slice(0, 6);

  // Projects
  const activeClient = projects.filter((p) => kindOf(p) === "client" && stageOf(p) !== CLIENT_STAGES.delivered);
  const activeAll = projects.filter((p) => (kindOf(p) === "client" ? stageOf(p) !== CLIENT_STAGES.delivered : !["launched", "paused"].includes(String(p.stage))));
  const newTickets = tickets.filter((t) => t.status === "new");

  // Attention list
  const alerts: Alert[] = [];
  lateTasks.forEach(({ t, due }) => alerts.push({ key: `t${t.id}`, href: "/tasks", icon: CheckCircle2, text: t.title, meta: due!.text, urgent: true }));
  unpaid.filter((i) => (daysUntil(i.dueDate) ?? 0) < 0).forEach((i) => alerts.push({ key: `i${i.id}`, href: `/tools/invoice-generator?id=${i.id}`, icon: Receipt, text: `فاتورة ${i.invoiceNumber ?? ""} · ${i.clientCompany || i.clientName || ""}`, meta: `متأخرة · ${n(Number(i.total))} ريال`, urgent: true }));
  newTickets.forEach((t) => alerts.push({ key: `s${t.id}`, href: `/support/${t.id}`, icon: LifeBuoy, text: t.subject || "طلب جديد", meta: `من ${t.customerName}` }));
  todayTasks.forEach(({ t }) => alerts.push({ key: `d${t.id}`, href: "/tasks", icon: CalendarClock, text: t.title, meta: "موعدها اليوم" }));
  activeClient.forEach((p) => { const d = daysUntil(p.endDate); if (d !== null && d <= 7) alerts.push({ key: `p${p.id}`, href: `/projects/${p.id}`, icon: Briefcase, text: p.name, meta: d < 0 ? `تسليم متأخر ${n(-d)} يوم` : d === 0 ? "التسليم اليوم" : `التسليم بعد ${n(d)} يوم`, urgent: d <= 0 }); });
  subs.filter((s) => (s.status ?? "active") === "active").forEach((s) => { const d = nextRenewal(s); const days = d ? Math.round((d.getTime() - todayStart().getTime()) / 86400000) : null; if (days !== null && days <= 3) alerts.push({ key: `r${s.id}`, href: "/finance/subscriptions", icon: Repeat, text: `${s.serviceName} يتجدد`, meta: `${days === 0 ? "اليوم" : days === 1 ? "بكرة" : `بعد ${n(days)} أيام`} · ${n(s.amount)} ريال` }); });

  const hour = now?.getHours() ?? 12;
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";
  const dateText = now?.toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { weekday: "long", day: "numeric", month: "long" }) ?? "";

  const tiles = [
    { href: "/finance", icon: Wallet, label: "صافي هالشهر", value: <>{n(income - expense)} <span className="saudi-riyal">&#xea;</span></>, sub: `دخل ${n(income)} · مصروف ${n(expense)}`, dark: true },
    { href: "/finance/invoices", icon: Receipt, label: "مستحق عند العملاء", value: <>{n(receivable)} <span className="saudi-riyal">&#xea;</span></>, sub: `${n(unpaid.length)} فاتورة مفتوحة` },
    { href: "/tasks", icon: CheckCircle2, label: "المهام المفتوحة", value: n(open.length), sub: lateTasks.length ? `${n(lateTasks.length)} متأخرة` : todayTasks.length ? `${n(todayTasks.length)} اليوم` : "ما فيه متأخر", warn: lateTasks.length > 0 },
    { href: "/projects", icon: Briefcase, label: "مشاريع جارية", value: n(activeAll.length), sub: `${n(activeClient.length)} لعملاء` },
  ];

  const quick = [
    { href: "/tasks", icon: CheckCircle2, label: "مهمة" },
    { href: "/projects", icon: Briefcase, label: "مشروع" },
    { href: "/tools/quote-builder", icon: FileText, label: "عرض سعر" },
    { href: "/tools/invoice-generator", icon: FileDigit, label: "فاتورة" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      {/* Greeting */}
      <header className="mb-6 flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{dateText}</p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">{greeting} يا أحمد</h1>
          <p className="mt-1 text-muted-foreground">
            {loading ? "…" : alerts.length ? `عندك ${n(alerts.length)} ${alerts.length === 1 ? "شي يحتاجك" : "أشياء تحتاجك"} اليوم.` : "كل شي تمام، ما فيه شي متأخر 👌"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <Link key={q.label} href={q.href} className="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors hover:border-foreground hover:bg-muted">
              <PlusCircle className="h-4 w-4" /> {q.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Tiles */}
      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={cn("group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md", t.dark ? "bg-foreground text-background" : "bg-card hover:border-foreground/40", t.warn && "border-destructive/40")}>
            <div className="flex items-center justify-between">
              <p className={cn("text-xs", t.dark ? "opacity-80" : "text-muted-foreground")}>{t.label}</p>
              <t.icon className={cn("h-4 w-4", t.dark ? "opacity-70" : "text-muted-foreground")} />
            </div>
            {loading ? <Skeleton className="mt-2 h-7 w-2/3" /> : <p className="mt-1 text-xl font-bold md:text-2xl">{t.value}</p>}
            <p className={cn("text-[11px]", t.dark ? "opacity-70" : t.warn ? "font-semibold text-destructive" : "text-muted-foreground")}>{loading ? "" : t.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mb-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Attention */}
        <section className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> يحتاج انتباهك</h2>
            {!loading && <span className="text-xs text-muted-foreground">{n(alerts.length)}</span>}
          </div>
          {loading ? <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          : alerts.length ? (
            <ul className="divide-y">
              {alerts.slice(0, 8).map((a) => (
                <li key={a.key}>
                  <Link href={a.href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", a.urgent ? "bg-destructive/10 text-destructive" : "bg-muted")}><a.icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{a.text}</span><span className={cn("block truncate text-xs", a.urgent ? "text-destructive" : "text-muted-foreground")}>{a.meta}</span></span>
                    <ArrowUpLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="p-10 text-center text-sm text-muted-foreground">ولا شي متأخر أو ينتظرك. يوم رايق ☕</p>}
        </section>

        <div className="space-y-6">
          {/* Focus tasks */}
          <section className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-bold">مهامك القريبة</h2>
              <Link href="/tasks" className="text-xs text-muted-foreground hover:text-foreground">كل المهام ←</Link>
            </div>
            {loading ? <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            : focus.length ? (
              <ul className="divide-y">
                {focus.map(({ t, due }) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY[t.priority]?.dot)} title={PRIORITY[t.priority]?.label} />
                    {due && <span className={cn("shrink-0 text-[11px]", due.tone === "late" ? "font-semibold text-destructive" : due.tone === "today" ? "font-semibold text-amber-600" : "text-muted-foreground")}>{due.text}</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="p-8 text-center text-sm text-muted-foreground">ما فيه مهام مفتوحة 🎉</p>}
          </section>

          {/* Active client projects */}
          {activeClient.length > 0 && (
            <section className="rounded-2xl border bg-card">
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="font-bold">مشاريع العملاء الجارية</h2>
                <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground">كل المشاريع ←</Link>
              </div>
              <ul className="divide-y">
                {activeClient.slice(0, 4).map((p) => {
                  const prog = computeProgress(p, tasks);
                  return (
                    <li key={p.id}>
                      <Link href={`/projects/${p.id}`} className="block px-4 py-3 hover:bg-muted/50">
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-semibold">{p.name} <span className="text-xs font-normal text-muted-foreground">· {p.clientName}</span></span>
                          <span className="shrink-0 text-xs font-bold tabular-nums">{n(prog)}٪</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: `${prog}%` }} /></div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* All sections */}
      <section className="space-y-6">
        {navLinks.map((group) => (
          <div key={group.category}>
            <h2 className="mb-3 text-sm font-bold text-muted-foreground">{group.category}</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {group.links.map((l) => (
                <Link key={l.href} href={l.href} className="group flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-md">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted transition-colors group-hover:bg-foreground group-hover:text-background"><l.icon className="h-5 w-5" /></span>
                  <span className="text-xs font-semibold leading-snug">{l.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
