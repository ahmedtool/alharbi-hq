export type TicketStatus = "new" | "in-progress" | "closed";

export interface Ticket {
  id: string;
  ticketId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  category: string;
  subject: string;
  productDetails?: { name: string; price: number } | null;
  fileUrls?: string[];
  status: TicketStatus;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Message { id: string; text: string; sender: "customer" | "support"; createdAt: unknown }

export const STATUS: Record<TicketStatus, { label: string; tone: string }> = {
  new: { label: "جديدة", tone: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200" },
  "in-progress": { label: "قيد المعالجة", tone: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200" },
  closed: { label: "مغلقة", tone: "bg-muted text-muted-foreground" },
};

export const CATEGORY: Record<string, string> = {
  "project-request": "طلب مشروع",
  "service-request": "طلب خدمة/منتج",
  "custom-request": "خدمة مخصصة",
  "quote-request": "طلب تسعيرة",
  collaboration: "تعاون مشترك",
  "job-inquiry": "بحث عن عمل",
  other: "غيرها",
};

/** Timestamps here may be adapter Timestamps, ISO strings or {seconds}. */
export const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (typeof v === "string" || typeof v === "number") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  const o = v as { toDate?: () => Date; seconds?: number };
  if (typeof o.toDate === "function") return o.toDate();
  if (typeof o.seconds === "number") return new Date(o.seconds * 1000);
  return null;
};

export const relTime = (v: unknown) => {
  const d = toDate(v);
  if (!d) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  const n = (x: number) => new Intl.NumberFormat("ar-SA").format(x);
  if (mins < 1) return "الحين";
  if (mins < 60) return `قبل ${n(mins)} د`;
  const h = Math.round(mins / 60);
  if (h < 24) return `قبل ${n(h)} س`;
  const days = Math.round(h / 24);
  if (days < 7) return days === 1 ? "أمس" : `قبل ${n(days)} أيام`;
  return d.toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { day: "numeric", month: "short" });
};

export const initialsOf = (name?: string) => (name || "؟").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
