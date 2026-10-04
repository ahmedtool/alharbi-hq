"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Field } from "@/components/app/form-bits";
import { Check, FileDigit, FileText, Loader2, MessageCircle, MoreHorizontal, PlusCircle, Search, Undo2 } from "lucide-react";
import { waNumber } from "@/app/clients/model";

/* Model --------------------------------------------------------------------- */
type Status = "unpaid" | "paid" | "overdue";
interface LineItem { description: string; quantity: number; price: number }
interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: Status;
  clientName?: string; clientCompany?: string; clientPhone?: string;
  projectName?: string;
  lineItems?: LineItem[];
  total: number;
  vat?: boolean;
  paymentMethod: string;
  internalNotes: string;
  paidAt?: string;
}

const STATUS: Record<Status, { label: string; tone: string }> = {
  unpaid: { label: "غير مدفوعة", tone: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200" },
  paid: { label: "مدفوعة", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200" },
  overdue: { label: "متأخرة", tone: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200" },
};
const PAYMENT_METHODS = ["تحويل بنكي", "مدى", "بطاقة ائتمانية", "Apple Pay", "نقدًا", "متجر سلة"];

const n = (x: number) => new Intl.NumberFormat("ar-SA").format(Math.round(x || 0));
const day = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};
const fmtDate = (iso?: string) => day(iso)?.toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { day: "numeric", month: "short", year: "numeric" }) ?? "—";
const daysUntil = (iso?: string) => {
  const d = day(iso);
  if (!d) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
};
const who = (i: Invoice) => i.clientCompany || i.clientName || "بدون عميل";

/** Paid invoices count as income in finance (same transaction id the invoice tool uses). */
async function syncTransaction(inv: Invoice, status: Status) {
  const txRef = doc(db, "transactions", `inv_${inv.id}`);
  if (status === "paid") {
    await setDoc(txRef, { id: `inv_${inv.id}`, description: `دخل من الفاتورة #${inv.invoiceNumber}`, amount: inv.total, type: "income", category: "دخل فواتير", date: new Date().toISOString() });
  } else if ((await getDoc(txRef)).exists()) {
    await deleteDoc(txRef);
  }
}

/* Edit (payment details) ---------------------------------------------------- */
function EditDialog({ invoice, onSaved, onClose }: { invoice: Invoice; onSaved: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<Status>(invoice.status === "overdue" ? "unpaid" : invoice.status);
  const [paymentMethod, setPaymentMethod] = React.useState(invoice.paymentMethod);
  const [internalNotes, setInternalNotes] = React.useState(invoice.internalNotes);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "invoices", invoice.id), { status, paymentMethod, internalNotes, ...(status === "paid" && invoice.status !== "paid" ? { paidAt: new Date().toISOString() } : {}) });
      await syncTransaction(invoice, status);
      toast({ title: "تم تحديث الفاتورة" });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحدّث الفاتورة" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>الدفع · <span dir="ltr">{invoice.invoiceNumber}</span></DialogTitle>
        <DialogDescription>{who(invoice)} · {n(invoice.total)} ريال</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="inline-flex w-full rounded-xl bg-muted p-1">
          {(["unpaid", "paid"] as Status[]).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={cn("flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors", status === s ? "bg-background shadow-sm" : "text-muted-foreground")}>
              {STATUS[s].label}
            </button>
          ))}
        </div>
        <Field label="طريقة الدفع">
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{[...new Set([...PAYMENT_METHODS, paymentMethod])].filter(Boolean).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="ملاحظات داخلية"><Textarea rows={3} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="ما تظهر في الفاتورة" /></Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />} حفظ</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* Card ---------------------------------------------------------------------- */
function InvoiceCard({ inv, onTogglePaid, onEdit, onDelete, busy }: { inv: Invoice; onTogglePaid: () => void; onEdit: () => void; onDelete: () => void; busy: boolean }) {
  const router = useRouter();
  const open = () => router.push(`/tools/invoice-generator?id=${inv.id}`);
  const st = STATUS[inv.status] ?? STATUS.unpaid;
  const days = daysUntil(inv.dueDate);
  const due = inv.status === "paid" ? null
    : days === null ? null
    : days < 0 ? { text: `متأخرة ${n(-days)} يوم`, late: true }
    : days === 0 ? { text: "تستحق اليوم", late: true }
    : { text: `تستحق خلال ${n(days)} يوم`, late: false };
  const items = (inv.lineItems || []).filter((l) => l.description?.trim());
  const wa = waNumber(inv.clientPhone);
  const reminder = `أهلًا ${inv.clientName || ""}، تذكير بسيط بفاتورة ${inv.invoiceNumber} بمبلغ ${n(inv.total)} ريال${inv.dueDate ? ` المستحقة بتاريخ ${fmtDate(inv.dueDate)}` : ""}. شاكر لك 🙏`;

  return (
    <article onClick={open} className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg">
      {/* paper-like header, echoing the invoice sheet */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-foreground/80 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{who(inv)}</p>
          <p className="truncate text-xs text-muted-foreground">{inv.projectName || (inv.clientCompany && inv.clientName ? inv.clientName : "—")}</p>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <div className="text-left">
            <p className="text-sm font-bold">{inv.vat ? "فاتورة ضريبية" : "فاتورة"}</p>
            <p className="text-[11px] text-muted-foreground" dir="ltr">{inv.invoiceNumber}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={open}>فتح وتعديل الفاتورة</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>الدفع والملاحظات</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">حذف</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", st.tone)}>{st.label}</span>
          {due && <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", due.late ? "border-destructive/40 text-destructive" : "text-muted-foreground")}>{due.text}</span>}
          {inv.status === "paid" && inv.paymentMethod && <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{inv.paymentMethod}</span>}
        </div>

        <ul className="space-y-0.5 text-sm text-muted-foreground">
          {items.slice(0, 2).map((l, i) => <li key={i} className="truncate">• {l.description.split("\n")[0]}</li>)}
          {items.length > 2 && <li className="text-xs">+ {n(items.length - 2)} بنود أخرى</li>}
          {!items.length && <li>—</li>}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 border-t pt-3">
          <div>
            <p className="text-[11px] text-muted-foreground">صدرت {fmtDate(inv.invoiceDate)}</p>
            <p className="text-2xl font-bold">{n(inv.total)} <span className="saudi-riyal text-base">&#xea;</span></p>
          </div>
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {inv.status !== "paid" && wa && (
              <Button asChild variant="outline" size="icon" title="تذكير واتساب">
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(reminder)}`} target="_blank" rel="noopener"><MessageCircle className="h-4 w-4" /></a>
              </Button>
            )}
            <Button size="sm" variant={inv.status === "paid" ? "outline" : "default"} onClick={onTogglePaid} disabled={busy}>
              {busy ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : inv.status === "paid" ? <Undo2 className="me-1.5 h-4 w-4" /> : <Check className="me-1.5 h-4 w-4" />}
              {inv.status === "paid" ? "تراجع" : "تم الدفع"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* Page ---------------------------------------------------------------------- */
type Filter = "all" | Status;

export default function InvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<Invoice | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "invoices"));
      const list = snap.docs.map((d) => {
        const x = d.data() as Omit<Invoice, "id">;
        const late = (x.status || "unpaid") !== "paid" && (daysUntil(x.dueDate) ?? 0) < 0;
        return {
          ...x, id: d.id,
          status: (late ? "overdue" : x.status || "unpaid") as Status,
          total: Number(x.total) || 0,
          paymentMethod: x.paymentMethod || "تحويل بنكي",
          internalNotes: x.internalNotes || "",
        };
      });
      list.sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || "") || (b.invoiceNumber || "").localeCompare(a.invoiceNumber || ""));
      setInvoices(list);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نجيب الفواتير" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const togglePaid = async (inv: Invoice) => {
    const next: Status = inv.status === "paid" ? "unpaid" : "paid";
    setBusyId(inv.id);
    try {
      await updateDoc(doc(db, "invoices", inv.id), { status: next, ...(next === "paid" ? { paidAt: new Date().toISOString() } : {}) });
      await syncTransaction(inv, next);
      toast({ title: next === "paid" ? `تم تسجيل ${n(inv.total)} ريال كدخل` : "رجعت الفاتورة غير مدفوعة" });
      await load();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحدّث الفاتورة" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (inv: Invoice) => {
    if (!window.confirm(`حذف الفاتورة ${inv.invoiceNumber}؟ بينحذف معها الدخل المسجّل لها.`)) return;
    try {
      await deleteDoc(doc(db, "invoices", inv.id));
      const tx = doc(db, "transactions", `inv_${inv.id}`);
      if ((await getDoc(tx)).exists()) await deleteDoc(tx);
      toast({ title: "انحذفت الفاتورة" });
      load();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحذف الفاتورة" });
    }
  };

  const unpaid = invoices.filter((i) => i.status !== "paid");
  const overdue = invoices.filter((i) => i.status === "overdue");
  const paid = invoices.filter((i) => i.status === "paid");
  const thisMonth = new Date().toISOString().slice(0, 7);
  const paidThisMonth = paid.filter((i) => (i.paidAt || i.invoiceDate || "").slice(0, 7) === thisMonth);
  const sum = (l: Invoice[]) => l.reduce((s, i) => s + i.total, 0);

  const q = search.trim().toLowerCase();
  const shown = invoices
    .filter((i) => filter === "all" || (filter === "unpaid" ? i.status !== "paid" : i.status === filter))
    .filter((i) => !q || [i.invoiceNumber, i.clientName, i.clientCompany, i.projectName].some((s) => (s || "").toLowerCase().includes(q)));

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "الكل", count: invoices.length },
    { key: "unpaid", label: "غير مدفوعة", count: unpaid.length },
    { key: "overdue", label: "متأخرة", count: overdue.length },
    { key: "paid", label: "مدفوعة", count: paid.length },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="الفواتير" description="كل فواتيرك: وش انحصّل، وش باقي عند العملاء، ووش تأخر.">
        <Button asChild variant="outline"><Link href="/tools/quote-builder"><FileText className="me-2 h-4 w-4" /> عرض سعر</Link></Button>
        <Button asChild><Link href="/tools/invoice-generator"><PlusCircle className="me-2 h-4 w-4" /> فاتورة جديدة</Link></Button>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {[
          { label: "مستحق عند العملاء", value: <>{n(sum(unpaid))} <span className="saudi-riyal">&#xea;</span></>, sub: `${n(unpaid.length)} فاتورة` },
          { label: "متأخر", value: <>{n(sum(overdue))} <span className="saudi-riyal">&#xea;</span></>, sub: `${n(overdue.length)} فاتورة`, warn: overdue.length > 0 },
          { label: "انحصّل هالشهر", value: <>{n(sum(paidThisMonth))} <span className="saudi-riyal">&#xea;</span></>, sub: `${n(paidThisMonth.length)} فاتورة` },
          { label: "إجمالي المحصّل", value: <>{n(sum(paid))} <span className="saudi-riyal">&#xea;</span></>, sub: `${n(paid.length)} فاتورة` },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border bg-card p-4", s.warn && "border-destructive/40")}>
            <p className={cn("text-xs text-muted-foreground", s.warn && "text-destructive")}>{s.label}</p>
            <p className="mt-1 text-xl font-bold md:text-2xl">{s.value}</p>
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالعميل أو الرقم أو المشروع" className="ps-9" />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}
        </div>
      ) : shown.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((inv) => (
            <InvoiceCard key={inv.id} inv={inv} busy={busyId === inv.id} onTogglePaid={() => togglePaid(inv)} onEdit={() => setEditing(inv)} onDelete={() => remove(inv)} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center">
          <FileDigit className="h-8 w-8 text-muted-foreground" />
          <h3 className="text-xl font-bold">{invoices.length ? "ما فيه فواتير تطابق البحث" : "ما فيه فواتير للحين"}</h3>
          {!invoices.length && <Button asChild><Link href="/tools/invoice-generator"><PlusCircle className="me-2 h-4 w-4" /> أول فاتورة</Link></Button>}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <EditDialog key={editing.id} invoice={editing} onSaved={load} onClose={() => setEditing(null)} />}
      </Dialog>
    </div>
  );
}
