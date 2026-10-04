"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from "@/lib/db";
import { storage, ref, uploadBytes, getDownloadURL } from "@/lib/storage";
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
import { Briefcase, Download, FileDigit, FolderOpen, Loader2, Mail, Package, PlusCircle, Save, Send, Trash2, Users } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { sendContractEmail } from "../contract-builder/actions";
import { getAccessToken } from "@/lib/auth";
import { logoAt } from "@/lib/brand";
import { kindOf as projectKind, type Project } from "@/app/projects/model";
import type { Client } from "@/app/clients/model";

/* Model --------------------------------------------------------------------- */
// Field names match the invoices already stored (the finance pages read them too).
type Status = "unpaid" | "paid" | "overdue";
const STATUS: Record<Status, { label: string; tone: string }> = {
  unpaid: { label: "غير مدفوعة", tone: "bg-amber-100 text-amber-900" },
  paid: { label: "مدفوعة", tone: "bg-emerald-100 text-emerald-900" },
  overdue: { label: "متأخرة", tone: "bg-red-100 text-red-900" },
};
const PAYMENT_METHODS = ["تحويل بنكي", "مدى", "بطاقة ائتمانية", "Apple Pay", "نقدًا"];

interface LineItem { id: number; description: string; quantity: number; price: number }
interface Product { id: string; name: string; description: string; price: number }
interface Invoice {
  id?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: Status;
  yourDetails: string;
  clientName: string; clientCompany: string; clientEmail: string; clientPhone: string; clientVat: string;
  projectId: string | null; projectName: string;
  lineItems: LineItem[];
  discount: number;
  vat: boolean;
  paymentMethod: string;
  bankDetails: string;
  notes: string;
  internalNotes: string;
  total?: number;
}
interface QuoteData {
  number?: string; projectId?: string; title?: string;
  clientName?: string; clientCompany?: string; clientEmail?: string; clientPhone?: string;
  items?: { title: string; details?: string; qty: number; price: number }[];
  discount?: number; vat?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const n = (x: number) => new Intl.NumberFormat("ar-SA").format(Math.round((x || 0) * 100) / 100);
const fmtDate = (iso: string) => {
  const d = iso ? new Date(iso.slice(0, 10) + "T00:00:00") : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { day: "numeric", month: "long", year: "numeric" }) : "—";
};

const totals = (v: Pick<Invoice, "lineItems" | "discount" | "vat">) => {
  const subtotal = (v.lineItems || []).reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
  const discount = Math.min(Number(v.discount) || 0, subtotal);
  const net = subtotal - discount;
  const vat = v.vat ? net * 0.15 : 0;
  return { subtotal, discount, net, vat, total: net + vat };
};

const blank = (number: string): Invoice => ({
  invoiceNumber: number, invoiceDate: today(), dueDate: addDays(14), status: "unpaid",
  yourDetails: "أحمد الحربي\nالمطوّر\nالرياض، المملكة العربية السعودية\nhi@ahmedalharbi.com",
  clientName: "", clientCompany: "", clientEmail: "", clientPhone: "", clientVat: "",
  projectId: null, projectName: "",
  lineItems: [{ id: 1, description: "", quantity: 1, price: 0 }],
  discount: 0, vat: false,
  paymentMethod: "تحويل بنكي", bankDetails: "",
  notes: "شكرًا لتعاملكم معنا.", internalNotes: "",
});

const nextNumber = (list: { invoiceNumber?: string }[]) => {
  const max = list.reduce((m, x) => Math.max(m, parseInt((x.invoiceNumber || "").split("-").pop() || "0", 10) || 0), 0);
  return `INV-${String(max + 1).padStart(3, "0")}`;
};

/* Invoice document (also what gets printed / saved as PDF) ------------------ */
function InvoiceSheet({ v, sheetRef }: { v: Invoice; sheetRef: React.RefObject<HTMLElement> }) {
  const t = totals(v);
  const [providerName, providerTitle, ...providerRest] = v.yourDetails.split("\n");
  const client = v.clientCompany || v.clientName || "—";
  const items = v.lineItems.filter((i) => i.description.trim() || i.price);
  return (
    <article ref={sheetRef} id="invoice-sheet" dir="rtl" className="contract-sheet mx-auto w-full max-w-[820px] rounded-2xl border bg-white p-8 text-[13px] leading-[1.9] text-neutral-900 shadow-xl sm:p-12">
      <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-5">
        <div className="flex items-center gap-3">
          <img src={logoAt(96)} alt="" width={52} height={52} crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-[52px] w-[52px] rounded-xl object-cover" />
          <div>
            <p className="text-lg font-bold leading-tight">{providerName || "أحمد الحربي"}</p>
            <p className="text-xs text-neutral-500">{providerTitle || "المطوّر"}</p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-2xl font-bold leading-tight">{v.vat ? "فاتورة ضريبية" : "فاتورة"}</p>
          <p className="text-xs text-neutral-500" dir="ltr">{v.invoiceNumber}</p>
          {v.status === "paid" && <p className="mt-1 inline-block rounded-full border-2 border-emerald-600 px-2.5 text-xs font-bold text-emerald-700">مدفوعة</p>}
        </div>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-1 text-xs font-bold text-neutral-500">من</p>
          <p className="font-bold">{providerName || "أحمد الحربي"}</p>
          {providerRest.filter(Boolean).map((l, i) => <p key={i} className="text-xs text-neutral-600">{l}</p>)}
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-1 text-xs font-bold text-neutral-500">إلى</p>
          <p className="font-bold">{client}</p>
          {v.clientCompany && v.clientName && <p className="text-xs text-neutral-600">{v.clientName}</p>}
          {v.clientEmail && <p className="text-xs text-neutral-600" dir="ltr" style={{ textAlign: "right" }}>{v.clientEmail}</p>}
          {v.clientPhone && <p className="text-xs text-neutral-600" dir="ltr" style={{ textAlign: "right" }}>{v.clientPhone}</p>}
          {v.clientVat && <p className="text-xs text-neutral-600">الرقم الضريبي: <span dir="ltr">{v.clientVat}</span></p>}
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs">
          <div className="flex justify-between gap-2"><span className="text-neutral-500">تاريخ الإصدار</span><b>{fmtDate(v.invoiceDate)}</b></div>
          <div className="mt-1 flex justify-between gap-2"><span className="text-neutral-500">تاريخ الاستحقاق</span><b>{fmtDate(v.dueDate)}</b></div>
          <div className="mt-1 flex justify-between gap-2"><span className="text-neutral-500">رقم الفاتورة</span><b dir="ltr">{v.invoiceNumber}</b></div>
          {v.projectName && <div className="mt-1 flex justify-between gap-2"><span className="text-neutral-500">المشروع</span><b>{v.projectName}</b></div>}
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-right">
        <thead>
          <tr className="bg-neutral-900 text-white">
            <th className="rounded-r-lg px-3 py-2 text-xs font-bold">#</th>
            <th className="w-1/2 px-3 py-2 text-xs font-bold">الخدمة / المنتج</th>
            <th className="px-3 py-2 text-center text-xs font-bold">الكمية</th>
            <th className="px-3 py-2 text-center text-xs font-bold">سعر الوحدة</th>
            <th className="rounded-l-lg px-3 py-2 text-left text-xs font-bold">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {(items.length ? items : v.lineItems).map((it, i) => {
            const [title, ...rest] = it.description.split("\n");
            const details = rest.join("\n").trim();
            return (
              <tr key={it.id} className="border-b border-neutral-200 align-top">
                <td className="px-3 py-2.5 text-neutral-500">{n(i + 1)}</td>
                <td className="px-3 py-2.5">
                  <p className="font-semibold">{title || "—"}</p>
                  {details && <p className="whitespace-pre-wrap text-xs text-neutral-600">{details}</p>}
                </td>
                <td className="px-3 py-2.5 text-center">{n(it.quantity)}</td>
                <td className="px-3 py-2.5 text-center">{n(it.price)}</td>
                <td className="px-3 py-2.5 text-left font-semibold">{n(it.quantity * it.price)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6 grid items-start gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-bold text-neutral-500">طريقة الدفع</p>
            <p>{v.paymentMethod}</p>
            {v.bankDetails && <p className="whitespace-pre-wrap text-xs text-neutral-600" dir="auto">{v.bankDetails}</p>}
          </div>
          {v.notes && (
            <div>
              <p className="mb-1 text-xs font-bold text-neutral-500">ملاحظات</p>
              <p className="whitespace-pre-wrap text-neutral-700">{v.notes}</p>
            </div>
          )}
        </div>
        <div className="sign-block rounded-xl border-2 border-neutral-900 p-4">
          <div className="flex items-center justify-between text-xs"><span className="text-neutral-500">المجموع</span><span>{n(t.subtotal)} ريال</span></div>
          {t.discount > 0 && <div className="mt-1 flex items-center justify-between text-xs"><span className="text-neutral-500">الخصم</span><span>− {n(t.discount)} ريال</span></div>}
          {v.vat && <div className="mt-1 flex items-center justify-between text-xs"><span className="text-neutral-500">ضريبة القيمة المضافة (١٥٪)</span><span>{n(t.vat)} ريال</span></div>}
          <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
            <span className="font-bold">الإجمالي المستحق</span>
            <span className="text-xl font-bold">{n(t.total)} <span className="text-sm">ريال</span></span>
          </div>
        </div>
      </div>

      <footer className="mt-10 border-t border-neutral-200 pt-4 text-center text-[11px] text-neutral-500">
        في حال وجود أي استفسار بخصوص هذه الفاتورة، يرجى التواصل معنا · ahmedalharbi.com
      </footer>
    </article>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-4 rounded-2xl border bg-card p-5"><h3 className="font-bold">{title}</h3>{children}</section>
);

/* Page ---------------------------------------------------------------------- */
export function InvoiceForm() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const sheetRef = React.useRef<HTMLElement>(null);
  const [v, setV] = React.useState<Invoice>(() => blank("INV-001"));
  const [saved, setSaved] = React.useState<Invoice[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [listOpen, setListOpen] = React.useState(false);
  const [mailOpen, setMailOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const load = React.useCallback(async () => {
    const [is, ps, cl, pr] = await Promise.all(["invoices", "projects", "clients", "products"].map((c) => getDocs(collection(db, c))));
    const list = is.docs.map((d) => ({ ...blank(""), ...(d.data() as Invoice), id: d.id })).sort((a, b) => (b.invoiceNumber || "").localeCompare(a.invoiceNumber || ""));
    setSaved(list);
    setProjects(ps.docs.map((d) => ({ id: d.id, ...d.data() } as Project)).filter((p) => projectKind(p) === "client"));
    setClients(cl.docs.map((d) => ({ id: d.id, ...d.data() } as Client)));
    setProducts(pr.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    return list;
  }, []);

  // Open ?id=<invoice>, fill from ?quote=<quote>, or start a fresh numbered invoice.
  const idParam = params.get("id");
  const quoteParam = params.get("quote");
  React.useEffect(() => {
    (async () => {
      const list = await load();
      if (idParam) {
        const found = list.find((x) => x.id === idParam);
        if (found) return setV(found);
        toast({ variant: "destructive", title: "الفاتورة غير موجودة." });
      }
      const fresh = blank(nextNumber(list));
      if (quoteParam) {
        const snap = await getDoc(doc(db, "quotes", quoteParam));
        if (snap.exists()) {
          const q = snap.data() as QuoteData;
          const items = (q.items || []).filter((i) => i.title?.trim());
          setV({
            ...fresh,
            clientName: q.clientName || "", clientCompany: q.clientCompany || "", clientEmail: q.clientEmail || "", clientPhone: q.clientPhone || "",
            projectId: q.projectId || null, projectName: q.title || "",
            lineItems: items.length ? items.map((i, k) => ({ id: k + 1, description: i.details ? `${i.title}\n${i.details}` : i.title, quantity: Number(i.qty) || 1, price: Number(i.price) || 0 })) : fresh.lineItems,
            discount: Number(q.discount) || 0, vat: !!q.vat,
          });
          toast({ title: `تعبّت الفاتورة من عرض السعر ${q.number || ""}`.trim(), description: "عدّل المبالغ لو بتفوتر دفعة وحدة بس." });
          return;
        }
      }
      setV(fresh);
    })().catch((e) => console.error(e));
  }, [load, idParam, quoteParam, toast]);

  const set = <K extends keyof Invoice>(key: K, value: Invoice[K]) => setV((cur) => ({ ...cur, [key]: value }));
  const setItem = (id: number, patch: Partial<LineItem>) => set("lineItems", v.lineItems.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  /** Fill from a client project: client details and what's still owed on it. */
  const fromProject = (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    const cl = clients.find((x) => x.id === p.clientId);
    const remaining = Math.max(0, (p.budget || 0) - (p.amountPaid || 0));
    setV((cur) => ({
      ...cur,
      projectId: id, projectName: p.name,
      clientName: cl?.name || p.clientName || "", clientCompany: cl?.company || "",
      clientEmail: cl?.email || "", clientPhone: cl?.phone || "", clientVat: cl?.vatNumber || "",
      lineItems: remaining ? [{ id: 1, description: `${p.name}${p.amountPaid ? "\nالمبلغ المتبقي من قيمة المشروع" : ""}`, quantity: 1, price: remaining }] : cur.lineItems,
    }));
    toast({ title: "تعبّت الفاتورة من المشروع", description: remaining ? `المتبقي على العميل ${n(remaining)} ريال.` : undefined });
  };

  const fromClient = (id: string) => {
    const cl = clients.find((x) => x.id === id);
    if (!cl) return;
    setV((cur) => ({ ...cur, clientName: cl.name || "", clientCompany: cl.company || "", clientEmail: cl.email || "", clientPhone: cl.phone || "", clientVat: cl.vatNumber || "" }));
  };

  const addProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const line = { id: Date.now(), description: p.description ? `${p.name}\n${p.description}` : p.name, quantity: 1, price: Number(p.price) || 0 };
    const empty = v.lineItems.length === 1 && !v.lineItems[0].description.trim() && !v.lineItems[0].price;
    set("lineItems", empty ? [line] : [...v.lineItems, line]);
  };

  /** A picture of the sheet for the files archive (letter-spacing reset keeps Arabic joined). */
  const archivePdf = async () => {
    const el = sheetRef.current;
    if (!el) return null;
    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 1024, width: 820,
      onclone: (d, node) => {
        node.style.width = "820px"; node.style.maxWidth = "820px";
        const st = d.createElement("style");
        st.textContent = "* { letter-spacing: normal !important; } #invoice-sheet { border: 0 !important; box-shadow: none !important; }";
        d.head.appendChild(st);
      },
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 10;
    const w = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
    const pxPerMm = canvas.width / w;
    const slice = Math.floor(pageH * pxPerMm);
    for (let y = 0, page = 0; y < canvas.height; y += slice, page++) {
      const h = Math.min(slice, canvas.height - y);
      const part = document.createElement("canvas");
      part.width = canvas.width; part.height = h;
      part.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page) pdf.addPage();
      pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, w, h / pxPerMm);
    }
    return pdf.output("blob");
  };

  const archive = async (blob: Blob) => {
    const fq = await getDocs(query(collection(db, "folders"), where("name", "==", "الفواتير"), limit(1)));
    const folderId = fq.empty ? (await addDoc(collection(db, "folders"), { name: "الفواتير", parentId: "root", createdAt: serverTimestamp() })).id : fq.docs[0].id;
    const name = `فاتورة-${v.invoiceNumber}.pdf`;
    const path = `files/${folderId}/${name}`;
    const r = ref(storage, path);
    await uploadBytes(r, blob);
    await addDoc(collection(db, "files"), { name, url: await getDownloadURL(r), path, size: blob.size, parentId: folderId, createdAt: serverTimestamp() });
  };

  const save = async () => {
    setSaving(true);
    try {
      const t = totals(v);
      const { id: existing, total: _old, ...rest } = v;
      const id = existing || doc(collection(db, "invoices")).id;
      await setDoc(doc(db, "invoices", id), { ...rest, projectId: v.projectId || null, subtotal: t.subtotal, vatAmount: t.vat, total: t.total });
      setV((cur) => ({ ...cur, id }));

      // Paid invoices count as income in finance.
      const txRef = doc(db, "transactions", `inv_${id}`);
      if (v.status === "paid") {
        await setDoc(txRef, { id: `inv_${id}`, description: `دخل من الفاتورة #${v.invoiceNumber}`, amount: t.total, type: "income", category: "دخل فواتير", date: new Date().toISOString() });
      } else if ((await getDoc(txRef)).exists()) {
        await deleteDoc(txRef);
      }
      toast({ title: "تم حفظ الفاتورة", description: v.invoiceNumber });
      await load();

      const blob = await archivePdf().catch((e) => { console.error(e); return null; });
      if (blob) { await archive(blob); toast({ title: "انحفظت نسخة PDF في ملفاتي ← الفواتير" }); }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ الفاتورة" });
    } finally {
      setSaving(false);
    }
  };

  const newInvoice = () => { setV(blank(nextNumber(saved))); router.replace("/tools/invoice-generator"); };
  const removeSaved = async (x: Invoice) => {
    if (!x.id || !window.confirm(`حذف الفاتورة ${x.invoiceNumber}؟`)) return;
    await deleteDoc(doc(db, "invoices", x.id));
    const tx = doc(db, "transactions", `inv_${x.id}`);
    if ((await getDoc(tx)).exists()) await deleteDoc(tx);
    const list = await load();
    if (v.id === x.id) setV(blank(nextNumber(list)));
  };

  const download = () => {
    const old = document.title;
    document.title = `فاتورة ${v.invoiceNumber}${v.clientCompany || v.clientName ? ` - ${v.clientCompany || v.clientName}` : ""}`;
    window.print();
    document.title = old;
  };

  const sendMail = async () => {
    if (!v.clientEmail) return toast({ variant: "destructive", title: "اكتب إيميل العميل" });
    setSending(true);
    try {
      const t = totals(v);
      const name = v.yourDetails.split("\n")[0] || "أحمد الحربي";
      const rows = v.lineItems.filter((i) => i.description.trim()).map((i) => `<tr><td>${i.description.split("\n")[0]}</td><td style="text-align:left">${n(i.quantity * i.price)} ريال</td></tr>`).join("");
      const html = `
        <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#111;max-width:600px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
          <div style="background:#111;color:#fff;padding:22px 26px"><b style="font-size:18px">${name}</b><div style="opacity:.7;font-size:13px">فاتورة ${v.invoiceNumber}</div></div>
          <div style="padding:26px">
            <p>أهلًا ${v.clientName || ""}،</p>
            <p>هذي فاتورة ${v.projectName ? `مشروع <b>«${v.projectName}»</b>` : "الخدمات المقدمة"}.</p>
            <table style="width:100%;background:#f6f6f4;border-radius:10px;padding:12px;font-size:14px">
              ${rows}
              <tr><td style="border-top:1px solid #ddd;padding-top:6px"><b>الإجمالي المستحق</b></td><td style="text-align:left;border-top:1px solid #ddd;padding-top:6px"><b>${n(t.total)} ريال</b></td></tr>
            </table>
            <p style="font-size:14px">تاريخ الاستحقاق: ${fmtDate(v.dueDate)} · طريقة الدفع: ${v.paymentMethod}${v.bankDetails ? `<br>${v.bankDetails.replace(/\n/g, "<br>")}` : ""}</p>
            <p style="margin-top:24px">تحياتي،<br><b>${name}</b></p>
          </div>
        </div>`;
      const r = await sendContractEmail({ to: v.clientEmail, subject: `فاتورة ${v.invoiceNumber} - ${name}`, htmlBody: html, fromName: name }, (await getAccessToken()) ?? "");
      if (!r.success) throw new Error(r.message);
      toast({ title: "وصلت الفاتورة لإيميل العميل" });
      setMailOpen(false);
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "ما انرسل الإيميل", description: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(false);
    }
  };

  const t = totals(v);

  return (
    <div className="contract-page p-4 sm:p-6 lg:p-8 text-right">
      <div className="no-print">
        <PageHeader title={v.id ? `فاتورة ${v.invoiceNumber}` : "الفواتير"} description="جهّز الفاتورة من مشروع أو عرض سعر، احفظها، وحمّلها PDF أو أرسلها.">
          <Button variant="outline" onClick={() => setListOpen(true)}><FolderOpen className="me-2 h-4 w-4" /> فواتيري ({n(saved.length)})</Button>
          <Button variant="outline" onClick={() => setMailOpen(true)}><Mail className="me-2 h-4 w-4" /> إرسال</Button>
          <Button variant="outline" onClick={save} disabled={saving}>{saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />} حفظ</Button>
          <Button onClick={download}><Download className="me-2 h-4 w-4" /> تحميل PDF</Button>
        </PageHeader>
      </div>

      <main className="contract-main grid items-start gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="no-print space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:pe-1">
          <div className="flex items-center gap-2 rounded-2xl border bg-card p-3">
            <FileDigit className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">رقم الفاتورة</p>
              <input aria-label="رقم الفاتورة" className="w-full bg-transparent font-bold outline-none" dir="ltr" style={{ textAlign: "right" }} value={v.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} />
            </div>
            <Select value={v.status} onValueChange={(s) => set("status", s as Status)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(STATUS) as Status[]).map((s) => <SelectItem key={s} value={s}>{STATUS[s].label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={newInvoice} title="فاتورة جديدة"><PlusCircle className="h-4 w-4" /></Button>
          </div>

          <Card title="ابدأ من مشروع">
            <Select value={v.projectId || ""} onValueChange={fromProject}>
              <SelectTrigger><SelectValue placeholder="اختر مشروع عميل يعبّي الفاتورة" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" />{p.name}{p.clientName ? ` · ${p.clientName}` : ""}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </Card>

          <Card title="العميل">
            {clients.length > 0 && (
              <Select value="" onValueChange={fromClient}>
                <SelectTrigger><SelectValue placeholder="اختر من عملائك" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}><span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />{c.company || c.name}{c.company && c.name ? ` · ${c.name}` : ""}</span></SelectItem>)}</SelectContent>
              </Select>
            )}
            <Field label="الجهة / الشركة (اختياري)"><Input value={v.clientCompany} onChange={(e) => set("clientCompany", e.target.value)} /></Field>
            <Field label="الاسم"><Input value={v.clientName} onChange={(e) => set("clientName", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الإيميل"><Input type="email" value={v.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} /></Field>
              <Field label="الجوال"><Input type="tel" value={v.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} /></Field>
            </div>
            <Field label="الرقم الضريبي (اختياري)"><Input dir="ltr" value={v.clientVat} onChange={(e) => set("clientVat", e.target.value)} /></Field>
          </Card>

          <Card title="التواريخ">
            <div className="grid grid-cols-2 gap-3">
              <Field label="تاريخ الإصدار"><Input type="date" value={v.invoiceDate} onChange={(e) => set("invoiceDate", e.target.value)} /></Field>
              <Field label="تاريخ الاستحقاق"><Input type="date" value={v.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></Field>
            </div>
            <Field label="اسم المشروع (اختياري)"><Input value={v.projectName} onChange={(e) => set("projectName", e.target.value)} /></Field>
          </Card>

          <Card title="البنود">
            {products.length > 0 && (
              <Select value="" onValueChange={addProduct}>
                <SelectTrigger><SelectValue placeholder="أضف من منتجاتك وخدماتك" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2"><Package className="h-3.5 w-3.5" />{p.name} · {n(p.price)} ريال</span></SelectItem>)}</SelectContent>
              </Select>
            )}
            <div className="space-y-3">
              {v.lineItems.map((it, i) => (
                <div key={it.id} className="space-y-2 rounded-xl border p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2.5 w-5 text-center text-xs text-muted-foreground">{n(i + 1)}</span>
                    <Textarea rows={2} value={it.description} placeholder={"الخدمة\nتفاصيل في سطر ثاني (اختياري)"} onChange={(e) => setItem(it.id, { description: e.target.value })} />
                    <Button variant="ghost" size="icon" onClick={() => set("lineItems", v.lineItems.filter((x) => x.id !== it.id))} disabled={v.lineItems.length === 1} aria-label={`حذف البند ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-[80px_1fr_auto] items-center gap-2">
                    <Input type="number" min={1} value={it.quantity || ""} placeholder="الكمية" onChange={(e) => setItem(it.id, { quantity: Number(e.target.value) })} />
                    <Input type="number" min={0} value={it.price || ""} placeholder="السعر" onChange={(e) => setItem(it.id, { price: Number(e.target.value) })} />
                    <span className="whitespace-nowrap text-sm font-bold">{n(it.quantity * it.price)} <span className="saudi-riyal">&#xea;</span></span>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("lineItems", [...v.lineItems, { id: Date.now(), description: "", quantity: 1, price: 0 }])}><PlusCircle className="me-2 h-4 w-4" /> إضافة بند</Button>
            </div>
            <Field label="خصم (ريال، اختياري)"><Input type="number" min={0} value={v.discount || ""} onChange={(e) => set("discount", Number(e.target.value))} /></Field>
            <label className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
              <span>إضافة ضريبة القيمة المضافة (١٥٪)</span>
              <Switch checked={v.vat} onCheckedChange={(x) => set("vat", x)} />
            </label>
            <p className="text-sm">الإجمالي المستحق: <b>{n(t.total)}</b> <span className="saudi-riyal">&#xea;</span></p>
          </Card>

          <Card title="الدفع والملاحظات">
            <Field label="طريقة الدفع">
              <Select value={v.paymentMethod} onValueChange={(x) => set("paymentMethod", x)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[...new Set([...PAYMENT_METHODS, v.paymentMethod])].filter(Boolean).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="بيانات التحويل (اختياري)"><Textarea rows={2} value={v.bankDetails} placeholder={"اسم البنك\nIBAN: SA..."} onChange={(e) => set("bankDetails", e.target.value)} /></Field>
            <Field label="ملاحظات تظهر للعميل"><Textarea rows={2} value={v.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
            <Field label="ملاحظات داخلية (ما تظهر في الفاتورة)"><Textarea rows={2} value={v.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} /></Field>
          </Card>

          <Card title="بياناتك">
            <Textarea rows={4} value={v.yourDetails} onChange={(e) => set("yourDetails", e.target.value)} />
            <p className="text-xs text-muted-foreground">السطر الأول اسمك، والثاني صفتك.</p>
          </Card>
        </div>

        <div className="contract-col min-w-0">
          <InvoiceSheet v={v} sheetRef={sheetRef} />
        </div>
      </main>

      {/* Saved invoices */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>فواتيري</DialogTitle><DialogDescription>افتح فاتورة محفوظة تعدّلها أو تحمّلها.</DialogDescription></DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {saved.length ? saved.map((x) => {
              const late = x.status !== "paid" && !!x.dueDate && x.dueDate.slice(0, 10) < today();
              const st = STATUS[late ? "overdue" : x.status] ?? STATUS.unpaid;
              return (
                <div key={x.id} className={cn("flex items-center gap-3 rounded-xl border p-3", x.id === v.id && "border-foreground")}>
                  <button type="button" className="min-w-0 flex-1 text-start" onClick={() => { setV(x); setListOpen(false); router.replace(`/tools/invoice-generator?id=${x.id}`); }}>
                    <p className="truncate font-bold">{x.clientCompany || x.clientName || "بدون عميل"} {x.projectName && <span className="text-xs font-normal text-muted-foreground">· {x.projectName}</span>}</p>
                    <p className="text-xs text-muted-foreground"><span dir="ltr">{x.invoiceNumber}</span> · {fmtDate(x.invoiceDate)} · {n(x.total ?? totals(x).total)} ريال</p>
                  </button>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", st.tone)}>{st.label}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeSaved(x)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              );
            }) : <p className="py-8 text-center text-sm text-muted-foreground">ما فيه فواتير محفوظة للحين.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email */}
      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إرسال الفاتورة للعميل</DialogTitle><DialogDescription>توصله رسالة فيها البنود والمبلغ المستحق. حمّل الـ PDF وأرفقه إذا تبيه بالنسخة الكاملة.</DialogDescription></DialogHeader>
          <Field label="إيميل العميل"><Input type="email" value={v.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} placeholder="email@example.com" /></Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMailOpen(false)}>إلغاء</Button>
            <Button onClick={sendMail} disabled={sending || !v.clientEmail}>{sending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />} إرسال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
