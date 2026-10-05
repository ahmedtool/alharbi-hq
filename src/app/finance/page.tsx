"use client";

import * as React from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db } from "@/lib/db";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Choices, Field } from "@/components/app/form-bits";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, BarChart3, FileDigit, FileText, Loader2, MoreHorizontal, Package, Repeat, Zap } from "lucide-react";

/* Model --------------------------------------------------------------------- */
type TxType = "income" | "expense";
interface Transaction { id: string; description: string; amount: number; type: TxType; category: string; date: string }
interface InvoiceLite { id: string; invoiceNumber?: string; clientName?: string; clientCompany?: string; total?: number; status?: string; dueDate?: string }
interface SubLite { id: string; serviceName: string; amount: number; renewalDate: string; cycle?: "monthly" | "yearly"; status?: string }

const CATEGORIES: Record<TxType, string[]> = {
  income: ["مشاريع", "دخل فواتير", "منتجات رقمية", "استشارات", "أخرى"],
  expense: ["اشتراكات", "أدوات وبرامج", "تسويق", "معدات", "رسوم وعمولات", "أخرى"],
};
type Period = "month" | "3m" | "year" | "all";
const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "هالشهر" }, { key: "3m", label: "آخر ٣ شهور" }, { key: "year", label: "هالسنة" }, { key: "all", label: "الكل" },
];

const n = (x: number) => new Intl.NumberFormat("ar-SA").format(Math.round(x || 0));
const day = (iso?: string) => { if (!iso) return null; const d = new Date(iso.length > 10 ? iso : iso + "T00:00:00"); return isNaN(d.getTime()) ? null : d; };
const todayStart = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
const periodStart = (p: Period) => {
  const t = new Date();
  if (p === "month") return new Date(t.getFullYear(), t.getMonth(), 1);
  if (p === "3m") return new Date(t.getFullYear(), t.getMonth() - 2, 1);
  if (p === "year") return new Date(t.getFullYear(), 0, 1);
  return null;
};
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Where an auto-created transaction came from (invoices and subscriptions write them). */
const sourceOf = (t: Transaction) =>
  t.id.startsWith("inv_") ? { label: "من فاتورة", href: `/tools/invoice-generator?id=${t.id.slice(4)}` }
  : t.id.startsWith("sub_") ? { label: "من اشتراك", href: "/finance/subscriptions" }
  : null;
const nextRenewal = (s: SubLite) => {
  let d = day(s.renewalDate);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  const t = todayStart();
  for (let i = 0; d < t && i < 600; i++) { d = new Date(d); if (s.cycle === "yearly") d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1); }
  return d;
};

/* Transaction form ---------------------------------------------------------- */
function TransactionForm({ tx, presetType, onSaved, onClose }: { tx: Transaction | null; presetType: TxType; onSaved: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const [type, setType] = React.useState<TxType>(tx?.type ?? presetType);
  const [amount, setAmount] = React.useState<number | "">(tx?.amount ?? "");
  const [description, setDescription] = React.useState(tx?.description ?? "");
  const [category, setCategory] = React.useState(tx?.category ?? CATEGORIES[presetType][0]);
  const [date, setDate] = React.useState(tx ? isoDay(day(tx.date) ?? new Date()) : isoDay(new Date()));
  const [saving, setSaving] = React.useState(false);

  const switchType = (t: TxType) => { setType(t); if (!CATEGORIES[t].includes(category)) setCategory(CATEGORIES[t][0]); };

  const save = async () => {
    if (!amount || !description.trim() || !category.trim()) return toast({ variant: "destructive", title: "اكتب المبلغ والوصف والتصنيف" });
    setSaving(true);
    try {
      const data = { type, amount: Number(amount), description: description.trim(), category: category.trim(), date: new Date(date + "T12:00:00").toISOString() };
      if (tx) await updateDoc(doc(db, "transactions", tx.id), data);
      else await addDoc(collection(db, "transactions"), data);
      toast({ title: tx ? "تم التحديث" : type === "income" ? "انسجل الدخل" : "انسجل المصروف" });
      onSaved();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{tx ? "تعديل معاملة" : type === "income" ? "دخل جديد" : "مصروف جديد"}</DialogTitle>
        <DialogDescription>الفواتير المدفوعة والاشتراكات تنسجل لحالها، هنا للباقي.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="inline-flex w-full rounded-xl bg-muted p-1">
          {(["income", "expense"] as TxType[]).map((t) => (
            <button key={t} type="button" onClick={() => switchType(t)}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors", type === t ? "bg-background shadow-sm" : "text-muted-foreground")}>
              {t === "income" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}{t === "income" ? "دخل" : "مصروف"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="المبلغ (ريال)"><Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} autoFocus /></Field>
          <Field label="التاريخ"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label="الوصف"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === "income" ? "مثال: استشارة لمتجر" : "مثال: إعلان سناب"} /></Field>
        <Field label="التصنيف">
          <Choices value={category} onChange={setCategory} options={CATEGORIES[type]} />
          {!CATEGORIES[type].includes(category) && <p className="pt-1 text-xs text-muted-foreground">التصنيف الحالي: {category}</p>}
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />} حفظ</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* Monthly chart ------------------------------------------------------------- */
// Validated categorical pair (slot 1 blue = income, slot 2 orange = expenses), stepped for dark mode.
const chartVars = "[--inc:#2a78d6] [--exp:#eb6834] dark:[--inc:#3987e5] dark:[--exp:#d95926]";

function MonthlyChart({ txs }: { txs: Transaction[] }) {
  const data = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${m.getFullYear()}-${m.getMonth()}`;
      const inMonth = txs.filter((t) => { const d = day(t.date); return d && `${d.getFullYear()}-${d.getMonth()}` === key; });
      return {
        label: m.toLocaleDateString("ar-SA-u-ca-gregory", { month: "short" }),
        full: m.toLocaleDateString("ar-SA-u-ca-gregory", { month: "long", year: "numeric" }),
        income: inMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [txs]);

  return (
    <section className={cn("rounded-2xl border bg-card p-5", chartVars)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">آخر ٦ شهور</h3>
          <p className="text-xs text-muted-foreground">الدخل والمصاريف لكل شهر</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--inc)]" /> الدخل</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--exp)]" /> المصاريف</span>
        </div>
      </div>
      <div className="h-64" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} reversed />
            <YAxis orientation="right" width={52} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${n(v / 1000)}k` : n(v))} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <div dir="rtl" className="rounded-xl border bg-popover px-3 py-2 text-right text-xs shadow-lg">
                    <p className="mb-1 font-bold">{d.full}</p>
                    <p className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[var(--inc)]" />الدخل: <b>{n(d.income)}</b> ريال</p>
                    <p className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[var(--exp)]" />المصاريف: <b>{n(d.expense)}</b> ريال</p>
                    <p className="mt-1 border-t pt-1 text-muted-foreground">الصافي: <b className="text-foreground">{n(d.income - d.expense)}</b> ريال</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="income" fill="var(--inc)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            <Bar dataKey="expense" fill="var(--exp)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* Page ---------------------------------------------------------------------- */
export default function FinancePage() {
  const { toast } = useToast();
  const [txs, setTxs] = React.useState<Transaction[]>([]);
  const [invoices, setInvoices] = React.useState<InvoiceLite[]>([]);
  const [subs, setSubs] = React.useState<SubLite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<Period>("month");
  const [typeFilter, setTypeFilter] = React.useState<"all" | TxType>("all");
  const [form, setForm] = React.useState<{ open: boolean; tx: Transaction | null; type: TxType }>({ open: false, tx: null, type: "expense" });

  const load = React.useCallback(async () => {
    try {
      const [t, i, s] = await Promise.all(["transactions", "invoices", "subscriptions"].map((c) => getDocs(collection(db, c))));
      setTxs(t.docs.map((d) => ({ ...(d.data() as Omit<Transaction, "id">), id: d.id, amount: Number(d.data().amount) || 0 })).sort((a, b) => (b.date || "").localeCompare(a.date || "")));
      setInvoices(i.docs.map((d) => ({ ...(d.data() as Omit<InvoiceLite, "id">), id: d.id })));
      setSubs(s.docs.map((d) => ({ ...(d.data() as Omit<SubLite, "id">), id: d.id, amount: Number(d.data().amount) || 0 })));
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نجيب البيانات المالية" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const remove = async (t: Transaction) => {
    if (!window.confirm(`حذف «${t.description}»؟`)) return;
    try { await deleteDoc(doc(db, "transactions", t.id)); toast({ title: "انحذفت المعاملة" }); load(); }
    catch (e) { console.error(e); toast({ variant: "destructive", title: "ما قدرنا نحذف" }); }
  };

  // Period figures
  const start = periodStart(period);
  const inPeriod = txs.filter((t) => { const d = day(t.date); return !start || (d && d >= start); });
  const income = inPeriod.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = inPeriod.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;
  const marginPct = income > 0 ? (net / income) * 100 : null;

  // What needs attention
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const receivable = unpaid.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const overdue = unpaid.filter((i) => { const d = day(i.dueDate); return d && d < todayStart(); });
  const activeSubs = subs.filter((s) => (s.status ?? "active") === "active");
  const subsMonthly = activeSubs.reduce((t, s) => t + (s.cycle === "yearly" ? s.amount / 12 : s.amount), 0);
  const renewingSoon = activeSubs
    .map((s) => ({ s, d: nextRenewal(s) }))
    .filter((x) => x.d && (x.d.getTime() - todayStart().getTime()) / 86400000 <= 7)
    .sort((a, b) => a.d!.getTime() - b.d!.getTime());

  // Expenses by category (single hue: magnitude)
  const byCat = Object.entries(
    inPeriod.filter((t) => t.type === "expense").reduce<Record<string, number>>((m, t) => { m[t.category || "أخرى"] = (m[t.category || "أخرى"] || 0) + t.amount; return m; }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxCat = byCat[0]?.[1] || 1;

  const attention = !loading && (
(overdue.length > 0 || renewingSoon.length > 0) && (
            <section className="rounded-2xl border border-amber-400/60 bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4 text-amber-500" /> يحتاج انتباهك</h3>
              <ul className="space-y-2 text-sm">
                {overdue.slice(0, 4).map((i) => (
                  <li key={i.id}><Link href={`/tools/invoice-generator?id=${i.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                    <span className="truncate">فاتورة <span dir="ltr">{i.invoiceNumber}</span> متأخرة · {i.clientCompany || i.clientName}</span><b className="whitespace-nowrap">{n(Number(i.total))}</b>
                  </Link></li>
                ))}
                {renewingSoon.slice(0, 4).map(({ s, d }) => (
                  <li key={s.id}><Link href="/finance/subscriptions" className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                    <span className="truncate">{s.serviceName} يتجدد {d!.getTime() === todayStart().getTime() ? "اليوم" : d!.toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { day: "numeric", month: "short" })}</span><b className="whitespace-nowrap">{n(s.amount)}</b>
                  </Link></li>
                ))}
              </ul>
            </section>
          )
  );

  const list = inPeriod.filter((t) => typeFilter === "all" || t.type === typeFilter);
  const openNew = (type: TxType) => setForm({ open: true, tx: null, type });

  return (
    <div className={cn("p-4 sm:p-6 lg:p-8 text-right", chartVars)}>
      <PageHeader title="المالية" description="وش دخل، وش طلع، ووش ينتظرك.">
        <Button variant="outline" onClick={() => openNew("expense")}><ArrowUpRight className="me-2 h-4 w-4" /> مصروف</Button>
        <Button onClick={() => openNew("income")}><ArrowDownLeft className="me-2 h-4 w-4" /> دخل</Button>
      </PageHeader>

      <div className="mb-5 inline-flex max-w-full overflow-x-auto rounded-xl bg-muted p-1">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" onClick={() => setPeriod(p.key)}
            className={cn("whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", period === p.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {p.label}
          </button>
        ))}
      </div>

      {attention && <div className="mb-6 lg:hidden">{attention}</div>}

      {/* Headline figures */}
      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />) : (
          [
            { label: "صافي الربح", value: n(net), sub: marginPct === null ? "ما فيه دخل بالفترة" : `هامش ${n(marginPct)}٪`, strong: true },
            { label: "الدخل", value: n(income), sub: `${n(inPeriod.filter((t) => t.type === "income").length)} معاملة`, dot: "bg-[var(--inc)]" },
            { label: "المصاريف", value: n(expenses), sub: `${n(inPeriod.filter((t) => t.type === "expense").length)} معاملة`, dot: "bg-[var(--exp)]" },
            { label: "مستحق عند العملاء", value: n(receivable), sub: `${n(unpaid.length)} فاتورة${overdue.length ? ` · ${n(overdue.length)} متأخرة` : ""}`, href: "/finance/invoices" },
          ].map((s) => {
            const body = (
              <>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{s.dot && <i className={cn("h-2 w-2 rounded-sm", s.dot)} />}{s.label}</p>
                <p className={cn("mt-1 text-xl font-bold md:text-2xl", s.strong && net < 0 && "text-destructive")}>{s.value} <span className="saudi-riyal">&#xea;</span></p>
                <p className="text-[11px] text-muted-foreground">{s.sub}</p>
              </>
            );
            return s.href
              ? <Link key={s.label} href={s.href} className="rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/40">{body}</Link>
              : <div key={s.label} className={cn("rounded-2xl border p-4", s.strong ? "bg-foreground text-background [&_p]:text-inherit" : "bg-card")}>{body}</div>;
          })
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {loading ? <Skeleton className="h-80 rounded-2xl" /> : <MonthlyChart txs={txs} />}

          {/* Transactions */}
          <section className="rounded-2xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <h3 className="font-bold">المعاملات <span className="text-xs font-normal text-muted-foreground">({n(list.length)})</span></h3>
              <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">
                {([["all", "الكل"], ["income", "دخل"], ["expense", "مصاريف"]] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setTypeFilter(k)} className={cn("rounded-md px-3 py-1 font-semibold", typeFilter === k ? "bg-background shadow-sm" : "text-muted-foreground")}>{l}</button>
                ))}
              </div>
            </div>
            {loading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : list.length ? (
              <ul className="divide-y">
                {list.slice(0, 50).map((t) => {
                  const src = sourceOf(t);
                  const inc = t.type === "income";
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white", inc ? "bg-[var(--inc)]" : "bg-[var(--exp)]")}>
                        {inc ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{t.description}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.category} · {day(t.date)?.toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { day: "numeric", month: "short" })}
                          {src && <> · <Link href={src.href} className="underline-offset-2 hover:underline"><Zap className="inline h-3 w-3" /> {src.label}</Link></>}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-bold">{inc ? "+" : "−"}{n(t.amount)} <span className="saudi-riyal text-xs">&#xea;</span></p>
                      {!src ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 shrink-0 p-0"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setForm({ open: true, tx: t, type: t.type })}>تعديل</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => remove(t)} className="text-destructive">حذف</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : <span className="w-8 shrink-0" />}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="p-10 text-center text-sm text-muted-foreground">ما فيه معاملات بهالفترة.</p>}
          </section>
        </div>

        {/* Side column */}
        <aside className="space-y-4">
          <div className="hidden lg:block">{attention}</div>

          <section className="rounded-2xl border bg-card p-4">
            <h3 className="mb-3 font-bold">وين تروح المصاريف</h3>
            {byCat.length ? (
              <ul className="space-y-3">
                {byCat.slice(0, 6).map(([cat, v]) => (
                  <li key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs"><span>{cat}</span><span className="font-bold">{n(v)} ريال · {n((v / (expenses || 1)) * 100)}٪</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--exp)]" style={{ width: `${(v / maxCat) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">ما فيه مصاريف بهالفترة.</p>}
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h3 className="mb-3 font-bold">اختصارات</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/finance/invoices", icon: FileDigit, label: "الفواتير", sub: `${n(receivable)} مستحق` },
                { href: "/finance/subscriptions", icon: Repeat, label: "الاشتراكات", sub: `${n(subsMonthly)} شهريًا` },
                { href: "/finance/products", icon: Package, label: "المنتجات", sub: "والخدمات" },
                { href: "/tools/quote-builder", icon: FileText, label: "عرض سعر", sub: "جديد" },
                { href: "/finance/reports", icon: BarChart3, label: "التقارير", sub: "تفصيلية" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="flex items-center gap-2.5 rounded-xl border p-3 transition-colors hover:border-foreground/40 hover:bg-muted/50">
                  <l.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0"><b className="block truncate text-sm">{l.label}</b><span className="block truncate text-[11px] text-muted-foreground">{l.sub}</span></span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}>
        {form.open && <TransactionForm key={form.tx?.id ?? `new-${form.type}`} tx={form.tx} presetType={form.type} onSaved={() => { setForm((f) => ({ ...f, open: false })); load(); }} onClose={() => setForm((f) => ({ ...f, open: false }))} />}
      </Dialog>
    </div>
  );
}
