"use client";

import { useEffect } from "react";

/** Registers /sw.js in production so the installed app opens fast and shows an offline page. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("Service worker registration failed", e));
  }, []);
  return null;
}
