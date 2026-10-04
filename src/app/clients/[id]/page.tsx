"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { db } from "@/lib/db";
import { collection, doc, getDoc, getDocs } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Briefcase, Building2, FileDigit, Globe, LifeBuoy, Mail, MapPin, MessageCircle, Phone, StickyNote, User } from "lucide-react";
import { clientKind, displayName, initials, waNumber, type Client } from "../model";
import { kindOf as projectKind, stageOf, sar, type Project } from "../../projects/model";

interface Invoice { id: string; invoiceNumber: string; clientName: string; total: number; invoiceDate: string; status: "paid" | "unpaid" | "overdue" }
interface Ticket { id: string; ticketId: string; subject: string; status: string; customerEmail?: string; customerPhone?: string; customerName?: string }

const INVOICE_STATUS = {
  paid: { label: "مدفوعة", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200" },
  unpaid: { label: "غير مدفوعة", tone: "bg-muted text-muted-foreground" },
  overdue: { label: "متأخرة", tone: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200" },
};
const TICKET_STATUS: Record<string, string> = { new: "جديد", "in-progress": "قيد المعالجة", closed: "مغلق" };

const Section = ({ icon: Icon, title, count, children }: { icon: React.ElementType; title: string; count: number; children: React.ReactNode }) => (
  <section className="rounded-2xl border bg-card">
    <header className="flex items-center gap-2 border-b px-5 py-4">
      <Icon className="h-5 w-5" /><h2 className="text-lg font-bold">{title}</h2>
      <span className="ms-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold">{sar(count)}</span>
    </header>
    <div className="divide-y">{children}</div>
  </section>
);
const Empty = ({ text }: { text: string }) => <p className="px-5 py-8 text-center text-sm text-muted-foreground">{text}</p>;

/** Everything about one client: contact, money, projects, invoices and support requests. */
export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = React.useState<Client | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "clients", id));
        if (!snap.exists()) return;
        const c = { id: snap.id, ...snap.data() } as Client;
        setClient(c);
        const [ps, is, ts] = await Promise.all([
          getDocs(collection(db, "projects")), getDocs(collection(db, "invoices")), getDocs(collection(db, "support_tickets")),
        ]);
        setProjects(ps.docs.map((d) => ({ id: d.id, ...d.data() } as Project)).filter((p) => projectKind(p) === "client" && p.clientId === c.id));
        const names = [c.name, c.company].map((v) => v?.trim()).filter(Boolean);
        setInvoices(is.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)).filter((i) => names.includes(i.clientName?.trim())));
        const phone = (c.phone || "").replace(/\D/g, "").slice(-9);
        setTickets(ts.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket)).filter((t) =>
          (c.email && t.customerEmail?.toLowerCase() === c.email.toLowerCase()) ||
          (phone && (t.customerPhone || "").replace(/\D/g, "").endsWith(phone))));
      } catch (e) {
        console.error("Error loading client", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="space-y-4 p-4 sm:p-6 lg:p-8"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  }
  if (!client) {
    return <div className="p-8 text-center"><p>ما لقينا العميل.</p><Button asChild variant="link"><Link href="/clients">العودة للعملاء</Link></Button></div>;
  }

  const kind = clientKind(client);
  const title = displayName(client);
  const contract = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const paid = projects.reduce((s, p) => s + (p.amountPaid || 0), 0);
  const invoicedPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const wa = waNumber(client.phone);
  const R = () => <span className="saudi-riyal">&#xea;</span>;

  const contacts = [
    client.phone && { href: `tel:${client.phone}`, icon: Phone, text: client.phone, ltr: true },
    wa && { href: `https://wa.me/${wa}`, icon: MessageCircle, text: "واتساب", ext: true },
    client.email && { href: `mailto:${client.email}`, icon: Mail, text: client.email, ltr: true },
    client.website && { href: client.website, icon: Globe, text: client.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), ext: true, ltr: true },
  ].filter(Boolean) as { href: string; icon: React.ElementType; text: string; ext?: boolean; ltr?: boolean }[];

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title={title} description={kind === "company" ? [client.name !== client.company ? client.name : "", client.role].filter(Boolean).join(" · ") || "شركة أو جهة" : "عميل فرد"}>
        <Button asChild variant="outline"><Link href="/clients">كل العملاء</Link></Button>
      </PageHeader>

      {/* Identity + contact */}
      <section className="mb-6 flex flex-col gap-5 rounded-2xl border bg-card p-5 md:flex-row md:items-center">
        <span className={cn("grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-xl font-bold", kind === "company" ? "bg-foreground text-background" : "bg-muted")}>
          {kind === "company" ? <Building2 className="h-7 w-7" /> : initials(title) || <User className="h-7 w-7" />}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border px-3 py-1 font-semibold">{kind === "company" ? "شركة / جهة" : "فرد"}</span>
            {client.city && <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1"><MapPin className="h-3.5 w-3.5" />{client.city}</span>}
            {client.source && <span className="rounded-full border px-3 py-1 text-muted-foreground">عرفني عن طريق: {client.source}</span>}
            {client.crNumber && <span className="rounded-full border px-3 py-1 text-muted-foreground">س.ت: <span dir="ltr">{client.crNumber}</span></span>}
            {client.vatNumber && <span className="rounded-full border px-3 py-1 text-muted-foreground">الرقم الضريبي: <span dir="ltr">{client.vatNumber}</span></span>}
          </div>
          {contacts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contacts.map((c) => (
                <a key={c.href} href={c.href} {...(c.ext ? { target: "_blank", rel: "noopener" } : {})}
                  className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-foreground hover:text-background">
                  <c.icon className="h-4 w-4" /><span dir={c.ltr ? "ltr" : undefined}>{c.text}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Money */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "قيمة المشاريع", value: <>{sar(contract)} <R /></> },
          { label: "المستلم", value: <>{sar(paid)} <R /></> },
          { label: "المتبقي", value: <>{sar(Math.max(0, contract - paid))} <R /></>, tone: contract - paid > 0 ? "text-amber-600" : "" },
          { label: "فواتير مدفوعة", value: <>{sar(invoicedPaid)} <R /></> },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className={cn("mt-1 text-xl font-bold md:text-2xl", t.tone)}>{t.value}</p>
          </div>
        ))}
      </div>

      {client.notes && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border bg-muted/50 p-4">
          <StickyNote className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="whitespace-pre-line text-sm">{client.notes}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={Briefcase} title="المشاريع" count={projects.length}>
          {projects.length ? projects.map((p) => {
            const st = stageOf(p);
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground"><span dir="ltr">{sar(p.amountPaid ?? 0)} / {sar(p.budget)}</span> <R /></p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", st.tone)}>{st.label}</span>
              </Link>
            );
          }) : <Empty text="ما فيه مشاريع لهالعميل." />}
        </Section>

        <div className="space-y-6">
          <Section icon={FileDigit} title="الفواتير" count={invoices.length}>
            {invoices.length ? invoices.map((i) => (
              <Link key={i.id} href={`/tools/invoice-generator?id=${i.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50">
                <div className="min-w-0 flex-1"><p className="font-semibold" dir="ltr" style={{ textAlign: "right" }}>{i.invoiceNumber}</p><p className="text-xs text-muted-foreground">{sar(i.total)} <R /></p></div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", INVOICE_STATUS[i.status]?.tone)}>{INVOICE_STATUS[i.status]?.label}</span>
              </Link>
            )) : <Empty text="ما فيه فواتير باسمه." />}
          </Section>

          <Section icon={LifeBuoy} title="طلباته" count={tickets.length}>
            {tickets.length ? tickets.map((t) => (
              <Link key={t.id} href={`/support/${t.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50">
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{t.subject || "طلب"}</p><p className="text-xs text-muted-foreground" dir="ltr" style={{ textAlign: "right" }}>#{t.ticketId}</p></div>
                <span className="rounded-full border px-2.5 py-1 text-xs">{TICKET_STATUS[t.status] ?? t.status}</span>
              </Link>
            )) : <Empty text="ما أرسل طلبات من نموذج الموقع (نطابق بالإيميل أو الجوال)." />}
          </Section>
        </div>
      </div>
    </div>
  );
}
