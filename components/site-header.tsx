"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { usePathname } from "next/navigation"

export function SiteHeader() {
  const pathname = usePathname()
  
  // Function to get page title based on current path
  const getPageTitle = () => {
    switch (pathname) {
      case "/dashboard":
        return "Dashboard"
      case "/identity":
        return "Identity Registry"
      case "/assets":
        return "Asset Registry"
      case "/access-control":
        return "Access Control"
      case "/audit":
        return "Audit Trail"
      case "/wallet":
        return "Wallet"
      case "/settings":
        return "Settings"
      default:
        // `/assets/BLKL-000123` and other dynamic routes.
        if (pathname.startsWith("/assets/")) {
          return `Asset ${pathname.split("/")[2] ?? ""}`.trim()
        }
        const segments = pathname.split('/').filter(Boolean)
        if (segments.length > 0) {
          return segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
        }
        return "Dashboard"
    }
  }

  return (
    <header className="flex h-[--header-height] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[--header-height] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 h-9 w-9 bg-white/90 hover:bg-white text-black border-2 border-gray-300 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">{getPageTitle()}</h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}