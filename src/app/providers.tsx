"use client";

import React from "react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Toaster } from "@/components/ui/toaster";
import { RegisterServiceWorker } from "@/components/app/register-sw";
import useClient from "@/hooks/use-client";
import Body from "./body";

/** Client-side wrapper for every page: RTL for Radix, auth guard, toasts, service worker. */
export function Providers({ children }: { children: React.ReactNode }) {
  const isClient = useClient();

  // On phones the on-screen keyboard covers the bottom of the page without resizing
  // it. Expose its height as --kb so bottom sheets (dialogs) can sit above it.
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb", `${Math.round(kb)}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);
  return (
    // الموقع عربي: كل مكونات Radix (القوائم، الاختيارات، التمرير...) تشتغل من اليمين لليسار
    <DirectionProvider dir="rtl">
      <Body>{children}</Body>
      <RegisterServiceWorker />
      {isClient && <Toaster />}
    </DirectionProvider>
  );
}
