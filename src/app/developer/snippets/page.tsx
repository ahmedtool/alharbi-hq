"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Choices, Field, IconInput } from "@/components/app/form-bits";
import { Check, ChevronDown, Code2, Copy, ExternalLink, Globe, Link2, Loader2, MoreHorizontal, Pin, PlusCircle, Search, Wrench } from "lucide-react";

/* Model --------------------------------------------------------------------- */
interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language?: string;
  tags?: string[];
  pinned?: boolean;
  updatedAt?: string;
}
interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  category?: string;
}

const LANGUAGES = ["TypeScript", "JavaScript", "React", "Python", "SQL", "Bash", "CSS", "HTML", "JSON", "أخرى"];
const TOOL_CATEGORIES = ["تطوير", "تصميم", "ذكاء اصطناعي", "استضافة", "مراجع", "أخرى"];

/** Older snippets have no language: guess one from the code. */
const guessLanguage = (code: string) => {
  const c = code.trim();
  const first = c.split("\n")[0];
  if (/^\s*[{[]/.test(c) && /"\s*:/.test(c)) return "JSON";
  if (/^\s*(select|insert|update|delete|create|alter|drop|with)\b/i.test(c)) return "SQL";
  if (/^\s*(def |class \w+.*:$|from \w+ import|import \w+$|print\()/m.test(c) && !/[{};]\s*$/m.test(c)) return "Python";
  if (/<\/?[A-Z]\w*[\s/>]|className=/.test(c)) return "React";
  if (/^\s*<(!doctype|html|div|head|body)/i.test(c)) return "HTML";
  if (/^[.#]?[\w-]+\s*\{[^}]*:[^}]*\}/m.test(c) && !/function|=>|import /.test(c)) return "CSS";
  if (/:\s*(string|number|boolean|any|void)\b|\binterface \w+|\btype \w+ =|\w+\s*:\s*[A-Z]\w*\s*[),=]/.test(c)) return "TypeScript";
  if (/^(#!|\$ |sudo |npm |pnpm |yarn |npx |git |cd |curl |rm |mkdir |docker |brew )/.test(first)) return "Bash";
  return "JavaScript";
};
const langOf = (s: Snippet) => s.language || guessLanguage(s.code || "");
const domainOf = (url?: string) => { try { return url ? new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "") : ""; } catch { return ""; } };
const n = (x: number) => new Intl.NumberFormat("ar-SA").format(x);

/* A tiny highlighter: comments, strings, numbers, keywords. Good enough for a glance. */
const KEYWORDS = new Set("const let var function return if else for while do switch case break continue new class extends import from export default async await try catch finally throw typeof instanceof in of interface type enum public private readonly def lambda pass yield with as elif None True False null undefined true false this self select where insert into update set delete create table alter join left right inner on group by order limit and or not values returning echo fi then".split(" "));
const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|--[^\n]*|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;

function highlight(line: string, lang: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  const hashComments = ["Python", "Bash"].includes(lang);
  const slashComments = !hashComments && lang !== "SQL";
  for (const m of line.matchAll(TOKEN)) {
    const t = m[0];
    const i = m.index ?? 0;
    if (i > last) out.push(line.slice(last, i));
    let cls = "";
    if (t.startsWith("//") || t.startsWith("/*")) cls = slashComments ? "text-neutral-500 italic" : "";
    else if (t.startsWith("#")) cls = hashComments ? "text-neutral-500 italic" : "";
    else if (t.startsWith("--")) cls = lang === "SQL" ? "text-neutral-500 italic" : "";
    else if (/^["'`]/.test(t)) cls = "text-emerald-300";
    else if (/^\d/.test(t)) cls = "text-amber-300";
    else if (KEYWORDS.has(lang === "SQL" ? t.toLowerCase() : t)) cls = "text-sky-300";
    else if (/^[A-Z]/.test(t)) cls = "text-violet-300";
    out.push(cls ? <span key={i} className={cls}>{t}</span> : t);
    last = i + t.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

/* Snippet form -------------------------------------------------------------- */
function SnippetForm({ snippet, onSaved, onClose }: { snippet: Snippet | null; onSaved: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState(snippet?.title ?? "");
  const [description, setDescription] = React.useState(snippet?.description ?? "");
  const [code, setCode] = React.useState(snippet?.code ?? "");
  const [language, setLanguage] = React.useState(snippet ? langOf(snippet) : "TypeScript");
  const [tags, setTags] = React.useState((snippet?.tags ?? []).join("، "));
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!title.trim() || !code.trim()) return toast({ variant: "destructive", title: "اكتب العنوان والكود" });
    setSaving(true);
    try {
      const data = {
        title: title.trim(), description: description.trim(), code, language,
        tags: tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
        updatedAt: new Date().toISOString(),
      };
      if (snippet) await updateDoc(doc(db, "snippets", snippet.id), data);
      else await addDoc(collection(db, "snippets"), { ...data, pinned: false });
      toast({ title: snippet ? "تم تحديث الكود" : "انحفظ الكود" });
      onSaved();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ الكود" });
    } finally {
      setSaving(false);
    }
  };

  /** Tab inserts two spaces instead of leaving the field. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = el;
    setCode(code.slice(0, a) + "  " + code.slice(b));
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 2; });
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{snippet ? "تعديل الكود" : "كود جديد"}</DialogTitle>
        <DialogDescription>احفظ القطع اللي ترجع لها كثير، وانسخها بضغطة.</DialogDescription>
      </DialogHeader>
      <div className="max-h-[68dvh] space-y-4 overflow-y-auto px-0.5">
        <Field label="العنوان"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: رفع ملف إلى Supabase Storage" autoFocus /></Field>
        <Field label="اللغة"><Choices value={language} onChange={setLanguage} options={LANGUAGES} /></Field>
        <Field label="الكود">
          <Textarea value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={onKeyDown} rows={12} dir="ltr" spellCheck={false}
            className="bg-neutral-950 font-code text-[13px] leading-6 text-neutral-100 placeholder:text-neutral-500" placeholder="// الصق الكود هنا" />
        </Field>
        <Field label="وش يسوي؟ (اختياري)"><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="وسوم (اختياري)" hint="افصل بينها بفاصلة"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="supabase، رفع ملفات" /></Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />} حفظ</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* Tool form ----------------------------------------------------------------- */
function ToolForm({ tool, onSaved, onClose }: { tool: Tool | null; onSaved: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = React.useState(tool?.name ?? "");
  const [url, setUrl] = React.useState(tool?.url ?? "");
  const [description, setDescription] = React.useState(tool?.description ?? "");
  const [category, setCategory] = React.useState(tool?.category ?? TOOL_CATEGORIES[0]);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!name.trim() || !url.trim()) return toast({ variant: "destructive", title: "اكتب اسم الأداة ورابطها" });
    setSaving(true);
    try {
      const clean = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
      const data = { name: name.trim(), url: clean, description: description.trim(), category };
      if (tool) await updateDoc(doc(db, "tools", tool.id), data);
      else await addDoc(collection(db, "tools"), data);
      toast({ title: tool ? "تم تحديث الأداة" : "انضافت الأداة" });
      onSaved();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحفظ الأداة" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{tool ? "تعديل الأداة" : "أداة جديدة"}</DialogTitle>
        <DialogDescription>المواقع والخدمات اللي تستخدمها دايمًا.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Field label="الاسم"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: Excalidraw" autoFocus /></Field>
        <Field label="الرابط"><IconInput icon={Globe} dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="excalidraw.com" /></Field>
        <Field label="التصنيف"><Choices value={category} onChange={setCategory} options={TOOL_CATEGORIES} /></Field>
        <Field label="وش تستخدمها فيه؟ (اختياري)"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />} حفظ</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* Cards --------------------------------------------------------------------- */
const PREVIEW_LINES = 14;

function SnippetCard({ s, onEdit, onPin, onDelete }: { s: Snippet; onEdit: () => void; onPin: () => void; onDelete: () => void }) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const lang = langOf(s);
  const lines = (s.code || "").replace(/\s+$/, "").split("\n");
  const long = lines.length > PREVIEW_LINES;
  const shown = expanded || !long ? lines : lines.slice(0, PREVIEW_LINES);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(s.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ variant: "destructive", title: "ما قدرنا ننسخ" });
    }
  };

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card">
      {/* editor window */}
      <div className="overflow-hidden bg-neutral-950 text-neutral-100" dir="ltr">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
          <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /></span>
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-400">{lang}</span>
          <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-300 transition-colors hover:bg-white/10 hover:text-white">
            {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> تم النسخ</> : <><Copy className="h-3.5 w-3.5" /> نسخ</>}
          </button>
        </div>
        <div className="relative">
          <pre className="overflow-x-auto py-3 font-code text-[12.5px] leading-6">
            <code className="block min-w-max">
              {shown.map((l, i) => (
                <div key={i} className="flex">
                  <span className="sticky left-0 w-10 shrink-0 select-none bg-neutral-950 pe-3 text-right text-neutral-600">{i + 1}</span>
                  <span className="whitespace-pre pe-4">{highlight(l, lang)}{"\n"}</span>
                </div>
              ))}
            </code>
          </pre>
          {long && !expanded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-neutral-950 to-transparent" />}
        </div>
        {long && (
          <button type="button" onClick={() => setExpanded((x) => !x)} className="flex w-full items-center justify-center gap-1 border-t border-white/10 py-2 text-xs text-neutral-400 hover:text-white">
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
            {expanded ? "إخفاء" : `عرض الكل (${n(lines.length)} سطر)`}
          </button>
        )}
      </div>

      <div className="flex flex-1 items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1.5">
          <h3 className="flex items-center gap-1.5 font-bold">{s.pinned && <Pin className="h-3.5 w-3.5 shrink-0 fill-current" />}<span className="truncate">{s.title}</span></h3>
          {s.description && <p className="line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
          {!!s.tags?.length && (
            <div className="flex flex-wrap gap-1.5">{s.tags.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">#{t}</span>)}</div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 shrink-0 p-0"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={copy}>نسخ الكود</DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>تعديل</DropdownMenuItem>
            <DropdownMenuItem onClick={onPin}>{s.pinned ? "إلغاء التثبيت" : "تثبيت فوق"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">حذف</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

function ToolCard({ t, onEdit, onDelete }: { t: Tool; onEdit: () => void; onDelete: () => void }) {
  const [broken, setBroken] = React.useState(false);
  const domain = domainOf(t.url);
  return (
    <div className="group relative flex items-start gap-3 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-lg font-bold">
        {domain && !broken
          ? <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" width={24} height={24} onError={() => setBroken(true)} />
          : (t.name.trim()[0] || "؟").toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        {/* the whole card opens the tool (stretched link) */}
        <a href={t.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-bold after:absolute after:inset-0 after:rounded-2xl">
          <span className="truncate">{t.name}</span><ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </a>
        <p className="truncate text-xs text-muted-foreground" dir="ltr" style={{ textAlign: "right" }}>{domain}</p>
        {t.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
        {t.category && <span className="mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t.category}</span>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative z-10 h-8 w-8 shrink-0 p-0"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>تعديل</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">حذف</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const Empty = ({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action: React.ReactNode }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center">
    <Icon className="h-8 w-8 text-muted-foreground" />
    <h3 className="text-xl font-bold">{title}</h3>
    {action}
  </div>
);

/* Page ---------------------------------------------------------------------- */
type Tab = "snippets" | "tools";

export default function SnippetsPage() {
  const { toast } = useToast();
  const [tab, setTab] = React.useState<Tab>("snippets");
  const [snippets, setSnippets] = React.useState<Snippet[]>([]);
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [lang, setLang] = React.useState("الكل");
  const [toolCat, setToolCat] = React.useState("الكل");
  const [snippetForm, setSnippetForm] = React.useState<{ open: boolean; item: Snippet | null }>({ open: false, item: null });
  const [toolForm, setToolForm] = React.useState<{ open: boolean; item: Tool | null }>({ open: false, item: null });

  const load = React.useCallback(async () => {
    try {
      const [s, t] = await Promise.all([getDocs(collection(db, "snippets")), getDocs(collection(db, "tools"))]);
      setSnippets(s.docs.map((d) => ({ id: d.id, ...d.data() } as Snippet)));
      setTools(t.docs.map((d) => ({ id: d.id, ...d.data() } as Tool)));
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نجيب البيانات" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const remove = async (col: "snippets" | "tools", id: string, name: string) => {
    if (!window.confirm(`حذف «${name}»؟`)) return;
    try {
      await deleteDoc(doc(db, col, id));
      toast({ title: "انحذف" });
      load();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نحذف" });
    }
  };

  const togglePin = async (s: Snippet) => {
    setSnippets((list) => list.map((x) => (x.id === s.id ? { ...x, pinned: !x.pinned } : x)));
    try { await updateDoc(doc(db, "snippets", s.id), { pinned: !s.pinned }); }
    catch (e) { console.error(e); load(); }
  };

  const q = search.trim().toLowerCase();
  const usedLangs = LANGUAGES.filter((l) => snippets.some((s) => langOf(s) === l));
  const shownSnippets = snippets
    .filter((s) => lang === "الكل" || langOf(s) === lang)
    .filter((s) => !q || [s.title, s.description, s.code, ...(s.tags ?? [])].some((x) => (x || "").toLowerCase().includes(q)))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.updatedAt || "").localeCompare(a.updatedAt || "") || a.title.localeCompare(b.title));
  const usedCats = TOOL_CATEGORIES.filter((c) => tools.some((t) => (t.category || "أخرى") === c));
  const shownTools = tools
    .filter((t) => toolCat === "الكل" || (t.category || "أخرى") === toolCat)
    .filter((t) => !q || [t.name, t.description, t.url].some((x) => (x || "").toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));

  const chip = (value: string, current: string, set: (v: string) => void, count: number) => (
    <button key={value} type="button" onClick={() => set(value)}
      className={cn("whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors", current === value ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:border-foreground hover:text-foreground")}>
      {value} <span className="opacity-60">{n(count)}</span>
    </button>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="الأكواد والأدوات" description="قطع الكود اللي ترجع لها، والأدوات اللي تستخدمها دايمًا.">
        {tab === "snippets"
          ? <Button onClick={() => setSnippetForm({ open: true, item: null })}><PlusCircle className="me-2 h-4 w-4" /> كود جديد</Button>
          : <Button onClick={() => setToolForm({ open: true, item: null })}><PlusCircle className="me-2 h-4 w-4" /> أداة جديدة</Button>}
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex self-start rounded-xl bg-muted p-1">
          {([["snippets", "الأكواد", Code2, snippets.length], ["tools", "الأدوات", Wrench, tools.length]] as const).map(([key, label, Icon, count]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={cn("flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors", tab === key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="h-4 w-4" /> {label} <span className="text-xs text-muted-foreground">({n(count)})</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === "snippets" ? "ابحث في العناوين والكود والوسوم" : "ابحث في الأدوات"} className="ps-9" />
        </div>
      </div>

      {tab === "snippets" && usedLangs.length > 1 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {chip("الكل", lang, setLang, snippets.length)}
          {usedLangs.map((l) => chip(l, lang, setLang, snippets.filter((s) => langOf(s) === l).length))}
        </div>
      )}
      {tab === "tools" && usedCats.length > 1 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {chip("الكل", toolCat, setToolCat, tools.length)}
          {usedCats.map((c) => chip(c, toolCat, setToolCat, tools.filter((t) => (t.category || "أخرى") === c).length))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : tab === "snippets" ? (
        shownSnippets.length ? (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {shownSnippets.map((s) => (
              <SnippetCard key={s.id} s={s} onEdit={() => setSnippetForm({ open: true, item: s })} onPin={() => togglePin(s)} onDelete={() => remove("snippets", s.id, s.title)} />
            ))}
          </div>
        ) : (
          <Empty icon={Code2} title={snippets.length ? "ما فيه كود يطابق البحث" : "ما فيه أكواد محفوظة للحين"} action={!snippets.length ? <Button onClick={() => setSnippetForm({ open: true, item: null })}><PlusCircle className="me-2 h-4 w-4" /> أول كود</Button> : null} />
        )
      ) : shownTools.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shownTools.map((t) => (
            <ToolCard key={t.id} t={t} onEdit={() => setToolForm({ open: true, item: t })} onDelete={() => remove("tools", t.id, t.name)} />
          ))}
        </div>
      ) : (
        <Empty icon={Link2} title={tools.length ? "ما فيه أداة تطابق البحث" : "ما فيه أدوات محفوظة للحين"} action={!tools.length ? <Button onClick={() => setToolForm({ open: true, item: null })}><PlusCircle className="me-2 h-4 w-4" /> أول أداة</Button> : null} />
      )}

      <Dialog open={snippetForm.open} onOpenChange={(o) => setSnippetForm((f) => ({ ...f, open: o }))}>
        {snippetForm.open && <SnippetForm key={snippetForm.item?.id ?? "new"} snippet={snippetForm.item} onSaved={() => { setSnippetForm({ open: false, item: null }); load(); }} onClose={() => setSnippetForm({ open: false, item: null })} />}
      </Dialog>
      <Dialog open={toolForm.open} onOpenChange={(o) => setToolForm((f) => ({ ...f, open: o }))}>
        {toolForm.open && <ToolForm key={toolForm.item?.id ?? "new"} tool={toolForm.item} onSaved={() => { setToolForm({ open: false, item: null }); load(); }} onClose={() => setToolForm({ open: false, item: null })} />}
      </Dialog>
    </div>
  );
}
