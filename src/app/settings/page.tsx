"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Field } from "@/components/app/form-bits";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown, CloudUpload, Database, Download, Eye, EyeOff, KeyRound, Loader2, LogOut, Moon, Palette, RefreshCcw, ShieldCheck, Smartphone, Sun, Upload, Wrench,
} from "lucide-react";
import { exportData, importData } from "./data-actions";
import { updatePassword } from "./actions";
import { migrateFirebaseFiles } from "./migrate-files-action";
import { auth, getAccessToken, signOut } from "@/lib/auth";

const Section = ({ icon: Icon, title, text, children, className }: { icon: React.ElementType; title: string; text: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-2xl border bg-card p-5", className)}>
    <div className="mb-4 flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted"><Icon className="h-5 w-5" /></span>
      <div><h3 className="font-bold">{title}</h3><p className="text-sm text-muted-foreground">{text}</p></div>
    </div>
    {children}
  </section>
);

/** Rough strength: length plus variety. */
const strength = (p: string) => {
  if (!p) return null;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s <= 1 ? { label: "ضعيفة", w: 25, tone: "bg-destructive" } : s <= 3 ? { label: "متوسطة", w: 60, tone: "bg-amber-500" } : { label: "قوية", w: 100, tone: "bg-emerald-500" };
};

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dark, setDark] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateStatus, setMigrateStatus] = useState("");
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setLastSignIn(data.user?.last_sign_in_at ?? null);
    }).catch(() => {});
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const setTheme = (d: boolean) => {
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    try { localStorage.setItem("theme", d ? "dark" : "light"); } catch {}
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("authenticatedUser");
      router.push("/admin");
    } catch (e) { console.error(e); toast({ variant: "destructive", title: "ما قدرنا نسجّل خروجك" }); }
  };

  const changePassword = async () => {
    if (newPw.length < 8) return toast({ variant: "destructive", title: "كلمة المرور الجديدة لازم ٨ أحرف على الأقل" });
    setSavingPw(true);
    try {
      const r = await updatePassword(currentPw, newPw);
      if (!r.success) throw new Error(r.message);
      toast({ title: r.message });
      setCurrentPw(""); setNewPw("");
    } catch (e) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "ما قدرنا نحدّث كلمة المرور" });
    } finally {
      setSavingPw(false);
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const data = await exportData();
      const count = Object.values(data).reduce((s, l) => s + l.length, 0);
      if (!count) throw new Error("ما لقينا بيانات");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      Object.assign(document.createElement("a"), { href: url, download: `backup-${new Date().toISOString().slice(0, 10)}.json` }).click();
      URL.revokeObjectURL(url);
      toast({ title: "نزلت النسخة الاحتياطية", description: `${new Intl.NumberFormat("ar-SA").format(count)} سجل من ${new Intl.NumberFormat("ar-SA").format(Object.keys(data).length)} قسم.` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نصدّر البيانات", description: e instanceof Error ? e.message : undefined });
    } finally {
      setExporting(false);
    }
  };

  const doImport = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const r = await importData(await file.text());
      if (!r.success) throw new Error(r.message);
      toast({ title: "انستوردت البيانات", description: "بتنعاد الصفحة الحين." });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      toast({ variant: "destructive", title: "فشل الاستيراد", description: e instanceof Error ? e.message : "تأكد إن الملف صحيح." });
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const clearCache = async () => {
    setClearing(true);
    try {
      if ("serviceWorker" in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      if (window.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
      const theme = localStorage.getItem("theme");
      localStorage.clear(); sessionStorage.clear();
      if (theme) localStorage.setItem("theme", theme);
      toast({ title: "انمسح الكاش", description: "بتنعاد الصفحة الحين." });
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "ما قدرنا نمسح الكاش" });
      setClearing(false);
    }
  };

  const migrateFiles = async () => {
    setMigrating(true);
    const skip: string[] = [];
    let moved = 0;
    try {
      const token = (await getAccessToken()) ?? "";
      for (;;) {
        const r = await migrateFirebaseFiles(token, skip);
        if (!r.ok) throw new Error(r.message);
        moved += r.moved;
        r.failed.forEach((f) => skip.push(f.key));
        setMigrateStatus(`انتقل ${moved} ملف، باقي ${r.remaining}${skip.length ? `، وتعذّر ${skip.length}` : ""}.`);
        if (r.remaining <= 0 || (r.moved === 0 && r.failed.length === 0)) break;
      }
      toast({ title: skip.length ? "انتهى النقل مع بعض الأخطاء" : "انتقلت كل الملفات", variant: skip.length ? "destructive" : undefined });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل نقل الملفات", description: e instanceof Error ? e.message : undefined });
    } finally {
      setMigrating(false);
    }
  };

  const pw = strength(newPw);
  const initial = (email[0] || "أ").toUpperCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="الإعدادات" description="حسابك، شكل لوحة التحكم، ونسخ بياناتك." />

      <div className="mx-auto max-w-4xl space-y-4">
        {/* Account */}
        <section className="flex flex-col gap-4 rounded-2xl border bg-foreground p-5 text-background sm:flex-row sm:items-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-background text-2xl font-bold text-foreground">{initial}</span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">أحمد الحربي</p>
            <p className="truncate text-sm opacity-80" dir="ltr" style={{ textAlign: "right" }}>{email || "…"}</p>
            {lastSignIn && <p className="text-xs opacity-60">آخر دخول: {new Date(lastSignIn).toLocaleString("ar-SA-u-nu-arab-ca-gregory", { dateStyle: "medium", timeStyle: "short" })}</p>}
          </div>
          <Button variant="secondary" onClick={logout}><LogOut className="me-2 h-4 w-4" /> تسجيل الخروج</Button>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Password */}
          <Section icon={KeyRound} title="كلمة المرور" text="غيّرها كل فترة، ٨ أحرف على الأقل." className="md:row-span-2">
            <div className="space-y-4">
              <Field label="كلمة المرور الحالية">
                <Input type={showPw ? "text" : "password"} dir="ltr" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
              </Field>
              <Field label="كلمة المرور الجديدة">
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} dir="ltr" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPw ? "إخفاء" : "إظهار"}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pw && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all", pw.tone)} style={{ width: `${pw.w}%` }} /></div>
                    <span className="text-xs text-muted-foreground">{pw.label}</span>
                  </div>
                )}
              </Field>
              <Button className="w-full" onClick={changePassword} disabled={savingPw || !currentPw || newPw.length < 8}>
                {savingPw ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="me-2 h-4 w-4" />} تحديث كلمة المرور
              </Button>
            </div>
          </Section>

          {/* Appearance */}
          <Section icon={Palette} title="المظهر" text="يتطبق على هالجهاز.">
            <div className="grid grid-cols-2 gap-2">
              {([[false, Sun, "فاتح"], [true, Moon, "داكن"]] as const).map(([d, Icon, label]) => (
                <button key={label} type="button" onClick={() => setTheme(d)}
                  className={cn("flex flex-col items-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-colors", dark === d ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/40")}>
                  <span className={cn("grid h-14 w-full place-items-center rounded-lg border", d ? "bg-neutral-900 text-white" : "bg-white text-neutral-900")}><Icon className="h-5 w-5" /></span>
                  {label}
                </button>
              ))}
            </div>
          </Section>

          {/* Session */}
          <Section icon={Smartphone} title="الجلسة" text={installed ? "أنت فاتح لوحة التحكم كتطبيق." : "أنت فاتح لوحة التحكم من المتصفح."}>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <span>خروج تلقائي إذا ما استخدمتها</span>
                <b>{installed ? "متوقف في التطبيق" : "بعد ساعة"}</b>
              </li>
              {!installed && <li className="px-1 text-xs text-muted-foreground">ثبّتها على جوالك من «إضافة للشاشة الرئيسية» وتفتح كتطبيق بدون خروج تلقائي.</li>}
            </ul>
          </Section>
        </div>

        {/* Data */}
        <Section icon={Database} title="بياناتك" text="خذ نسخة احتياطية من كل شي: المشاريع والعملاء والمالية والمهام وغيرها.">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={doExport} disabled={exporting}
              className="flex items-center gap-3 rounded-xl border p-4 text-start transition-colors hover:border-foreground/40 disabled:opacity-60">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">{exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}</span>
              <span><b className="block">تصدير نسخة احتياطية</b><span className="text-xs text-muted-foreground">ملف JSON ينزل على جهازك</span></span>
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" disabled={importing} className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-start transition-colors hover:border-destructive/60 disabled:opacity-60">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">{importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}</span>
                  <span><b className="block">استعادة من نسخة</b><span className="text-xs text-muted-foreground">يستبدل البيانات الحالية</span></span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>متأكد؟</AlertDialogTitle>
                  <AlertDialogDescription>الاستعادة <b className="text-destructive">تحذف كل البيانات الحالية</b> وتحط بدالها اللي في الملف، وما تقدر ترجع. خذ نسخة احتياطية قبل.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={() => importRef.current?.click()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">اختر الملف</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={(e) => doImport(e.target.files?.[0])} />
          </div>
        </Section>

        {/* Advanced */}
        <section className="rounded-2xl border bg-card">
          <button type="button" onClick={() => setAdvanced((a) => !a)} className="flex w-full items-center gap-3 p-5 text-start">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted"><Wrench className="h-5 w-5" /></span>
            <span className="flex-1"><b className="block">أدوات الصيانة</b><span className="text-sm text-muted-foreground">لو شي علّق أو تبي تنقل ملفات قديمة.</span></span>
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", advanced && "rotate-180")} />
          </button>
          {advanced && (
            <div className="grid gap-3 border-t p-5 sm:grid-cols-2">
              <div className="space-y-3 rounded-xl border p-4">
                <p className="flex items-center gap-2 font-bold"><RefreshCcw className="h-4 w-4" /> مسح الكاش</p>
                <p className="text-xs text-muted-foreground">يمسح الملفات المؤقتة ويعيد تحميل اللوحة. ممكن يطلب منك تسجّل دخول من جديد.</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="outline" className="w-full" disabled={clearing}>{clearing && <Loader2 className="me-2 h-4 w-4 animate-spin" />} امسح الكاش</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>مسح الكاش؟</AlertDialogTitle><AlertDialogDescription>بتنعاد اللوحة، وممكن تحتاج تسجّل دخول مرة ثانية.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={clearCache}>امسح</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="space-y-3 rounded-xl border p-4">
                <p className="flex items-center gap-2 font-bold"><CloudUpload className="h-4 w-4" /> نقل الملفات من Firebase</p>
                <p className="text-xs text-muted-foreground">ينقل أي ملف باقي على Firebase إلى Supabase ويحدّث روابطه. آمن لو عدته.</p>
                {migrateStatus && <p className="text-xs font-semibold">{migrateStatus}</p>}
                <Button variant="outline" className="w-full" onClick={migrateFiles} disabled={migrating}>{migrating && <Loader2 className="me-2 h-4 w-4 animate-spin" />} انقل الملفات</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
