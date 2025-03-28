"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Clock, Eye, Settings, Menu, X, LogOut } from "lucide-react"
import { signOut } from "@/lib/auth-utils"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  groupName: string
}

export default function DashboardLayout({ children, groupName }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/beta")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Users, label: "Manage Players", href: "/dashboard/players" },
    { icon: Clock, label: "Inactivity Notices", href: "/dashboard/inactivity" },
    { icon: Eye, label: "Views", href: "/dashboard/views" },
    { icon: Settings, label: "Workspace Settings", href: "/dashboard/settings" },
  ]

  return (
    <div className="min-h-screen bg-[#030303] flex">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-[#0a0a0a] border-r border-white/10 transition-transform duration-300 md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white truncate">{groupName}</h2>
            <p className="text-sm text-white/60">Group Management</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-start gap-3 text-white/70 hover:text-white"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn("flex-1 transition-all duration-300", isSidebarOpen ? "md:ml-64" : "ml-0")}>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}

