"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, arrayUnion, setDoc, collection, query, where, getDocs } from "firebase/firestore"
import { getCurrentUserData } from "@/lib/auth-utils"
import { getWorkspaceFromInviteCode } from "@/lib/invite-utils"
import BioVerification from "@/components/auth/bio-verification"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function InvitePage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [workspace, setWorkspace] = useState<any>(null)
  const [workspaceOwner, setWorkspaceOwner] = useState<any>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const { id: workspaceId } = params

  useEffect(() => {
    const fetchWorkspaceDetails = async () => {
      try {
        // First check if the ID is an invite code or a workspace ID
        let actualWorkspaceId = workspaceId;
        
        // Check if this is an invite code by looking for it in the invites collection
        const invitesQuery = query(
          collection(db, "invites"),
          where("code", "==", workspaceId),
          where("isActive", "==", true)
        );
        
        const inviteSnapshot = await getDocs(invitesQuery);
        
        if (!inviteSnapshot.empty) {
          // This is an invite code, get the workspace ID from it
          const invite = inviteSnapshot.docs[0].data();
          
          // Check if invite has expired
          if (invite.expiresAt && invite.expiresAt < Date.now()) {
            setError("This invite has expired.");
            return;
          }
          
          console.log("Found invite code, resolving to workspace ID:", invite.workspaceId);
          actualWorkspaceId = invite.workspaceId;
        }
        
        console.log("Fetching workspace with ID:", actualWorkspaceId);
        // Get workspace details
        const workspaceDoc = await getDoc(doc(db, "workspaces", actualWorkspaceId));
        
        if (workspaceDoc.exists()) {
          const workspaceData = workspaceDoc.data();
          console.log("Workspace data found:", workspaceData.name || "Unnamed workspace");
          setWorkspace(workspaceData);

          // Get workspace owner details
          if (workspaceData.ownerId) {
            const ownerDoc = await getDoc(doc(db, "users", workspaceData.ownerId));
            if (ownerDoc.exists()) {
              setWorkspaceOwner(ownerDoc.data());
            }
          }
        } else {
          console.error("Workspace document does not exist for ID:", actualWorkspaceId);
          setError("Workspace not found or has been deleted.");
        }
      } catch (error) {
        console.error("Error fetching workspace:", error);
        setError("Failed to load workspace details.");
      }
    }

    fetchWorkspaceDetails()
  }, [workspaceId])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser)

        // Get additional user data from Firestore
        const data = await getCurrentUserData(authUser.uid)
        setUserData(data)

        // Check if user needs to verify their Roblox account
        if (!data?.robloxVerified) {
          setNeedsVerification(true)
        } else {
          // Check if user is already a member of this workspace
          if (workspace && workspace.members && workspace.members.includes(authUser.uid)) {
            setSuccess("You're already a member of this workspace.")
          }
        }
      } else {
        // Not logged in, redirect to beta login
        router.push(`/beta?redirect=/invite/${workspaceId}`)
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router, workspaceId, workspace])

  const handleBioVerified = async (username: string, userId: number) => {
    // Update in database
    if (user) {
      // Update Roblox verification status
      await setDoc(
        doc(db, "users", user.uid),
        {
          robloxUsername: username,
          robloxUserId: userId,
          robloxVerified: true,
          updatedAt: Date.now(),
        },
        { merge: true },
      )

      setNeedsVerification(false)
      setUserData((prev: any) => ({
        ...prev,
        robloxUsername: username,
        robloxUserId: userId,
        robloxVerified: true,
      }))
    }
  }

  const handleJoinWorkspace = async () => {
    if (!user || !userData || !workspace) return

    setIsJoining(true)
    setError(null)

    try {
      // Always check group membership first, regardless of invite method
      if (!userData.robloxVerified || !userData.robloxUserId) {
        setError("You must verify your Roblox account before joining a workspace.")
        setIsJoining(false)
        return
      }

      // Check if user has the required rank and is in the group
      let hasRequiredRank = false
      let isInGroup = false
      
      // Skip group check only for workspace owner
      const isWorkspaceOwner = user.uid === workspace.ownerId
      
      if (!isWorkspaceOwner) {
        try {
          // Fetch user's groups
          const response = await fetch(`/api/roblox/groups?userId=${userData.robloxUserId}`)
          if (!response.ok) {
            throw new Error(`Failed to fetch groups: ${response.status}`)
          }
          
          const groups = await response.json()
          console.log("User groups:", groups)
          console.log("Workspace group ID:", workspace.groupId)
          
          // Find if user is in this group
          const matchingGroup = groups.find((g: any) => g.id === workspace.groupId)
          
          if (!matchingGroup) {
            setError("You must be a member of the group to join this workspace.")
            setIsJoining(false)
            return
          }
          
          isInGroup = true
          
          // Check if user's rank is in the allowed ranks (if specified)
          if (workspace.allowedRanks && workspace.allowedRanks.length > 0) {
            const userRoleId = matchingGroup.role.id
            hasRequiredRank = workspace.allowedRanks.includes(userRoleId)
            
            if (!hasRequiredRank) {
              setError("You don't have the required rank to join this workspace.")
              setIsJoining(false)
              return
            }
          }
        } catch (error) {
          console.error("Error checking user groups:", error)
          setError("Failed to verify group membership. Please try again.")
          setIsJoining(false)
          return
        }
      }

      // Get the actual workspace ID (in case we're using an invite code)
      const actualWorkspaceId = workspace.id || workspaceId;
      
      // Add user to workspace members
      await setDoc(
        doc(db, "workspaces", actualWorkspaceId),
        {
          members: arrayUnion(user.uid),
          updatedAt: Date.now(),
        },
        { merge: true },
      )

      // Add workspace to user's workspaces
      await setDoc(
        doc(db, "users", user.uid),
        {
          workspaces: arrayUnion(actualWorkspaceId),
          activeWorkspace: actualWorkspaceId,
        },
        { merge: true },
      )

      setSuccess("You've successfully joined the workspace!")

      // Redirect to workspace after a short delay
      setTimeout(() => {
        router.push(`/workspace/${workspace.id || workspaceId}`)
      }, 1500)
    } catch (error) {
      console.error("Error joining workspace:", error)
      setError("Failed to join workspace. Please try again.")
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303] p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl pointer-events-none" />

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Invitation Error</CardTitle>
            <CardDescription>There was a problem with this invitation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-destructive mb-4">{error}</div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (success && !needsVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303] p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl pointer-events-none" />

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Success!</CardTitle>
            <CardDescription>Workspace joined successfully</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="text-center mb-4">{success}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push(`/workspace/${workspaceId}`)} className="w-full">
              Go to Workspace
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (needsVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303] p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Join Workspace</h1>
            <p className="text-white/60">Verify your Roblox account to join this workspace</p>
          </div>

          <BioVerification onVerified={handleBioVerified} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030303] p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Workspace Invitation</CardTitle>
          <CardDescription>You've been invited to join a workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {workspace && (
            <div className="flex flex-col items-center">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarImage src={workspace.icon || "/placeholder.svg?height=80&width=80"} alt={workspace.groupName} />
                <AvatarFallback>{workspace.groupName?.charAt(0) || "W"}</AvatarFallback>
              </Avatar>

              <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                {workspace.groupName}
                {workspace.isVerified && <CheckCircle className="h-5 w-5 text-primary" />}
              </h2>

              {workspaceOwner && (
                <p className="text-muted-foreground text-sm mb-4">Invited by {workspaceOwner.username}</p>
              )}

              <div className="w-full p-4 bg-muted rounded-lg mt-4">
                <h3 className="font-medium mb-2">About this workspace</h3>
                <p className="text-sm text-muted-foreground">
                  This is a group management workspace for the Roblox group "{workspace.groupName}". Joining will give
                  you access to announcements, member management, and other group tools.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" size="lg" onClick={handleJoinWorkspace} disabled={isJoining}>
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

