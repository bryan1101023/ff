"use client"

import { cn } from "@/lib/utils"
import { CardFooter } from "@/components/ui/card"
import { CardContent } from "@/components/ui/card"
import { CardDescription } from "@/components/ui/card"
import { CardTitle } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import {
  getCurrentUserData,
  updateSelectedGroup,
  getUserWorkspaces,
  updateRobloxVerification,
  createWorkspace,
  checkAndAddToEligibleWorkspaces,
} from "@/lib/auth-utils"
import { getUserGroups } from "@/lib/roblox-api"
import GroupSelector from "@/components/dashboard/group-selector"
import GroupVerification from "@/components/dashboard/group-verification"
import RankSelection from "@/components/dashboard/rank-selection"
import WorkspaceCreation from "@/components/dashboard/workspace-creation"
import BioVerification from "@/components/auth/bio-verification"
import Notification from "@/components/ui/notification"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  LogOut,
  Plus,
  AlertCircle,
  Search,
  SortAsc,
  SortDesc,
  Users,
  MessageSquare,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { signOut } from "@/lib/auth-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import { motion } from "framer-motion"
import BugReportButton from "@/components/bug-report/bug-report-button"
import NotificationBell from "@/components/ui/notification-bell"

// Define the RobloxRole interface for consistent typing
interface RobloxRole {
  id: number;
  name: string;
  rank: number;
  memberCount?: number;
}

interface WorkspaceCardProps {
  workspace: any
  isActive: boolean
  onSelect: (id: string) => void
}

const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ workspace, isActive, onSelect }) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleSelect = () => {
    if (workspace.isDeleted) {
      onSelect(workspace.id)
      return
    }

    setIsLoading(true)
    onSelect(workspace.id)
  }

  return (
    <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
      <Card
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all hover:shadow-md",
          isActive ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50",
          workspace.isDeleted ? "opacity-80" : "",
        )}
        onClick={handleSelect}
      >
        <div className="aspect-video relative">
          {workspace.isDeleted ? (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <p className="text-white font-medium text-xl">Workspace Deleted</p>
            </div>
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50"></div>
          <img
            src={workspace.icon || "/placeholder.svg?height=200&width=400"}
            alt={workspace.groupName}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="bg-[#111] p-3">
          <h3 className="font-medium text-white truncate">{workspace.groupName}</h3>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-400">ID: {workspace.id.substring(0, 8)}</p>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-white hover:text-white/80"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect()
                }}
              >
                {workspace.isDeleted ? "View" : "Open"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default function DashboardPage() {
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null)
  const [activeWorkspaceContent, setActiveWorkspaceContent] = useState<string>("overview") // overview, announcements, inactivity, etc.
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [setupStep, setSetupStep] = useState(0)
  const [robloxUserId, setRobloxUserId] = useState<number | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [groupRanks, setGroupRanks] = useState<Array<RobloxRole>>([])
  const [selectedRanks, setSelectedRanks] = useState<number[]>([])
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [showDeletedNotification, setShowDeletedNotification] = useState(false)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
  const [creatingWorkspaceError, setCreatingWorkspaceError] = useState<string | null>(null)
  const [userGroups, setUserGroups] = useState<any[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc") // Default sort by member count desc
  const router = useRouter()
  const searchParams = useSearchParams()

  const showDeletedWorkspaceNotification = (workspace: any) => {
    // Only show the notification if it's not already visible
    if (!showDeletedNotification) {
      setShowDeletedNotification(true)
      // Automatically hide after 10 seconds
      setTimeout(() => {
        setShowDeletedNotification(false)
      }, 10000)
    }

    // Don't create database notifications - that's a separate feature
    // Remove the database notification code
  }

  const fetchVerifiedUserGroups = async () => {
    if (userData?.robloxVerified && userData?.robloxUserId) {
      setIsLoadingGroups(true)
      try {
        const groups = await getUserGroups(userData.robloxUserId)
        setUserGroups(groups)
      } catch (error) {
        console.error("Error fetching user groups:", error)
      } finally {
        setIsLoadingGroups(false)
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser)
        setIsLoading(true)

        try {
          // Get additional user data from Firestore
          const data = await getCurrentUserData(authUser.uid)
          setUserData(data)

          // Check if user is banned
          if (data?.isBanned) {
            router.push("/banned")
            return
          }

          // Check if user is warned
          if (data?.isWarned) {
            router.push("/warning")
            return
          }
          
          // Load workspaces for all users immediately
          const userWorkspaces = await getUserWorkspaces(authUser.uid)
          const accessibleWorkspaces = await filterAccessibleWorkspaces(userWorkspaces, authUser.uid, data)
          setWorkspaces(accessibleWorkspaces)
          
          if (data?.robloxVerified && data?.robloxUserId) {
            setSetupStep(4) // Show dashboard with workspaces
            
            // Run eligibility check in the background without waiting
            setTimeout(() => {
              // Ensure robloxUserId is defined before calling
              if (data.robloxUserId) {
                checkAndAddToEligibleWorkspaces(authUser.uid, data.robloxUserId)
                  .then(() => {
                  // Refresh workspaces after eligibility check completes
                  // but don't block the UI
                  getUserWorkspaces(authUser.uid)
                    .then(newWorkspaces => {
                      filterAccessibleWorkspaces(newWorkspaces, authUser.uid, data)
                        .then(newAccessibleWorkspaces => {
                          setWorkspaces(newAccessibleWorkspaces)
                        })
                    })
                  })
              }
            }, 2000) // Delay eligibility check to prioritize UI loading
          } else {
            // User is not verified, show bio verification
            setSetupStep(1)
          }
        } catch (error) {
          console.error("Error loading dashboard:", error)
        } finally {
          setIsLoading(false)
        }
      } else {
        // Not logged in, redirect to beta login
        router.push("/beta")
      }
    })

    return () => unsubscribe()
  }, [router, robloxUserId])

  const userGroupsCache = new Map<string, any[]>();

  const filterAccessibleWorkspaces = async (workspaces: any[], userId: string, userData: any) => {
    // If there are no workspaces, return empty array immediately
    if (!workspaces || workspaces.length === 0) {
      return [];
    }
    
    // First, separate workspaces the user owns (these are always accessible)
    const ownedWorkspaces = workspaces.filter((workspace) => workspace.ownerId === userId);
    
    // Workspaces where the user is explicitly a member (through invites)
    const memberWorkspaces = workspaces.filter(
      (workspace) => workspace.ownerId !== userId && workspace.members && workspace.members.includes(userId)
    );
    
    // Other workspaces that might be accessible through group membership
    const otherWorkspaces = workspaces.filter(
      (workspace) => workspace.ownerId !== userId && 
                     (!workspace.members || !workspace.members.includes(userId))
    );
    
    // If user is not verified with Roblox, only show workspaces they own and are members of
    if (!userData?.robloxVerified || !userData?.robloxUserId) {
      return [...ownedWorkspaces, ...memberWorkspaces];
    }
    
    // If there are no other workspaces to check, return owned and member ones immediately
    if (otherWorkspaces.length === 0) {
      return [...ownedWorkspaces, ...memberWorkspaces];
    }

    // For verified users, check if they have the required rank for each workspace
    try {
      // Check cache first
      let groups;
      if (userGroupsCache.has(userData.robloxUserId.toString())) {
        groups = userGroupsCache.get(userData.robloxUserId.toString());
      } else {
        // Set a timeout to prevent long-running requests
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 1500)
        );
        
        try {
          // Race between the fetch and the timeout
          const response = await Promise.race([
            fetch(`/api/roblox/groups?userId=${userData.robloxUserId}`),
            timeoutPromise
          ]) as Response;
          
          if (!response.ok) {
            return [...ownedWorkspaces, ...memberWorkspaces];
          }
          
          groups = await response.json();
          // Store in cache
          userGroupsCache.set(userData.robloxUserId.toString(), groups);
        } catch (error) {
          console.error("Error or timeout fetching groups:", error);
          return [...ownedWorkspaces, ...memberWorkspaces];
        }
      }

      // Limit the number of workspaces we process for performance
      const limitedOtherWorkspaces = otherWorkspaces.slice(0, 10);
      
      // Filter other workspaces based on group membership and rank
      const accessibleOtherWorkspaces = limitedOtherWorkspaces.filter((workspace) => {
        // Find if user is in this group
        const matchingGroup = groups.find((g: any) => g.id === workspace.groupId)
        if (!matchingGroup) return false

        // Check if user's rank is in the allowed ranks
        const userRankId = matchingGroup.role.id
        return workspace.allowedRanks?.includes(userRankId) || false
      })

      // Combine owned, member, and accessible workspaces
      return [...ownedWorkspaces, ...memberWorkspaces, ...accessibleOtherWorkspaces];
    } catch (error) {
      console.error("Error filtering accessible workspaces:", error)
      // If there's an error, show workspaces they own and are members of
      return [...ownedWorkspaces, ...memberWorkspaces];
    }
  }

  useEffect(() => {
    const workspaceId = searchParams.get("workspace")
    if (workspaceId && workspaces.length > 0) {
      const workspace = workspaces.find((w) => w.id === workspaceId)
      if (workspace && !workspace.isDeleted) {
        setActiveWorkspace(workspace)
      }
    }
  }, [searchParams, workspaces])

  useEffect(() => {
    if (isCreatingWorkspace && userData?.robloxVerified && userData?.robloxUserId) {
      // Immediately fetch groups when creating workspace as verified user
      const fetchGroups = async () => {
        setIsLoadingGroups(true)
        try {
          const groups = await getUserGroups(userData.robloxUserId)
          setUserGroups(groups)
        } catch (error) {
          console.error("Error fetching user groups:", error)
        } finally {
          setIsLoadingGroups(false)
        }
      }

      fetchGroups()
    }
  }, [isCreatingWorkspace, userData?.robloxVerified, userData?.robloxUserId])

  useEffect(() => {
    // If user is at step 1 and already verified, skip to group selection
    if (setupStep === 1 && userData?.robloxVerified && userData?.robloxUserId) {
      console.log('User is already verified, skipping to group selection with robloxUserId:', userData.robloxUserId);
      // Make sure to set the robloxUserId from userData
      setRobloxUserId(userData.robloxUserId);
      // Then move to step 2
      setSetupStep(2);
    }
  }, [setupStep, userData?.robloxVerified, userData?.robloxUserId]);

  const handleCreateWorkspace = () => {
    console.log('handleCreateWorkspace called');
    setIsCreatingWorkspace(true)
    setCreatingWorkspaceError(null)
    setSearchQuery("")

    // If user is already verified, skip to group selection from their verified account
    if (userData?.robloxVerified) {
      console.log('User is already verified, setting step to 1 (group selection)');
      
      // Make sure to set the robloxUserId from userData
      if (userData.robloxUserId) {
        console.log('Setting robloxUserId from userData:', userData.robloxUserId);
        setRobloxUserId(userData.robloxUserId);
      } else {
        console.error('User is verified but robloxUserId is missing in userData');
      }
      
      setSetupStep(1) // Set to step 1 (group selection) instead of 0

      // Immediately fetch groups if we have the robloxUserId
      if (userData.robloxUserId) {
        const fetchGroups = async () => {
          setIsLoadingGroups(true)
          try {
            console.log('Fetching groups for verified user:', userData.robloxUserId);
            const groups = await getUserGroups(userData.robloxUserId)
            setUserGroups(groups)
          } catch (error) {
            console.error("Error fetching user groups:", error)
          } finally {
            setIsLoadingGroups(false)
          }
        }
        fetchGroups()
      }
    } else {
      // If not verified, they need to verify first
      setSetupStep(1)
    }
  }

  const handleGroupSelected = async (groupId: number, groupName: string, robloxId: number, groupIcon?: string) => {
    // Create a properly structured group object
    const group = {
      id: groupId,
      name: groupName,
      icon: groupIcon || ''
    };
    
    console.log('handleGroupSelected called with:', { groupId, groupName, robloxId, groupIcon });
    
    setSelectedGroup(group);
    setCreatingWorkspaceError(null);

    try {
      console.log(`Fetching group roles for groupId: ${groupId}`);
      const response = await fetch(`/api/roblox/group-roles?groupId=${groupId}`, {
        // Add cache control headers to prevent caching issues
        cache: 'no-store'
      });
      
      // Check response format before attempting to parse JSON
      const contentType = response.headers.get('content-type');
      console.log(`Response content type: ${contentType}`);
      
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse.substring(0, 200));
        throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
      }
      
      const data = await response.json();
      console.log('Group roles API response structure:', data ? (Array.isArray(data) ? `Array with ${data.length} items` : typeof data) : 'null');

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch group roles')
      }

      // Ensure data is an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected an array of roles')
      }

      // Transform and validate the roles data
      const formattedRanks = data.map(role => {
        if (!role || typeof role !== 'object') {
          throw new Error('Invalid role format')
        }

        return {
          id: Number(role.id),
          name: String(role.name || ''),
          rank: Number(role.rank),
          memberCount: role.memberCount ? Number(role.memberCount) : undefined
        }
      })

      setGroupRanks(formattedRanks)
      setSetupStep(3)
    } catch (error) {
      console.error('Error fetching group roles:', error)
      setCreatingWorkspaceError(
        error instanceof Error 
          ? error.message 
          : 'Failed to fetch group roles. Please try again.'
      )
    }
  }

  const handleBioVerified = async (username: string, userId: number) => {
    setRobloxUserId(userId)

    // Update in database
    if (user) {
      await updateRobloxVerification(user.uid, username, userId, true)
    }

    // Go directly to dashboard, no group selection required
    setSetupStep(4)
  }

  const handleGroupVerified = (ranks: any[]) => {
    // Ensure ranks is an array
    if (!Array.isArray(ranks)) {
      console.error('Received non-array ranks:', ranks);
      setCreatingWorkspaceError('Invalid ranks format received. Please try again.');
      return;
    }
    
    // Ensure ranks are properly formatted
    const formattedRanks = ranks.map(rank => {
      // Make sure each property has a fallback value
      return {
        id: Number(rank?.id || 0),
        name: String(rank?.name || ''),
        rank: Number(rank?.rank || 0),
        memberCount: rank?.memberCount ? Number(rank.memberCount) : undefined
      };
    });
    
    console.log('Formatted ranks in dashboard:', formattedRanks);
    setGroupRanks(formattedRanks);
    setSetupStep(3); // Move to rank selection
  }

  const handleRanksSelected = async (ranks: number[]) => {
    // Debug log for ranks
    console.log('handleRanksSelected called with ranks:', JSON.stringify(ranks));
    
    // Validate that ranks is an array of numbers
    if (!Array.isArray(ranks)) {
      console.error('ranks is not an array:', ranks);
      setCreatingWorkspaceError('Invalid ranks format. Please try again.');
      return;
    }
    
    // Ensure all ranks are numbers
    const validRanks = ranks.map(id => Number(id));
    console.log('Converted ranks to numbers:', JSON.stringify(validRanks));
    
    // Reset states to ensure a fresh start
    setIsCreatingWorkspace(true);
    setSelectedRanks(validRanks);
    setCreatingWorkspaceError(null);
    
    // Immediately show the animation
    setSetupStep(3.5);
    
    // Add a small delay to allow the animation to start
    setTimeout(async () => {
      try {
        // Actually create the workspace in the database
        if (user && selectedGroup) {
          console.log('Creating workspace with:', {
            userId: user.uid,
            groupId: selectedGroup.id,
            groupName: selectedGroup.name,
            rankIds: validRanks,
            icon: selectedGroup.icon || ''
          });
          
          const workspace = await createWorkspace(
            user.uid,
            selectedGroup.id,
            selectedGroup.name,
            validRanks,
            selectedGroup.icon
          );
          
          console.log('Workspace created successfully:', workspace);
          setWorkspaceId(workspace.id);
          
          // The WorkspaceCreation component will call handleWorkspaceCreated when done
        } else {
          throw new Error("Missing user or group information");
        }
      } catch (error) {
        console.error("Error creating workspace:", error);
        setCreatingWorkspaceError("Failed to create workspace. Please try again.");
        setIsCreatingWorkspace(false);
        setSetupStep(3); // Go back to rank selection on error
      }
    }, 500);
  }

  const handleWorkspaceCreated = async () => {
    // Refresh workspaces
    if (user) {
      try {
        const userWorkspaces = await getUserWorkspaces(user.uid)
        setWorkspaces(userWorkspaces)
        
        // If we have a workspaceId, redirect to that workspace
        if (workspaceId) {
          router.push(`/workspace/${workspaceId}`)
        }
      } catch (error) {
        console.error("Error fetching workspaces:", error)
      }
    }

    setSetupStep(4) // Move to dashboard
    setIsCreatingWorkspace(false)
  }

  const handleSelectWorkspace = async (id: string) => {
    const workspace = workspaces.find((w) => w.id === id)

    if (workspace?.isDeleted) {
      showDeletedWorkspaceNotification(workspace)
      return
    }

    try {
      // Update the user's active workspace in the database
      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            activeWorkspace: id,
          },
          { merge: true },
        )

        // Navigate directly to the workspace page
        router.push(`/workspace/${id}`)
      }
    } catch (error) {
      console.error("Error selecting workspace:", error)
    }
  }

  const handleVerifiedGroupSelect = async (group: any) => {
    // Check if user already has a workspace for this group (including deleted ones)
    const existingWorkspace = workspaces.find((w) => w.groupId === group.id)
    const isDeleted = existingWorkspace?.isDeleted

    if (existingWorkspace) {
      if (isDeleted) {
        // Check if user is immune
        if (userData?.isImmune) {
          // Immune users can recreate deleted workspaces
          setSelectedGroup({ id: group.id, name: group.name, icon: group.icon })
          setRobloxUserId(userData.robloxUserId)
          setCreatingWorkspaceError(null)

          // Move directly to group verification
          setSetupStep(2)
          return
        }

        setCreatingWorkspaceError(
          `This group's workspace was previously deleted and cannot be recreated. Please select a different group.`,
        )
        return
      } else {
        setCreatingWorkspaceError(`You already have a workspace for ${group.name}. Please select a different group.`)
        return
      }
    }

    setSelectedGroup({ id: group.id, name: group.name, icon: group.icon })
    setRobloxUserId(userData.robloxUserId)
    setCreatingWorkspaceError(null)

    // Move directly to group verification
    setSetupStep(2)
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  const getFilteredAndSortedGroups = () => {
    if (!userGroups.length) return []

    // First filter by search query
    const filtered = userGroups.filter((group) => group.name.toLowerCase().includes(searchQuery.toLowerCase()))

    // Then sort by member count
    return filtered.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.memberCount - b.memberCount
      } else {
        return b.memberCount - a.memberCount
      }
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  // Bio verification step - only show if user is not verified
  if (setupStep === 1 && !userData?.robloxVerified) {
    console.log('Showing bio verification because user is not verified');
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303] p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          <BioVerification onVerified={handleBioVerified} />
        </div>
      </div>
    )
  }
  
  // Show loading while transitioning from step 1 to 2 for verified users
  if (setupStep === 1 && userData?.robloxVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  // Group selection step - modified to handle verified users differently
  if (setupStep === 0) {
    return (
      <div className="min-h-screen bg-[#030303] p-4 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {isCreatingWorkspace ? "Create Workspace" : "Staffify Dashboard"}
              </h1>
              <p className="text-white/60">
                {isCreatingWorkspace
                  ? "Select a group for your new workspace"
                  : userData?.username
                    ? `Welcome, ${userData.username}`
                    : "Welcome to Staffify"}
              </p>
            </div>

            {isCreatingWorkspace && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreatingWorkspace(false)
                  setSetupStep(4)
                }}
              >
                Cancel
              </Button>
            )}

            {!isCreatingWorkspace && (
              <div className="flex items-center gap-3">
                {/* Add the notification bell here */}
                {user && <NotificationBell userId={user.uid} />}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    try {
                      await signOut()
                      router.push("/beta")
                    } catch (error) {
                      console.error("Error signing out:", error)
                    }
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Sign out</span>
                </Button>
              </div>
            )}
          </div>

          <div className="max-w-3xl mx-auto">
            {creatingWorkspaceError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{creatingWorkspaceError}</AlertDescription>
              </Alert>
            )}

            {/* For verified users, show their groups directly */}
            {userData?.robloxVerified ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Select Your Roblox Group</CardTitle>
                  <CardDescription>
                    Choose a group from your verified Roblox account ({userData.robloxUsername})
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Search and sort controls */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search groups..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleSortOrder}
                      title={
                        sortOrder === "asc" ? "Sort by member count (ascending)" : "Sort by member count (descending)"
                      }
                    >
                      {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </Button>
                  </div>

                  {isLoadingGroups ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : getFilteredAndSortedGroups().length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getFilteredAndSortedGroups().map((group) => (
                        <div
                          key={group.id}
                          className="p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50"
                          onClick={() => handleVerifiedGroupSelect(group)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted">
                              <img
                                src={group.icon || "/placeholder.svg?height=48&width=48"}
                                alt={group.name}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{group.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {group.role} • {group.memberCount.toLocaleString()} members
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : userGroups.length > 0 && searchQuery ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No groups match your search.</p>
                      <Button variant="link" onClick={() => setSearchQuery("")}>
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-4">No groups found for your Roblox account.</p>
                      <Button onClick={fetchVerifiedUserGroups}>Refresh Groups</Button>
                    </div>
                  )}
                </CardContent>

                {userGroups.length > 0 && (
                  <CardFooter className="text-sm text-muted-foreground">
                    Showing {getFilteredAndSortedGroups().length} of {userGroups.length} groups
                  </CardFooter>
                )}
              </Card>
            ) : (
              // For non-verified users, use the regular GroupSelector
              <GroupSelector
                userId={user.uid}
                initialRobloxUsername={userData?.robloxUsername}
                robloxUserId={userData?.robloxUserId || robloxUserId}
                robloxVerified={userData?.robloxVerified}
                onGroupSelected={handleGroupSelected}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Group verification step
  if (setupStep === 2 && selectedGroup && robloxUserId) {
    return (
      <div className="min-h-screen bg-[#030303] p-4 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Group Verification</h1>
            <p className="text-white/60">Verify your ownership of the selected group</p>
          </div>

          <GroupVerification
            userId={user.uid}
            robloxUserId={robloxUserId}
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
            onVerified={handleGroupVerified}
            onCancel={() => {
              if (isCreatingWorkspace) {
                setSetupStep(0)
              } else {
                setSetupStep(4)
                setIsCreatingWorkspace(false)
              }
            }}
          />
        </div>
      </div>
    )
  }
  
  // If we're at step 2 but missing data, go back to group selection
  if (setupStep === 2 && (!selectedGroup || !robloxUserId)) {
    console.log('Missing data for group verification, returning to group selection');
    // Use setTimeout to avoid state updates during render
    setTimeout(() => {
      setSetupStep(0);
    }, 0);
    
    // Show loading while transitioning
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  // Rank selection step
  if (setupStep === 3 && groupRanks.length > 0) {
    // Debug log for groupRanks
    console.log('Rendering rank selection with groupRanks:', JSON.stringify(groupRanks));
    
    return (
      <div className="min-h-screen bg-[#030303] p-4 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Access Control</h1>
            <p className="text-white/60">Select which ranks can access your workspace</p>
          </div>

          {creatingWorkspaceError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{creatingWorkspaceError}</AlertDescription>
            </Alert>
          )}

          <RankSelection 
            ranks={groupRanks} 
            onComplete={handleRanksSelected} 
            onBack={() => setSetupStep(2)} 
          />
        </div>
      </div>
    )
  }

  // Workspace creation animation
  if (setupStep === 3.5) {
    // Debug log for selectedRanks
    console.log('Rendering workspace creation with selectedRanks:', JSON.stringify(selectedRanks));
    
    // Ensure selectedRanks is an array of numbers
    const safeRanks = Array.isArray(selectedRanks) 
      ? selectedRanks.map(r => typeof r === 'number' ? r : Number(r))
      : [];
    
    return (
      <div className="min-h-screen bg-[#030303] p-4 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <WorkspaceCreation 
            onComplete={handleWorkspaceCreated} 
            selectedRanks={safeRanks} 
          />
        </div>
      </div>
    )
  }

  // Fallback for any unhandled steps
  if (setupStep !== 0 && setupStep !== 1 && setupStep !== 2 && setupStep !== 3 && setupStep !== 3.5 && setupStep !== 4) {
    console.log(`Unhandled setup step: ${setupStep}, redirecting to dashboard`);
    // Use setTimeout to avoid state updates during render
    setTimeout(() => {
      setSetupStep(4);
    }, 0);
    
    // Show loading while transitioning
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  // Render the dashboard with the bug report button
  return (
    <>
      <Notification
        message="This workspace has been deleted for violating Staffify rules."
        type="white"
        duration={10000}
        isVisible={showDeletedNotification}
        onClose={() => setShowDeletedNotification(false)}
      />

      <div className="min-h-screen bg-[#030303] p-4 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {activeWorkspace ? activeWorkspace.groupName : "Staffify Dashboard"}
              </h1>
              <p className="text-white/60">
                {activeWorkspace
                  ? "Manage your group workspace"
                  : userData?.username
                    ? `Welcome, ${userData.username}`
                    : "Welcome to Staffify"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Add the notification bell here */}
              {user && <NotificationBell userId={user.uid} />}

              {activeWorkspace ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveWorkspace(null)
                    // Just remove the query parameter instead of navigating
                    const url = new URL(window.location.href)
                    url.searchParams.delete("workspace")
                    router.replace(url.toString())
                  }}
                >
                  Back to Dashboard
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="bg-white text-black hover:bg-white/90"
                  onClick={handleCreateWorkspace}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workspace
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  try {
                    await signOut()
                    router.push("/beta")
                  } catch (error) {
                    console.error("Error signing out:", error)
                  }
                }}
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          </div>

          {activeWorkspace ? (
            // Show workspace content with animation
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Workspace content goes here - simplified version */}
              <Card>
                <CardHeader>
                  <CardTitle>Group Overview</CardTitle>
                  <CardDescription>Manage your Roblox group</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Members
                        </CardTitle>
                        <CardDescription>Total group members</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">0</div>
                        <p className="text-sm text-muted-foreground">No data available</p>
                        <Button
                          variant="outline"
                          className="w-full mt-4"
                          onClick={() => router.push(`/workspace/${activeWorkspace.id}/members`)}
                        >
                          Manage Members
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-primary" />
                          Announcements
                        </CardTitle>
                        <CardDescription>Recent announcements</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">0</div>
                        <p className="text-sm text-muted-foreground">No announcements</p>
                        <Button
                          variant="outline"
                          className="w-full mt-4"
                          onClick={() => router.push(`/workspace/${activeWorkspace.id}/announcements`)}
                        >
                          View Announcements
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          Inactivity Notices
                        </CardTitle>
                        <CardDescription>Active notices</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">0</div>
                        <p className="text-sm text-muted-foreground">No notices</p>
                        <Button
                          variant="outline"
                          className="w-full mt-4"
                          onClick={() => router.push(`/workspace/${activeWorkspace.id}/inactivity`)}
                        >
                          Manage Notices
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest actions in your group</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 pb-4 border-b">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">No recent activity</p>
                              <p className="text-sm text-muted-foreground">Activity will appear here</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common tasks for group management</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            variant="outline"
                            className="h-auto py-4 flex flex-col items-center justify-center"
                            onClick={() => router.push(`/workspace/${activeWorkspace.id}/members`)}
                          >
                            <Users className="h-5 w-5 mb-2" />
                            <span>Manage Members</span>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-auto py-4 flex flex-col items-center justify-center"
                            onClick={() => router.push(`/workspace/${activeWorkspace.id}/announcements`)}
                          >
                            <MessageSquare className="h-5 w-5 mb-2" />
                            <span>Post Announcement</span>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-auto py-4 flex flex-col items-center justify-center"
                            onClick={() => router.push(`/workspace/${activeWorkspace.id}/inactivity`)}
                          >
                            <Calendar className="h-5 w-5 mb-2" />
                            <span>Submit Inactivity</span>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-auto py-4 flex flex-col items-center justify-center"
                            onClick={() => window.location.reload()}
                          >
                            <RefreshCw className="h-5 w-5 mb-2" />
                            <span>Refresh Data</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : isLoading ? (
            <div className="max-w-md mx-auto text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Loading Your Workspaces</h2>
              <p className="text-gray-400 mb-6">
                Just a moment while we fetch your workspaces...
              </p>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-12">
              <div className="text-6xl mb-4">😔</div>
              <h2 className="text-xl font-bold text-white mb-2">No Workspaces Found!</h2>
              <p className="text-gray-400 mb-6">
                I know what it's like when you're not invited! It's okay, why don't you make your own?
              </p>
              <Button onClick={handleCreateWorkspace}>Create Workspace</Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Your Workspaces</h2>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {/* Show all workspaces together, including deleted ones */}
                  {workspaces.map((workspace) => (
                    <WorkspaceCard
                      key={workspace.id}
                      workspace={workspace}
                      isActive={false}
                      onSelect={handleSelectWorkspace}
                    />
                  ))}
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>
      <BugReportButton />
    </>
  )
}
