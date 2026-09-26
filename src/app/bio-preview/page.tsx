"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, Copy, Share2, RotateCw, Hash, Check } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BIO_PATH = "/bio";

/**
 * The public links page shown inside the dashboard: a live phone-sized preview
 * plus share/copy actions, so managing it doesn't leave the app.
 */
export default function BioPreviewPage() {
  const { toast } = useToast();
  const [reloadKey, setReloadKey] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [url, setUrl] = React.useState(BIO_PATH);

  React.useEffect(() => setUrl(window.location.origin + BIO_PATH), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ variant: "destructive", title: "ما قدرت أنسخ الرابط" });
    }
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "أحمد الحربي | روابطي", url }); } catch { /* cancelled */ }
    } else {
      copy();
    }
  };

  const reload = () => { setLoaded(false); setReloadKey((k) => k + 1); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="صفحة الروابط" description="معاينة مباشرة لصفحتك العامة كما يشوفها الزوار." />

      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
        {/* Actions */}
        <div className="space-y-6 lg:order-2 lg:w-80">
          <div className="rounded-lg border p-4">
            <p className="mb-1 text-xs font-bold text-muted-foreground">رابط الصفحة</p>
            <p className="truncate font-medium" dir="ltr" style={{ textAlign: "right" }}>{url.replace(/^https?:\/\//, "")}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={copy} className="flex-col h-auto py-3 gap-1.5">
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                <span className="text-xs">{copied ? "تم النسخ" : "نسخ"}</span>
              </Button>
              <Button variant="outline" onClick={share} className="flex-col h-auto py-3 gap-1.5">
                <Share2 className="h-5 w-5" />
                <span className="text-xs">مشاركة</span>
              </Button>
              <Button variant="outline" asChild className="flex-col h-auto py-3 gap-1.5">
                <a href={BIO_PATH} target="_blank" rel="noopener">
                  <ExternalLink className="h-5 w-5" />
                  <span className="text-xs">فتح</span>
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-3 text-xs font-bold text-muted-foreground">محتوى الصفحة</p>
            <Link href="/numbered-links" className="flex items-center justify-between gap-3 rounded-md p-2 -m-2 hover:bg-muted active:bg-muted">
              <span className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <span>
                  <b className="block text-sm">إدارة الوصول بالرقم</b>
                  <small className="text-muted-foreground">الأرقام اللي يبحث عنها الزوار في الصفحة</small>
                </span>
              </span>
              <span aria-hidden="true" className="text-muted-foreground">←</span>
            </Link>
          </div>
        </div>

        {/* Live preview in a phone frame */}
        <div className="lg:order-1 flex flex-col items-center gap-3">
          <div className="relative w-full max-w-[380px] rounded-[2.2rem] border-[10px] border-foreground bg-foreground shadow-xl">
            <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-foreground" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[1.6rem] bg-background" style={{ height: "min(70dvh, 720px)" }}>
              {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />}
              <iframe
                key={reloadKey}
                src={BIO_PATH}
                title="معاينة صفحة الروابط"
                className="h-full w-full border-0"
                onLoad={() => setLoaded(true)}
              />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reload}>
            <RotateCw className="me-2 h-4 w-4" /> تحديث المعاينة
          </Button>
        </div>
      </div>
    </div>
  );
}
