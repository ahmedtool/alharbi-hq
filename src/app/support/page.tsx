"use client";

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { collection, getDocs } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Copy, ExternalLink, Inbox, LifeBuoy, MessageCircle, Paperclip, Search } from "lucide-react";
import { CATEGORY, STATUS, initialsOf, relTime, toDate, type Ticket, type TicketStatus } from "./model";

type Filter = "active" | TicketStatus;

export default function SupportPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>("active");
  const [search, setSearch] = React.useState("");
  const [link, setLink] = React.useState("");

  React.useEffect(() => {
    setLink(`${window.location.origin}/support/submit`);
    getDocs(collection(db, "support_tickets"))
      .then((s) => setTickets(
        s.docs.map((d) => ({ ...(d.data() as Omit<Ticket, "id">), id: d.id }))
          .sort((a, b) => (toDate(b.updatedAt)?.getTime() ?? 0) - (toDate(a.updatedAt)?.getTime() ?? 0)),
      ))
      .catch((e) => { console.error(e); toast({ variant: "destructive", title: "ما قدرنا نجيب الطلبات" }); })
      .finally(() => setLoading(false));
  }, [toast]);

  const count = (st: TicketStatus) => tickets.filter((t) => t.status === st).length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const closedThisMonth = tickets.filter((t) => t.status === "closed" && (toDate(t.updatedAt) ?? new Date(0)) >= monthStart).length;

  const q = search.trim().toLowerCase();
  const shown = tickets
    .filter((t) => (filter === "active" ? t.status !== "closed" : t.status === filter))
    .filter((t) => !q || [t.subject, t.customerName, t.customerEmail, t.ticketId].some((x) => (x || "").toLowerCase().includes(q)));

  const tabs: { key: Filter; label: string; n: number }[] = [
    { key: "active", label: "النشطة", n: tickets.length - count("closed") },
    { key: "new", label: "جديدة", n: count("new") },
    { key: "in-progress", label: "قيد المعالجة", n: count("in-progress") },
    { key: "closed", label: "الأرشيف", n: count("closed") },
  ];
  const fmt = (x: number) => new Intl.NumberFormat("ar-SA").format(x);
  const copy = () => { navigator.clipboard.writeText(link); toast({ title: "انسخ رابط الطلبات" }); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="الدعم الفني" description="طلبات ورسائل العملاء، ترد عليها وتتابعها لين تتسكّر." />

      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {[
          { label: "جديدة", value: count("new"), sub: "تنتظر أول رد", warn: count("new") > 0 },
          { label: "قيد المعالجة", value: count("in-progress"), sub: "شغّال عليها" },
          { label: "تسكّرت هالشهر", value: closedThisMonth, sub: "طلبات منتهية" },
          { label: "كل الطلبات", value: tickets.length, sub: `${fmt(count("closed"))} في الأرشيف` },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border bg-card p-4", s.warn && "border-amber-400/60")}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{loading ? "…" : fmt(s.value)}</p>
            <p className="text-[11px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Public link */}
      <section className="mb-6 flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted"><LifeBuoy className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">رابط طلبات العملاء</p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr" style={{ textAlign: "right" }}>{link || "…"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copy} disabled={!link}><Copy className="me-1.5 h-4 w-4" /> نسخ</Button>
          <Button variant="outline" size="sm" asChild><a href={`https://wa.me/?text=${encodeURIComponent(`لأي طلب أو استفسار: ${link}`)}`} target="_blank" rel="noopener"><MessageCircle className="me-1.5 h-4 w-4" /> واتساب</a></Button>
          <Button variant="outline" size="sm" asChild><a href="/support/submit" target="_blank" rel="noopener"><ExternalLink className="me-1.5 h-4 w-4" /> فتح</a></Button>
        </div>
      </section>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-muted p-1">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setFilter(t.key)}
              className={cn("whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", filter === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.label} <span className="text-xs text-muted-foreground">({fmt(t.n)})</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالموضوع أو العميل أو الرقم" className="ps-9" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : shown.length ? (
        <ul className="space-y-2">
          {shown.map((t) => {
            const st = STATUS[t.status] ?? STATUS.new;
            return (
              <li key={t.id}>
                <Link href={`/support/${t.id}`} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-md", t.status === "new" && "border-s-4 border-s-foreground")}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold">{initialsOf(t.customerName)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn("truncate", t.status === "new" ? "font-bold" : "font-semibold")}>{t.subject || "بدون موضوع"}</p>
                      {!!t.fileUrls?.length && <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.customerName}{t.category ? ` · ${CATEGORY[t.category] ?? t.category}` : ""} · <span dir="ltr">#{t.ticketId}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", st.tone)}>{st.label}</span>
                    <span className="text-[11px] text-muted-foreground">{relTime(t.updatedAt)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex min-h-[35vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <h3 className="text-xl font-bold">{tickets.length ? "ما فيه طلبات هنا" : "ما وصلتك طلبات للحين"}</h3>
          {!tickets.length && <p className="text-sm text-muted-foreground">انسخ رابط الطلبات وحطه في موقعك أو حساباتك.</p>}
        </div>
      )}
    </div>
  );
}
