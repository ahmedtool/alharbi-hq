"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowRight, Briefcase, ExternalLink, ListChecks, MoreHorizontal, PlusCircle, Rocket, Target, UserPlus } from "lucide-react";
import type { Task } from "../tasks/model";
import {
  CLIENT_STAGES, PERSONAL_CATEGORIES, PERSONAL_STAGES, computeProgress, daysUntil, deadlineText, kindOf, sar, stageOf,
  type ClientStage, type PersonalStage, type Project, type ProjectKind,
} from "./model";

interface Client { id: string; name: string; phone?: string; email?: string }

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const fromDateInput = (v: string) => (v ? new Date(v + "T00:00:00").toISOString() : "");

/* Step 1: what kind of project ------------------------------------------- */
function KindPicker({ onPick }: { onPick: (k: ProjectKind) => void }) {
  const options: { kind: ProjectKind; icon: React.ElementType; title: string; text: string; points: string[] }[] = [
    {
      kind: "personal", icon: Rocket, title: "مشروع شخصي",
      text: "فكرة أو منتج تبنيه لنفسك.",
      points: ["المرحلة: فكرة ← بناء ← إطلاق", "الهدف والرابط", "التكلفة"],
    },
    {
      kind: "client", icon: Briefcase, title: "مشروع لعميل",
      text: "شغل مدفوع لعميل بعقد ومستحقات.",
      points: ["العميل وقيمة العقد", "المبلغ المستلم والمتبقي", "موعد التسليم"],
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map(({ kind, icon: Icon, title, text, points }) => (
        <button
          key={kind}
          type="button"
          onClick={() => onPick(kind)}
          className="group text-start rounded-2xl border p-5 transition-all hover:border-foreground hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-muted transition-colors group-hover:bg-foreground group-hover:text-background">
            <Icon className="h-6 w-6" />
          </span>
          <b className="block text-lg">{title}</b>
          <span className="block text-sm text-muted-foreground">{text}</span>
          <ul className="mt-3 space-y-1 text-sm">
            {points.map((p) => <li key={p} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-foreground/50" />{p}</li>)}
          </ul>
        </button>
      ))}
    </div>
  );
}

/** Segmented control for the stage. */
function StagePicker<T extends string>({ value, onChange, stages }: { value: T; onChange: (v: T) => void; stages: Record<T, { label: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted p-1 sm:grid-cols-4">
      {(Object.keys(stages) as T[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "rounded-lg px-2 py-2 text-sm font-semibold transition-colors",
            value === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {stages[k].label}
        </button>
      ))}
    </div>
  );
}

const Field = ({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("space-y-1.5", className)}>
    <Label className="font-semibold">{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const Money = ({ value, onChange, id }: { value: number; onChange: (n: number) => void; id: string }) => (
  <div className="relative">
    <Input id={id} type="number" inputMode="decimal" min={0} value={value || ""} placeholder="0" onChange={(e) => onChange(Number(e.target.value))} className="pl-8" />
    <span className="saudi-riyal absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">&#xea;</span>
  </div>
);

/* Step 2: the form for that kind ----------------------------------------- */
function ProjectForm({
  project, clients, onSaved, onClose,
}: { project: Project | null; clients: Client[]; onSaved: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const [kind, setKind] = React.useState<ProjectKind | null>(project ? kindOf(project) : null);
  const [saving, setSaving] = React.useState(false);

  // shared
  const [name, setName] = React.useState(project?.name ?? "");
  const [description, setDescription] = React.useState(project?.description ?? "");
  const [startDate, setStartDate] = React.useState(toDateInput(project?.startDate) || toDateInput(new Date().toISOString()));
  const [endDate, setEndDate] = React.useState(toDateInput(project?.endDate));
  const [budget, setBudget] = React.useState(project?.budget ?? 0);
  const [link, setLink] = React.useState(project?.link ?? "");
  // personal
  const [personalStage, setPersonalStage] = React.useState<PersonalStage>(
    project && kindOf(project) === "personal" && (project.stage as PersonalStage) in PERSONAL_STAGES ? (project.stage as PersonalStage) : "idea"
  );
  const [goal, setGoal] = React.useState(project?.goal ?? "");
  const [category, setCategory] = React.useState(project?.category ?? PERSONAL_CATEGORIES[0]);
  // client
  const [clientStage, setClientStage] = React.useState<ClientStage>(
    project && kindOf(project) === "client" && (project.stage as ClientStage) in CLIENT_STAGES ? (project.stage as ClientStage) : "active"
  );
  const [clientId, setClientId] = React.useState<string>(project?.clientId ?? "");
  const [newClient, setNewClient] = React.useState(false);
  const [newClientName, setNewClientName] = React.useState("");
  const [newClientPhone, setNewClientPhone] = React.useState("");
  const [amountPaid, setAmountPaid] = React.useState(project?.amountPaid ?? 0);

  const remaining = Math.max(0, budget - amountPaid);

  const save = async () => {
    if (!kind) return;
    if (!name.trim()) return toast({ variant: "destructive", title: "اكتب اسم المشروع" });
    if (kind === "client" && !clientId && !(newClient && newClientName.trim())) {
      return toast({ variant: "destructive", title: "اختر العميل أو أضف عميل جديد" });
    }
    setSaving(true);
    try {
      let cId = clientId;
      let cName = clients.find((c) => c.id === clientId)?.name ?? null;
      if (kind === "client" && newClient) {
        const ref = await addDoc(collection(db, "clients"), { name: newClientName.trim(), phone: newClientPhone.trim(), email: "", company: "", notes: "" });
        cId = ref.id;
        cName = newClientName.trim();
      }
      const base = {
        kind, name: name.trim(), description: description.trim(),
        startDate: fromDateInput(startDate), endDate: fromDateInput(endDate),
        budget: Number(budget) || 0, link: link.trim(),
      };
      const data = kind === "personal"
        ? { ...base, stage: personalStage, goal: goal.trim(), category, clientId: null, clientName: null, amountPaid: 0 }
        : { ...base, stage: clientStage, clientId: cId || null, clientName: cName, amountPaid: Number(amountPaid) || 0 };

      if (project) await updateDoc(doc(db, "projects", project.id), data);
      else await addDoc(collection(db, "projects"), data);
      toast({ title: project ? "تم تحديث المشروع" : "تم إنشاء المشروع" });
      onSaved();
    } catch (e) {
      console.error("Error saving project", e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ المشروع، جرّب مرة ثانية" });
    } finally {
      setSaving(false);
    }
  };

  if (!kind) {
    return (
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>مشروع جديد</DialogTitle>
          <DialogDescription>وش نوع المشروع؟ كل نوع له تفاصيل مختلفة.</DialogDescription>
        </DialogHeader>
        <KindPicker onPick={setKind} />
      </DialogContent>
    );
  }

  const isClient = kind === "client";
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
            {isClient ? <Briefcase className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
          </span>
          <div className="text-start">
            <DialogTitle>{project ? "تعديل " : ""}{isClient ? "مشروع لعميل" : "مشروع شخصي"}</DialogTitle>
            <DialogDescription>{isClient ? "العميل، العقد، والمستحقات." : "الفكرة، الهدف، ووين وصلت."}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {isClient ? (
          <>
            <Field label="العميل">
              {!newClient ? (
                <div className="flex gap-2">
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={() => { setNewClient(true); setClientId(""); }}>
                    <UserPlus className="me-2 h-4 w-4" /> جديد
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2 rounded-xl border border-dashed p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Input placeholder="اسم العميل" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                  <Input placeholder="الجوال (اختياري)" type="tel" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
                  <Button type="button" variant="ghost" onClick={() => setNewClient(false)}>من القائمة</Button>
                </div>
              )}
            </Field>
            <Field label="اسم المشروع"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلًا: متجر إلكتروني لمطعم" /></Field>
            <Field label="نطاق العمل" hint="وش متفقين عليه بالضبط؟ يفيدك وقت المراجعة والتسليم.">
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="المرحلة"><StagePicker value={clientStage} onChange={setClientStage} stages={CLIENT_STAGES} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="قيمة العقد"><Money id="budget" value={budget} onChange={setBudget} /></Field>
              <Field label="المستلم حتى الآن" hint={budget > 0 ? `المتبقي: ${sar(remaining)} ر.س` : undefined}>
                <Money id="paid" value={amountPaid} onChange={setAmountPaid} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="تاريخ البداية"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
              <Field label="موعد التسليم"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
            </div>
            <Field label="رابط التسليم (اختياري)" hint="رابط النسخة التجريبية أو ملفات التسليم.">
              <Input type="url" dir="ltr" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <Field label="اسم المشروع"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلًا: مرشح" /></Field>
            <Field label="الفكرة باختصار"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="الهدف" hint="وش يعني النجاح لهالمشروع؟ مثلًا: ١٠ مطاعم مشتركة قبل نهاية السنة.">
              <div className="relative">
                <Target className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pr-10" value={goal} onChange={(e) => setGoal(e.target.value)} />
              </div>
            </Field>
            <Field label="المرحلة"><StagePicker value={personalStage} onChange={setPersonalStage} stages={PERSONAL_STAGES} /></Field>
            <Field label="النوع">
              <div className="flex flex-wrap gap-2">
                {PERSONAL_CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors", category === c ? "border-foreground bg-foreground text-background" : "hover:border-foreground")}>
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="تاريخ البداية"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
              <Field label="موعد الإطلاق المستهدف (اختياري)"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="رابط المشروع (اختياري)"><Input type="url" dir="ltr" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} /></Field>
              <Field label="التكلفة المتوقعة (اختياري)"><Money id="cost" value={budget} onChange={setBudget} /></Field>
            </div>
          </>
        )}

        <p className="flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          <ListChecks className="h-4 w-4 shrink-0" />
          نسبة الإنجاز تنحسب تلقائيًا من مهام المشروع، كل ما أنجزت مهمة يتقدم المشروع.
        </p>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {!project ? (
          <Button type="button" variant="ghost" onClick={() => setKind(null)}><ArrowRight className="me-2 h-4 w-4" /> تغيير النوع</Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="button" onClick={save} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ المشروع"}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

/* Cards ------------------------------------------------------------------- */
function ProjectCard({ project, progress, taskCount, onEdit, onDelete }: { project: Project; progress: number; taskCount: number; onEdit: () => void; onDelete: () => void }) {
  const router = useRouter();
  const kind = kindOf(project);
  const stage = stageOf(project);
  const delivered = kind === "client" && stage === CLIENT_STAGES.delivered;
  const due = delivered ? null : deadlineText(daysUntil(project.endDate));
  const paidPct = project.budget > 0 ? Math.min(100, ((project.amountPaid ?? 0) / project.budget) * 100) : 0;

  return (
    <article
      onClick={() => router.push(`/projects/${project.id}`)}
      className="group flex cursor-pointer flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">
            {kind === "client" ? <Briefcase className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{project.name}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {kind === "client" ? (project.clientName || "بدون عميل") : (project.category || "مشروع شخصي")}
            </p>
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

      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", stage.tone)}>{stage.label}</span>
        {due && (
          <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", due.late ? "border-destructive/40 text-destructive" : "text-muted-foreground")}>{due.text}</span>
        )}
      </div>

      {kind === "client" ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">المستلم</span>
            <span dir="ltr" className="font-bold">{sar(project.amountPaid ?? 0)} / {sar(project.budget)} <span className="saudi-riyal">&#xea;</span></span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} /></div>
        </div>
      ) : (
        <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
          {project.goal ? <><Target className="me-1 inline h-3.5 w-3.5" />{project.goal}</> : (project.description || "بدون وصف")}
        </p>
      )}

      <div className="mt-auto flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${progress}%` }} /></div>
        <span className="text-xs font-bold tabular-nums">{sar(progress)}٪</span>
        <span className="text-[11px] text-muted-foreground">{taskCount ? `${sar(taskCount)} مهام` : "بدون مهام"}</span>
        {project.link && (
          <a href={project.link} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-foreground" title="فتح الرابط">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </article>
  );
}

/* Page -------------------------------------------------------------------- */
type Filter = "all" | ProjectKind;

export default function ProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Project | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ps, cs, ts] = await Promise.all([getDocs(collection(db, "projects")), getDocs(collection(db, "clients")), getDocs(collection(db, "tasks"))]);
      setProjects(ps.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
      setClients(cs.docs.map((d) => ({ id: d.id, ...d.data() } as Client)));
      setTasks(ts.docs.map((d) => ({ id: d.id, ...d.data() } as Task)));
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "حدث خطأ أثناء جلب البيانات." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const remove = async (p: Project) => {
    if (!window.confirm(`حذف «${p.name}»؟`)) return;
    try {
      await deleteDoc(doc(db, "projects", p.id));
      toast({ title: "تم حذف المشروع" });
      load();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحذف المشروع" });
    }
  };

  const personal = projects.filter((p) => kindOf(p) === "personal");
  const client = projects.filter((p) => kindOf(p) === "client");
  const shown = filter === "all" ? projects : filter === "client" ? client : personal;

  const contractTotal = client.reduce((s, p) => s + (p.budget || 0), 0);
  const received = client.reduce((s, p) => s + (p.amountPaid || 0), 0);
  const activeClient = client.filter((p) => stageOf(p) !== CLIENT_STAGES.delivered).length;
  const building = personal.filter((p) => stageOf(p) === PERSONAL_STAGES.building).length;

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "الكل", count: projects.length },
    { key: "client", label: "لعملاء", count: client.length },
    { key: "personal", label: "شخصية", count: personal.length },
  ];
  const openNew = () => { setEditing(null); setOpen(true); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="المشاريع" description="مشاريعك الشخصية وشغلك للعملاء، كل نوع بتفاصيله.">
        <Button onClick={openNew}><PlusCircle className="me-2 h-4 w-4" /> مشروع جديد</Button>
      </PageHeader>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <ProjectForm
            key={editing?.id ?? "new"}
            project={editing}
            clients={clients}
            onSaved={() => { setOpen(false); load(); }}
            onClose={() => setOpen(false)}
          />
        )}
      </Dialog>

      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {[
          { label: "قيمة عقود العملاء", value: <>{sar(contractTotal)} <span className="saudi-riyal">&#xea;</span></> },
          { label: "المتبقي عند العملاء", value: <>{sar(Math.max(0, contractTotal - received))} <span className="saudi-riyal">&#xea;</span></> },
          { label: "مشاريع عملاء جارية", value: sar(activeClient) },
          { label: "مشاريع شخصية قيد البناء", value: sar(building) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-bold md:text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 inline-flex rounded-xl bg-muted p-1">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setFilter(t.key)}
            className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", filter === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t.label} <span className="text-xs text-muted-foreground">({sar(t.count)})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : shown.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <ProjectCard key={p.id} project={p} progress={computeProgress(p, tasks)} taskCount={tasks.filter((t) => (t.projectId ? t.projectId === p.id : t.project === p.name)).length} onEdit={() => { setEditing(p); setOpen(true); }} onDelete={() => remove(p)} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center">
          <h3 className="text-xl font-bold">ما فيه مشاريع هنا للحين</h3>
          <p className="text-sm text-muted-foreground">ابدأ بمشروع شخصي أو مشروع لعميل.</p>
          <Button onClick={openNew}><PlusCircle className="me-2 h-4 w-4" /> مشروع جديد</Button>
        </div>
      )}
    </div>
  );
}
