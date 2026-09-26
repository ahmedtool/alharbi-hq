
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, ArrowRight } from "lucide-react";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logoAt } from "@/lib/brand";


type PageHeaderProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
    const router = useRouter();

  return (
    <>
    <div className={cn("rule-draw flex flex-col md:flex-row items-start md:items-end justify-between gap-3 md:gap-4 mb-6 md:mb-10 pb-4 md:pb-5", className)}>
      <div className="grid gap-1 flex-1">
        <div className="flex items-center gap-3">
            <Link href="/dashboard" title="لوحة التحكم" className="shrink-0">
                <img src={logoAt(96)} alt="" width={40} height={40} className="h-9 w-9 md:h-10 md:w-10 rounded-full object-cover bg-muted" />
            </Link>
            <h1 className="text-2xl font-bold md:text-4xl font-headline tracking-tight">{title}</h1>
        </div>
        {description && <p className="text-sm md:text-base text-muted-foreground">{description}</p>}
      </div>
      <div className="w-full md:w-auto flex-shrink-0">
        <div className="flex flex-wrap justify-end items-center gap-2">
           {children}
            <Button variant="outline" size="icon" onClick={() => router.back()} title="العودة للخلف">
                <ArrowRight />
            </Button>
             <Button variant="outline" size="icon" className="hidden md:inline-flex" onClick={() => router.push('/dashboard')} title="العودة للوحة التحكم">
                <Home />
            </Button>
        </div>
      </div>
    </div>
    </>
  );
}
