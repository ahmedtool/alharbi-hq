/**
 * Clients are either an individual or a company/organisation.
 * Older clients have no `kind`; they count as companies when they have a company name.
 * For companies, `company` is the trade name and `name` the contact person
 * (falls back to the company name so invoices and project pickers keep working).
 */
export type ClientKind = "individual" | "company";

export interface Client {
  id: string;
  kind?: ClientKind;
  name: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  city?: string;
  source?: string;
  website?: string;
  crNumber?: string;
  vatNumber?: string;
  notes?: string;
}

export const clientKind = (c: Pick<Client, "kind" | "company">): ClientKind =>
  c.kind ?? (c.company?.trim() ? "company" : "individual");

/** The name to show first: the company for companies, the person otherwise. */
export const displayName = (c: Client) => (clientKind(c) === "company" && c.company?.trim() ? c.company : c.name);

export const SOURCES = ["توصية", "تيك توك", "X", "موقعي", "واتساب", "أخرى"];

/** Saudi numbers like 05xxxxxxxx become 9665xxxxxxxx for WhatsApp links. */
export const waNumber = (phone?: string) => {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("966")) return d;
  if (d.startsWith("05")) return "966" + d.slice(1);
  if (d.startsWith("5") && d.length === 9) return "966" + d;
  return d;
};

export const initials = (s: string) => s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
