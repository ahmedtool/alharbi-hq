"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Fingerprint, Loader2, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoAt } from "@/lib/brand";
import { isInstalledApp } from "@/lib/installed-app";
import { isLockEnabled, unlock } from "@/lib/app-lock";
import { auth, signOut } from "@/lib/auth";

const RELOCK_AFTER_MS = 5 * 60 * 1000;
const PUBLIC = ["/", "/admin", "/cv", "/support/submit"];

/** Covers the installed app until the person unlocks with Windows Hello / Face ID. */
export function AppLock() {
  const pathname = usePathname();
  const router = useRouter();
  const [locked, setLocked] = React.useState(() => isInstalledApp() && isLockEnabled());
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const hiddenAt = React.useRef<number | null>(null);

  const tryUnlock = React.useCallback(async () => {
    setBusy(true); setFailed(false);
    const ok = await unlock();
    setBusy(false);
    if (ok) setLocked(false); else setFailed(true);
  }, []);

  // Lock on open, and again after the app was in the background for a while.
  React.useEffect(() => {
    if (!isInstalledApp()) return;
    const onVis = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER_MS && isLockEnabled()) setLocked(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Ask straight away when the lock appears.
  React.useEffect(() => { if (locked) tryUnlock(); }, [locked, tryUnlock]);

  if (!locked || PUBLIC.includes(pathname)) return null;

  const usePassword = async () => {
    await signOut(auth);
    setLocked(false);
    router.replace("/admin");
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background">
      <div className="w-full max-w-xs space-y-6 p-6 text-center">
        <img src={logoAt(96)} alt="" width={64} height={64} className="mx-auto h-16 w-16 rounded-2xl" />
        <div>
          <p className="text-xl font-bold">لوحة التحكم مقفلة</p>
          <p className="mt-1 text-sm text-muted-foreground">افتحها بوجهك أو بصمتك أو رمز الجهاز.</p>
        </div>
        <Button className="h-12 w-full text-base" onClick={tryUnlock} disabled={busy}>
          {busy ? <Loader2 className="me-2 h-5 w-5 animate-spin" /> : <ScanFace className="me-2 h-5 w-5" />} افتح
        </Button>
        {failed && <p className="text-sm text-destructive">ما تم التحقق. حاول مرة ثانية.</p>}
        <button type="button" onClick={usePassword} className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Fingerprint className="h-3.5 w-3.5" /> الدخول بكلمة المرور بدلًا منها
        </button>
      </div>
    </div>
  );
}
