"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Choices, Field, IconInput } from "@/components/app/form-bits";
import { ExternalLink, Globe, Loader2, MoreHorizontal, PlusCircle, RefreshCw, Repeat, Search } from "lucide-react";

/* Model --------------------------------------------------------------------- */
// Older subscriptions only have serviceName / amount / renewalDate: they count as monthly and active.
type Cycle = "monthly" | "yearly";
type Status = "active" | "paused" | "cancelled";
interface Subscription {
  id: string;
  serviceName: string;
  amount: number;
  renewalDate: string;
  cycle?: Cycle;
  category?: string;
  status?: Status;
  website?: string;
  notes?: string;
}

const CYCLE: Record<Cycle, { label: string; per: string }> = {
  monthly: { label: "شهري", per: "شهريًا" },
  yearly: { label: "سنوي", per: "سنويًا" },
};
const STATUS: Record<Status, { label: string; tone: string }> = {
  active: { label: "نشط", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200" },
  paused: { label: "موقوف", tone: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200" },
  cancelled: { label: "ملغي", tone: "bg-muted text-muted-foreground" },
};
const CATEGORIES = ["استضافة ودومين", "أدوات تطوير", "ذكاء اصطناعي", "تصميم", "تسويق", "إنتاجية", "أخرى"];

const cycleOf = (s: Subscription): Cycle => s.cycle ?? "monthly";
const statusOf = (s: Subscription): Status => s.status ?? "active";
const monthly = (s: Subscription) => (cycleOf(s) === "yearly" ? s.amount / 12 : s.amount);

const n = (x: number) => new Intl.NumberFormat("ar-SA").format(Math.round(x || 0));
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDay = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso.length > 10 ? iso : iso + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};
const addCycle = (d: Date, c: Cycle) => { const x = new Date(d); if (c === "yearly") x.setFullYear(x.getFullYear() + 1); else x.setMonth(x.getMonth() + 1); return x; };
const todayStart = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

/** The next renewal on or after today (a stored date in the past rolls forward by the cycle). */
const nextRenewal = (s: Subscription) => {
  let d = parseDay(s.renewalDate);
  if (!d) return null;
  const t = todayStart();
  for (let i = 0; d < t && i < 600; i++) d = addCycle(d, cycleOf(s));
  return d;
};
const daysTo = (d: Date | null) => (d ? Math.round((d.getTime() - todayStart().getTime()) / 86400000) : null);
const fmtDate = (d: Date | null) => d?.toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { day: "numeric", month: "long" }) ?? "—";
const domainOf = (url?: string) => { try { return url ? new URL(url.startsWith("http") ? url : `https://${url}`).hostname : ""; } catch { return ""; } };

/** Active subscriptions are an expense in finance (same transaction id as before). */
async function syncTransaction(id: string, data: Omit<Subscription, "id">) {
  const ref = doc(db, "transactions", `sub_${id}`);
  if ((data.status ?? "active") === "active") {
    await setDoc(ref, { description: `مصروف اشتراك: ${data.serviceName}`, amount: Number(data.amount), type: "expense", category: "اشتراكات", date: new Date().toISOString() });
  } else if ((await getDoc(ref)).exists()) {
    await deleteDoc(ref);
  }
}

/* Form ---------------------------------------------------------------------- */
function SubscriptionForm({ sub, onSaved, onClose }: { sub: Subscription | null; onSaved: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const [serviceName, setServiceName] = React.useState(sub?.serviceName ?? "");
  const [amount, setAmount] = React.useState<number | "">(sub?.amount ?? "");
  const [cycle, setCycle] = React.useState<Cycle>(sub ? cycleOf(sub) : "monthly");
  const [category, setCategory] = React.useState(sub?.category ?? CATEGORIES[0]);
  const [renewal, setRenewal] = React.useState(sub ? isoDay(nextRenewal(sub) ?? todayStart()) : isoDay(addCycle(todayStart(), "monthly")));
  const [status, setStatus] = React.useState<Status>(sub ? statusOf(sub) : "active");
  const [website, setWebsite] = React.useState(sub?.website ?? "");
  const [notes, setNotes] = React.useState(sub?.notes ?? "");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!serviceName.trim() || !amount || !renewal) {
      toast({ variant: "destructive", title: "اكتب اسم الخدمة والمبلغ وتاريخ التجديد" });
      return;
    }
    setSaving(true);
    try {
      const data = { serviceName: serviceName.trim(), amount: Number(amount), renewalDate: new Date(renewal + "T00:00:00").toISOString(), cycle, category, status, website: website.trim(), notes: notes.trim() };
      let id = sub?.id;
      if (id) await updateDoc(doc(db, "subscriptions", id), data);
      else id = (await addDoc(collection(db, "subscriptions"), data)).id;
      await syncTransaction(id, data);
      toast({ title: sub ? "تم تحديث الاشتراك" : "انضاف الاشتراك" });
      onSaved();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ الاشتراك" });
    } finally {
      setSaving(false);
    }
  };

  const quick = [
    { label: "بعد شهر", d: addCycle(todayStart(), "monthly") },
    { label: "بعد سنة", d: addCycle(todayStart(), "yearly") },
  ];

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{sub ? "تعديل الاشتراك" : "اشتراك جديد"}</DialogTitle>
        <DialogDescription>الاشتراك النشط ينحسب مصروف في المالية تلقائيًا.</DialogDescription>
      </DialogHeader>
      <div className="max-h-[65dvh] space-y-4 overflow-y-auto px-0.5">
        <Field label="اسم الخدمة"><Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="مثال: Vercel، ChatGPT، Figma" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="المبلغ (ريال)"><Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
          <Field label="الدورة">
            <div className="inline-flex w-full rounded-xl bg-muted p-1">
              {(Object.keys(CYCLE) as Cycle[]).map((c) => (
                <button key={c} type="button" onClick={() => setCycle(c)}
                  className={cn("flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors", cycle === c ? "bg-background shadow-sm" : "text-muted-foreground")}>
                  {CYCLE[c].label}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <Field label="التجديد الجاي">
          <Input type="date" value={renewal} onChange={(e) => setRenewal(e.target.value)} />
          <div className="flex gap-2 pt-1">
            {quick.map((q) => (
              <button key={q.label} type="button" onClick={() => setRenewal(isoDay(q.d))} className="rounded-full border px-3 py-1 text-xs font-semibold hover:border-foreground">{q.label}</button>
            ))}
          </div>
        </Field>
        <Field label="التصنيف"><Choices value={category} onChange={setCategory} options={CATEGORIES} /></Field>
        <Field label="رابط الخدمة (اختياري)"><IconInput icon={Globe} dir="ltr" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="vercel.com" /></Field>
        {sub && (
          <Field label="الحالة">
            <div className="inline-flex w-full rounded-xl bg-muted p-1">
              {(Object.keys(STATUS) as Status[]).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={cn("flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors", status === s ? "bg-background shadow-sm" : "text-muted-foreground")}>
                  {STATUS[s].label}
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field label="ملاحظات (اختياري)"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="الحساب المستخدم، البطاقة، متى تلغيه…" /></Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />} حفظ</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* Card ---------------------------------------------------------------------- */
function ServiceIcon({ s }: { s: Subscription }) {
  const [broken, setBroken] = React.useState(false);
  const domain = domainOf(s.website);
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-lg font-bold">
      {domain && !broken
        ? <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" width={26} height={26} onError={() => setBroken(true)} />
        : (s.serviceName.trim()[0] || "؟").toUpperCase()}
    </span>
  );
}

function SubscriptionCard({ s, onEdit, onRenewed, onStatus, onDelete, busy }: {
  s: Subscription; onEdit: () => void; onRenewed: () => void; onStatus: (st: Status) => void; onDelete: () => void; busy: boolean;
}) {
  const status = statusOf(s);
  const cycle = cycleOf(s);
  const next = nextRenewal(s);
  const days = daysTo(next);
  const active = status === "active";
  const soon = active && days !== null && days <= 3;
  const renewText = days === null ? null : days === 0 ? "يتجدد اليوم" : days === 1 ? "يتجدد بكرة" : `يتجدد خلال ${n(days)} يوم`;

  return (
    <article onClick={onEdit} className={cn("group flex cursor-pointer flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg", !active && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ServiceIcon s={s} />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{s.serviceName}</h3>
            <p className="truncate text-xs text-muted-foreground">{s.category || "اشتراك"}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onEdit}>تعديل</DropdownMenuItem>
            {status !== "active" && <DropdownMenuItem onClick={() => onStatus("active")}>تفعيل</DropdownMenuItem>}
            {status !== "paused" && <DropdownMenuItem onClick={() => onStatus("paused")}>إيقاف مؤقت</DropdownMenuItem>}
            {status !== "cancelled" && <DropdownMenuItem onClick={() => onStatus("cancelled")}>إلغاء الاشتراك</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">حذف</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", STATUS[status].tone)}>{STATUS[status].label}</span>
        <span className="rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground"><Repeat className="me-1 inline h-3 w-3" />{CYCLE[cycle].label}</span>
        {active && renewText && <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", soon ? "border-destructive/40 text-destructive" : "text-muted-foreground")}>{renewText}</span>}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 border-t pt-3">
        <div>
          <p className="text-2xl font-bold">{n(s.amount)} <span className="saudi-riyal text-base">&#xea;</span> <span className="text-xs font-normal text-muted-foreground">{CYCLE[cycle].per}</span></p>
          <p className="text-[11px] text-muted-foreground">
            {cycle === "yearly" ? `≈ ${n(s.amount / 12)} شهريًا` : `≈ ${n(s.amount * 12)} سنويًا`}{active && next ? ` · التجديد ${fmtDate(next)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {s.website && (
            <Button asChild variant="outline" size="icon" title="فتح الخدمة">
              <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`} target="_blank" rel="noopener"><ExternalLink className="h-4 w-4" /></a>
            </Button>
          )}
          {active && soon && (
            <Button size="sm" onClick={onRenewed} disabled={busy}>
              {busy ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="me-1.5 h-4 w-4" />} تم التجديد
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

/* Page ---------------------------------------------------------------------- */
type Filter = "all" | Status;

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const [subs, setSubs] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>("active");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<Subscription | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "subscriptions"));
      setSubs(snap.docs.map((d) => ({ ...(d.data() as Omit<Subscription, "id">), id: d.id, amount: Number(d.data().amount) || 0 })));
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نجيب الاشتراكات" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const patch = async (s: Subscription, change: Partial<Subscription>, msg: string) => {
    setBusyId(s.id);
    try {
      await updateDoc(doc(db, "subscriptions", s.id), change);
      const { id, ...rest } = { ...s, ...change };
      await syncTransaction(id, rest);
      toast({ title: msg });
      await load();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحدّث الاشتراك" });
    } finally {
      setBusyId(null);
    }
  };

  /** Mark this cycle as paid: the renewal moves to the next cycle. */
  const renewed = (s: Subscription) => {
    const next = addCycle(nextRenewal(s) ?? todayStart(), cycleOf(s));
    return patch(s, { renewalDate: next.toISOString() }, `التجديد الجاي ${fmtDate(next)}`);
  };

  const remove = async (s: Subscription) => {
    if (!window.confirm(`حذف اشتراك ${s.serviceName}؟ بينحذف معه المصروف المسجّل له.`)) return;
    try {
      await deleteDoc(doc(db, "subscriptions", s.id));
      const tx = doc(db, "transactions", `sub_${s.id}`);
      if ((await getDoc(tx)).exists()) await deleteDoc(tx);
      toast({ title: "انحذف الاشتراك" });
      load();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحذف الاشتراك" });
    }
  };

  const active = subs.filter((s) => statusOf(s) === "active");
  const perMonth = active.reduce((t, s) => t + monthly(s), 0);
  const week = active.filter((s) => { const d = daysTo(nextRenewal(s)); return d !== null && d <= 7; });
  const biggest = [...active].sort((a, b) => monthly(b) - monthly(a))[0];

  const q = search.trim().toLowerCase();
  const shown = subs
    .filter((s) => filter === "all" || statusOf(s) === filter)
    .filter((s) => !q || [s.serviceName, s.category, s.website].some((x) => (x || "").toLowerCase().includes(q)))
    .sort((a, b) => {
      const ra = statusOf(a) === "active" ? 0 : 1, rb = statusOf(b) === "active" ? 0 : 1;
      return ra - rb || (nextRenewal(a)?.getTime() ?? Infinity) - (nextRenewal(b)?.getTime() ?? Infinity);
    });

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "active", label: "نشطة", count: active.length },
    { key: "paused", label: "موقوفة", count: subs.filter((s) => statusOf(s) === "paused").length },
    { key: "cancelled", label: "ملغاة", count: subs.filter((s) => statusOf(s) === "cancelled").length },
    { key: "all", label: "الكل", count: subs.length },
  ];
  const openNew = () => { setEditing(null); setOpen(true); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="الاشتراكات" description="كل اشتراكاتك الدورية، كم تكلفك، ومتى تتجدد.">
        <Button onClick={openNew}><PlusCircle className="me-2 h-4 w-4" /> اشتراك جديد</Button>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {[
          { label: "التكلفة الشهرية", value: <>{n(perMonth)} <span className="saudi-riyal">&#xea;</span></>, sub: `${n(active.length)} اشتراك نشط` },
          { label: "التكلفة السنوية", value: <>{n(perMonth * 12)} <span className="saudi-riyal">&#xea;</span></>, sub: "تقديرًا" },
          { label: "يتجدد هالأسبوع", value: <>{n(week.reduce((t, s) => t + s.amount, 0))} <span className="saudi-riyal">&#xea;</span></>, sub: `${n(week.length)} اشتراك`, warn: week.length > 0 },
          { label: "الأغلى", value: biggest ? biggest.serviceName : "—", sub: biggest ? `≈ ${n(monthly(biggest))} شهريًا` : "" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border bg-card p-4", s.warn && "border-amber-400/60")}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 truncate text-xl font-bold md:text-2xl">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-muted p-1">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setFilter(t.key)}
              className={cn("whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", filter === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.label} <span className="text-xs text-muted-foreground">({n(t.count)})</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم الخدمة أو التصنيف" className="ps-9" />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : shown.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => (
            <SubscriptionCard key={s.id} s={s} busy={busyId === s.id}
              onEdit={() => { setEditing(s); setOpen(true); }}
              onRenewed={() => renewed(s)}
              onStatus={(st) => patch(s, { status: st }, st === "active" ? "تفعّل الاشتراك" : st === "paused" ? "توقف الاشتراك مؤقتًا" : "انلغى الاشتراك")}
              onDelete={() => remove(s)} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center">
          <Repeat className="h-8 w-8 text-muted-foreground" />
          <h3 className="text-xl font-bold">{subs.length ? "ما فيه اشتراكات هنا" : "ما فيه اشتراكات للحين"}</h3>
          {!subs.length && <Button onClick={openNew}><PlusCircle className="me-2 h-4 w-4" /> أضف أول اشتراك</Button>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        {open && <SubscriptionForm key={editing?.id ?? "new"} sub={editing} onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />}
      </Dialog>
    </div>
  );
}
