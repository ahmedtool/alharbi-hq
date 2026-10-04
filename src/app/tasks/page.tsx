"use client";

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Choices, Field, KindPicker } from "@/components/app/form-bits";
import { ArrowRight, Briefcase, CalendarClock, CheckCircle2, Circle, FolderKanban, ListTodo, MoreHorizontal, PlusCircle, Trash2, User } from "lucide-react";
import {
  GENERAL_CATEGORIES, PRIORITY, STATUS, dueInfo, statusFromSubtasks, taskKind, taskFraction,
  type Priority, type SubTask, type Task, type TaskKind, type TaskStatus,
} from "./model";
import { kindOf as projectKind, type Project } from "../projects/model";

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const fromDateInput = (v: string) => (v ? new Date(v + "T00:00:00").toISOString() : "");
const n = (x: number) => new Intl.NumberFormat("ar-SA").format(x);

/* Form ---------------------------------------------------------------------- */
function TaskForm({ task, projects, onSaved, onClose }: { task: Task | null; projects: Project[]; onSaved: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const [kind, setKind] = React.useState<TaskKind | null>(task ? taskKind(task) : null);
  const [saving, setSaving] = React.useState(false);

  const initialProjectId = task?.projectId ?? projects.find((p) => p.name === task?.project)?.id ?? "";
  const [title, setTitle] = React.useState(task?.title ?? "");
  const [notes, setNotes] = React.useState(task?.notes ?? "");
  const [projectId, setProjectId] = React.useState(initialProjectId);
  const [category, setCategory] = React.useState(task?.category ?? GENERAL_CATEGORIES[0]);
  const [priority, setPriority] = React.useState<Priority>(task?.priority ?? "medium");
  const [status, setStatus] = React.useState<TaskStatus>(task?.status ?? "todo");
  const [dueDate, setDueDate] = React.useState(toDateInput(task?.dueDate));
  const [subTasks, setSubTasks] = React.useState<SubTask[]>(task?.subTasks?.length ? task.subTasks : []);

  const setSub = (id: number, text: string) => setSubTasks((c) => c.map((s) => (s.id === id ? { ...s, text } : s)));
  const quickDue = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); setDueDate(toDateInput(d.toISOString())); };

  const save = async () => {
    if (!kind) return;
    if (!title.trim()) return toast({ variant: "destructive", title: "اكتب عنوان المهمة" });
    if (kind === "project" && !projectId) return toast({ variant: "destructive", title: "اختر المشروع" });
    setSaving(true);
    try {
      const subs = subTasks.filter((s) => s.text.trim());
      const newStatus = statusFromSubtasks(subs, status);
      const proj = projects.find((p) => p.id === projectId);
      const data: Record<string, unknown> = {
        kind, title: title.trim(), notes: notes.trim(), subTasks: subs, priority, status: newStatus, dueDate: fromDateInput(dueDate),
        projectId: kind === "project" ? projectId : null,
        project: kind === "project" ? proj?.name ?? "" : "شخصي",
        category: kind === "general" ? category : "",
      };
      if (newStatus === "done" && task?.status !== "done") data.completedAt = Timestamp.now();
      if (newStatus !== "done") data.completedAt = null;
      if (task) await updateDoc(doc(db, "tasks", task.id), data);
      else await addDoc(collection(db, "tasks"), data);
      toast({ title: task ? "تم تعديل المهمة" : "تمت إضافة المهمة" });
      onSaved();
    } catch (e) {
      console.error("Error saving task", e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ المهمة" });
    } finally {
      setSaving(false);
    }
  };

  if (!kind) {
    return (
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>مهمة جديدة</DialogTitle>
          <DialogDescription>المهمة تابعة لمشروع، ولا مهمة عامة؟</DialogDescription>
        </DialogHeader>
        <KindPicker<TaskKind>
          onPick={setKind}
          options={[
            { kind: "project", icon: Briefcase, title: "مهمة مشروع", text: "جزء من شغل مشروع شخصي أو لعميل.", points: ["تنربط بالمشروع", "تحرّك نسبة إنجازه تلقائيًا", "خطوات وموعد تسليم"] },
            { kind: "general", icon: User, title: "مهمة عامة", text: "شي تبي تخلصه بعيد عن المشاريع.", points: ["تصنيف: شخصي، عمل، إداري، تعلّم", "موعد وأولوية", "خطوات صغيرة"] },
          ]}
        />
      </DialogContent>
    );
  }

  const isProject = kind === "project";
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">{isProject ? <Briefcase className="h-5 w-5" /> : <User className="h-5 w-5" />}</span>
          <div className="text-start">
            <DialogTitle>{task ? "تعديل " : ""}{isProject ? "مهمة مشروع" : "مهمة عامة"}</DialogTitle>
            <DialogDescription>{isProject ? "إنجازها يحرّك نسبة إنجاز المشروع." : "رتّبها بالتصنيف والموعد."}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {isProject && (
          <Field label="المشروع">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="اختر المشروع" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">{projectKind(p) === "client" ? <Briefcase className="h-3.5 w-3.5" /> : <FolderKanban className="h-3.5 w-3.5" />}{p.name}{p.clientName ? ` · ${p.clientName}` : ""}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="المهمة"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isProject ? "مثلًا: تصميم صفحة الدفع" : "مثلًا: تجديد السجل التجاري"} /></Field>
        {!isProject && <Field label="التصنيف"><Choices value={category} onChange={setCategory} options={GENERAL_CATEGORIES} /></Field>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="موعد التسليم">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <div className="flex gap-1.5 pt-1">
              {[{ l: "اليوم", d: 0 }, { l: "بكرة", d: 1 }, { l: "بعد أسبوع", d: 7 }].map((q) => (
                <button key={q.l} type="button" onClick={() => quickDue(q.d)} className="rounded-full border px-2.5 py-0.5 text-xs hover:border-foreground">{q.l}</button>
              ))}
              {dueDate && <button type="button" onClick={() => setDueDate("")} className="rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">بدون</button>}
            </div>
          </Field>
          <Field label="الأولوية">
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1">
              {(Object.keys(PRIORITY) as Priority[]).map((k) => (
                <button key={k} type="button" onClick={() => setPriority(k)}
                  className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold", priority === k ? "bg-background shadow-sm" : "text-muted-foreground")}>
                  <span className={cn("h-2 w-2 rounded-full", PRIORITY[k].dot)} />{PRIORITY[k].label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="الخطوات (اختياري)" hint="لو قسمت المهمة لخطوات، حالتها تتحدث لحالها كل ما شطبت خطوة.">
          <div className="space-y-2">
            {subTasks.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-5 text-center text-xs text-muted-foreground">{n(i + 1)}</span>
                <Input value={s.text} onChange={(e) => setSub(s.id, e.target.value)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => setSubTasks((c) => c.filter((x) => x.id !== s.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setSubTasks((c) => [...c, { id: Date.now(), text: "", completed: false }])}>
              <PlusCircle className="me-2 h-4 w-4" /> إضافة خطوة
            </Button>
          </div>
        </Field>

        {!subTasks.some((s) => s.text.trim()) && (
          <Field label="الحالة">
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1">
              {(Object.keys(STATUS) as TaskStatus[]).map((k) => (
                <button key={k} type="button" onClick={() => setStatus(k)}
                  className={cn("rounded-lg py-2 text-sm font-semibold", status === k ? "bg-background shadow-sm" : "text-muted-foreground")}>{STATUS[k].label}</button>
              ))}
            </div>
          </Field>
        )}

        <Field label="ملاحظات"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {!task ? <Button type="button" variant="ghost" onClick={() => setKind(null)}><ArrowRight className="me-2 h-4 w-4" /> تغيير النوع</Button> : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="button" onClick={save} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ المهمة"}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

/* Card ---------------------------------------------------------------------- */
function TaskCard({ task, projectName, onToggleDone, onToggleSub, onMove, onEdit, onDelete }: {
  task: Task; projectName?: string;
  onToggleDone: () => void; onToggleSub: (id: number, v: boolean) => void; onMove: (s: TaskStatus) => void; onEdit: () => void; onDelete: () => void;
}) {
  const kind = taskKind(task);
  const done = task.status === "done";
  const due = dueInfo(task.dueDate, done);
  const subs = task.subTasks || [];
  const frac = taskFraction(task);

  return (
    <article className={cn("group rounded-2xl border bg-card p-4 transition-all hover:border-foreground/30 hover:shadow-md", done && "opacity-70")}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={onToggleDone} className="mt-0.5 text-muted-foreground transition-colors hover:text-foreground" aria-label={done ? "إرجاع المهمة" : "إنهاء المهمة"}>
          {done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn("font-bold leading-snug", done && "line-through")}>{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            {kind === "project" ? (
              projectName ? (
                <Link href={`/projects/${task.projectId}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-semibold hover:bg-foreground hover:text-background"><Briefcase className="h-3 w-3" />{projectName}</Link>
              ) : <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-semibold"><Briefcase className="h-3 w-3" />{task.project}</span>
            ) : <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">{task.category || "شخصي"}</span>}
            <span className="inline-flex items-center gap-1 text-muted-foreground"><span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY[task.priority]?.dot)} />{PRIORITY[task.priority]?.label}</span>
            {due && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                due.tone === "late" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200" :
                due.tone === "today" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200" : "border text-muted-foreground")}>
                <CalendarClock className="h-3 w-3" />{due.text}
              </span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(STATUS) as TaskStatus[]).filter((s) => s !== task.status && !subs.length).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onMove(s)}>نقل إلى «{STATUS[s].label}»</DropdownMenuItem>
            ))}
            {!subs.length && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onEdit}>تعديل</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">حذف</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {subs.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t pt-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${frac * 100}%` }} /></div>
            <span className="text-[11px] font-bold text-muted-foreground">{n(subs.filter((s) => s.completed).length)}/{n(subs.length)}</span>
          </div>
          {subs.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={s.completed} onCheckedChange={(v) => onToggleSub(s.id, !!v)} />
              <span className={cn(s.completed && "text-muted-foreground line-through")}>{s.text}</span>
            </label>
          ))}
        </div>
      )}
      {task.notes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.notes}</p>}
    </article>
  );
}

/* Page ---------------------------------------------------------------------- */
type Filter = "all" | TaskKind;

const sortTasks = (a: Task, b: Task) => {
  const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
  const db_ = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
  if (da !== db_) return da - db_;
  const pr = { high: 0, medium: 1, low: 2 };
  return (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1);
};

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ts, ps] = await Promise.all([getDocs(collection(db, "tasks")), getDocs(collection(db, "projects"))]);
      setTasks(ts.docs.map((d) => ({ id: d.id, ...d.data() } as Task)).map((t) => ({ ...t, subTasks: t.subTasks || [] })));
      setProjects(ps.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "حدث خطأ أثناء جلب المهام." });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  React.useEffect(() => { load(); }, [load]);

  /** Save a change locally right away, then in the database (rolls back on failure). */
  const patch = async (t: Task, changes: Partial<Task>) => {
    const next = { ...t, ...changes };
    const data: Record<string, unknown> = { ...changes };
    if (changes.status && changes.status !== t.status) data.completedAt = changes.status === "done" ? Timestamp.now() : null;
    setTasks((all) => all.map((x) => (x.id === t.id ? next : x)));
    try {
      await updateDoc(doc(db, "tasks", t.id), data);
    } catch (e) {
      console.error(e);
      setTasks((all) => all.map((x) => (x.id === t.id ? t : x)));
      toast({ variant: "destructive", title: "ما قدرنا نحدّث المهمة" });
    }
  };

  const toggleDone = (t: Task) => {
    if (t.status === "done") {
      const subs = t.subTasks.map((s) => ({ ...s, completed: false }));
      return patch(t, { status: "todo", ...(t.subTasks.length ? { subTasks: subs } : {}) });
    }
    const subs = t.subTasks.map((s) => ({ ...s, completed: true }));
    return patch(t, { status: "done", ...(t.subTasks.length ? { subTasks: subs } : {}) });
  };
  const toggleSub = (t: Task, id: number, v: boolean) => {
    const subs = t.subTasks.map((s) => (s.id === id ? { ...s, completed: v } : s));
    return patch(t, { subTasks: subs, status: statusFromSubtasks(subs, t.status) });
  };
  const remove = async (t: Task) => {
    if (!window.confirm(`حذف «${t.title}»؟`)) return;
    await deleteDoc(doc(db, "tasks", t.id));
    setTasks((all) => all.filter((x) => x.id !== t.id));
  };

  const projectName = (t: Task) => (t.projectId ? projects.find((p) => p.id === t.projectId)?.name : undefined);
  const shown = tasks.filter((t) => filter === "all" || taskKind(t) === filter);
  const open_ = tasks.filter((t) => t.status !== "done");
  const late = open_.filter((t) => (dueInfo(t.dueDate)?.days ?? 1) < 0).length;
  const today = open_.filter((t) => dueInfo(t.dueDate)?.days === 0).length;
  const weekAgo = Date.now() - 7 * 86400000;
  const doneWeek = tasks.filter((t) => {
    if (t.status !== "done") return false;
    const c = t.completedAt as { toDate?: () => Date } | string | undefined;
    const d = typeof c === "string" ? new Date(c) : c?.toDate?.();
    return d ? d.getTime() >= weekAgo : false;
  }).length;

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "الكل", count: tasks.length },
    { key: "project", label: "مشاريع", count: tasks.filter((t) => taskKind(t) === "project").length },
    { key: "general", label: "عامة", count: tasks.filter((t) => taskKind(t) === "general").length },
  ];
  const openNew = () => { setEditing(null); setOpen(true); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="المهام" description="مهام مشاريعك ومهامك العامة، بمواعيدها.">
        <Button onClick={openNew}><PlusCircle className="me-2 h-4 w-4" /> مهمة جديدة</Button>
      </PageHeader>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && <TaskForm key={editing?.id ?? "new"} task={editing} projects={projects} onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />}
      </Dialog>

      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {[
          { label: "متأخرة", value: late, tone: late ? "text-destructive" : "" },
          { label: "موعدها اليوم", value: today, tone: today ? "text-amber-600" : "" },
          { label: "مفتوحة", value: open_.length, tone: "" },
          { label: "أنجزتها هالأسبوع", value: doneWeek, tone: doneWeek ? "text-emerald-600" : "" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", s.tone)}>{n(s.value)}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 inline-flex rounded-xl bg-muted p-1">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setFilter(t.key)}
            className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", filter === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t.label} <span className="text-xs text-muted-foreground">({n(t.count)})</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {(Object.keys(STATUS) as TaskStatus[]).map((st) => {
          const col = shown.filter((t) => t.status === st).sort(sortTasks);
          return (
            <section key={st} className="rounded-2xl bg-muted/50 p-3">
              <h2 className="mb-3 flex items-center gap-2 px-1 font-bold">
                <span className={cn("h-2.5 w-2.5 rounded-full", STATUS[st].dot)} />{STATUS[st].label}
                <span className="text-sm font-normal text-muted-foreground">({n(col.length)})</span>
              </h2>
              <div className="space-y-3">
                {loading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
                  : col.length ? col.map((t) => (
                    <TaskCard key={t.id} task={t} projectName={projectName(t)}
                      onToggleDone={() => toggleDone(t)} onToggleSub={(id, v) => toggleSub(t, id, v)} onMove={(s) => patch(t, { status: s })}
                      onEdit={() => { setEditing(t); setOpen(true); }} onDelete={() => remove(t)} />
                  )) : (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-8 text-sm text-muted-foreground">
                      <ListTodo className="h-5 w-5" />ما فيه مهام هنا
                    </div>
                  )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
