"use client";

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Choices, Field, IconInput, KindPicker } from "@/components/app/form-bits";
import { ArrowRight, Briefcase, Clock, FileDigit, Globe, Link2, Loader2, MoreHorizontal, Package, PlusCircle, Search, Trash2 } from "lucide-react";

/* Model --------------------------------------------------------------------- */
// Older items have no `kind`: they count as services (that's what was sold through invoices).
type Kind = "service" | "product";
interface Product {
  id: string;
  kind?: Kind;
  name: string;
  description: string;
  price: number;
  cost?: number;
  isPublic: boolean;
  unit?: string;
  // service
  deliveryDays?: number;
  includes?: string[];
  // product
  link?: string;
}
interface InvoiceLite { lineItems?: { description: string; quantity: number; price: number }[] }

const kindOf = (p: Product): Kind => p.kind ?? "service";
const SERVICE_UNITS = ["سعر ثابت", "بالساعة", "باليوم", "شهري"];
const PRODUCT_UNITS = ["مرة واحدة", "شهري", "سنوي", "للنسخة"];
const n = (x: number) => new Intl.NumberFormat("ar-SA").format(Math.round(x || 0));
const unitSuffix = (u?: string) => ({ "بالساعة": "/ ساعة", "باليوم": "/ يوم", "شهري": "/ شهريًا", "سنوي": "/ سنويًا", "للنسخة": "/ نسخة" } as Record<string, string>)[u || ""] || "";
const margin = (p: Product) => (p.price > 0 ? ((p.price - (p.cost || 0)) / p.price) * 100 : 0);
/** Invoice lines store "name\ndetails": the first line is the item name. */
const lineName = (d: string) => (d || "").split("\n")[0].trim();

/* Form ---------------------------------------------------------------------- */
function ProductForm({ product, onSaved, onClose }: { product: Product | null; onSaved: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const [kind, setKind] = React.useState<Kind | null>(product ? kindOf(product) : null);
  const isService = kind === "service";
  const [name, setName] = React.useState(product?.name ?? "");
  const [description, setDescription] = React.useState(product?.description ?? "");
  const [price, setPrice] = React.useState<number | "">(product?.price ?? "");
  const [cost, setCost] = React.useState<number | "">(product?.cost || "");
  const [unit, setUnit] = React.useState(product?.unit ?? "");
  const [deliveryDays, setDeliveryDays] = React.useState<number | "">(product?.deliveryDays ?? "");
  const [includes, setIncludes] = React.useState<string[]>(product?.includes?.length ? product.includes : [""]);
  const [link, setLink] = React.useState(product?.link ?? "");
  const [isPublic, setIsPublic] = React.useState(product?.isPublic ?? false);
  const [saving, setSaving] = React.useState(false);

  const units = isService ? SERVICE_UNITS : PRODUCT_UNITS;
  const unitValue = unit || units[0];
  const profit = (Number(price) || 0) - (Number(cost) || 0);

  const save = async () => {
    if (!kind) return;
    if (!name.trim() || price === "" || Number(price) < 0) return toast({ variant: "destructive", title: "اكتب الاسم والسعر" });
    setSaving(true);
    try {
      const data: Omit<Product, "id"> = {
        kind, name: name.trim(), description: description.trim(),
        price: Number(price), cost: Number(cost) || 0, isPublic, unit: unitValue,
        ...(isService
          ? { deliveryDays: Number(deliveryDays) || 0, includes: includes.map((s) => s.trim()).filter(Boolean) }
          : { link: link.trim() }),
      };
      if (product) await updateDoc(doc(db, "products", product.id), data as Record<string, unknown>);
      else await addDoc(collection(db, "products"), data);
      toast({ title: product ? "تم التحديث" : isService ? "انضافت الخدمة" : "انضاف المنتج" });
      onSaved();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ" });
    } finally {
      setSaving(false);
    }
  };

  if (!kind) {
    return (
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة جديد</DialogTitle>
          <DialogDescription>خدمة تنفذها بنفسك، ولا منتج جاهز تبيعه؟</DialogDescription>
        </DialogHeader>
        <KindPicker<Kind>
          onPick={setKind}
          options={[
            { kind: "service", icon: Briefcase, title: "خدمة", text: "شغل تنفذه للعميل.", points: ["السعر بالمشروع أو بالساعة", "مدة التنفيذ", "وش تشمل الخدمة"] },
            { kind: "product", icon: Package, title: "منتج", text: "شي جاهز: قالب، اشتراك، أداة.", points: ["السعر لمرة أو باشتراك", "رابط المنتج", "التكلفة وهامش الربح"] },
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
            {isService ? <Briefcase className="h-5 w-5" /> : <Package className="h-5 w-5" />}
          </span>
          <div className="text-start">
            <DialogTitle>{product ? "تعديل " : ""}{isService ? "خدمة" : "منتج"}</DialogTitle>
            <DialogDescription>الاسم والوصف يطلعون في الفواتير وعروض الأسعار.</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="max-h-[65dvh] space-y-5 overflow-y-auto px-0.5 py-1">
        <Field label={isService ? "اسم الخدمة" : "اسم المنتج"}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isService ? "مثال: تصميم وتطوير متجر إلكتروني" : "مثال: قالب سيرة ذاتية"} autoFocus />
        </Field>
        <Field label="الوصف"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="سطرين يوضحون للعميل وش ياخذ." /></Field>

        <Field label="طريقة التسعير"><Choices value={unitValue} onChange={setUnit} options={units} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`السعر (ريال) ${unitSuffix(unitValue)}`}><Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
          <Field label="التكلفة عليك (اختياري)" hint={price !== "" ? `الربح ${n(profit)} ريال${Number(price) > 0 ? ` · هامش ${n((profit / Number(price)) * 100)}٪` : ""}` : undefined}>
            <Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value === "" ? "" : Number(e.target.value))} />
          </Field>
        </div>

        {isService ? (
          <>
            <Field label="مدة التنفيذ (يوم، اختياري)"><IconInput icon={Clock} type="number" min={0} value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
            <Field label="وش تشمل الخدمة؟">
              <div className="space-y-2">
                {includes.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={s} placeholder="مثال: جولتين تعديل" onChange={(e) => setIncludes(includes.map((x, j) => (j === i ? e.target.value : x)))} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setIncludes(includes.length > 1 ? includes.filter((_, j) => j !== i) : [""])}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setIncludes([...includes, ""])}><PlusCircle className="me-2 h-4 w-4" /> إضافة</Button>
              </div>
            </Field>
          </>
        ) : (
          <Field label="رابط المنتج (اختياري)"><IconInput icon={Link2} dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></Field>
        )}

        <label className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
          <span>يظهر للعملاء في طلب الخدمة بصفحة الدعم</span>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </label>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {!product ? <Button type="button" variant="ghost" onClick={() => setKind(null)}><ArrowRight className="me-2 h-4 w-4" /> تغيير النوع</Button> : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="button" onClick={save} disabled={saving}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />} حفظ</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

/* Card ---------------------------------------------------------------------- */
function ProductCard({ p, sales, onEdit, onDuplicate, onTogglePublic, onDelete }: {
  p: Product; sales: { count: number; total: number };
  onEdit: () => void; onDuplicate: () => void; onTogglePublic: () => void; onDelete: () => void;
}) {
  const service = kindOf(p) === "service";
  const m = margin(p);
  const hasCost = (p.cost || 0) > 0;
  return (
    <article onClick={onEdit} className="group flex cursor-pointer flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">
            {service ? <Briefcase className="h-5 w-5" /> : <Package className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{p.name}</h3>
            <p className="truncate text-xs text-muted-foreground">{service ? "خدمة" : "منتج"}{p.unit ? ` · ${p.unit}` : ""}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onEdit}>تعديل</DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>تكرار</DropdownMenuItem>
            <DropdownMenuItem onClick={onTogglePublic}>{p.isPublic ? "إخفاء عن العملاء" : "إظهار للعملاء"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">حذف</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {p.isPublic && <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-900 dark:bg-sky-900/30 dark:text-sky-200"><Globe className="me-1 inline h-3 w-3" />ظاهر للعملاء</span>}
        {service && !!p.deliveryDays && <span className="rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground"><Clock className="me-1 inline h-3 w-3" />{n(p.deliveryDays)} يوم</span>}
        <span className="rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground">{sales.count ? `انباع ${n(sales.count)} مرة` : "ما انباع للحين"}</span>
      </div>

      {p.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p> : null}
      {service && !!p.includes?.length && (
        <ul className="space-y-0.5 text-sm">
          {p.includes.slice(0, 3).map((s, i) => <li key={i} className="flex gap-2"><span className="text-muted-foreground">✓</span><span className="truncate">{s}</span></li>)}
        </ul>
      )}

      <div className="mt-auto space-y-3 border-t pt-3">
        {hasCost && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">هامش الربح</span><span className={cn("font-bold", m < 0 && "text-destructive")}>{n(m)}٪ · {n(p.price - (p.cost || 0))} ريال</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", m < 0 ? "bg-destructive" : "bg-emerald-500")} style={{ width: `${Math.max(0, Math.min(100, m))}%` }} /></div>
          </div>
        )}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-bold">{n(p.price)} <span className="saudi-riyal text-base">&#xea;</span> <span className="text-xs font-normal text-muted-foreground">{unitSuffix(p.unit)}</span></p>
            {sales.total > 0 && <p className="text-[11px] text-muted-foreground">دخل منه {n(sales.total)} ريال</p>}
          </div>
          <Button asChild size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
            <Link href={`/tools/invoice-generator?product=${p.id}`}><FileDigit className="me-1.5 h-4 w-4" /> فاتورة</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

/* Page ---------------------------------------------------------------------- */
type Filter = "all" | Kind;

export default function ProductsPage() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Product[]>([]);
  const [invoices, setInvoices] = React.useState<InvoiceLite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [ps, is] = await Promise.all([getDocs(collection(db, "products")), getDocs(collection(db, "invoices"))]);
      setItems(ps.docs.map((d) => ({ ...(d.data() as Omit<Product, "id">), id: d.id, price: Number(d.data().price) || 0 })));
      setInvoices(is.docs.map((d) => d.data() as InvoiceLite));
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نجيب المنتجات" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  /** Sales per item, matched by name on invoice lines. */
  const sales = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const inv of invoices) for (const l of inv.lineItems || []) {
      const key = lineName(l.description);
      if (!key) continue;
      const cur = map.get(key) || { count: 0, total: 0 };
      map.set(key, { count: cur.count + (Number(l.quantity) || 1), total: cur.total + (Number(l.quantity) || 0) * (Number(l.price) || 0) });
    }
    return map;
  }, [invoices]);
  const salesOf = (p: Product) => sales.get(p.name.trim()) || { count: 0, total: 0 };

  const duplicate = async (p: Product) => {
    const { id: _id, ...rest } = p;
    await addDoc(collection(db, "products"), { ...rest, name: `${p.name} (نسخة)` });
    toast({ title: "انعملت نسخة" });
    load();
  };
  const togglePublic = async (p: Product) => {
    setItems((list) => list.map((x) => (x.id === p.id ? { ...x, isPublic: !x.isPublic } : x)));
    try { await updateDoc(doc(db, "products", p.id), { isPublic: !p.isPublic }); }
    catch (e) { console.error(e); load(); }
  };
  const remove = async (p: Product) => {
    if (!window.confirm(`حذف «${p.name}»؟ الفواتير القديمة ما تتأثر.`)) return;
    try {
      await deleteDoc(doc(db, "products", p.id));
      toast({ title: "انحذف" });
      load();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحذف" });
    }
  };

  const services = items.filter((p) => kindOf(p) === "service");
  const products = items.filter((p) => kindOf(p) === "product");
  const withCost = items.filter((p) => (p.cost || 0) > 0 && p.price > 0);
  const avgMargin = withCost.length ? withCost.reduce((s, p) => s + margin(p), 0) / withCost.length : null;
  const best = [...items].sort((a, b) => salesOf(b).total - salesOf(a).total)[0];

  const q = search.trim().toLowerCase();
  const shown = items
    .filter((p) => filter === "all" || kindOf(p) === filter)
    .filter((p) => !q || [p.name, p.description, ...(p.includes ?? [])].some((x) => (x || "").toLowerCase().includes(q)))
    .sort((a, b) => salesOf(b).count - salesOf(a).count || a.name.localeCompare(b.name));

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "الكل", count: items.length },
    { key: "service", label: "خدمات", count: services.length },
    { key: "product", label: "منتجات", count: products.length },
  ];
  const openNew = () => { setEditing(null); setOpen(true); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="المنتجات والخدمات" description="اللي تبيعه وتنفذه، بأسعاره وأرباحه، جاهز للفواتير وعروض الأسعار.">
        <Button onClick={openNew}><PlusCircle className="me-2 h-4 w-4" /> إضافة</Button>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {[
          { label: "الخدمات", value: n(services.length), sub: `${n(services.filter((p) => p.isPublic).length)} ظاهرة للعملاء` },
          { label: "المنتجات", value: n(products.length), sub: `${n(products.filter((p) => p.isPublic).length)} ظاهرة للعملاء` },
          { label: "متوسط هامش الربح", value: avgMargin === null ? "—" : `${n(avgMargin)}٪`, sub: avgMargin === null ? "أضف التكلفة عشان ينحسب" : `من ${n(withCost.length)} عنصر` },
          { label: "الأكثر دخلًا", value: best && salesOf(best).total ? best.name : "—", sub: best && salesOf(best).total ? `${n(salesOf(best).total)} ريال من الفواتير` : "من الفواتير" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 truncate text-xl font-bold md:text-2xl">{s.value}</p>
            <p className="truncate text-[11px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex self-start rounded-xl bg-muted p-1">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setFilter(t.key)}
              className={cn("whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", filter === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.label} <span className="text-xs text-muted-foreground">({n(t.count)})</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الوصف" className="ps-9" />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}</div>
      ) : shown.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <ProductCard key={p.id} p={p} sales={salesOf(p)}
              onEdit={() => { setEditing(p); setOpen(true); }}
              onDuplicate={() => duplicate(p)}
              onTogglePublic={() => togglePublic(p)}
              onDelete={() => remove(p)} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center">
          <Package className="h-8 w-8 text-muted-foreground" />
          <h3 className="text-xl font-bold">{items.length ? "ما فيه شي يطابق البحث" : "ما فيه منتجات أو خدمات للحين"}</h3>
          {!items.length && <Button onClick={openNew}><PlusCircle className="me-2 h-4 w-4" /> أضف أول خدمة</Button>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        {open && <ProductForm key={editing?.id ?? "new"} product={editing} onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />}
      </Dialog>
    </div>
  );
}
