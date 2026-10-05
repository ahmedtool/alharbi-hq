"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "@/lib/db";
import { storage, ref, uploadBytes, getDownloadURL, deleteObject } from "@/lib/storage";
import {
  Banknote, Check, ChevronLeft, Copy, Download, ExternalLink, Eye, FileArchive, FileImage, FileText, FileType, Folder, FolderPlus,
  Home, LayoutGrid, List, Loader2, MoreHorizontal, Move, Pencil, Search, ShieldCheck, Trash2, Upload, X,
} from "lucide-react";

/* Model --------------------------------------------------------------------- */
interface FileData { id: string; name: string; url: string; path: string; size: number; parentId: string; createdAt: unknown; type: "file" }
interface FolderData { id: string; name: string; parentId: string; createdAt: unknown; type: "folder" }
type LegalDoc = { id: string; name: string; url: string; path: string };
type PathSegment = { id: string; name: string };
type Item = FileData | FolderData;
const ROOT = "root";

type Kind = "image" | "pdf" | "doc" | "other";
const KINDS: { key: "all" | Kind; label: string }[] = [
  { key: "all", label: "الكل" }, { key: "image", label: "صور" }, { key: "pdf", label: "PDF" }, { key: "doc", label: "مستندات" }, { key: "other", label: "أخرى" },
];
const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");
const kindOf = (name: string): Kind => {
  const e = extOf(name);
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "heic", "avif"].includes(e)) return "image";
  if (e === "pdf") return "pdf";
  if (["doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt", "md", "pages", "numbers", "key"].includes(e)) return "doc";
  return "other";
};
const KindIcon = ({ name, className }: { name: string; className?: string }) => {
  const k = kindOf(name);
  const Icon = k === "image" ? FileImage : k === "pdf" ? FileType : k === "doc" ? FileText : FileArchive;
  return <Icon className={className} />;
};
const size = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
/** createdAt can be an ISO string, a Firestore-like timestamp, or missing. */
const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (typeof v === "string" || typeof v === "number") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  const o = v as { toDate?: () => Date; seconds?: number };
  if (typeof o.toDate === "function") return o.toDate();
  if (typeof o.seconds === "number") return new Date(o.seconds * 1000);
  return null;
};
const fmtDate = (v: unknown) => toDate(v)?.toLocaleDateString("ar-SA-u-nu-arab-ca-gregory", { day: "numeric", month: "short", year: "numeric" }) ?? "";
const n = (x: number) => new Intl.NumberFormat("ar-SA").format(x);

/* Small pieces -------------------------------------------------------------- */
function Thumb({ file, big }: { file: FileData; big?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (kindOf(file.name) === "image" && !broken) {
    return <img src={file.url} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />;
  }
  return (
    <div className="grid h-full w-full place-items-center bg-muted">
      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <KindIcon name={file.name} className={big ? "h-10 w-10" : "h-5 w-5"} />
        {big && <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-bold uppercase" dir="ltr">{extOf(file.name) || "file"}</span>}
      </div>
    </div>
  );
}

/* Page ---------------------------------------------------------------------- */
export default function FilesPage() {
  const { toast } = useToast();
  const uploadInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState<PathSegment[]>([]);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  const [folderDialog, setFolderDialog] = useState<{ open: boolean; folder: FolderData | null; name: string }>({ open: false, folder: null, name: "" });
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; file: FileData | null; name: string }>({ open: false, file: null, name: "" });
  const [preview, setPreview] = useState<FileData | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveIds, setMoveIds] = useState<string[]>([]);
  const [allFolders, setAllFolders] = useState<FolderData[]>([]);
  const [moveTarget, setMoveTarget] = useState(ROOT);
  const [moving, setMoving] = useState(false);

  // Official papers (root only)
  const [iban, setIban] = useState("");
  const [ibanSaved, setIbanSaved] = useState("");
  const [freelanceDoc, setFreelanceDoc] = useState<LegalDoc | null>(null);
  const [ibanFiles, setIbanFiles] = useState<LegalDoc[]>([]);

  const folderId = path.length ? path[path.length - 1].id : ROOT;

  useEffect(() => { try { const v = localStorage.getItem("files-view"); if (v === "list" || v === "grid") setView(v); } catch {} }, []);
  const changeView = (v: "grid" | "list") => { setView(v); try { localStorage.setItem("files-view", v); } catch {} };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fs, ds] = await Promise.all([
        getDocs(query(collection(db, "files"), where("parentId", "==", folderId), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "folders"), where("parentId", "==", folderId), orderBy("name", "asc"))),
      ]);
      setFiles(fs.docs.map((d) => ({ ...(d.data() as Omit<FileData, "id" | "type">), id: d.id, type: "file" })));
      setFolders(ds.docs.map((d) => ({ ...(d.data() as Omit<FolderData, "id" | "type">), id: d.id, type: "folder" })));
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نجيب الملفات" });
    } finally {
      setLoading(false);
    }
  }, [folderId, toast]);

  const loadLegal = useCallback(async () => {
    try {
      const cfg = await getDoc(doc(db, "legal_info", "config"));
      const v = cfg.exists() ? (cfg.data().iban as string) || "" : "";
      setIban(v); setIbanSaved(v);
      const lf = (await getDocs(collection(db, "legal_files"))).docs.map((d) => ({ ...(d.data() as Omit<LegalDoc, "id">), id: d.id }));
      setFreelanceDoc(lf.find((f) => f.id === "freelance_document") || null);
      setIbanFiles(lf.filter((f) => f.id.startsWith("iban_file_")));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (folderId === ROOT) loadLegal(); }, [folderId, loadLegal]);

  /* Upload ------------------------------------------------------------------ */
  const upload = async (list: File[]) => {
    if (!list.length) return;
    setUploading(list.map((f) => f.name));
    let ok = 0;
    for (const file of list) {
      try {
        const p = `files/${folderId}/${Date.now()}_${file.name}`;
        const r = ref(storage, p);
        await uploadBytes(r, file);
        await addDoc(collection(db, "files"), { name: file.name, url: await getDownloadURL(r), path: p, size: file.size, parentId: folderId, createdAt: serverTimestamp() });
        ok++;
      } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: `ما انرفع ${file.name}` });
      } finally {
        setUploading((u) => u.filter((x) => x !== file.name));
      }
    }
    if (ok) toast({ title: ok === 1 ? "انرفع الملف" : `انرفع ${n(ok)} ملفات` });
    load();
  };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); upload(Array.from(e.dataTransfer.files)); };

  /* Folders ----------------------------------------------------------------- */
  const saveFolder = async () => {
    const name = folderDialog.name.trim();
    if (!name) return;
    try {
      if (folderDialog.folder) await updateDoc(doc(db, "folders", folderDialog.folder.id), { name });
      else await addDoc(collection(db, "folders"), { name, parentId: folderId, createdAt: serverTimestamp() });
      setFolderDialog({ open: false, folder: null, name: "" });
      load();
    } catch (e) { console.error(e); toast({ variant: "destructive", title: "ما قدرنا نحفظ المجلد" }); }
  };

  const deleteFolderDeep = async (id: string) => {
    const batch = writeBatch(db);
    const walk = async (cur: string) => {
      for (const f of (await getDocs(query(collection(db, "files"), where("parentId", "==", cur)))).docs) {
        try { await deleteObject(ref(storage, (f.data() as FileData).path)); } catch {}
        batch.delete(doc(db, "files", f.id));
      }
      for (const sub of (await getDocs(query(collection(db, "folders"), where("parentId", "==", cur)))).docs) await walk(sub.id);
      batch.delete(doc(db, "folders", cur));
    };
    await walk(id);
    await batch.commit();
  };

  /* Files ------------------------------------------------------------------- */
  const saveRename = async () => {
    const name = renameDialog.name.trim();
    if (!renameDialog.file || !name) return;
    try { await updateDoc(doc(db, "files", renameDialog.file.id), { name }); setRenameDialog({ open: false, file: null, name: "" }); load(); }
    catch (e) { console.error(e); toast({ variant: "destructive", title: "ما قدرنا نغيّر الاسم" }); }
  };

  const removeItems = async (items: Item[]) => {
    if (!items.length) return;
    const label = items.length === 1 ? `«${items[0].name}»${items[0].type === "folder" ? " ومحتوياته" : ""}` : `${n(items.length)} عناصر`;
    if (!window.confirm(`حذف ${label}؟ ما تقدر ترجعه.`)) return;
    try {
      for (const it of items) {
        if (it.type === "folder") await deleteFolderDeep(it.id);
        else { try { await deleteObject(ref(storage, it.path)); } catch {} await deleteDoc(doc(db, "files", it.id)); }
      }
      toast({ title: "انحذف" });
      load();
    } catch (e) { console.error(e); toast({ variant: "destructive", title: "ما قدرنا نحذف" }); }
  };

  const openMove = async (ids: string[]) => {
    setMoveIds(ids); setMoveTarget(ROOT); setMoveOpen(true);
    try { setAllFolders((await getDocs(query(collection(db, "folders"), orderBy("name", "asc")))).docs.map((d) => ({ ...(d.data() as Omit<FolderData, "id" | "type">), id: d.id, type: "folder" }))); }
    catch (e) { console.error(e); }
  };
  const doMove = async () => {
    if (moveTarget === folderId) return toast({ variant: "destructive", title: "هذا هو المجلد الحالي" });
    setMoving(true);
    try {
      const batch = writeBatch(db);
      moveIds.forEach((id) => batch.update(doc(db, folders.some((f) => f.id === id) ? "folders" : "files", id), { parentId: moveTarget }));
      await batch.commit();
      toast({ title: "انتقل" });
      setMoveOpen(false);
      load();
    } catch (e) { console.error(e); toast({ variant: "destructive", title: "ما قدرنا ننقل" }); }
    finally { setMoving(false); }
  };

  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast({ title: `انسخ ${label}` }); };

  /* Official papers ---------------------------------------------------------- */
  const saveIban = async () => {
    try { await setDoc(doc(db, "legal_info", "config"), { iban: iban.trim() }, { merge: true }); setIbanSaved(iban.trim()); toast({ title: "انحفظ الآيبان" }); }
    catch (e) { console.error(e); toast({ variant: "destructive", title: "ما قدرنا نحفظ" }); }
  };
  const uploadLegal = async (file: File | undefined, type: "freelance" | "iban") => {
    if (!file) return;
    try {
      const id = type === "freelance" ? "freelance_document" : `iban_file_${Date.now()}`;
      const p = `legal/${id}_${file.name}`;
      const r = ref(storage, p);
      await uploadBytes(r, file);
      await setDoc(doc(db, "legal_files", id), { name: file.name, url: await getDownloadURL(r), path: p });
      toast({ title: "انرفع" });
      loadLegal();
    } catch (e) { console.error(e); toast({ variant: "destructive", title: "ما انرفع الملف" }); }
  };
  const removeLegal = async (d: LegalDoc) => {
    if (!window.confirm(`حذف «${d.name}»؟`)) return;
    try { try { await deleteObject(ref(storage, d.path)); } catch {} await deleteDoc(doc(db, "legal_files", d.id)); loadLegal(); }
    catch (e) { console.error(e); toast({ variant: "destructive", title: "ما قدرنا نحذف" }); }
  };

  /* Derived ----------------------------------------------------------------- */
  const q = search.trim().toLowerCase();
  const shownFolders = kind === "all" ? folders.filter((f) => !q || f.name.toLowerCase().includes(q)) : [];
  const shownFiles = files.filter((f) => (kind === "all" || kindOf(f.name) === kind) && (!q || f.name.toLowerCase().includes(q)));
  const shownItems: Item[] = [...shownFolders, ...shownFiles];
  const totalSize = files.reduce((s, f) => s + (Number(f.size) || 0), 0);
  const selecting = selected.size > 0;
  const toggle = (id: string) => setSelected((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });
  const selectedItems = shownItems.filter((i) => selected.has(i.id));

  const fileMenu = (f: FileData) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" className="h-8 w-8 shrink-0 p-0"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => setPreview(f)}><Eye className="me-2 h-4 w-4" /> معاينة</DropdownMenuItem>
        <DropdownMenuItem asChild><a href={f.url} target="_blank" rel="noopener" download={f.name}><Download className="me-2 h-4 w-4" /> تحميل</a></DropdownMenuItem>
        <DropdownMenuItem onClick={() => copy(f.url, "الرابط")}><Copy className="me-2 h-4 w-4" /> نسخ الرابط</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setRenameDialog({ open: true, file: f, name: f.name })}><Pencil className="me-2 h-4 w-4" /> إعادة تسمية</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openMove([f.id])}><Move className="me-2 h-4 w-4" /> نقل</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => removeItems([f])} className="text-destructive"><Trash2 className="me-2 h-4 w-4" /> حذف</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const folderMenu = (f: FolderData) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" className="h-8 w-8 shrink-0 p-0"><span className="sr-only">خيارات</span><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => setFolderDialog({ open: true, folder: f, name: f.name })}><Pencil className="me-2 h-4 w-4" /> إعادة تسمية</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openMove([f.id])}><Move className="me-2 h-4 w-4" /> نقل</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => removeItems([f])} className="text-destructive"><Trash2 className="me-2 h-4 w-4" /> حذف</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const check = (id: string) => (
    <span onClick={(e) => e.stopPropagation()} className={cn("transition-opacity", !selecting && !selected.has(id) && "opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-sm:hidden")}>
      <Checkbox checked={selected.has(id)} onCheckedChange={() => toggle(id)} aria-label="تحديد" className="h-5 w-5 bg-background" />
    </span>
  );
  const openItem = (it: Item) => (selecting ? toggle(it.id) : it.type === "folder" ? setPath((p) => [...p, { id: it.id, name: it.name }]) : setPreview(it));

  return (
    <div className="p-4 pb-28 sm:p-6 lg:p-8 text-right"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={onDrop}>
      <PageHeader title="ملفاتي" description="ملفاتك ومجلداتك وأوراقك الرسمية في مكان واحد. اسحب أي ملف وأفلته هنا يرتفع.">
        <Button variant="outline" onClick={() => setFolderDialog({ open: true, folder: null, name: "" })}><FolderPlus className="me-2 h-4 w-4" /> مجلد جديد</Button>
        <Button onClick={() => uploadInput.current?.click()}><Upload className="me-2 h-4 w-4" /> رفع ملفات</Button>
        <input ref={uploadInput} type="file" multiple className="hidden" onChange={(e) => { upload(Array.from(e.target.files || [])); e.target.value = ""; }} />
      </PageHeader>

      {/* Official papers */}
      {folderId === ROOT && (
        <section className="mb-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-muted"><Banknote className="h-4 w-4" /></span><div><p className="font-bold">الآيبان البنكي</p><p className="text-xs text-muted-foreground">انسخه بضغطة وقت ما تحتاجه</p></div></div>
            <div className="flex items-center gap-2">
              <Input value={iban} onChange={(e) => setIban(e.target.value)} dir="ltr" className="font-mono tracking-wide" placeholder="SA00 0000 0000 0000 0000 0000" />
              <Button variant="outline" size="icon" onClick={() => copy(iban, "الآيبان")} disabled={!iban} title="نسخ"><Copy className="h-4 w-4" /></Button>
              {iban !== ibanSaved && <Button size="icon" onClick={saveIban} title="حفظ"><Check className="h-4 w-4" /></Button>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ibanFiles.map((f) => (
                <span key={f.id} className="flex max-w-full items-center gap-1 rounded-full border py-1 pe-1 ps-3 text-xs">
                  <a href={f.url} target="_blank" rel="noopener" className="truncate hover:underline">{f.name}</a>
                  <button type="button" onClick={() => removeLegal(f)} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label="حذف"><X className="h-3 w-3" /></button>
                </span>
              ))}
              <label className="flex cursor-pointer items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground">
                <Upload className="h-3 w-3" /> شهادة الآيبان
                <input type="file" className="hidden" onChange={(e) => { uploadLegal(e.target.files?.[0], "iban"); e.target.value = ""; }} />
              </label>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-muted"><ShieldCheck className="h-4 w-4" /></span><div><p className="font-bold">وثيقة العمل الحر</p><p className="text-xs text-muted-foreground">جاهزة ترسلها لأي عميل يطلبها</p></div></div>
            {freelanceDoc ? (
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2.5">
                <KindIcon name={freelanceDoc.name} className="h-5 w-5 shrink-0 text-muted-foreground" />
                <a href={freelanceDoc.url} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">{freelanceDoc.name}</a>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copy(freelanceDoc.url, "رابط الوثيقة")} title="نسخ الرابط"><Copy className="h-4 w-4" /></Button>
                <label className="grid h-8 w-8 cursor-pointer place-items-center rounded-md hover:bg-background" title="استبدال"><Upload className="h-4 w-4" /><input type="file" className="hidden" onChange={(e) => { uploadLegal(e.target.files?.[0], "freelance"); e.target.value = ""; }} /></label>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => removeLegal(freelanceDoc)} title="حذف"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground hover:border-foreground hover:text-foreground">
                <Upload className="h-4 w-4" /> ارفع الوثيقة
                <input type="file" className="hidden" onChange={(e) => { uploadLegal(e.target.files?.[0], "freelance"); e.target.value = ""; }} />
              </label>
            )}
          </div>
        </section>
      )}

      {/* Breadcrumb + tools */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          <button type="button" onClick={() => setPath([])} className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold hover:bg-muted", !path.length && "bg-muted")}><Home className="h-4 w-4" /> ملفاتي</button>
          {path.map((s, i) => (
            <React.Fragment key={s.id}>
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              <button type="button" onClick={() => setPath((p) => p.slice(0, i + 1))} className={cn("rounded-lg px-2 py-1 font-semibold hover:bg-muted", i === path.length - 1 && "bg-muted")}>{s.name}</button>
            </React.Fragment>
          ))}
          {!loading && <span className="ms-2 text-xs text-muted-foreground">{n(folders.length)} مجلد · {n(files.length)} ملف{totalSize ? ` · ${size(totalSize)}` : ""}</span>}
        </nav>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في هالمجلد" className="ps-9" />
          </div>
          <div className="inline-flex rounded-xl bg-muted p-1">
            {([["grid", LayoutGrid, "شبكة"], ["list", List, "قائمة"]] as const).map(([v, Icon, label]) => (
              <button key={v} type="button" onClick={() => changeView(v)} title={label} className={cn("rounded-lg p-1.5", view === v ? "bg-background shadow-sm" : "text-muted-foreground")}><Icon className="h-4 w-4" /></button>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {KINDS.map((k) => (
          <button key={k.key} type="button" onClick={() => setKind(k.key)}
            className={cn("whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors", kind === k.key ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:border-foreground hover:text-foreground")}>
            {k.label}
          </button>
        ))}
      </div>

      {/* Uploading */}
      {uploading.length > 0 && (
        <div className="mb-4 space-y-1 rounded-2xl border bg-card p-3">
          {uploading.map((name) => <p key={name} className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /><span className="truncate">{name}</span></p>)}
        </div>
      )}

      {/* Content */}
      <div className={cn("relative rounded-2xl transition-colors", dragging && "outline-dashed outline-2 outline-offset-4 outline-foreground/40")}>
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-background/80 backdrop-blur-sm">
            <p className="flex items-center gap-2 text-lg font-bold"><Upload className="h-5 w-5" /> أفلت الملفات هنا</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
        ) : !shownItems.length ? (
          <button type="button" onClick={() => uploadInput.current?.click()} className="flex min-h-[35vh] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center hover:border-foreground/40">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-lg font-bold">{files.length || folders.length ? "ما فيه شي يطابق" : "المجلد فاضي"}</span>
            <span className="text-sm text-muted-foreground">اسحب ملفات وأفلتها هنا، أو اضغط ترفع</span>
          </button>
        ) : view === "grid" ? (
          <div className="space-y-5">
            {shownFolders.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {shownFolders.map((f) => (
                  <div key={f.id} onClick={() => openItem(f)}
                    className={cn("group flex cursor-pointer items-center gap-3 rounded-2xl border bg-card p-3 transition-all hover:border-foreground/40 hover:shadow-md", selected.has(f.id) && "border-foreground ring-1 ring-foreground")}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><Folder className="h-5 w-5 fill-current" /></span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{f.name}</span>
                    {check(f.id)}
                    {folderMenu(f)}
                  </div>
                ))}
              </div>
            )}
            {shownFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {shownFiles.map((f) => (
                  <div key={f.id} onClick={() => openItem(f)}
                    className={cn("group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg", selected.has(f.id) && "border-foreground ring-1 ring-foreground")}>
                    <div className="relative aspect-[4/3] overflow-hidden border-b">
                      <Thumb file={f} big />
                      <div className="absolute start-2 top-2">{check(f.id)}</div>
                    </div>
                    <div className="flex items-start gap-1 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold" title={f.name}>{f.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{size(Number(f.size) || 0)}{fmtDate(f.createdAt) ? ` · ${fmtDate(f.createdAt)}` : ""}</p>
                      </div>
                      {fileMenu(f)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center gap-3 border-b px-4 py-2 text-xs text-muted-foreground">
              <Checkbox checked={selectedItems.length === shownItems.length} onCheckedChange={(c) => setSelected(c ? new Set(shownItems.map((i) => i.id)) : new Set())} aria-label="تحديد الكل" className="h-4 w-4" />
              <span className="flex-1">الاسم</span><span className="hidden w-24 sm:block">الحجم</span><span className="hidden w-28 md:block">التاريخ</span><span className="w-8" />
            </div>
            <ul className="divide-y">
              {shownItems.map((it) => (
                <li key={it.id} onClick={() => openItem(it)} className={cn("group flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-muted/50", selected.has(it.id) && "bg-muted")}>
                  <span onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggle(it.id)} aria-label="تحديد" className="h-4 w-4" /></span>
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                    {it.type === "folder" ? <span className="grid h-full w-full place-items-center bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><Folder className="h-4 w-4 fill-current" /></span> : <Thumb file={it} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{it.name}</span>
                  <span className="hidden w-24 text-xs text-muted-foreground sm:block" dir="ltr" style={{ textAlign: "right" }}>{it.type === "file" ? size(Number(it.size) || 0) : "—"}</span>
                  <span className="hidden w-28 text-xs text-muted-foreground md:block">{fmtDate(it.createdAt)}</span>
                  {it.type === "folder" ? folderMenu(it) : fileMenu(it)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Selection bar */}
      {selecting && (
        <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-[min(560px,calc(100%-2rem))] items-center gap-2 rounded-2xl border bg-foreground p-2 ps-4 text-background shadow-2xl md:bottom-6">
          <span className="flex-1 text-sm font-bold">{n(selected.size)} محدد</span>
          <Button size="sm" variant="secondary" onClick={() => openMove([...selected])}><Move className="me-1.5 h-4 w-4" /> نقل</Button>
          <Button size="sm" variant="destructive" onClick={() => removeItems(selectedItems)}><Trash2 className="me-1.5 h-4 w-4" /> حذف</Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-background hover:bg-background/10 hover:text-background" onClick={() => setSelected(new Set())} aria-label="إلغاء التحديد"><X className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Folder dialog */}
      <Dialog open={folderDialog.open} onOpenChange={(o) => setFolderDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{folderDialog.folder ? "إعادة تسمية المجلد" : "مجلد جديد"}</DialogTitle><DialogDescription>{folderDialog.folder ? "" : `داخل «${path.length ? path[path.length - 1].name : "ملفاتي"}»`}</DialogDescription></DialogHeader>
          <Input value={folderDialog.name} onChange={(e) => setFolderDialog((d) => ({ ...d, name: e.target.value }))} placeholder="اسم المجلد" autoFocus onKeyDown={(e) => e.key === "Enter" && saveFolder()} />
          <DialogFooter><Button variant="ghost" onClick={() => setFolderDialog((d) => ({ ...d, open: false }))}>إلغاء</Button><Button onClick={saveFolder}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(o) => setRenameDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>إعادة تسمية</DialogTitle><DialogDescription>الاسم الجديد يظهر هنا، والملف نفسه ما يتغيّر.</DialogDescription></DialogHeader>
          <Input value={renameDialog.name} onChange={(e) => setRenameDialog((d) => ({ ...d, name: e.target.value }))} autoFocus onKeyDown={(e) => e.key === "Enter" && saveRename()} />
          <DialogFooter><Button variant="ghost" onClick={() => setRenameDialog((d) => ({ ...d, open: false }))}>إلغاء</Button><Button onClick={saveRename}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>نقل {n(moveIds.length)} {moveIds.length === 1 ? "عنصر" : "عناصر"}</DialogTitle><DialogDescription>اختر المجلد اللي تبي تنقلها له.</DialogDescription></DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border p-1.5">
            {[{ id: ROOT, name: "ملفاتي (الرئيسية)" }, ...allFolders.filter((f) => !moveIds.includes(f.id))].map((f) => (
              <button key={f.id} type="button" onClick={() => setMoveTarget(f.id)}
                className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm", moveTarget === f.id ? "bg-foreground text-background" : "hover:bg-muted")}>
                {f.id === ROOT ? <Home className="h-4 w-4" /> : <Folder className="h-4 w-4" />}<span className="flex-1 truncate">{f.name}</span>{moveTarget === f.id && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setMoveOpen(false)}>إلغاء</Button><Button onClick={doMove} disabled={moving}>{moving && <Loader2 className="me-2 h-4 w-4 animate-spin" />} نقل</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="flex h-[88dvh] max-w-5xl flex-col gap-3">
          <DialogHeader>
            <DialogTitle className="truncate pe-8">{preview?.name}</DialogTitle>
            <DialogDescription>{preview ? `${size(Number(preview.size) || 0)}${fmtDate(preview.createdAt) ? ` · ${fmtDate(preview.createdAt)}` : ""}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-muted/40">
            {preview && (kindOf(preview.name) === "image"
              ? <img src={preview.url} alt={preview.name} className="h-full w-full object-contain" />
              : kindOf(preview.name) === "pdf"
                ? <iframe src={preview.url} className="h-full w-full border-0" title={preview.name} />
                : <div className="grid h-full place-items-center text-center"><div className="space-y-2"><KindIcon name={preview.name} className="mx-auto h-12 w-12 text-muted-foreground" /><p className="text-sm text-muted-foreground">ما فيه معاينة لهالنوع، حمّله وافتحه.</p></div></div>)}
          </div>
          {preview && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => copy(preview.url, "الرابط")}><Copy className="me-2 h-4 w-4" /> نسخ الرابط</Button>
              <Button variant="outline" asChild><a href={preview.url} target="_blank" rel="noopener"><ExternalLink className="me-2 h-4 w-4" /> فتح</a></Button>
              <Button asChild><a href={preview.url} download={preview.name} target="_blank" rel="noopener"><Download className="me-2 h-4 w-4" /> تحميل</a></Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
