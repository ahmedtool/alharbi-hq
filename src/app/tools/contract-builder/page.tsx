"use client";

import React from "react";
import { db } from "@/lib/db";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from "@/lib/db";
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
import { Briefcase, Download, FileSignature, FolderOpen, Loader2, Mail, PlusCircle, Save, Send, Trash2 } from "lucide-react";
import { sendContractEmail } from "./actions";
import { getAccessToken } from "@/lib/auth";
import { logoAt } from "@/lib/brand";
import { kindOf as projectKind, type Project } from "@/app/projects/model";
import type { Client } from "@/app/clients/model";

/* Model --------------------------------------------------------------------- */
type Status = "draft" | "sent" | "signed";
const STATUS: Record<Status, string> = { draft: "مسودة", sent: "أُرسل للعميل", signed: "موقّع" };

interface Installment { id: number; amount: number; condition: string }
interface Contract {
  id?: string;
  number: string;
  date: string;
  status: Status;
  providerName: string; providerTitle: string; providerEmail: string; providerPhone: string;
  clientName: string; clientCompany: string; clientEmail: string; clientPhone: string; clientVat: string;
  projectId: string;
  title: string; summary: string; field: string;
  scope: string[];
  startDate: string; endDate: string; delivery: string;
  installments: Installment[];
  vat: boolean;
  revisions: number; supportDays: number; city: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const n = (x: number) => new Intl.NumberFormat("ar-SA").format(Math.round(x || 0));
const fmtDate = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { day: "numeric", month: "long", year: "numeric" }) : "........");

const addDaysFrom = (iso: string, d: number) => { const x = new Date(iso + "T00:00:00"); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
/** The fields of a saved quote that a contract can be filled from. */
interface QuoteData {
  number?: string; projectId?: string; title?: string; intro?: string;
  clientName?: string; clientCompany?: string; clientEmail?: string; clientPhone?: string;
  items?: { title: string; details?: string; qty: number; price: number }[];
  discount?: number; vat?: boolean; durationDays?: number;
}

const blank = (number: string): Contract => ({
  number, date: today(), status: "draft",
  providerName: "أحمد الحربي", providerTitle: "المطور", providerEmail: "hi@ahmedalharbi.com", providerPhone: "+966560766880",
  clientName: "", clientCompany: "", clientEmail: "", clientPhone: "", clientVat: "",
  projectId: "",
  title: "", summary: "", field: "تطوير المنتجات والحلول الرقمية",
  scope: ["تصميم واجهات المستخدم (UI/UX).", "تطوير المنصة وتجهيزها للعمل على الجوال والكمبيوتر.", "رفع المشروع على الاستضافة وتسليم بيانات الدخول."],
  startDate: today(), endDate: addDays(30), delivery: "رابط مباشر للنسخة النهائية مع بيانات الدخول والملفات المصدرية",
  installments: [
    { id: 1, amount: 0, condition: "دفعة مقدمة عند توقيع العقد" },
    { id: 2, amount: 0, condition: "عند التسليم النهائي" },
  ],
  vat: false, revisions: 2, supportDays: 30, city: "الرياض",
});

/* Contract document (also what gets printed / saved as PDF) ----------------- */
function ContractDocument({ c }: { c: Contract }) {
  const subtotal = c.installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const vatAmount = c.vat ? subtotal * 0.15 : 0;
  const total = subtotal + vatAmount;
  const client = c.clientCompany || c.clientName || "........";
  const art = (i: number) => `المادة (${n(i)})`;
  let k = 0;
  const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-1.5 mt-5 text-[15px] font-bold">{art(++k)}: {children}</h2>;

  return (
    <article className="contract-sheet mx-auto max-w-[820px] rounded-2xl border bg-white p-8 text-[13px] leading-[1.95] text-neutral-900 shadow-xl sm:p-12">
      <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-5">
        <div className="flex items-center gap-3">
          <img src={logoAt(96)} alt="" width={52} height={52} className="h-[52px] w-[52px] rounded-xl object-cover" />
          <div>
            <p className="text-lg font-bold leading-tight">{c.providerName}</p>
            <p className="text-xs text-neutral-500">{c.providerTitle}</p>
          </div>
        </div>
        <div className="text-left text-xs text-neutral-500" dir="rtl">
          <p>رقم العقد: <b className="text-neutral-900" dir="ltr">{c.number}</b></p>
          <p>التاريخ: {fmtDate(c.date)}</p>
          <p>المدينة: {c.city}</p>
        </div>
      </header>

      <h1 className="mb-1 mt-6 text-center text-2xl font-bold">عقد تطوير وتقديم خدمات رقمية</h1>
      <p className="mb-6 text-center text-xs text-neutral-500">مشروع «{c.title || "........"}»</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-1 text-xs font-bold text-neutral-500">الطرف الأول (المطوّر)</p>
          <p className="font-bold">{c.providerName}</p>
          <p className="text-xs text-neutral-600">{c.providerTitle}</p>
          <p className="text-xs text-neutral-600" dir="ltr" style={{ textAlign: "right" }}>{c.providerEmail} · {c.providerPhone}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-1 text-xs font-bold text-neutral-500">الطرف الثاني (العميل)</p>
          <p className="font-bold">{client}</p>
          {c.clientCompany && c.clientName && <p className="text-xs text-neutral-600">ويمثله: {c.clientName}</p>}
          {(c.clientEmail || c.clientPhone) && <p className="text-xs text-neutral-600" dir="ltr" style={{ textAlign: "right" }}>{[c.clientEmail, c.clientPhone].filter(Boolean).join(" · ")}</p>}
          {c.clientVat && <p className="text-xs text-neutral-600">الرقم الضريبي: <span dir="ltr">{c.clientVat}</span></p>}
        </div>
      </div>

      <h2 className="mb-1.5 mt-6 text-[15px] font-bold">تمهيد</h2>
      <p className="text-justify">
        حيث إن الطرف الأول مطوّر متخصص في {c.field}، ويرغب الطرف الثاني في تنفيذ مشروع «{c.title || "........"}»، فقد اتفق الطرفان وهما بكامل أهليتهما المعتبرة شرعًا ونظامًا على ما يلي، ويُعد هذا التمهيد جزءًا لا يتجزأ من العقد.
      </p>

      <H>موضوع العقد</H>
      <p className="text-justify">يلتزم الطرف الأول بتنفيذ مشروع «{c.title || "........"}» لصالح الطرف الثاني{c.summary ? `: ${c.summary}` : "."}</p>

      <H>نطاق العمل</H>
      <ol className="list-inside list-decimal space-y-0.5 pr-1">
        {c.scope.filter((s) => s.trim()).map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <p className="mt-1 text-justify text-neutral-700">وأي عمل خارج هذا النطاق يُعد عملًا إضافيًا، تُتفق تكلفته ومدته كتابيًا قبل البدء فيه.</p>

      <H>المدة والتسليم</H>
      <p className="text-justify">
        يبدأ تنفيذ المشروع بتاريخ {fmtDate(c.startDate)}، ويُسلَّم في موعد أقصاه {fmtDate(c.endDate)}. وتُحتسب المدة من تاريخ استلام الدفعة الأولى وجميع المحتويات والصلاحيات اللازمة من الطرف الثاني. ويكون التسليم عن طريق: {c.delivery}.
      </p>

      <H>المقابل المالي وجدول الدفعات</H>
      <p>
        {c.vat
          ? <>قيمة العقد {n(subtotal)} ريال سعودي، تُضاف إليها ضريبة القيمة المضافة (١٥٪) بمبلغ {n(vatAmount)} ريال، ليكون الإجمالي <b>{n(total)} ريال سعودي</b></>
          : <>القيمة الإجمالية للعقد <b>{n(total)} ريال سعودي</b></>}، تُدفع على النحو الآتي:
      </p>
      <table className="mt-2 w-full border-collapse overflow-hidden rounded-lg text-[12.5px]">
        <thead>
          <tr className="bg-neutral-900 text-white">
            <th className="p-2 text-right font-semibold">الدفعة</th>
            <th className="p-2 text-right font-semibold">الاستحقاق</th>
            <th className="p-2 text-left font-semibold">المبلغ (ريال)</th>
          </tr>
        </thead>
        <tbody>
          {c.installments.map((i, idx) => (
            <tr key={i.id} className="border-b border-neutral-200">
              <td className="p-2">{n(idx + 1)}</td>
              <td className="p-2">{i.condition || "........"}</td>
              <td className="p-2 text-left font-bold">{n(i.amount)}</td>
            </tr>
          ))}
          <tr className="bg-neutral-50">
            <td className="p-2 font-bold" colSpan={2}>الإجمالي{c.vat ? " شامل الضريبة" : ""}</td>
            <td className="p-2 text-left font-bold">{n(total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-justify text-neutral-700">لا يبدأ العمل على أي مرحلة قبل استلام الدفعة المستحقة عنها، والدفعة المقدمة غير مستردة بعد بدء العمل.</p>

      <H>المراجعات والتعديلات</H>
      <p className="text-justify">يحق للطرف الثاني طلب {c.revisions === 1 ? "جولة مراجعة واحدة" : c.revisions === 2 ? "جولتي مراجعة" : `${n(c.revisions)} جولات مراجعة`} على المخرجات ضمن نطاق العمل دون مقابل، وتُحتسب التعديلات الإضافية أو الخارجة عن النطاق بشكل منفصل.</p>

      <H>التزامات الطرف الثاني</H>
      <p className="text-justify">يلتزم الطرف الثاني بتزويد الطرف الأول بالمحتوى والصلاحيات المطلوبة خلال خمسة (٥) أيام عمل من طلبها، ويمتد موعد التسليم بقدر أي تأخير منه. وعليه مراجعة كل تسليم خلال سبعة (٧) أيام، ويُعد التسليم مقبولًا إذا انقضت المدة دون ملاحظات مكتوبة.</p>

      <H>الضمان والدعم الفني</H>
      <p className="text-justify">يلتزم الطرف الأول بإصلاح أي أخطاء برمجية ناتجة عن عمله لمدة {n(c.supportDays)} يومًا من تاريخ التسليم النهائي دون مقابل، ولا يشمل ذلك إضافة مزايا جديدة أو الأعطال الناتجة عن تعديلات من غيره.</p>

      <H>الملكية الفكرية</H>
      <p className="text-justify">تنتقل ملكية المخرجات النهائية والملفات المصدرية إلى الطرف الثاني بعد سداد كامل قيمة العقد، وتبقى الأدوات والمكتبات الخارجية خاضعة لتراخيصها. ويحق للطرف الأول عرض المشروع ضمن أعماله ما لم يُتفق كتابيًا على خلاف ذلك.</p>

      <H>السرية</H>
      <p className="text-justify">يلتزم الطرفان بالمحافظة على سرية المعلومات والبيانات التي يطّلعان عليها بسبب هذا العقد، وعدم إفشائها لأي طرف ثالث أثناء سريان العقد وبعد انتهائه.</p>

      <H>إنهاء العقد</H>
      <p className="text-justify">يحق لأي طرف إنهاء العقد بإشعار كتابي إذا أخلّ الطرف الآخر بالتزاماته ولم يعالج الإخلال خلال سبعة (٧) أيام من إشعاره. وعند الإنهاء يستحق الطرف الأول مقابل ما أنجزه من أعمال، ويعيد ما استلمه عن أعمال لم تُنفذ.</p>

      <H>النظام الواجب التطبيق</H>
      <p className="text-justify">يخضع هذا العقد لأنظمة المملكة العربية السعودية، ويُسعى لحل أي خلاف وديًا، فإن تعذّر خلال خمسة عشر (١٥) يومًا فتختص به المحاكم المختصة في مدينة {c.city}.</p>

      <H>أحكام عامة</H>
      <p className="text-justify">تُعد المراسلات عبر البريد الإلكتروني والجوال المذكورين أعلاه وسيلة تواصل معتمدة بين الطرفين، ولا يُعتد بأي تعديل على هذا العقد ما لم يكن مكتوبًا وموافقًا عليه من الطرفين. وحُرر هذا العقد من نسختين بيد كل طرف نسخة للعمل بموجبها.</p>

      <div className="sign-block mt-12 grid grid-cols-2 gap-10 border-t pt-8 text-center text-xs">
        {[{ who: "الطرف الأول (المطوّر)", name: c.providerName }, { who: "الطرف الثاني (العميل)", name: c.clientName || client }].map((p) => (
          <div key={p.who}>
            <p className="font-bold">{p.who}</p>
            <p className="mt-1">{p.name}</p>
            <div className="mx-auto mt-10 w-4/5 border-b border-dashed border-neutral-400" />
            <p className="mt-1 text-neutral-500">التوقيع</p>
            <div className="mx-auto mt-6 w-4/5 border-b border-dashed border-neutral-400" />
            <p className="mt-1 text-neutral-500">التاريخ</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-[10px] text-neutral-400" dir="ltr">ahmedalharbi.com · {c.number}</p>
    </article>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-4 rounded-2xl border bg-card p-5"><h3 className="font-bold">{title}</h3>{children}</section>
);

/* Page ---------------------------------------------------------------------- */
export default function ContractBuilderPage() {
  const { toast } = useToast();
  const [c, setC] = React.useState<Contract>(() => blank("AH-0000"));
  const [saved, setSaved] = React.useState<Contract[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [listOpen, setListOpen] = React.useState(false);
  const [mailOpen, setMailOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const nextNumber = (list: Contract[]) => `AH-${new Date().getFullYear()}-${String(list.length + 1).padStart(3, "0")}`;

  const load = React.useCallback(async () => {
    const [cs, ps, cl] = await Promise.all([getDocs(collection(db, "contracts")), getDocs(collection(db, "projects")), getDocs(collection(db, "clients"))]);
    const list = cs.docs.map((d) => ({ ...(d.data() as Contract), id: d.id })).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    setSaved(list);
    setProjects(ps.docs.map((d) => ({ id: d.id, ...d.data() } as Project)).filter((p) => projectKind(p) === "client"));
    setClients(cl.docs.map((d) => ({ id: d.id, ...d.data() } as Client)));
    return list;
  }, []);

  React.useEffect(() => {
    load().then(async (list) => {
      setC((cur) => (cur.id ? cur : { ...cur, number: nextNumber(list) }));
      // Opened from an accepted quote: fill the contract from it.
      const quoteId = new URLSearchParams(window.location.search).get("quote");
      if (!quoteId) return;
      const snap = await getDoc(doc(db, "quotes", quoteId));
      if (!snap.exists()) return;
      const q = snap.data() as QuoteData;
      const items = (q.items || []).filter((i) => i.title?.trim());
      const net = Math.max(0, items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0) - (Number(q.discount) || 0));
      const half = Math.round(net / 2);
      setC((cur) => ({
        ...cur,
        projectId: q.projectId || "",
        title: q.title || cur.title,
        summary: q.intro && !q.intro.startsWith("شكرًا لاهتمامك") ? q.intro : "",
        scope: items.length ? items.map((i) => (i.details ? `${i.title}: ${i.details.replace(/\n+/g, "، ")}` : i.title)) : cur.scope,
        clientName: q.clientName || "", clientCompany: q.clientCompany || "",
        clientEmail: q.clientEmail || "", clientPhone: q.clientPhone || "",
        endDate: q.durationDays ? addDaysFrom(cur.startDate, q.durationDays) : cur.endDate,
        installments: net ? [
          { id: 1, amount: half, condition: "دفعة مقدمة عند توقيع العقد" },
          { id: 2, amount: net - half, condition: "عند التسليم النهائي" },
        ] : cur.installments,
        vat: !!q.vat,
      }));
      toast({ title: `تعبّى العقد من عرض السعر ${q.number || ""}`.trim(), description: "راجع النطاق والدفعات قبل الإرسال." });
    }).catch((e) => console.error(e));
  }, [load, toast]);

  const set = <K extends keyof Contract>(key: K, value: Contract[K]) => setC((cur) => ({ ...cur, [key]: value }));

  /** Fill the contract from a client project (client details, scope, dates, 50/50 payments). */
  const fromProject = (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    const cl = clients.find((x) => x.id === p.clientId);
    const half = Math.round((p.budget || 0) / 2);
    const lines = (p.description || "").split(/\n|،\s*|\.\s+/).map((s) => s.trim()).filter((s) => s.length > 3);
    setC((cur) => ({
      ...cur,
      projectId: id,
      title: p.name,
      summary: lines.length > 1 ? "" : p.description || "",
      scope: lines.length > 1 ? lines : cur.scope,
      clientName: cl?.name || p.clientName || "",
      clientCompany: cl?.company || "",
      clientEmail: cl?.email || "",
      clientPhone: cl?.phone || "",
      clientVat: cl?.vatNumber || "",
      city: cl?.city || cur.city,
      startDate: p.startDate ? p.startDate.slice(0, 10) : cur.startDate,
      endDate: p.endDate ? p.endDate.slice(0, 10) : cur.endDate,
      installments: p.budget ? [
        { id: 1, amount: half, condition: "دفعة مقدمة عند توقيع العقد" },
        { id: 2, amount: (p.budget || 0) - half, condition: "عند التسليم النهائي" },
      ] : cur.installments,
    }));
    toast({ title: "تعبّى العقد من المشروع", description: "راجع النطاق والدفعات قبل الإرسال." });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { id, ...data } = c;
      if (id) await updateDoc(doc(db, "contracts", id), data as Record<string, unknown>);
      else { const ref = await addDoc(collection(db, "contracts"), data); setC((cur) => ({ ...cur, id: ref.id })); }
      await load();
      toast({ title: "تم حفظ العقد" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ العقد" });
    } finally {
      setSaving(false);
    }
  };

  const newContract = () => setC(blank(nextNumber(saved)));
  const removeSaved = async (x: Contract) => {
    if (!x.id || !window.confirm(`حذف العقد ${x.number}؟`)) return;
    await deleteDoc(doc(db, "contracts", x.id));
    const list = await load();
    if (c.id === x.id) setC(blank(nextNumber(list)));
  };

  /** Save as PDF through the browser's print dialog: crisp text, proper pages, only the contract. */
  const download = () => {
    const old = document.title;
    document.title = `عقد ${c.number} - ${c.clientCompany || c.clientName || c.title}`.trim();
    window.print();
    document.title = old;
  };

  const sendMail = async () => {
    if (!c.clientEmail) return toast({ variant: "destructive", title: "اكتب إيميل العميل" });
    setSending(true);
    try {
      const total = c.installments.reduce((s, i) => s + (Number(i.amount) || 0), 0) * (c.vat ? 1.15 : 1);
      const html = `
        <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#111;max-width:600px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
          <div style="background:#111;color:#fff;padding:22px 26px"><b style="font-size:18px">${c.providerName}</b><div style="opacity:.7;font-size:13px">${c.providerTitle}</div></div>
          <div style="padding:26px">
            <p>أهلًا ${c.clientName || ""}،</p>
            <p>أرسل لك عقد مشروع <b>«${c.title}»</b> للمراجعة والاعتماد.</p>
            <table style="width:100%;background:#f6f6f4;border-radius:10px;padding:12px;font-size:14px">
              <tr><td>رقم العقد</td><td style="text-align:left"><b>${c.number}</b></td></tr>
              <tr><td>المدة</td><td style="text-align:left">${fmtDate(c.startDate)} ← ${fmtDate(c.endDate)}</td></tr>
              <tr><td>الإجمالي</td><td style="text-align:left"><b>${n(total)} ريال</b></td></tr>
              <tr><td>الدفعات</td><td style="text-align:left">${n(c.installments.length)}</td></tr>
            </table>
            <p>مرفق نسخة العقد، وإذا عندك أي ملاحظة أنا حاضر.</p>
            <p style="margin-top:24px">تحياتي،<br><b>${c.providerName}</b><br>${c.providerTitle} · ${c.providerPhone}</p>
          </div>
        </div>`;
      const r = await sendContractEmail({ to: c.clientEmail, subject: `عقد مشروع ${c.title} - ${c.providerName}`, htmlBody: html, fromName: c.providerName }, (await getAccessToken()) ?? "");
      if (!r.success) throw new Error(r.message);
      setC((cur) => ({ ...cur, status: cur.status === "draft" ? "sent" : cur.status }));
      toast({ title: "وصل العقد لإيميل العميل" });
      setMailOpen(false);
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "ما انرسل الإيميل", description: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(false);
    }
  };

  const subtotal = c.installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <div className="contract-page p-4 sm:p-6 lg:p-8 text-right">
      <div className="no-print">
        <PageHeader title="العقود" description="جهّز العقد من مشروع العميل، احفظه، وحمّله PDF أو أرسله.">
          <Button variant="outline" onClick={() => setListOpen(true)}><FolderOpen className="me-2 h-4 w-4" /> عقودي ({n(saved.length)})</Button>
          <Button variant="outline" onClick={() => setMailOpen(true)}><Mail className="me-2 h-4 w-4" /> إرسال</Button>
          <Button variant="outline" onClick={save} disabled={saving}>{saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />} حفظ</Button>
          <Button onClick={download}><Download className="me-2 h-4 w-4" /> تحميل PDF</Button>
        </PageHeader>
      </div>

      <main className="contract-main grid items-start gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="no-print space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:pe-1">
          <div className="flex items-center gap-2 rounded-2xl border bg-card p-3">
            <FileSignature className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">العقد</p><p className="font-bold" dir="ltr" style={{ textAlign: "right" }}>{c.number}</p></div>
            <Select value={c.status} onValueChange={(v) => set("status", v as Status)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(STATUS) as Status[]).map((s) => <SelectItem key={s} value={s}>{STATUS[s]}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={newContract} title="عقد جديد"><PlusCircle className="h-4 w-4" /></Button>
          </div>

          <Card title="ابدأ من مشروع">
            <Select value={c.projectId} onValueChange={fromProject}>
              <SelectTrigger><SelectValue placeholder="اختر مشروع عميل يعبّي العقد" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" />{p.name}{p.clientName ? ` · ${p.clientName}` : ""}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </Card>

          <Card title="العميل (الطرف الثاني)">
            <Field label="الجهة / الشركة (اختياري)"><Input value={c.clientCompany} onChange={(e) => set("clientCompany", e.target.value)} /></Field>
            <Field label="الاسم"><Input value={c.clientName} onChange={(e) => set("clientName", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الإيميل"><Input type="email" value={c.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} /></Field>
              <Field label="الجوال"><Input type="tel" value={c.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} /></Field>
            </div>
            <Field label="الرقم الضريبي (اختياري)"><Input dir="ltr" value={c.clientVat} onChange={(e) => set("clientVat", e.target.value)} /></Field>
          </Card>

          <Card title="المشروع والنطاق">
            <Field label="اسم المشروع"><Input value={c.title} onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="وصف مختصر (اختياري)"><Textarea rows={2} value={c.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
            <Field label="بنود نطاق العمل">
              <div className="space-y-2">
                {c.scope.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs text-muted-foreground">{n(i + 1)}</span>
                    <Input value={s} onChange={(e) => set("scope", c.scope.map((x, j) => (j === i ? e.target.value : x)))} />
                    <Button variant="ghost" size="icon" onClick={() => set("scope", c.scope.filter((_, j) => j !== i))} disabled={c.scope.length === 1}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => set("scope", [...c.scope, ""])}><PlusCircle className="me-2 h-4 w-4" /> إضافة بند</Button>
              </div>
            </Field>
          </Card>

          <Card title="المدة والتسليم">
            <div className="grid grid-cols-2 gap-3">
              <Field label="البداية"><Input type="date" value={c.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
              <Field label="التسليم"><Input type="date" value={c.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>
            </div>
            <Field label="طريقة التسليم"><Input value={c.delivery} onChange={(e) => set("delivery", e.target.value)} /></Field>
          </Card>

          <Card title="الدفعات">
            <div className="space-y-2">
              {c.installments.map((it, i) => (
                <div key={it.id} className="grid grid-cols-[1fr_110px_auto] items-center gap-2">
                  <Input value={it.condition} placeholder="متى تُستحق؟" onChange={(e) => set("installments", c.installments.map((x) => (x.id === it.id ? { ...x, condition: e.target.value } : x)))} />
                  <Input type="number" min={0} value={it.amount || ""} placeholder="المبلغ" onChange={(e) => set("installments", c.installments.map((x) => (x.id === it.id ? { ...x, amount: Number(e.target.value) } : x)))} />
                  <Button variant="ghost" size="icon" onClick={() => set("installments", c.installments.filter((x) => x.id !== it.id))} disabled={c.installments.length === 1} aria-label={`حذف الدفعة ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("installments", [...c.installments, { id: Date.now(), amount: 0, condition: "" }])}><PlusCircle className="me-2 h-4 w-4" /> إضافة دفعة</Button>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
              <span>إضافة ضريبة القيمة المضافة (١٥٪)</span>
              <Switch checked={c.vat} onCheckedChange={(v) => set("vat", v)} />
            </label>
            <p className="text-sm">الإجمالي: <b>{n(subtotal * (c.vat ? 1.15 : 1))}</b> <span className="saudi-riyal">&#xea;</span></p>
          </Card>

          <Card title="الشروط">
            <div className="grid grid-cols-3 gap-3">
              <Field label="جولات المراجعة"><Input type="number" min={0} value={c.revisions} onChange={(e) => set("revisions", Number(e.target.value))} /></Field>
              <Field label="أيام الدعم"><Input type="number" min={0} value={c.supportDays} onChange={(e) => set("supportDays", Number(e.target.value))} /></Field>
              <Field label="المدينة"><Input value={c.city} onChange={(e) => set("city", e.target.value)} /></Field>
            </div>
          </Card>

          <Card title="بياناتك (الطرف الأول)">
            <div className="grid grid-cols-2 gap-3">
              <Field label="الاسم"><Input value={c.providerName} onChange={(e) => set("providerName", e.target.value)} /></Field>
              <Field label="الصفة"><Input value={c.providerTitle} onChange={(e) => set("providerTitle", e.target.value)} /></Field>
              <Field label="الإيميل"><Input type="email" value={c.providerEmail} onChange={(e) => set("providerEmail", e.target.value)} /></Field>
              <Field label="الجوال"><Input type="tel" value={c.providerPhone} onChange={(e) => set("providerPhone", e.target.value)} /></Field>
            </div>
            <Field label="مجال التخصص (يظهر في التمهيد)"><Input value={c.field} onChange={(e) => set("field", e.target.value)} /></Field>
          </Card>
        </div>

        <div className="contract-col min-w-0">
          <ContractDocument c={c} />
        </div>
      </main>

      {/* Saved contracts */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>عقودي</DialogTitle><DialogDescription>افتح عقد محفوظ تعدّله أو تحمّله.</DialogDescription></DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {saved.length ? saved.map((x) => (
              <div key={x.id} className={cn("flex items-center gap-3 rounded-xl border p-3", x.id === c.id && "border-foreground")}>
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => { setC({ ...blank(x.number), ...x }); setListOpen(false); }}>
                  <p className="truncate font-bold">{x.title || "بدون عنوان"} <span className="text-xs font-normal text-muted-foreground">· {x.clientCompany || x.clientName}</span></p>
                  <p className="text-xs text-muted-foreground"><span dir="ltr">{x.number}</span> · {fmtDate(x.date)}</p>
                </button>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", x.status === "signed" ? "bg-emerald-100 text-emerald-900" : x.status === "sent" ? "bg-sky-100 text-sky-900" : "bg-muted")}>{STATUS[x.status] ?? "مسودة"}</span>
                <Button variant="ghost" size="icon" onClick={() => removeSaved(x)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )) : <p className="py-8 text-center text-sm text-muted-foreground">ما فيه عقود محفوظة للحين.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email */}
      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إرسال العقد للعميل</DialogTitle><DialogDescription>توصله رسالة فيها ملخص العقد. حمّل الـ PDF وأرفقه إذا تبيه بالنسخة الكاملة.</DialogDescription></DialogHeader>
          <Field label="إيميل العميل"><Input type="email" value={c.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} placeholder="email@example.com" /></Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMailOpen(false)}>إلغاء</Button>
            <Button onClick={sendMail} disabled={sending || !c.clientEmail}>{sending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />} إرسال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
