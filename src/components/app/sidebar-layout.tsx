
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { AppSidebar } from "@/components/app/app-sidebar"
import { Sidebar } from "@/components/ui/sidebar"

// Sidebar Layout
// -----------------------------------------------------------------------------

type SidebarLayoutProps = {
  defaultCollapsed?: boolean
  children: React.ReactNode
}

export function SidebarLayout({
  defaultCollapsed = false,
  children,
}: SidebarLayoutProps) {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = React.useState(
    isMobile ? true : defaultCollapsed
  )

  React.useEffect(() => {
    if (isMobile) {
      setCollapsed(true)
    }
  }, [isMobile])

  return (
    <div className={cn("flex h-screen w-full")}>
      <Sidebar
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className={cn(isMobile && "absolute z-50")}
      >
        <AppSidebar />
      </Sidebar>
      <main
        className={cn(
          "flex-1 overflow-y-auto bg-background transition-[margin-right] duration-200 ease-in-out",
          !isMobile
            ? collapsed
              ? "mr-14"
              : "mr-60"
            : "mr-14"
        )}
      >
        {children}
      </main>
    </div>
  )
}
