
"use client"

import * as React from "react"
import { MoreHorizontal, ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

////////////////////////////////////////////////////////////////////////////////

const _SidebarContext = React.createContext<{
  collapsible: boolean
  collapsed: boolean
}>({
  collapsible: false,
  collapsed: false,
})

function useSidebar() {
  return React.useContext(_SidebarContext)
}

////////////////////////////////////////////////////////////////////////////////

const Sidebar = React.forwardRef<
  React.ElementRef<"aside">,
  React.ComponentProps<"aside"> & {
    collapsible?: boolean
    collapsed?: boolean
    onCollapse?: (collapsed: boolean) => void
  }
>(
  (
    {
      collapsible = false,
      collapsed = false,
      onCollapse,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <_SidebarContext.Provider
        value={{
          collapsible,
          collapsed: collapsible && collapsed,
        }}
      >
        <aside
          ref={ref}
          className={cn(
            "group flex h-screen flex-col justify-between overflow-y-auto bg-sidebar text-sidebar-foreground",
            collapsible
              ? "data-[collapsed=false]:w-60 data-[collapsed=true]:w-14"
              : "w-60",
            "transition-all duration-200 ease-in-out",
            className
          )}
          data-collapsible={collapsible}
          data-collapsed={collapsible && collapsed}
          {...props}
        >
          <div className="flex flex-col gap-2">{children}</div>
          {collapsible ? (
            <div
              className={cn(
                "sticky bottom-0 bg-sidebar p-3",
                "group-data-[collapsed=true]:p-2"
              )}
            >
              <Button
                variant="ghost"
                className="h-8 w-full justify-center p-0 group-data-[collapsed=true]:justify-center group-data-[collapsed=false]:justify-end"
                onClick={() => onCollapse?.(!collapsed)}
              >
                <ChevronLeft
                  className={cn(
                    "h-4 w-4",
                    "group-data-[collapsed=true]:rotate-180"
                  )}
                />
              </Button>
            </div>
          ) : null}
        </aside>
      </_SidebarContext.Provider>
    )
  }
)
Sidebar.displayName = "Sidebar"

////////////////////////////////////////////////////////////////////////////////

const SidebarHeader = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-16 shrink-0 items-center border-b border-sidebar-border p-4",
        "group-data-[collapsed=true]:h-14 group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:border-b-0 group-data-[collapsed=true]:p-2",
        className
      )}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

////////////////////////////////////////////////////////////////////////////////

const SidebarContent = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto", className)}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

////////////////////////////////////////////////////////////////////////////////

const SidebarFooter = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "sticky bottom-0 mt-auto border-t border-sidebar-border",
        className
      )}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

////////////////////////////////////////////////////////////////////////////////

const SidebarMenu = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-1 p-2",
        "group-data-[collapsed=true]:gap-2 group-data-[collapsed=true]:p-1.5",
        className
      )}
      {...props}
    />
  )
})
SidebarMenu.displayName = "SidebarMenu"

////////////////////////////////////////////////////////////////////////////////

const SidebarMenuItem = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ asChild = false, ...props }, ref) => {
  return <div ref={ref} data-slot="sidebar-menu-item" {...props} />
})
SidebarMenuItem.displayName = "SidebarMenuItem"

////////////////////////////////////////////////////////////////////////////////

const _SidebarMenuButtonContext = React.createContext<{
  depth: number
}>({
  depth: 0,
})

const SidebarMenuButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  ButtonProps & {
    isActive?: boolean
  }
>(({ variant = "ghost", size = "default", isActive, ...props }, ref) => {
  const { collapsed } = useSidebar()
  const { depth } = React.useContext(_SidebarMenuButtonContext)

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              variant={isActive ? "primary" : variant}
              size="icon"
              className="h-10 w-10"
              data-active={isActive}
              {...props}
            />
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="border-sidebar-border bg-sidebar text-sidebar-foreground"
          >
            {props.children}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      ref={ref}
      variant={isActive ? "primary" : variant}
      size={size}
      className={cn("h-10 justify-start", `pl-${depth * 4 + 4}`)}
      data-active={isActive}
      {...props}
    />
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

////////////////////////////////////////////////////////////////////////////////

function SidebarMenuSub({ children }: { children: React.ReactNode }) {
  const { depth } = React.useContext(_SidebarMenuButtonContext)

  return (
    <_SidebarMenuButtonContext.Provider value={{ depth: depth + 1 }}>
      <div className="flex flex-col" data-slot="sidebar-menu-sub">
        {children}
      </div>
    </_SidebarMenuButtonContext.Provider>
  )
}

function SidebarMenuSubItem({ children }: { children: React.ReactNode }) {
  return (
    <div data-slot="sidebar-menu-sub-item" className="flex flex-col">
      {children}
    </div>
  )
}

const SidebarMenuSubButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  ButtonProps & {
    isActive?: boolean
  }
>(({ ...props }, ref) => {
  return (
    <SidebarMenuButton ref={ref} size="sm" {...props} />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

////////////////////////////////////////////////////////////////////////////////

const SidebarMenuBadge = React.forwardRef<
  React.ElementRef<"span">,
  React.ComponentProps<"span">
>(({ className, ...props }, ref) => {
  const { collapsed } = useSidebar()

  if (collapsed) {
    return null
  }

  return (
    <span
      ref={ref}
      className={cn("ml-auto text-xs", className)}
      {...props}
    />
  )
})
SidebarMenuBadge.displayName = "SidebarMenuBadge"

////////////////////////////////////////////////////////////////////////////////

export {
  useSidebar,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuBadge,
}
