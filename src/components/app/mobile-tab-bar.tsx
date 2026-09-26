"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { mobileTabs, navLinks } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** A tab is active on its own page and on pages below it (e.g. /finance/invoices under /finance). */
const isActive = (pathname: string, href: string) =>
  pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

/**
 * App-style navigation for the dashboard on phones: a fixed bottom bar with the
 * main sections and a "more" sheet holding every other page. Hidden from md up.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Close the sheet after navigating from it.
  React.useEffect(() => setMoreOpen(false), [pathname]);

  const inTabs = mobileTabs.some((t) => isActive(pathname, t.href));

  return (
    <>
      {/* Keeps page content clear of the fixed bar. */}
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />
      <nav
        className="tab-bar fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="التنقل الرئيسي"
      >
        <ul className="grid h-16 grid-cols-5">
          {mobileTabs.map(({ name, href, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Icon className={cn("h-[22px] w-[22px] transition-transform", active && "scale-110")} strokeWidth={active ? 2.4 : 1.8} />
                  {name}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                !inTabs || moreOpen ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={!inTabs ? 2.4 : 1.8} />
              المزيد
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-4 pt-3"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" aria-hidden="true" />
          <SheetHeader className="text-start">
            <SheetTitle>كل الأقسام</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-6">
            {navLinks.map((section) => (
              <section key={section.category}>
                <h3 className="mb-2 text-xs font-bold text-muted-foreground">{section.category}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {section.links.map(({ name, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium leading-snug active:bg-muted",
                        isActive(pathname, href) && "border-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {name}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
