"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp, updateDoc, where, writeBatch } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle, Copy, FileText, Loader2, Mail, MessageCircle, MoreHorizontal, Package, Paperclip, Phone, Send, Trash2, UserPlus } from "lucide-react";
import { waNumber } from "@/app/clients/model";
import { CATEGORY, STATUS, initialsOf, relTime, toDate, type Message, type Ticket, type TicketStatus } from "../model";

const QUICK_REPLIES = [
  "أهلًا {name}، استلمت طلبك وبرجع لك بالتفاصيل خلال يوم عمل.",
  "شكرًا لتواصلك! ممكن توضح لي أكثر وش المطلوب بالضبط؟",
  "جهّزت لك عرض السعر، بيوصلك على الإيميل الحين.",
  "تم الانتهاء من طلبك ✅ إذا عندك أي ملاحظة أنا حاضر.",
];

const nextInvoiceNumber = async () => {
  const s = await getDocs(query(collection(db, "invoices"), orderBy("invoiceNumber", "desc"), limit(1)));
  if (s.empty) return "INV-001";
  const last = parseInt(String(s.docs[0].data().invoiceNumber || "").split("-").pop() || "0", 10) || 0;
  return `INV-${String(last + 1).padStart(3, "0")}`;
};

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const bottom = React.useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [confirm, setConfirm] = React.useState<"delete" | "sale" | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    try {
      const snap = await getDoc(doc(db, "support_tickets", id));
      if (!snap.exists()) { toast({ variant: "destructive", title: "الطلب غير موجود" }); router.push("/support"); return; }
      setTicket({ ...(snap.data() as Omit<Ticket, "id">), id: snap.id });
      const ms = await getDocs(query(collection(db, `support_tickets/${id}/messages`), orderBy("createdAt", "asc")));
      setMessages(ms.docs.map((d) => ({ ...(d.data() as Omit<Message, "id">), id: d.id })));
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نجيب الطلب" });
    } finally {
      setLoading(false);
    }
  }, [id, toast, router]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const send = async () => {
    if (!ticket || !reply.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, `support_tickets/${ticket.id}/messages`), { text: reply.trim(), sender: "support", createdAt: Timestamp.now() });
      const status: TicketStatus = ticket.status === "new" ? "in-progress" : ticket.status;
      await updateDoc(doc(db, "support_tickets", ticket.id), { updatedAt: Timestamp.now(), status });
      setReply("");
      setTicket((t) => (t ? { ...t, status } : t));
      await load();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما انرسل الرد" });
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status: TicketStatus) => {
    if (!ticket) return;
    setTicket({ ...ticket, status });
    try { await updateDoc(doc(db, "support_tickets", ticket.id), { status, updatedAt: Timestamp.now() }); }
    catch (e) { console.error(e); toast({ variant: "destructive", title: "ما قدرنا نحدّث الحالة" }); load(); }
  };

  const remove = async () => {
    if (!ticket) return;
    setBusy(true);
    try {
      const ms = await getDocs(query(collection(db, `support_tickets/${ticket.id}/messages`)));
      const batch = writeBatch(db);
      ms.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      await deleteDoc(doc(db, "support_tickets", ticket.id));
      toast({ title: "انحذف الطلب" });
      router.push("/support");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحذف" });
      setBusy(false);
    }
  };

  /** Product order: create a paid invoice + income, then close the ticket. */
  const confirmSale = async () => {
    if (!ticket?.productDetails) return;
    setBusy(true);
    try {
      const invoiceNumber = await nextInvoiceNumber();
      const today = new Date();
      const due = new Date(); due.setDate(today.getDate() + 14);
      const invoiceId = `inv_${ticket.id}`;
      const price = Number(ticket.productDetails.price) || 0;
      await setDoc(doc(db, "invoices", invoiceId), {
        invoiceNumber, clientName: ticket.customerName, clientEmail: ticket.customerEmail || "", clientPhone: ticket.customerPhone || "", clientCompany: "",
        invoiceDate: today.toISOString().slice(0, 10), dueDate: due.toISOString().slice(0, 10), status: "paid", paidAt: today.toISOString(),
        paymentMethod: "متجر سلة", internalNotes: `من طلب الدعم #${ticket.ticketId}`,
        yourDetails: "أحمد الحربي\nالمطوّر\nالرياض، المملكة العربية السعودية\nhi@ahmedalharbi.com",
        lineItems: [{ id: 1, description: ticket.productDetails.name, quantity: 1, price }],
        subtotal: price, total: price, notes: "شكرًا لتعاملكم معنا.",
      });
      await setDoc(doc(db, "transactions", `inv_${invoiceId}`), { id: `inv_${invoiceId}`, description: `دخل من الفاتورة #${invoiceNumber}`, amount: price, type: "income", category: "دخل فواتير", date: today.toISOString() });
      await updateDoc(doc(db, "support_tickets", ticket.id), { status: "closed", updatedAt: Timestamp.now() });
      toast({ title: "تأكد البيع", description: `انعملت الفاتورة ${invoiceNumber} وتسكّر الطلب.` });
      router.push(`/tools/invoice-generator?id=${invoiceId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نأكد البيع" });
      setBusy(false);
    }
  };

  const addAsClient = async () => {
    if (!ticket) return;
    try {
      if (ticket.customerEmail) {
        const existing = await getDocs(query(collection(db, "clients"), where("email", "==", ticket.customerEmail), limit(1)));
        if (!existing.empty) { router.push(`/clients/${existing.docs[0].id}`); return; }
      }
      const ref = await addDoc(collection(db, "clients"), {
        kind: "individual", name: ticket.customerName, email: ticket.customerEmail || "", phone: ticket.customerPhone || "",
        source: "الموقع", notes: `من طلب الدعم #${ticket.ticketId}: ${ticket.subject}`,
      });
      toast({ title: "انضاف للعملاء" });
      router.push(`/clients/${ref.id}`);
    } catch (e) { console.error(e); toast({ variant: "destructive", title: "ما قدرنا نضيفه" }); }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><Skeleton className="h-[60vh] rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
      </div>
    );
  }
  if (!ticket) return null;

  const st = STATUS[ticket.status] ?? STATUS.new;
  const wa = waNumber(ticket.customerPhone);
  const first = ticket.customerName?.split(/\s+/)[0] || "";
  const canSell = ticket.category === "service-request" && !!ticket.productDetails && ticket.status !== "closed";
  const created = toDate(ticket.createdAt);

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start gap-3 border-b pb-5">
        <Button variant="outline" size="icon" asChild className="shrink-0 rounded-full"><Link href="/support" aria-label="رجوع"><ArrowRight className="h-4 w-4" /></Link></Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold md:text-3xl">{ticket.subject || "بدون موضوع"}</h1>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", st.tone)}>{st.label}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span dir="ltr">#{ticket.ticketId}</span> · {CATEGORY[ticket.category] ?? ticket.category}{created ? ` · ${created.toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { day: "numeric", month: "long" })}` : ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="rounded-full"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={addAsClient}><UserPlus className="me-2 h-4 w-4" /> أضفه كعميل</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(ticket.ticketId); toast({ title: "انسخ رقم الطلب" }); }}><Copy className="me-2 h-4 w-4" /> نسخ رقم الطلب</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirm("delete")} className="text-destructive"><Trash2 className="me-2 h-4 w-4" /> حذف الطلب</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Conversation */}
        <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card">
          <div className="max-h-[60dvh] min-h-[280px] flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4 sm:p-5">
            {messages.length ? messages.map((m) => {
              const mine = m.sender === "support";
              return (
                <div key={m.id} className={cn("flex items-end gap-2", mine ? "flex-row-reverse" : "")}>
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold", mine ? "bg-foreground text-background" : "bg-background border")}>{mine ? "أ" : initialsOf(ticket.customerName)}</span>
                  <div className={cn("max-w-[80%] space-y-1", mine && "items-end text-left")}>
                    <div className={cn("whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm text-right", mine ? "rounded-be-md bg-foreground text-background" : "rounded-bs-md border bg-background")}>{m.text}</div>
                    <p className={cn("px-1 text-[11px] text-muted-foreground", mine ? "text-left" : "text-right")}>{mine ? "أنت" : first} · {relTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            }) : <p className="py-16 text-center text-sm text-muted-foreground">ما فيه رسائل للحين. ابدأ بالرد تحت.</p>}
            <div ref={bottom} />
          </div>

          {/* Composer */}
          <div className="space-y-3 border-t p-3 sm:p-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_REPLIES.map((r) => (
                <button key={r} type="button" onClick={() => setReply(r.replace("{name}", first))} className="max-w-[16rem] shrink-0 truncate rounded-full border px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground">{r.replace("{name}", first)}</button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="اكتب ردك…" className="min-h-[44px] resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }} disabled={sending} />
              <Button onClick={send} disabled={sending || !reply.trim()} className="h-11 shrink-0">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}<span className="ms-2 hidden sm:inline">إرسال</span></Button>
            </div>
            <p className="text-[11px] text-muted-foreground">الرد ينحفظ في سجل الطلب. للتواصل المباشر استخدم الإيميل أو الواتساب من بطاقة العميل.</p>
          </div>
        </section>

        {/* Side */}
        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-sm font-bold">{initialsOf(ticket.customerName)}</span>
              <div className="min-w-0"><p className="truncate font-bold">{ticket.customerName}</p><p className="text-xs text-muted-foreground">العميل</p></div>
            </div>
            <div className="space-y-2 text-sm">
              {ticket.customerEmail && <a href={`mailto:${ticket.customerEmail}?subject=${encodeURIComponent(`بخصوص طلبك #${ticket.ticketId}`)}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"><Mail className="h-4 w-4 text-muted-foreground" /><span className="truncate" dir="ltr">{ticket.customerEmail}</span></a>}
              {ticket.customerPhone && <a href={`tel:${ticket.customerPhone}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"><Phone className="h-4 w-4 text-muted-foreground" /><span dir="ltr">{ticket.customerPhone}</span></a>}
            </div>
            {wa && (
              <Button asChild variant="outline" className="mt-3 w-full"><a href={`https://wa.me/${wa}?text=${encodeURIComponent(`أهلًا ${first}، بخصوص طلبك #${ticket.ticketId}: `)}`} target="_blank" rel="noopener"><MessageCircle className="me-2 h-4 w-4" /> واتساب</a></Button>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <p className="mb-2 text-xs font-bold text-muted-foreground">الحالة</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {(Object.keys(STATUS) as TicketStatus[]).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} className={cn("rounded-lg px-2 py-1.5 text-xs font-semibold", ticket.status === s ? "bg-background shadow-sm" : "text-muted-foreground")}>{STATUS[s].label}</button>
              ))}
            </div>
          </section>

          {ticket.productDetails && (
            <section className="rounded-2xl border bg-card p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground"><Package className="h-4 w-4" /> المطلوب</p>
              <p className="font-bold">{ticket.productDetails.name}</p>
              <p className="text-2xl font-bold">{new Intl.NumberFormat("ar-SA").format(Number(ticket.productDetails.price) || 0)} <span className="saudi-riyal text-base">&#xea;</span></p>
              {canSell && <Button className="mt-3 w-full" onClick={() => setConfirm("sale")} disabled={busy}><CheckCircle className="me-2 h-4 w-4" /> تأكيد البيع وإصدار فاتورة</Button>}
            </section>
          )}

          {!!ticket.fileUrls?.length && (
            <section className="rounded-2xl border bg-card p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground"><Paperclip className="h-4 w-4" /> المرفقات ({new Intl.NumberFormat("ar-SA").format(ticket.fileUrls.length)})</p>
              <div className="grid grid-cols-3 gap-2">
                {ticket.fileUrls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noopener" className="group aspect-square overflow-hidden rounded-xl border bg-muted">
                    {/\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)
                      ? <img src={url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      : <span className="grid h-full place-items-center text-xs text-muted-foreground"><FileText className="mb-1 h-5 w-5" />ملف {new Intl.NumberFormat("ar-SA").format(i + 1)}</span>}
                  </a>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "delete" ? "حذف الطلب؟" : "تأكيد البيع؟"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete"
                ? "بينحذف الطلب وكل رسائله، وما تقدر ترجعه."
                : `بتنعمل فاتورة مدفوعة بـ ${new Intl.NumberFormat("ar-SA").format(Number(ticket.productDetails?.price) || 0)} ريال، وتنسجل دخل، ويتسكّر الطلب.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirm === "delete" ? remove : confirmSale} className={confirm === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
              {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{confirm === "delete" ? "احذف" : "أكّد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
