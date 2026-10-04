/**
 * Tasks are either part of a project, or general (personal/admin) work.
 * Older tasks have no `kind`: they count as project tasks when they name a
 * project other than "شخصي". Project progress is computed from its tasks.
 */
export type TaskKind = "project" | "general";
export type TaskStatus = "todo" | "inprogress" | "done";
export type Priority = "high" | "medium" | "low";

export interface SubTask { id: number; text: string; completed: boolean }

export interface Task {
  id: string;
  kind?: TaskKind;
  title: string;
  notes?: string;
  subTasks: SubTask[];
  /** Project name (kept for older tasks and display). */
  project: string;
  projectId?: string | null;
  category?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: unknown;
}

export const taskKind = (t: Pick<Task, "kind" | "project" | "projectId">): TaskKind =>
  t.kind ?? (t.projectId || (t.project && t.project !== "شخصي") ? "project" : "general");

export const GENERAL_CATEGORIES = ["شخصي", "عمل", "إداري", "تعلّم"];

export const PRIORITY: Record<Priority, { label: string; dot: string }> = {
  high: { label: "عالية", dot: "bg-red-500" },
  medium: { label: "متوسطة", dot: "bg-amber-500" },
  low: { label: "منخفضة", dot: "bg-slate-400" },
};

export const STATUS: Record<TaskStatus, { label: string; dot: string }> = {
  todo: { label: "جديدة", dot: "bg-sky-500" },
  inprogress: { label: "قيد التنفيذ", dot: "bg-amber-500" },
  done: { label: "مكتملة", dot: "bg-emerald-500" },
};

/** Status follows the subtasks when there are any. */
export const statusFromSubtasks = (subs: SubTask[], fallback: TaskStatus): TaskStatus => {
  if (!subs.length) return fallback;
  const done = subs.filter((s) => s.completed).length;
  return done === subs.length ? "done" : done > 0 ? "inprogress" : "todo";
};

/** How finished a task is, 0..1 (subtasks count when there are any). */
export const taskFraction = (t: Pick<Task, "status" | "subTasks">) => {
  if (t.status === "done") return 1;
  const subs = t.subTasks || [];
  if (subs.length) return subs.filter((s) => s.completed).length / subs.length;
  return 0;
};

/** Does this task belong to the project? (by id, or by name for older tasks) */
export const belongsTo = (t: Pick<Task, "projectId" | "project">, p: { id: string; name: string }) =>
  t.projectId ? t.projectId === p.id : !!t.project && t.project === p.name;

/** Due-date label relative to today. */
export const dueInfo = (iso?: string, done?: boolean) => {
  if (!iso || done) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  const n = (x: number) => new Intl.NumberFormat("ar-SA").format(x);
  if (days < 0) return { text: `متأخرة ${n(-days)} يوم`, tone: "late" as const, days };
  if (days === 0) return { text: "اليوم", tone: "today" as const, days };
  if (days === 1) return { text: "بكرة", tone: "soon" as const, days };
  if (days <= 7) return { text: `خلال ${n(days)} أيام`, tone: "soon" as const, days };
  return { text: d.toLocaleDateString("ar-SA-u-nu-arab", { day: "numeric", month: "long" }), tone: "later" as const, days };
};
