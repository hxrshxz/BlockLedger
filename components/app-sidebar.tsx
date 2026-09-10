"use client"

import * as React from "react"
import { IconInnerShadowTop } from "@tabler/icons-react"
import {
  Fingerprint,
  Gem,
  HelpCircle,
  LayoutDashboard,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Wallet,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"

const data = {
  user: {
    name: "BlockLedger User",
    email: "user@blockledger.io",
    avatar: "/placeholder-user.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Identity",
      url: "/identity",
      icon: Fingerprint,
    },
    {
      title: "Assets",
      url: "/assets",
      icon: Gem,
    },
    {
      title: "Access Control",
      url: "/access-control",
      icon: ShieldCheck,
    },
    {
      title: "Audit Trail",
      url: "/audit",
      icon: ScrollText,
    },
    {
      title: "Wallet",
      url: "/wallet",
      icon: Wallet,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircle,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const userData = {
    name: user?.name || data.user.name,
    email: user?.email || data.user.email,
    avatar: data.user.avatar,
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">BlockLedger</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
