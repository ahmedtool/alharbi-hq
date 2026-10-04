"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Big "what kind is it?" cards that start a create dialog. */
export function KindPicker<K extends string>({ options, onPick }: {
  options: { kind: K; icon: React.ElementType; title: string; text: string; points: string[] }[];
  onPick: (k: K) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map(({ kind, icon: Icon, title, text, points }) => (
        <button
          key={kind}
          type="button"
          onClick={() => onPick(kind)}
          className="group text-start rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:border-foreground hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-muted transition-colors group-hover:bg-foreground group-hover:text-background">
            <Icon className="h-6 w-6" />
          </span>
          <b className="block text-lg">{title}</b>
          <span className="block text-sm text-muted-foreground">{text}</span>
          <ul className="mt-3 space-y-1 text-sm">
            {points.map((p) => <li key={p} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-foreground/50" />{p}</li>)}
          </ul>
        </button>
      ))}
    </div>
  );
}

/** Pill choices (single select). */
export function Choices({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors", value === o ? "border-foreground bg-foreground text-background" : "hover:border-foreground")}>
          {o}
        </button>
      ))}
    </div>
  );
}

export const Field = ({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("space-y-1.5", className)}>
    <Label className="font-semibold">{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

/** Input with a leading icon (on the right in RTL). */
export const IconInput = ({ icon: Icon, className, ...props }: React.ComponentProps<typeof Input> & { icon: React.ElementType }) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input className={cn("pr-10", className)} {...props} />
  </div>
);
