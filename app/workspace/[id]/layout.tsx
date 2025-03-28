"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, BadgeCheck, AlertTriangle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import NotificationBell from "@/components/ui/notification-bell"

import React, { use } from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { getCurrentUserData } from "@/lib/auth-utils"
import WorkspaceSidebar from "@/components/workspace/workspace-sidebar"
import { ThemeProvider } from "@/components/theme-provider"

// Helper function to safely get the workspace ID
function getWorkspaceId(params: any): string {
  // For Next.js 14+, params should be unwrapped with use()
  if (typeof params === 'object' && params !== null) {
    if (params.then && typeof params.then === 'function') {
      // It's a Promise-like object, use React.use
      const unwrappedParams = use(params) as { id?: string }
      return unwrappedParams.id || ""
    } else {
      // It's a regular object
      return params.id || ""
    }
  }
  return ""
}

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: any
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [workspace, setWorkspace] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [restrictions, setRestrictions] = useState<any>(null)
  const router = useRouter()
  
  // Get the workspace ID safely
  const workspaceId = getWorkspaceId(params)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        router.push("/beta")
        return
      }

      try {
        // Get user data
        const userData = await getCurrentUserData(authUser.uid)
        setUserData(userData)

        if (userData?.isBanned) {
          router.push("/banned")
          return
        }

        // Add check for warned users
        if (userData?.isWarned) {
          router.push("/warning")
          return
        }

        // Get workspace data
        const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId))

        if (!workspaceDoc.exists()) {
          // Workspace doesn't exist
          setIsAuthorized(false)
          setIsLoading(false)
          return
        }

        const workspaceData = workspaceDoc.data()
        setWorkspace(workspaceData)

        // Check if workspace is deleted
        if (workspaceData.isDeleted) {
          setIsAuthorized(false)
          setIsLoading(false)
          return
        }

        // Check for workspace restrictions
        const restrictionsDoc = await getDoc(doc(db, "workspaces", workspaceId, "restrictions", "current"))
        if (restrictionsDoc.exists() && restrictionsDoc.data()?.isActive) {
          setRestrictions(restrictionsDoc.data())
        }

        // Check if user is a member of this workspace
        if (workspaceData.members.includes(authUser.uid)) {
          // Now check if the user has the required rank to access this workspace
          if (userData.robloxVerified && userData.robloxUserId) {
            try {
              // Fetch user's groups and ranks
              const response = await fetch(`/api/roblox/groups?userId=${userData.robloxUserId}`)
              if (response.ok) {
                const groups = await response.json()

                // Find the group that matches this workspace
                const matchingGroup = groups.find((g: any) => g.id === workspaceData.groupId)

                if (matchingGroup) {
                  // Check if user's rank is in the allowed ranks for this workspace
                  const userRankId = matchingGroup.role.id
                  const hasRequiredRank = workspaceData.allowedRanks.includes(userRankId)

                  if (hasRequiredRank || workspaceData.ownerId === authUser.uid) {
                    // User has the required rank or is the workspace owner
                    setIsAuthorized(true)
                  } else {
                    // User doesn't have the required rank
                    console.log("User doesn't have the required rank to access this workspace")
                    setIsAuthorized(false)
                  }
                } else {
                  // User is not in this group
                  console.log("User is not in the group for this workspace")
                  setIsAuthorized(false)
                }
              } else {
                // Fallback to basic authorization if we can't fetch groups
                // Only allow access if user is the workspace owner
                setIsAuthorized(workspaceData.ownerId === authUser.uid)
              }
            } catch (error) {
              console.error("Error checking group membership:", error)
              // Fallback to basic authorization if there's an error
              // Only allow access if user is the workspace owner
              setIsAuthorized(workspaceData.ownerId === authUser.uid)
            }
          } else {
            // User is not verified with Roblox
            // Only allow access if user is the workspace owner
            setIsAuthorized(workspaceData.ownerId === authUser.uid)
          }
        } else {
          // User is not a member of this workspace
          setIsAuthorized(false)
        }
      } catch (error) {
        console.error("Error checking workspace access:", error)
        setIsAuthorized(false)
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [workspaceId, router])

  // Check if the current path is restricted
  const isFeatureRestricted = (pathname: string) => {
    if (!restrictions || !restrictions.features) return false

    const path = pathname.split("/").pop()

    if (restrictions.features.includes("inactivityNotice") && (path === "inactivity" || path === "manage")) {
      return true
    }

    if (restrictions.features.includes("timeTracking") && path === "time-tracking") {
      return true
    }

    if (restrictions.features.includes("automation") && path === "automation") {
      return true
    }

    if (restrictions.features.includes("announcements") && path === "announcements") {
      return true
    }

    if (restrictions.features.includes("memberManagement") && path === "members") {
      return true
    }

    return false
  }

  // Get current path
  const currentPath = typeof window !== "undefined" ? window.location.pathname : ""
  const isCurrentFeatureRestricted = isFeatureRestricted(currentPath)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  if (!isAuthorized || !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <div className="text-center max-w-md px-4">
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-white/60 mb-6">
            You don't have permission to access this workspace. This could be because:
          </p>
          <ul className="text-white/60 text-left list-disc pl-6 mb-6">
            <li>The workspace doesn't exist</li>
            <li>The workspace has been deleted</li>
            <li>You're not a member of this group</li>
            <li>Your Roblox rank doesn't have access to this workspace</li>
          </ul>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-white text-black rounded-md hover:bg-white/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Show restricted feature message if the current feature is restricted
  if (isCurrentFeatureRestricted) {
    return (
      <ThemeProvider attribute="class" defaultTheme={workspace.theme || "light"}>
        <div className={`${workspace.theme === "dark" ? "dark" : ""} min-h-screen bg-background text-foreground`}>
          <div className="flex h-screen overflow-hidden">
            <WorkspaceSidebar workspace={workspace} userData={userData} />
            <div className="flex-1 overflow-auto">
              <div className="flex flex-col items-center justify-center h-full p-6">
                <div className="max-w-md text-center">
                  <div className="bg-amber-500/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Feature Restricted</h2>
                  <p className="text-muted-foreground mb-4">This feature has been restricted by an administrator.</p>
                  <div className="bg-muted p-4 rounded-lg mb-4 text-left">
                    <p className="font-medium mb-1">Reason:</p>
                    <p className="text-sm text-muted-foreground">{restrictions?.reason || "No reason provided"}</p>

                    {restrictions?.duration && (
                      <>
                        <p className="font-medium mt-3 mb-1">Duration:</p>
                        <p className="text-sm text-muted-foreground">{restrictions.duration}</p>
                      </>
                    )}
                  </div>
                  <Button
                    onClick={() => router.push(`/workspace/${workspaceId}`)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Return to Workspace
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  // Apply the theme class based on workspace settings
  const themeClass = workspace.theme === "dark" ? "dark" : ""

  return (
    <ThemeProvider attribute="class" defaultTheme={workspace.theme || "light"}>
      <div className={`${themeClass} min-h-screen bg-background text-foreground`}>
        <div className="flex h-screen overflow-hidden">
          <WorkspaceSidebar workspace={workspace} userData={userData} />
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Add header with workspace title and notification bell */}
            <header className="border-b bg-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-semibold">{workspace?.name || "Workspace"}</h1>
                {workspace?.isVerified && (
                  <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-500 border-blue-500/20">
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              {isCurrentFeatureRestricted && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Restricted Feature
                </Badge>
              )}
            </header>
            <div className="flex-1 overflow-auto">{children}</div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
