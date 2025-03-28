"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  CheckCircle,
  BarChart3,
  Clock,
  FileText,
  Bot,
  Flag,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-utils"
import NotificationBell from "@/components/ui/notification-bell"
import { useState } from "react"
import FlagReportModal from "./flag-report-modal"

interface WorkspaceSidebarProps {
  workspace: any
  userData: any
}

export default function WorkspaceSidebar({ workspace, userData }: WorkspaceSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const workspaceId = pathname.split("/")[2]
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/beta")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleBackToDashboard = () => {
    router.push("/dashboard")
  }

  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Overview",
      href: `/workspace/${workspaceId}`,
      isActive: pathname === `/workspace/${workspaceId}`,
    },
    {
      icon: MessageCircle,
      label: "Feed",
      href: `/workspace/${workspaceId}/feed`,
      isActive: pathname.includes(`/workspace/${workspaceId}/feed`),
    },
    {
      icon: MessageSquare,
      label: "Announcements",
      href: `/workspace/${workspaceId}/announcements`,
      isActive: pathname.includes(`/workspace/${workspaceId}/announcements`),
    },
    {
      icon: Calendar,
      label: "Inactivity Notices",
      href: `/workspace/${workspaceId}/inactivity`,
      isActive: pathname.includes(`/workspace/${workspaceId}/inactivity`),
    },
    {
      icon: Users,
      label: "Members",
      href: `/workspace/${workspaceId}/members`,
      isActive: pathname.includes(`/workspace/${workspaceId}/members`),
    },
    {
      icon: BarChart3,
      label: "Analytics",
      href: `/workspace/${workspaceId}/analytics`,
      isActive: pathname.includes(`/workspace/${workspaceId}/analytics`),
    },
    {
      icon: Clock,
      label: "Time Tracking",
      href: `/workspace/${workspaceId}/time-tracking`,
      isActive: pathname.includes(`/workspace/${workspaceId}/time-tracking`),
    },
    {
      icon: FileText,
      label: "Logs",
      href: `/workspace/${workspaceId}/logs`,
      isActive: pathname.includes(`/workspace/${workspaceId}/logs`),
    },
    {
      icon: Bot,
      label: "Automation",
      href: `/workspace/${workspaceId}/automation`,
      isActive: pathname.includes(`/workspace/${workspaceId}/automation`),
    },
    {
      icon: Calendar,
      label: "Sessions",
      href: `/workspace/${workspaceId}/sessions`,
      isActive: pathname.includes(`/workspace/${workspaceId}/sessions`),
    },
    {
      icon: Settings,
      label: "Settings",
      href: `/workspace/${workspaceId}/settings`,
      isActive: pathname.includes(`/workspace/${workspaceId}/settings`),
    },
  ]

  return (
    <div className="h-screen w-64 flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={workspace?.icon || workspace?.groupIcon || "/placeholder.svg?height=40&width=40"} alt={workspace?.groupName || "Workspace"} />
              <AvatarFallback>{workspace?.groupName?.charAt(0) || "W"}</AvatarFallback>
            </Avatar>
            {workspace?.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                <CheckCircle className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h2 className="text-lg font-bold truncate">{workspace?.groupName}</h2>
              {workspace?.isVerified && <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">Group Workspace</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button variant="outline" size="sm" className="w-full" onClick={handleBackToDashboard}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                item.isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <item.icon className={`h-5 w-5 ${item.isActive ? "text-primary" : "text-muted-foreground"}`} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                userData?.robloxUserId
                  ? `https://www.roblox.com/headshot-thumbnail/image?userId=${userData.robloxUserId}&width=48&height=48&format=png`
                  : "/placeholder.svg?height=32&width=32"
              }
              alt={userData?.username || "User"}
            />
            <AvatarFallback>{userData?.username?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userData?.username || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {userData?.robloxUsername || userData?.email || ""}
            </p>
          </div>
          {/* Add notification bell and flag icon */}
          <div className="flex items-center gap-1">
            {userData?.uid && <NotificationBell userId={userData.uid} />}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsFlagModalOpen(true)}
              className="relative hover:bg-white/10"
              title="Flag workspace"
            >
              <Flag className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Flag Report Modal */}
      <FlagReportModal
        isOpen={isFlagModalOpen}
        onClose={() => setIsFlagModalOpen(false)}
        workspace={workspace}
        userData={userData}
      />
    </div>
  )
}
