"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, BadgeCheck, AlertTriangle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import NotificationBell from "@/components/ui/notification-bell"

import React, { use } from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, onSnapshot } from "firebase/firestore"
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
    let unsubscribeRestrictions: (() => void) | undefined;
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

        // Initial check for workspace restrictions
        const restrictionsDoc = await getDoc(doc(db, "workspaces", workspaceId, "restrictions", "current"))
        if (restrictionsDoc.exists() && restrictionsDoc.data()?.isActive) {
          setRestrictions(restrictionsDoc.data())
        }
        
        // Set up real-time listener for workspace restrictions
        unsubscribeRestrictions = onSnapshot(
          doc(db, "workspaces", workspaceId, "restrictions", "current"),
          (docSnapshot) => {
            if (docSnapshot.exists() && docSnapshot.data()?.isActive) {
              const newRestrictions = docSnapshot.data();
              
              // Only trigger notification if this is a new restriction (not the initial load)
              if (restrictions === null) {
                setRestrictions(newRestrictions);
              } else if (JSON.stringify(restrictions) !== JSON.stringify(newRestrictions)) {
                // This is a change in restrictions - dispatch custom event for the notification listener
                const restrictionEvent = new CustomEvent("workspace-restricted", {
                  detail: {
                    workspaceName: workspace?.groupName || "Workspace",
                    features: newRestrictions.features || [],
                    reason: newRestrictions.reason || "No reason provided",
                    duration: newRestrictions.duration || "indefinite",
                  },
                });
                window.dispatchEvent(restrictionEvent);
                
                // Update state
                setRestrictions(newRestrictions);
                
                // If user is on a now-restricted page, redirect them
                const currentPath = window.location.pathname;
                if (isFeatureRestricted(currentPath, newRestrictions)) {
                  router.push(`/workspace/${workspaceId}`);
                }
              }
            } else {
              // Restrictions were removed
              if (restrictions !== null) {
                // Dispatch custom event for the notification listener
                const unrestrictEvent = new CustomEvent("workspace-unrestricted", {
                  detail: {
                    workspaceName: workspace?.groupName || "Workspace",
                  },
                });
                window.dispatchEvent(unrestrictEvent);
              }
              
              // Clear restrictions
              setRestrictions(null);
            }
          },
          (error) => {
            console.error("Error listening to workspace restrictions:", error);
          }
        );

        // Check if user is a member of this workspace
        if (workspaceData.members.includes(authUser.uid)) {
          // If the user was explicitly added as a member (through invite or other means),
          // we should allow them access regardless of group membership or rank
          
          // Always authorize users who are in the members list
          setIsAuthorized(true)
          
          // Log group membership and rank info for monitoring purposes only
          if (workspaceData.allowedRanks && workspaceData.allowedRanks.length > 0 && 
              userData?.robloxVerified && userData?.robloxUserId && 
              authUser.uid !== workspaceData.ownerId) { // Skip check for workspace owner
            try {
              // Fetch user's groups and ranks
              const response = await fetch(`/api/roblox/groups?userId=${userData?.robloxUserId}`)
              if (response.ok) {
                const groups = await response.json()

                // Find the group that matches this workspace
                const matchingGroup = groups.find((g: any) => g.id === workspaceData.groupId)

                if (matchingGroup) {
                  // Check if user's rank is in the allowed ranks for this workspace
                  const userRankId = matchingGroup.role.id
                  const hasRequiredRank = workspaceData.allowedRanks.includes(userRankId)

                  if (!hasRequiredRank) {
                    // Only log a warning but still allow access since they were invited
                    console.log("User doesn't have the required rank but was explicitly invited")
                  }
                } else {
                  // User is not in this group, but was explicitly invited
                  console.log("User is not in the group but was explicitly invited")
                }
              }
            } catch (error) {
              console.error("Error checking group membership:", error)
              // Continue allowing access despite the error
            }
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

    return () => {
      unsubscribe();
      // Also unsubscribe from the restrictions listener if it exists
      if (typeof unsubscribeRestrictions === 'function') {
        unsubscribeRestrictions();
      }
    }
  }, [workspaceId, router])

  // Check if the current path is restricted
  const isFeatureRestricted = (pathname: string, checkRestrictions: any = null) => {
    // Use provided restrictions or fall back to state
    const activeRestrictions = checkRestrictions || restrictions;
    if (!activeRestrictions || !activeRestrictions.features) return false

    // Extract the feature part from the path
    const pathParts = pathname.split("/").filter(Boolean);
    
    // For paths like /workspace/123/feature
    // pathParts would be ['workspace', '123', 'feature']
    let path = null;
    if (pathParts.length >= 3 && pathParts[0] === 'workspace') {
      // Get the feature part (last segment)
      path = pathParts[pathParts.length - 1];
    }
    
    // If we're at the workspace root, path will be the workspace ID or null
    // In this case, no features are restricted
    if (!path || path === workspaceId) {
      return false;
    }

    if (activeRestrictions.features.includes("inactivityNotice") && (path === "inactivity" || path === "manage")) {
      return true
    }

    if (activeRestrictions.features.includes("timeTracking") && path === "time-tracking") {
      return true
    }

    if (activeRestrictions.features.includes("automation") && path === "automation") {
      return true
    }

    if (activeRestrictions.features.includes("announcements") && path === "announcements") {
      return true
    }

    if (activeRestrictions.features.includes("memberManagement") && path === "members") {
      return true
    }

    return false
  }

  // Get current path and check if it's restricted
  const currentPath = typeof window !== "undefined" ? window.location.pathname : ""
  
  // Force this to be recalculated whenever restrictions change or path changes
  const isCurrentFeatureRestricted = useMemo(() => {
    // Only check for restrictions if we have restrictions and a valid path
    if (!restrictions || !restrictions.features || !currentPath) {
      return false;
    }
    
    // Check if the current path is restricted
    const result = isFeatureRestricted(currentPath);
    
    return result;
  }, [currentPath, restrictions, workspaceId])
  
  // Redirect if the current feature is restricted
  useEffect(() => {
    if (isCurrentFeatureRestricted && !isLoading && workspace) {
      // Dispatch a custom event for the restriction
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('workspace-restricted', { 
          detail: { 
            workspaceId,
            restrictions 
          } 
        });
        window.dispatchEvent(event);
        
        // Show toast notification
        const { showToast } = require('@/lib/notification-utils');
        showToast({
          title: "Feature Restricted",
          description: `This feature has been restricted by an administrator. ${restrictions?.reason || ''}`,
          variant: "black",
        });
      }
      
      // Redirect to workspace home
      router.push(`/workspace/${workspaceId}`);
    }
  }, [isCurrentFeatureRestricted, isLoading, workspace, workspaceId, router, restrictions])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        <span className="sr-only">Loading workspace...</span>
      </div>
    )
  }

  if (!isAuthorized || !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303] p-4">
        <div className="text-center w-full max-w-md px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-sm sm:text-base text-white/60 mb-6">
            You don't have permission to access this workspace. This could be because:
          </p>
          <ul className="text-sm sm:text-base text-white/60 text-left list-disc pl-6 mb-6">
            <li>The workspace doesn't exist</li>
            <li>The workspace has been deleted</li>
            <li>You're not a member of this group</li>
            <li>Your Roblox rank doesn't have access to this workspace</li>
          </ul>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full sm:w-auto px-4 py-2 bg-white text-black rounded-md hover:bg-white/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Show restricted feature message if the current feature is restricted
  // Also check that we have restrictions loaded
  if (isCurrentFeatureRestricted && restrictions && restrictions.features) {
    return (
      <ThemeProvider attribute="class" defaultTheme={workspace.theme || "light"}>
        <div className={`${workspace.theme === "dark" ? "dark" : ""} min-h-screen bg-background text-foreground`}>
          <div className="flex flex-col md:flex-row h-screen overflow-hidden">
            <WorkspaceSidebar workspace={workspace} userData={userData} />
            <div className="flex-1 overflow-auto">
              <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6">
                <div className="w-full max-w-md text-center px-4">
                  <div className="bg-amber-500/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">Feature Restricted</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">This feature has been restricted by an administrator.</p>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg mb-4 text-left">
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
                    className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
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
        <div className="flex flex-col md:flex-row h-screen overflow-hidden">
          {/* Sidebar - will be mobile-friendly from the component */}
          <WorkspaceSidebar workspace={workspace} userData={userData} />
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header with workspace title and notification bell */}
            <header className="border-b bg-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Only show back button on desktop since mobile has the menu button */}
                <div className="hidden md:block">
                  <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </div>
                <h1 className="text-xl font-semibold truncate">{workspace?.name || "Workspace"}</h1>
                {workspace?.isVerified && (
                  <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-500 border-blue-500/20 hidden sm:flex">
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              {isCurrentFeatureRestricted && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs sm:text-sm">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Restricted Feature</span>
                  <span className="sm:hidden">Restricted</span>
                </Badge>
              )}
            </header>
            
            {/* Main content */}
            <div className="flex-1 overflow-auto p-2 sm:p-4">{children}</div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
