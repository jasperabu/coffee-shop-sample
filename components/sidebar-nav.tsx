"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Coffee,
  ShoppingCart,
  Package,
  Warehouse,
  DollarSign,
  BarChart3,
  ClipboardList,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"

const navItems = [
  {
    title: "Cash Register",
    href: "/",
    icon: ShoppingCart,
  },
  {
    title: "Products",
    href: "/products",
    icon: Coffee,
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Warehouse,
  },
  {
    title: "Cash Management",
    href: "/cash",
    icon: DollarSign,
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: ClipboardList,
  },
]

const SIDEBAR_STORAGE_KEY = "da-bes-sidebar-collapsed"

export function SidebarNav() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored !== null) {
      setIsCollapsed(stored === "true")
    }
  }, [])

  const toggleSidebar = () => {
    const newValue = !isCollapsed
    setIsCollapsed(newValue)
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newValue))
  }

  if (!mounted) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground">
        <div className="flex h-full flex-col" />
      </aside>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div
            className={cn(
              "flex h-16 items-center border-b border-sidebar-border",
              isCollapsed ? "justify-center px-2" : "gap-3 px-6"
            )}
          >
            <Coffee className="h-8 w-8 shrink-0 text-sidebar-primary" />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight">Da Bes</span>
                <span className="text-xs text-sidebar-foreground/70">Coffee Shop POS</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return isCollapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-10 w-full items-center justify-center rounded-lg transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer with Toggle */}
          <div className="border-t border-sidebar-border p-2">
            {!isCollapsed && (
              <div className="mb-2 flex items-center gap-3 rounded-lg bg-sidebar-accent/30 px-3 py-2">
                <Package className="h-5 w-5 text-sidebar-primary" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium">POS System</span>
                  <span className="text-xs text-sidebar-foreground/60">v1.0.0</span>
                </div>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className={cn(
                    "w-full text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    isCollapsed ? "justify-center" : "justify-start gap-3 px-3"
                  )}
                >
                  {isCollapsed ? (
                    <PanelLeft className="h-5 w-5" />
                  ) : (
                    <>
                      <PanelLeftClose className="h-5 w-5" />
                      <span>Collapse</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="font-medium">
                  Expand sidebar
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}

export function useSidebarWidth() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkStorage = () => {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      setIsCollapsed(stored === "true")
    }
    checkStorage()
    window.addEventListener("storage", checkStorage)
    const interval = setInterval(checkStorage, 100)
    return () => {
      window.removeEventListener("storage", checkStorage)
      clearInterval(interval)
    }
  }, [])

  return mounted ? (isCollapsed ? "4rem" : "16rem") : "16rem"
}
