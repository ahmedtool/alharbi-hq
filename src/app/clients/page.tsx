"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Choices, Field, IconInput, KindPicker } from "@/components/app/form-bits";
import { ArrowRight, Building2, Globe, Mail, MapPin, MessageCircle, MoreHorizontal, Phone, PlusCircle, Search, User, UserPlus } from "lucide-react";
import { SOURCES, clientKind, displayName, initials, waNumber, type Client, type ClientKind } from "./model";
import { kindOf as projectKind, sar, type Project } from "../projects/model";

/* Form ---------------------------------------------------------------------- */
function ClientForm({ client, onSaved, onClose }: { client: Client | null; onSaved: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const [kind, setKind] = React.useState<ClientKind | null>(client ? clientKind(client) : null);
  const [saving, setSaving] = React.useState(false);
  const isCompany = kind === "company";

  const [company, setCompany] = React.useState(client?.company ?? "");
  const [name, setName] = React.useState(client && !(clientKind(client) === "company" && client.name === client.company) ? client.name : "");
  const [role, setRole] = React.useState(client?.role ?? "");
  const [phone, setPhone] = React.useState(client?.phone ?? "");
  const [email, setEmail] = React.useState(client?.email ?? "");
  const [city, setCity] = React.useState(client?.city ?? "");
  const [source, setSource] = React.useState(client?.source ?? "");
  const [website, setWebsite] = React.useState(client?.website ?? "");
  const [crNumber, setCrNumber] = React.useState(client?.crNumber ?? "");
  const [vatNumber, setVatNumber] = React.useState(client?.vatNumber ?? "");
  const [notes, setNotes] = React.useState(client?.notes ?? "");

  const save = async () => {
    if (!kind) return;
    if (isCompany ? !company.trim() : !name.trim()) {
      return toast({ variant: "destructive", title: isCompany ? "اكتب اسم الشركة أو الجهة" : "اكتب اسم العميل" });
    }
    setSaving(true);
    try {
      const common = { kind, phone: phone.trim(), email: email.trim(), city: city.trim(), source, notes: notes.trim() };
      const data = isCompany
        ? { ...common, company: company.trim(), name: name.trim() || company.trim(), role: role.trim(), website: website.trim(), crNumber: crNumber.trim(), vatNumber: vatNumber.trim() }
        : { ...common, name: name.trim(), company: "", role: "", website: "", crNumber: "", vatNumber: "" };
      if (client) await updateDoc(doc(db, "clients", client.id), data);
      else await addDoc(collection(db, "clients"), data);
      toast({ title: client ? "تم تحديث العميل" : "تمت إضافة العميل" });
      onSaved();
    } catch (e) {
      console.error("Error saving client", e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ العميل، جرّب مرة ثانية" });
    } finally {
      setSaving(false);
    }
  };

  if (!kind) {
    return (
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>عميل جديد</DialogTitle>
          <DialogDescription>العميل فرد ولا شركة؟ كل نوع له بيانات مختلفة.</DialogDescription>
        </DialogHeader>
        <KindPicker<ClientKind>
          onPick={setKind}
          options={[
            { kind: "individual", icon: User, title: "فرد", text: "شخص يتعامل معك باسمه.", points: ["الاسم والتواصل", "المدينة", "من وين عرفك"] },
            { kind: "company", icon: Building2, title: "شركة أو جهة", text: "منشأة أو مطعم أو متجر.", points: ["اسم الجهة والشخص المسؤول", "السجل التجاري والرقم الضريبي", "الموقع الإلكتروني"] },
          ]}
        />
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
            {isCompany ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </span>
          <div className="text-start">
            <DialogTitle>{client ? "تعديل " : ""}{isCompany ? "شركة أو جهة" : "عميل فرد"}</DialogTitle>
            <DialogDescription>{isCompany ? "بيانات الجهة والشخص اللي تتعامل معه." : "بيانات التواصل الأساسية."}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {isCompany ? (
          <>
            <Field label="اسم الشركة أو الجهة"><IconInput icon={Building2} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="مثلًا: مطعم بازيليكو" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الشخص المسؤول"><IconInput icon={User} value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="منصبه (اختياري)"><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="مثلًا: مدير التسويق" /></Field>
            </div>
          </>
        ) : (
          <Field label="الاسم"><IconInput icon={User} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الجوال"><IconInput icon={Phone} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" /></Field>
          <Field label="الإيميل"><IconInput icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>

        <div className={cn("grid gap-4", isCompany && "sm:grid-cols-2")}>
          <Field label="المدينة"><IconInput icon={MapPin} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          {isCompany && <Field label="الموقع الإلكتروني"><IconInput icon={Globe} type="url" dir="ltr" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} /></Field>}
        </div>

        {isCompany && (
          <div className="grid gap-4 rounded-2xl border border-dashed p-4 sm:grid-cols-2">
            <Field label="السجل التجاري (اختياري)"><Input inputMode="numeric" dir="ltr" value={crNumber} onChange={(e) => setCrNumber(e.target.value)} /></Field>
            <Field label="الرقم الضريبي (اختياري)" hint="يفيدك في الفواتير الضريبية."><Input inputMode="numeric" dir="ltr" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} /></Field>
          </div>
        )}

        <Field label="من وين عرفك؟"><Choices value={source} onChange={setSource} options={SOURCES} /></Field>
        <Field label="ملاحظات"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isCompany ? "طريقة الدفع، أوقات التواصل، أي شي يهمك تتذكره." : "أي شي يهمك تتذكره عنه."} /></Field>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {!client ? <Button type="button" variant="ghost" onClick={() => setKind(null)}><ArrowRight className="me-2 h-4 w-4" /> تغيير النوع</Button> : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="button" onClick={save} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ العميل"}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

/* Card ---------------------------------------------------------------------- */
type ClientStats = { projects: number; contract: number; paid: number };

function ClientCard({ client, stats, onEdit, onDelete }: { client: Client; stats: ClientStats; onEdit: () => void; onDelete: () => void }) {
  const router = useRouter();
  const kind = clientKind(client);
  const title = displayName(client);
  const sub = kind === "company" ? [client.name !== client.company ? client.name : "", client.role].filter(Boolean).join(" · ") : (client.city || client.source || "");
  const owed = Math.max(0, stats.contract - stats.paid);
  const wa = waNumber(client.phone);

  return (
    <article onClick={() => router.push(`/clients/${client.id}`)}
      className="group flex cursor-pointer flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl font-bold", kind === "company" ? "bg-foreground text-background" : "bg-muted")}>
            {kind === "company" ? <Building2 className="h-5 w-5" /> : initials(title) || <User className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{title}</h3>
            <p className="truncate text-xs text-muted-foreground">{sub || (kind === "company" ? "شركة" : "فرد")}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onEdit}>تعديل</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">حذف</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-center">
        <div><p className="text-[11px] text-muted-foreground">المشاريع</p><p className="font-bold">{sar(stats.projects)}</p></div>
        <div><p className="text-[11px] text-muted-foreground">التعامل</p><p className="font-bold">{sar(stats.contract)} <span className="saudi-riyal text-xs">&#xea;</span></p></div>
        <div><p className="text-[11px] text-muted-foreground">المتبقي</p><p className={cn("font-bold", owed > 0 && "text-amber-600")}>{sar(owed)} <span className="saudi-riyal text-xs">&#xea;</span></p></div>
      </div>

      <div className="mt-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {client.phone && <a href={`tel:${client.phone}`} className="grid h-9 w-9 place-items-center rounded-full border hover:border-foreground" title="اتصال"><Phone className="h-4 w-4" /></a>}
        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener" className="grid h-9 w-9 place-items-center rounded-full border hover:border-foreground" title="واتساب"><MessageCircle className="h-4 w-4" /></a>}
        {client.email && <a href={`mailto:${client.email}`} className="grid h-9 w-9 place-items-center rounded-full border hover:border-foreground" title="إيميل"><Mail className="h-4 w-4" /></a>}
        {client.source && <span className="ms-auto rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{client.source}</span>}
      </div>
    </article>
  );
}

/* Page ---------------------------------------------------------------------- */
type Filter = "all" | ClientKind;

export default function ClientsPage() {
  const { toast } = useToast();
  const [clients, setClients] = React.useState<Client[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Client | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [cs, ps] = await Promise.all([getDocs(collection(db, "clients")), getDocs(collection(db, "projects"))]);
      setClients(cs.docs.map((d) => ({ id: d.id, ...d.data() } as Client)));
      setProjects(ps.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "حدث خطأ أثناء جلب العملاء." });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  React.useEffect(() => { load(); }, [load]);

  const remove = async (c: Client) => {
    if (!window.confirm(`حذف «${displayName(c)}»؟ مشاريعه ما تنحذف.`)) return;
    try {
      await deleteDoc(doc(db, "clients", c.id));
      toast({ title: "تم حذف العميل" });
      load();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحذف العميل" });
    }
  };

  const statsFor = React.useCallback((c: Client): ClientStats => {
    const mine = projects.filter((p) => projectKind(p) === "client" && p.clientId === c.id);
    return { projects: mine.length, contract: mine.reduce((s, p) => s + (p.budget || 0), 0), paid: mine.reduce((s, p) => s + (p.amountPaid || 0), 0) };
  }, [projects]);

  const companies = clients.filter((c) => clientKind(c) === "company");
  const individuals = clients.filter((c) => clientKind(c) === "individual");
  const term = q.trim().toLowerCase();
  const shown = (filter === "all" ? clients : filter === "company" ? companies : individuals)
    .filter((c) => !term || [c.name, c.company, c.phone, c.email, c.city].some((v) => v?.toLowerCase().includes(term)));

  const all = clients.map(statsFor);
  const totalContract = all.reduce((s, x) => s + x.contract, 0);
  const totalOwed = all.reduce((s, x) => s + Math.max(0, x.contract - x.paid), 0);
  const active = all.filter((x) => x.projects > 0).length;
  const openNew = () => { setEditing(null); setOpen(true); };

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "الكل", count: clients.length },
    { key: "company", label: "شركات", count: companies.length },
    { key: "individual", label: "أفراد", count: individuals.length },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="العملاء" description="أفراد وشركات، وكل اللي بينك وبينهم في مكان واحد.">
        <Button onClick={openNew}><UserPlus className="me-2 h-4 w-4" /> عميل جديد</Button>
      </PageHeader>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && <ClientForm key={editing?.id ?? "new"} client={editing} onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />}
      </Dialog>

      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {[
          { label: "عدد العملاء", value: sar(clients.length) },
          { label: "عملاء عندهم مشاريع", value: sar(active) },
          { label: "إجمالي التعامل", value: <>{sar(totalContract)} <span className="saudi-riyal">&#xea;</span></> },
          { label: "المتبقي عند العملاء", value: <>{sar(totalOwed)} <span className="saudi-riyal">&#xea;</span></> },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-bold md:text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex self-start rounded-xl bg-muted p-1">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setFilter(t.key)}
              className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", filter === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.label} <span className="text-xs text-muted-foreground">({sar(t.count)})</span>
            </button>
          ))}
        </div>
        <div className="sm:w-72"><IconInput icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الجوال أو المدينة" /></div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
      ) : shown.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => <ClientCard key={c.id} client={c} stats={statsFor(c)} onEdit={() => { setEditing(c); setOpen(true); }} onDelete={() => remove(c)} />)}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center">
          <h3 className="text-xl font-bold">{term ? "ما لقيت عميل بهالبحث" : "ما فيه عملاء هنا للحين"}</h3>
          {!term && <Button onClick={openNew}><PlusCircle className="me-2 h-4 w-4" /> عميل جديد</Button>}
        </div>
      )}
    </div>
  );
}
