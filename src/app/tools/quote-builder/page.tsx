"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Field } from "@/components/app/form-bits";
import { Briefcase, Download, FileDigit, FileSignature, FileText, FolderOpen, Loader2, Mail, PlusCircle, Save, Send, Trash2 } from "lucide-react";
import { sendContractEmail } from "../contract-builder/actions";
import { getAccessToken } from "@/lib/auth";
import { logoAt } from "@/lib/brand";
import { kindOf as projectKind, type Project } from "@/app/projects/model";
import type { Client } from "@/app/clients/model";

/* Model --------------------------------------------------------------------- */
type Status = "draft" | "sent" | "accepted" | "rejected";
const STATUS: Record<Status, { label: string; tone: string }> = {
  draft: { label: "مسودة", tone: "bg-muted" },
  sent: { label: "أُرسل للعميل", tone: "bg-sky-100 text-sky-900" },
  accepted: { label: "مقبول", tone: "bg-emerald-100 text-emerald-900" },
  rejected: { label: "مرفوض", tone: "bg-red-100 text-red-900" },
};

interface Item { id: number; title: string; details: string; qty: number; price: number }
interface Quote {
  id?: string;
  number: string;
  date: string;
  validUntil: string;
  status: Status;
  providerName: string; providerTitle: string; providerEmail: string; providerPhone: string;
  clientName: string; clientCompany: string; clientEmail: string; clientPhone: string;
  projectId: string;
  title: string; intro: string;
  items: Item[];
  discount: number;
  vat: boolean;
  durationDays: number;
  payment: string;
  includes: string[];
  notes: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const n = (x: number) => new Intl.NumberFormat("ar-SA").format(Math.round(x || 0));
const fmtDate = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { day: "numeric", month: "long", year: "numeric" }) : "........");

const quoteTotals = (q: Pick<Quote, "items" | "discount" | "vat">) => {
  const subtotal = q.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const discount = Math.min(Number(q.discount) || 0, subtotal);
  const net = subtotal - discount;
  const vat = q.vat ? net * 0.15 : 0;
  return { subtotal, discount, net, vat, total: net + vat };
};

const blank = (number: string): Quote => ({
  number, date: today(), validUntil: addDays(14), status: "draft",
  providerName: "أحمد الحربي", providerTitle: "المطوّر", providerEmail: "hi@ahmedalharbi.com", providerPhone: "+966560766880",
  clientName: "", clientCompany: "", clientEmail: "", clientPhone: "",
  projectId: "",
  title: "", intro: "شكرًا لاهتمامك. هذا عرض السعر المقترح لتنفيذ مشروعك، ويوضح المطلوب والتكلفة والمدة.",
  items: [{ id: 1, title: "", details: "", qty: 1, price: 0 }],
  discount: 0, vat: false,
  durationDays: 30,
  payment: "٥٠٪ دفعة مقدمة عند الموافقة، و٥٠٪ عند التسليم النهائي",
  includes: ["جولتين مراجعة على التصميم والتنفيذ", "دعم فني مجاني لمدة ٣٠ يومًا بعد التسليم", "تسليم الملفات المصدرية وبيانات الدخول"],
  notes: "",
});

/* Quote document (also what gets printed / saved as PDF) -------------------- */
function QuoteDocument({ q }: { q: Quote }) {
  const t = quoteTotals(q);
  const client = q.clientCompany || q.clientName || "—";
  const items = q.items.filter((i) => i.title.trim() || i.price);
  return (
    <article className="contract-sheet mx-auto max-w-[820px] rounded-2xl border bg-white p-8 text-[13px] leading-[1.9] text-neutral-900 shadow-xl sm:p-12">
      <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-5">
        <div className="flex items-center gap-3">
          <img src={logoAt(96)} alt="" width={52} height={52} onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-[52px] w-[52px] rounded-xl object-cover" />
          <div>
            <p className="text-lg font-bold leading-tight">{q.providerName}</p>
            <p className="text-xs text-neutral-500">{q.providerTitle}</p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-2xl font-bold leading-tight">عرض سعر</p>
          <p className="text-xs text-neutral-500" dir="ltr">{q.number}</p>
        </div>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-1 text-xs font-bold text-neutral-500">من</p>
          <p className="font-bold">{q.providerName}</p>
          <p className="text-xs text-neutral-600">{q.providerTitle}</p>
          <p className="text-xs text-neutral-600" dir="ltr" style={{ textAlign: "right" }}>{q.providerEmail}</p>
          <p className="text-xs text-neutral-600" dir="ltr" style={{ textAlign: "right" }}>{q.providerPhone}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-1 text-xs font-bold text-neutral-500">مقدّم إلى</p>
          <p className="font-bold">{client}</p>
          {q.clientCompany && q.clientName && <p className="text-xs text-neutral-600">{q.clientName}</p>}
          {q.clientEmail && <p className="text-xs text-neutral-600" dir="ltr" style={{ textAlign: "right" }}>{q.clientEmail}</p>}
          {q.clientPhone && <p className="text-xs text-neutral-600" dir="ltr" style={{ textAlign: "right" }}>{q.clientPhone}</p>}
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs">
          <div className="flex justify-between gap-2"><span className="text-neutral-500">تاريخ العرض</span><b>{fmtDate(q.date)}</b></div>
          <div className="mt-1 flex justify-between gap-2"><span className="text-neutral-500">صالح حتى</span><b>{fmtDate(q.validUntil)}</b></div>
          <div className="mt-1 flex justify-between gap-2"><span className="text-neutral-500">مدة التنفيذ</span><b>{n(q.durationDays)} يوم</b></div>
          <div className="mt-1 flex justify-between gap-2"><span className="text-neutral-500">رقم العرض</span><b dir="ltr">{q.number}</b></div>
        </div>
      </div>

      {(q.title || q.intro) && (
        <div className="mt-6">
          {q.title && <h1 className="text-lg font-bold">مشروع «{q.title}»</h1>}
          {q.intro && <p className="mt-1 whitespace-pre-wrap text-justify text-neutral-700">{q.intro}</p>}
        </div>
      )}

      <table className="mt-6 w-full border-collapse text-right">
        <thead>
          <tr className="bg-neutral-900 text-white">
            <th className="rounded-r-lg px-3 py-2 text-xs font-bold">#</th>
            <th className="w-1/2 px-3 py-2 text-xs font-bold">البند</th>
            <th className="px-3 py-2 text-center text-xs font-bold">الكمية</th>
            <th className="px-3 py-2 text-center text-xs font-bold">السعر</th>
            <th className="rounded-l-lg px-3 py-2 text-left text-xs font-bold">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {(items.length ? items : q.items).map((it, i) => (
            <tr key={it.id} className="border-b border-neutral-200 align-top">
              <td className="px-3 py-2.5 text-neutral-500">{n(i + 1)}</td>
              <td className="px-3 py-2.5">
                <p className="font-semibold">{it.title || "—"}</p>
                {it.details && <p className="whitespace-pre-wrap text-xs text-neutral-600">{it.details}</p>}
              </td>
              <td className="px-3 py-2.5 text-center">{n(it.qty)}</td>
              <td className="px-3 py-2.5 text-center">{n(it.price)}</td>
              <td className="px-3 py-2.5 text-left font-semibold">{n(it.qty * it.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 grid items-start gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          {q.includes.some((s) => s.trim()) && (
            <div>
              <p className="mb-1 text-xs font-bold text-neutral-500">يشمل العرض</p>
              <ul className="space-y-0.5">
                {q.includes.filter((s) => s.trim()).map((s, i) => <li key={i} className="flex gap-2"><span className="text-neutral-400">✓</span><span>{s}</span></li>)}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-1 text-xs font-bold text-neutral-500">طريقة الدفع</p>
            <p>{q.payment}</p>
          </div>
        </div>
        <div className="sign-block rounded-xl border-2 border-neutral-900 p-4">
          <div className="flex items-center justify-between text-xs"><span className="text-neutral-500">المجموع</span><span>{n(t.subtotal)} ريال</span></div>
          {t.discount > 0 && <div className="mt-1 flex items-center justify-between text-xs"><span className="text-neutral-500">الخصم</span><span>− {n(t.discount)} ريال</span></div>}
          {q.vat && <div className="mt-1 flex items-center justify-between text-xs"><span className="text-neutral-500">ضريبة القيمة المضافة (١٥٪)</span><span>{n(t.vat)} ريال</span></div>}
          <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
            <span className="font-bold">الإجمالي{q.vat ? " شامل الضريبة" : ""}</span>
            <span className="text-xl font-bold">{n(t.total)} <span className="text-sm">ريال</span></span>
          </div>
        </div>
      </div>

      {q.notes && (
        <div className="mt-6">
          <p className="mb-1 text-xs font-bold text-neutral-500">ملاحظات</p>
          <p className="whitespace-pre-wrap text-neutral-700">{q.notes}</p>
        </div>
      )}

      <div className="sign-block mt-10 grid grid-cols-2 gap-10 border-t pt-6 text-center text-xs">
        <div>
          <p className="font-bold">مقدّم العرض</p>
          <p className="mt-1">{q.providerName}</p>
          <div className="mx-auto mt-8 w-4/5 border-b border-dashed border-neutral-400" />
          <p className="mt-1 text-neutral-500">التوقيع</p>
        </div>
        <div>
          <p className="font-bold">موافقة العميل</p>
          <p className="mt-1">{q.clientName || client}</p>
          <div className="mx-auto mt-8 w-4/5 border-b border-dashed border-neutral-400" />
          <p className="mt-1 text-neutral-500">التوقيع والتاريخ</p>
        </div>
      </div>

      <footer className="mt-8 border-t border-neutral-200 pt-4 text-center text-[11px] text-neutral-500">
        هذا العرض صالح حتى {fmtDate(q.validUntil)}، وبعد الموافقة يُجهَّز عقد المشروع · ahmedalharbi.com
      </footer>
    </article>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-4 rounded-2xl border bg-card p-5"><h3 className="font-bold">{title}</h3>{children}</section>
);

/** A small editable list of lines (used for "what's included"). */
const Lines = ({ value, onChange, add }: { value: string[]; onChange: (v: string[]) => void; add: string }) => (
  <div className="space-y-2">
    {value.map((s, i) => (
      <div key={i} className="flex items-center gap-2">
        <Input value={s} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
        <Button variant="ghost" size="icon" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
      </div>
    ))}
    <Button variant="outline" size="sm" onClick={() => onChange([...value, ""])}><PlusCircle className="me-2 h-4 w-4" /> {add}</Button>
  </div>
);

/* Page ---------------------------------------------------------------------- */
export default function QuoteBuilderPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [q, setQ] = React.useState<Quote>(() => blank("Q-0000"));
  const [saved, setSaved] = React.useState<Quote[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [listOpen, setListOpen] = React.useState(false);
  const [mailOpen, setMailOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const nextNumber = (list: Quote[]) => `Q-${new Date().getFullYear()}-${String(list.length + 1).padStart(3, "0")}`;

  const load = React.useCallback(async () => {
    const [qs, ps, cl] = await Promise.all([getDocs(collection(db, "quotes")), getDocs(collection(db, "projects")), getDocs(collection(db, "clients"))]);
    const list = qs.docs.map((d) => ({ ...(d.data() as Quote), id: d.id })).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    setSaved(list);
    setProjects(ps.docs.map((d) => ({ id: d.id, ...d.data() } as Project)).filter((p) => projectKind(p) === "client"));
    setClients(cl.docs.map((d) => ({ id: d.id, ...d.data() } as Client)));
    return list;
  }, []);

  React.useEffect(() => {
    load().then((list) => setQ((cur) => (cur.id ? cur : { ...cur, number: nextNumber(list) }))).catch((e) => console.error(e));
  }, [load]);

  const set = <K extends keyof Quote>(key: K, value: Quote[K]) => setQ((cur) => ({ ...cur, [key]: value }));
  const setItem = (id: number, patch: Partial<Item>) => set("items", q.items.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  /** Fill from a client project: client details, title, one item with the budget, duration. */
  const fromProject = (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    const cl = clients.find((x) => x.id === p.clientId);
    const days = p.startDate && p.endDate ? Math.max(1, Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86400000)) : q.durationDays;
    setQ((cur) => ({
      ...cur,
      projectId: id,
      title: p.name,
      clientName: cl?.name || p.clientName || "",
      clientCompany: cl?.company || "",
      clientEmail: cl?.email || "",
      clientPhone: cl?.phone || "",
      durationDays: days,
      items: p.budget ? [{ id: 1, title: p.name, details: p.description || "", qty: 1, price: p.budget }] : cur.items,
    }));
    toast({ title: "تعبّى العرض من المشروع", description: "قسّم البنود وراجع الأسعار قبل الإرسال." });
  };

  const persist = async (data: Quote) => {
    const { id, ...rest } = data;
    if (id) { await updateDoc(doc(db, "quotes", id), rest as Record<string, unknown>); return id; }
    const ref = await addDoc(collection(db, "quotes"), rest);
    setQ((cur) => ({ ...cur, id: ref.id }));
    return ref.id;
  };

  const save = async () => {
    setSaving(true);
    try {
      await persist(q);
      await load();
      toast({ title: "تم حفظ العرض" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ العرض" });
    } finally {
      setSaving(false);
    }
  };

  /** Accepted? Save it and open the contract or invoice tool filled from this quote. */
  const toNext = async (to: "contract" | "invoice") => {
    try {
      const id = await persist({ ...q, status: "accepted" });
      setQ((cur) => ({ ...cur, status: "accepted" }));
      router.push(to === "contract" ? `/tools/contract-builder?quote=${id}` : `/tools/invoice-generator?quote=${id}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ العرض" });
    }
  };

  const newQuote = () => setQ(blank(nextNumber(saved)));
  const removeSaved = async (x: Quote) => {
    if (!x.id || !window.confirm(`حذف العرض ${x.number}؟`)) return;
    await deleteDoc(doc(db, "quotes", x.id));
    const list = await load();
    if (q.id === x.id) setQ(blank(nextNumber(list)));
  };

  const download = () => {
    const old = document.title;
    document.title = `عرض سعر ${q.number} - ${q.clientCompany || q.clientName || q.title}`.trim();
    window.print();
    document.title = old;
  };

  const sendMail = async () => {
    if (!q.clientEmail) return toast({ variant: "destructive", title: "اكتب إيميل العميل" });
    setSending(true);
    try {
      const t = quoteTotals(q);
      const rows = q.items.filter((i) => i.title.trim()).map((i) => `<tr><td>${i.title}</td><td style="text-align:left">${n(i.qty * i.price)} ريال</td></tr>`).join("");
      const html = `
        <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#111;max-width:600px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
          <div style="background:#111;color:#fff;padding:22px 26px"><b style="font-size:18px">${q.providerName}</b><div style="opacity:.7;font-size:13px">${q.providerTitle}</div></div>
          <div style="padding:26px">
            <p>أهلًا ${q.clientName || ""}،</p>
            <p>هذا عرض السعر لمشروع <b>«${q.title}»</b>.</p>
            <table style="width:100%;background:#f6f6f4;border-radius:10px;padding:12px;font-size:14px">
              ${rows}
              <tr><td style="border-top:1px solid #ddd;padding-top:6px"><b>الإجمالي${q.vat ? " شامل الضريبة" : ""}</b></td><td style="text-align:left;border-top:1px solid #ddd;padding-top:6px"><b>${n(t.total)} ريال</b></td></tr>
            </table>
            <p style="font-size:14px">مدة التنفيذ: ${n(q.durationDays)} يوم · الدفع: ${q.payment}<br>العرض صالح حتى ${fmtDate(q.validUntil)}.</p>
            <p>إذا ناسبك العرض رد على هالإيميل ونجهز العقد ونبدأ.</p>
            <p style="margin-top:24px">تحياتي،<br><b>${q.providerName}</b><br>${q.providerTitle} · ${q.providerPhone}</p>
          </div>
        </div>`;
      const r = await sendContractEmail({ to: q.clientEmail, subject: `عرض سعر - ${q.title} - ${q.providerName}`, htmlBody: html, fromName: q.providerName }, (await getAccessToken()) ?? "");
      if (!r.success) throw new Error(r.message);
      setQ((cur) => ({ ...cur, status: cur.status === "draft" ? "sent" : cur.status }));
      toast({ title: "وصل العرض لإيميل العميل" });
      setMailOpen(false);
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "ما انرسل الإيميل", description: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(false);
    }
  };

  const t = quoteTotals(q);

  return (
    <div className="contract-page p-4 sm:p-6 lg:p-8 text-right">
      <div className="no-print">
        <PageHeader title="عروض الأسعار" description="جهّز عرض السعر، حمّله PDF أو أرسله، ولما يوافق العميل حوّله لعقد.">
          <Button variant="outline" onClick={() => setListOpen(true)}><FolderOpen className="me-2 h-4 w-4" /> عروضي ({n(saved.length)})</Button>
          <Button variant="outline" onClick={() => setMailOpen(true)}><Mail className="me-2 h-4 w-4" /> إرسال</Button>
          <Button variant="outline" onClick={save} disabled={saving}>{saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />} حفظ</Button>
          <Button onClick={download}><Download className="me-2 h-4 w-4" /> تحميل PDF</Button>
        </PageHeader>
      </div>

      <main className="contract-main grid items-start gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="no-print space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:pe-1">
          <div className="flex items-center gap-2 rounded-2xl border bg-card p-3">
            <FileText className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">العرض</p><p className="font-bold" dir="ltr" style={{ textAlign: "right" }}>{q.number}</p></div>
            <Select value={q.status} onValueChange={(v) => set("status", v as Status)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(STATUS) as Status[]).map((s) => <SelectItem key={s} value={s}>{STATUS[s].label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={newQuote} title="عرض جديد"><PlusCircle className="h-4 w-4" /></Button>
          </div>

          <Card title="ابدأ من مشروع">
            <Select value={q.projectId} onValueChange={fromProject}>
              <SelectTrigger><SelectValue placeholder="اختر مشروع عميل يعبّي العرض" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" />{p.name}{p.clientName ? ` · ${p.clientName}` : ""}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </Card>

          <Card title="العميل">
            <Field label="الجهة / الشركة (اختياري)"><Input value={q.clientCompany} onChange={(e) => set("clientCompany", e.target.value)} /></Field>
            <Field label="الاسم"><Input value={q.clientName} onChange={(e) => set("clientName", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الإيميل"><Input type="email" value={q.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} /></Field>
              <Field label="الجوال"><Input type="tel" value={q.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} /></Field>
            </div>
          </Card>

          <Card title="المشروع">
            <Field label="اسم المشروع"><Input value={q.title} onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="مقدمة العرض"><Textarea rows={3} value={q.intro} onChange={(e) => set("intro", e.target.value)} /></Field>
          </Card>

          <Card title="البنود والأسعار">
            <div className="space-y-3">
              {q.items.map((it, i) => (
                <div key={it.id} className="space-y-2 rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs text-muted-foreground">{n(i + 1)}</span>
                    <Input value={it.title} placeholder="البند (مثال: تصميم الواجهات)" onChange={(e) => setItem(it.id, { title: e.target.value })} />
                    <Button variant="ghost" size="icon" onClick={() => set("items", q.items.filter((x) => x.id !== it.id))} disabled={q.items.length === 1} aria-label={`حذف البند ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <Textarea rows={2} value={it.details} placeholder="تفاصيل (اختياري)" onChange={(e) => setItem(it.id, { details: e.target.value })} />
                  <div className="grid grid-cols-[80px_1fr_auto] items-center gap-2">
                    <Input type="number" min={1} value={it.qty || ""} placeholder="الكمية" onChange={(e) => setItem(it.id, { qty: Number(e.target.value) })} />
                    <Input type="number" min={0} value={it.price || ""} placeholder="السعر" onChange={(e) => setItem(it.id, { price: Number(e.target.value) })} />
                    <span className="whitespace-nowrap text-sm font-bold">{n(it.qty * it.price)} <span className="saudi-riyal">&#xea;</span></span>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("items", [...q.items, { id: Date.now(), title: "", details: "", qty: 1, price: 0 }])}><PlusCircle className="me-2 h-4 w-4" /> إضافة بند</Button>
            </div>
            <Field label="خصم (ريال، اختياري)"><Input type="number" min={0} value={q.discount || ""} onChange={(e) => set("discount", Number(e.target.value))} /></Field>
            <label className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
              <span>إضافة ضريبة القيمة المضافة (١٥٪)</span>
              <Switch checked={q.vat} onCheckedChange={(v) => set("vat", v)} />
            </label>
            <p className="text-sm">الإجمالي: <b>{n(t.total)}</b> <span className="saudi-riyal">&#xea;</span></p>
          </Card>

          <Card title="المدة والدفع">
            <div className="grid grid-cols-2 gap-3">
              <Field label="مدة التنفيذ (يوم)"><Input type="number" min={1} value={q.durationDays || ""} onChange={(e) => set("durationDays", Number(e.target.value))} /></Field>
              <Field label="العرض صالح حتى"><Input type="date" value={q.validUntil} onChange={(e) => set("validUntil", e.target.value)} /></Field>
            </div>
            <Field label="طريقة الدفع"><Input value={q.payment} onChange={(e) => set("payment", e.target.value)} /></Field>
          </Card>

          <Card title="يشمل العرض">
            <Lines value={q.includes} onChange={(v) => set("includes", v)} add="إضافة ميزة" />
            <Field label="ملاحظات (اختياري)"><Textarea rows={2} value={q.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          </Card>

          <Card title="بياناتك">
            <div className="grid grid-cols-2 gap-3">
              <Field label="الاسم"><Input value={q.providerName} onChange={(e) => set("providerName", e.target.value)} /></Field>
              <Field label="الصفة"><Input value={q.providerTitle} onChange={(e) => set("providerTitle", e.target.value)} /></Field>
              <Field label="الإيميل"><Input type="email" value={q.providerEmail} onChange={(e) => set("providerEmail", e.target.value)} /></Field>
              <Field label="الجوال"><Input type="tel" value={q.providerPhone} onChange={(e) => set("providerPhone", e.target.value)} /></Field>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => toNext("contract")}><FileSignature className="me-2 h-4 w-4" /> حوّله لعقد</Button>
            <Button variant="secondary" onClick={() => toNext("invoice")}><FileDigit className="me-2 h-4 w-4" /> أصدر فاتورة</Button>
          </div>
        </div>

        <div className="contract-col min-w-0">
          <QuoteDocument q={q} />
        </div>
      </main>

      {/* Saved quotes */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>عروضي</DialogTitle><DialogDescription>افتح عرض محفوظ تعدّله أو تحمّله.</DialogDescription></DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {saved.length ? saved.map((x) => (
              <div key={x.id} className={cn("flex items-center gap-3 rounded-xl border p-3", x.id === q.id && "border-foreground")}>
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => { setQ({ ...blank(x.number), ...x }); setListOpen(false); }}>
                  <p className="truncate font-bold">{x.title || "بدون عنوان"} <span className="text-xs font-normal text-muted-foreground">· {x.clientCompany || x.clientName}</span></p>
                  <p className="text-xs text-muted-foreground"><span dir="ltr">{x.number}</span> · {fmtDate(x.date)} · {n(quoteTotals({ ...blank(""), ...x }).total)} ريال</p>
                </button>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", (STATUS[x.status] ?? STATUS.draft).tone)}>{(STATUS[x.status] ?? STATUS.draft).label}</span>
                <Button variant="ghost" size="icon" onClick={() => removeSaved(x)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )) : <p className="py-8 text-center text-sm text-muted-foreground">ما فيه عروض محفوظة للحين.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email */}
      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إرسال العرض للعميل</DialogTitle><DialogDescription>توصله رسالة فيها البنود والإجمالي. حمّل الـ PDF وأرفقه إذا تبيه بالنسخة الكاملة.</DialogDescription></DialogHeader>
          <Field label="إيميل العميل"><Input type="email" value={q.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} placeholder="email@example.com" /></Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMailOpen(false)}>إلغاء</Button>
            <Button onClick={sendMail} disabled={sending || !q.clientEmail}>{sending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />} إرسال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
