import { belongsTo, taskFraction } from "../tasks/model";

/**
 * Projects come in two kinds with different fields:
 * - personal: an idea or product built for myself (stage, goal, link, cost)
 * - client:   paid work for a client (client, contract value, amount received, deadline)
 * Older projects have no `kind`; they count as client projects when they have a client.
 */
export type ProjectKind = "personal" | "client";

export type PersonalStage = "idea" | "building" | "launched" | "paused";
export type ClientStage = "quote" | "active" | "review" | "delivered";

export interface Project {
  id: string;
  kind?: ProjectKind;
  name: string;
  description: string;
  stage?: PersonalStage | ClientStage;
  startDate: string;
  endDate?: string;
  progress: number;
  /** Personal: expected/spent cost. Client: contract value. */
  budget: number;
  // personal
  goal?: string;
  link?: string;
  category?: string;
  // client
  clientId?: string | null;
  clientName?: string | null;
  amountPaid?: number;
  isPublic?: boolean;
}

export const kindOf = (p: Pick<Project, "kind" | "clientId">): ProjectKind =>
  p.kind ?? (p.clientId ? "client" : "personal");

export const PERSONAL_STAGES: Record<PersonalStage, { label: string; tone: string }> = {
  idea: { label: "فكرة", tone: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200" },
  building: { label: "قيد البناء", tone: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200" },
  launched: { label: "مُطلق", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200" },
  paused: { label: "متوقف", tone: "bg-muted text-muted-foreground" },
};

export const CLIENT_STAGES: Record<ClientStage, { label: string; tone: string }> = {
  quote: { label: "عرض سعر", tone: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200" },
  active: { label: "جاري التنفيذ", tone: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200" },
  review: { label: "مراجعة العميل", tone: "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200" },
  delivered: { label: "تم التسليم", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200" },
};

export const PERSONAL_CATEGORIES = ["منتج SaaS", "أداة", "محتوى", "تعلّم", "أخرى"];

export const stageOf = (p: Project) => {
  if (kindOf(p) === "client") {
    const s = (p.stage as ClientStage) in CLIENT_STAGES ? (p.stage as ClientStage) : (p.progress >= 100 ? "delivered" : "active");
    return CLIENT_STAGES[s];
  }
  const s = (p.stage as PersonalStage) in PERSONAL_STAGES ? (p.stage as PersonalStage) : (p.progress >= 100 ? "launched" : "building");
  return PERSONAL_STAGES[s];
};

export const sar = (n: number) => new Intl.NumberFormat("ar-SA").format(Math.round(n || 0));

/** Whole days from today to an ISO date (negative when it's past). */
export const daysUntil = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

export const deadlineText = (days: number | null) => {
  if (days === null) return null;
  if (days < 0) return { text: `متأخر ${sar(-days)} يوم`, late: true };
  if (days === 0) return { text: "التسليم اليوم", late: true };
  return { text: `باقي ${sar(days)} يوم`, late: false };
};

/**
 * Progress is calculated, not typed in: the average completion of the
 * project's tasks (a task with subtasks counts by how many are ticked).
 * With no tasks yet it's 100% once delivered/launched, otherwise 0%.
 */
export const computeProgress = (p: Project, tasks: TaskLike[]) => {
  const mine = tasks.filter((t) => belongsTo(t, p));
  if (mine.length) return Math.round((mine.reduce((s, t) => s + taskFraction(t), 0) / mine.length) * 100);
  return p.stage === "delivered" || p.stage === "launched" ? 100 : 0;
};
type TaskLike = Parameters<typeof taskFraction>[0] & Parameters<typeof belongsTo>[0];
