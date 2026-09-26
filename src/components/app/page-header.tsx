
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import * as React from "react";
import { useRouter } from "next/navigation";


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
    <div className={cn("rule-draw flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-10 pb-5", className)}>
      <div className="grid gap-1 flex-1">
        <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold md:text-4xl font-headline tracking-tight">{title}</h1>
        </div>
        {description && <p className="text-base text-muted-foreground">{description}</p>}
      </div>
      <div className="w-full md:w-auto flex-shrink-0">
        <div className="flex justify-end items-center gap-2">
           {children}
            <Button variant="outline" size="icon" onClick={() => router.back()} title="العودة للخلف">
                <ArrowLeft />
            </Button>
             <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')} title="العودة للوحة التحكم">
                <Home />
            </Button>
        </div>
      </div>
    </div>
    </>
  );
}
