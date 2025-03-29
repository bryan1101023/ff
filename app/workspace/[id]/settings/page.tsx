"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
// Add imports for the restriction details
import { doc, getDoc, setDoc, collection, arrayRemove } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  Loader2,
  Copy,
  CheckCircle,
  Trash2,
  BadgeCheck,
  Clock,
  BarChart3,
  UserPlus,
  X,
  Search,
  Mail,
  User,
  AlertTriangle,
} from "lucide-react"
import { useTheme } from "next-themes"
import { updateWorkspaceTheme, updateWorkspaceAllowedRanks, applyForVerification } from "@/lib/workspace-utils"
import { toast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { generateInviteCode, deactivateInvite, getWorkspaceInvites } from "@/lib/invites-utils"
// Add imports for the restriction details
import { AlertTitle } from "@/components/ui/alert"
import RestrictionDetailsModal from "@/components/workspace/restriction-details-modal"
import { useRouter } from "next/navigation"

export default function WorkspaceSettingsPage({ params }: { params: { id: string } }) {
  const [workspace, setWorkspace] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { id: workspaceId } = params
  const [robloxToken, setRobloxToken] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isApplyingForVerification, setIsApplyingForVerification] = useState(false)
  const [verificationReason, setVerificationReason] = useState("")
  const [groupRoles, setGroupRoles] = useState<any[]>([])
  const [selectedRanks, setSelectedRanks] = useState<number[]>([])
  const [isSavingRanks, setIsSavingRanks] = useState(false)
  const { theme, setTheme } = useTheme()
  const [members, setMembers] = useState<any[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredMembers, setFilteredMembers] = useState<any[]>([])
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [invites, setInvites] = useState<any[]>([])
  const [isLoadingInvites, setIsLoadingInvites] = useState(false)
  const [inviteExpiration, setInviteExpiration] = useState<string | null>(null)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null)
  const [selectedMinRank, setSelectedMinRank] = useState<string | null>(null)
  const [minRankName, setMinRankName] = useState<string | null>(null)
  const [groupShout, setGroupShout] = useState("")
  const [isUpdatingShout, setIsUpdatingShout] = useState(false)
  const [groupInfo, setGroupInfo] = useState<any>(null)
  const [isLoadingGroupInfo, setIsLoadingGroupInfo] = useState(false)
  const [isVerifyingToken, setIsVerifyingToken] = useState(false)
  const [robloxUserInfo, setRobloxUserInfo] = useState<any>(null)
  const [showTokenConfirmation, setShowTokenConfirmation] = useState(false)
  // Add state for restrictions and modal
  const [restrictions, setRestrictions] = useState<any>(null)
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false)
  // Add state for delete workspace confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Add useEffect to fetch restrictions
  useEffect(() => {
    const fetchRestrictions = async () => {
      try {
        const restrictionsDoc = await getDoc(doc(db, "workspaces", params.id, "restrictions", "current"))
        if (restrictionsDoc.exists() && restrictionsDoc.data().isActive) {
          setRestrictions(restrictionsDoc.data())
        }
      } catch (error) {
        console.error("Error fetching restrictions:", error)
      }
    }

    fetchRestrictions()
  }, [params.id])

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId))
        if (workspaceDoc.exists()) {
          const workspaceData = workspaceDoc.data()
          setWorkspace(workspaceData)
          setSelectedRanks(workspaceData.allowedRanks || [])

          // Fetch group roles
          if (workspaceData.groupId) {
            try {
              const response = await fetch(`/api/roblox/group-roles?groupId=${workspaceData.groupId}`)
              if (response.ok) {
                const data = await response.json()
                setGroupRoles(data.roles || [])
              }
            } catch (error) {
              console.error("Error fetching group roles:", error)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching workspace:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkspace()
  }, [workspaceId])

  useEffect(() => {
    const fetchMembers = async () => {
      if (!workspace || !workspace.members) return

      setIsLoadingMembers(true)
      try {
        const memberData = []

        for (const memberId of workspace.members) {
          const memberDoc = await getDoc(doc(db, "users", memberId))
          if (memberDoc.exists()) {
            memberData.push({
              id: memberId,
              ...memberDoc.data(),
              isOwner: memberId === workspace.ownerId,
            })
          }
        }

        setMembers(memberData)
        setFilteredMembers(memberData)
      } catch (error) {
        console.error("Error fetching members:", error)
      } finally {
        setIsLoadingMembers(false)
      }
    }

    fetchMembers()
  }, [workspace])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredMembers(
        members.filter(
          (member) =>
            member.username?.toLowerCase().includes(query) ||
            member.robloxUsername?.toLowerCase().includes(query) ||
            member.email?.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, members])

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/invite/${workspaceId}`
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const verifyRobloxToken = async () => {
    if (!robloxToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Roblox account token.",
        variant: "destructive",
      })
      return
    }

    setIsVerifyingToken(true)
    setError(null)

    try {
      // First, we need to get a CSRF token
      const csrfResponse = await fetch("https://auth.roblox.com/v2/logout", {
        method: "POST",
        headers: {
          Cookie: `.ROBLOSECURITY=${robloxToken}`,
        },
      })

      if (!csrfResponse.ok) {
        setError("Invalid Roblox token. Please check your token and try again.")
        setIsVerifyingToken(false)
        return
      }

      // Get the user's info
      const userResponse = await fetch("https://users.roblox.com/v1/users/authenticated", {
        headers: {
          Cookie: `.ROBLOSECURITY=${robloxToken}`,
          "x-csrf-token": csrfResponse.headers.get("x-csrf-token") || "",
        },
      })

      if (!userResponse.ok) {
        setError("Failed to get user information. Please check your token and try again.")
        setIsVerifyingToken(false)
        return
      }

      const userData = await userResponse.json()

      // Get the user's avatar
      const avatarResponse = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.id}&size=150x150&format=Png`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      )

      let avatarUrl = `/placeholder.svg?height=150&width=150&text=${encodeURIComponent(userData.name)}`

      if (avatarResponse.ok) {
        const avatarData = await avatarResponse.json()
        if (avatarData.data && avatarData.data.length > 0) {
          avatarUrl = avatarData.data[0].imageUrl
        }
      }

      setRobloxUserInfo({
        ...userData,
        avatar: avatarUrl,
      })

      setShowTokenConfirmation(true)
    } catch (error) {
      console.error("Error verifying Roblox token:", error)
      setError("Failed to verify Roblox token. Please try again.")
    } finally {
      setIsVerifyingToken(false)
    }
  }

  const handleSaveToken = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Save the token to the workspace
      await setDoc(
        doc(db, "workspaces", workspaceId),
        {
          robloxToken: robloxToken,
          robloxUserId: robloxUserInfo.id,
          robloxUsername: robloxUserInfo.name,
          updatedAt: Date.now(),
        },
        { merge: true },
      )

      // Update the workspace state with the new token
      setWorkspace((prev) => ({
        ...prev,
        robloxToken: robloxToken,
        robloxUserId: robloxUserInfo.id,
        robloxUsername: robloxUserInfo.name,
      }))

      setSuccess("Roblox account linked successfully!")
      toast({
        title: "Account Linked",
        description: `Your Roblox account (${robloxUserInfo.name}) has been linked successfully.`,
      })

      // Reset the confirmation state
      setShowTokenConfirmation(false)

      // Fetch group info to update the UI
      fetchGroupInfo()
    } catch (error) {
      console.error("Error saving Roblox token:", error)
      setError("Failed to save Roblox account token. Please try again.")
      toast({
        title: "Error",
        description: "Failed to link Roblox account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelTokenConfirmation = () => {
    setShowTokenConfirmation(false)
    setRobloxUserInfo(null)
  }

  const handleThemeChange = (theme: string) => {
    setTheme(theme)
    updateWorkspaceTheme(workspaceId, theme)
    toast({
      title: "Theme updated",
      description: `Workspace theme set to ${theme} mode.`,
    })
  }

  const handleRankToggle = (rankId: number) => {
    setSelectedRanks((prev) => (prev.includes(rankId) ? prev.filter((id) => id !== rankId) : [...prev, rankId]))
  }

  const handleSaveRanks = async () => {
    if (selectedRanks.length === 0) {
      toast({
        title: "Error",
        description: "You must select at least one rank to have access to the workspace.",
        variant: "destructive",
      })
      return
    }

    setIsSavingRanks(true)
    try {
      await updateWorkspaceAllowedRanks(workspaceId, selectedRanks)
      toast({
        title: "Access updated",
        description: "Workspace access permissions have been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating ranks:", error)
      toast({
        title: "Error",
        description: "Failed to update access permissions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingRanks(false)
    }
  }

  const handleApplyForVerification = async () => {
    if (!verificationReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for verification.",
        variant: "destructive",
      })
      return
    }

    setIsApplyingForVerification(true)
    try {
      await applyForVerification(workspaceId, verificationReason)
      setVerificationReason("")
      toast({
        title: "Application submitted",
        description: "Your verification application has been submitted for review.",
      })
    } catch (error) {
      console.error("Error applying for verification:", error)
      toast({
        title: "Error",
        description: "Failed to submit verification application. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsApplyingForVerification(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === workspace.ownerId) {
      toast({
        title: "Cannot remove owner",
        description: "You cannot remove the workspace owner.",
        variant: "destructive",
      })
      return
    }

    setIsRemovingMember(memberId)

    try {
      // Remove member from workspace
      await setDoc(
        doc(db, "workspaces", workspaceId),
        {
          members: arrayRemove(memberId),
          updatedAt: Date.now(),
        },
        { merge: true },
      )

      // Remove workspace from member's workspaces
      await setDoc(
        doc(db, "users", memberId),
        {
          workspaces: arrayRemove(workspaceId),
        },
        { merge: true },
      )

      // Update local state
      setMembers((prev) => prev.filter((member) => member.id !== memberId))
      setFilteredMembers((prev) => prev.filter((member) => member.id !== memberId))

      toast({
        title: "Member removed",
        description: "The member has been removed from the workspace.",
      })
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRemovingMember(null)
    }
  }

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      })
      return
    }

    setIsSendingInvite(true)

    try {
      // In a real app, you would send an email with the invite link
      // For now, we'll just show a success message

      // Store the invitation in Firestore
      const inviteRef = doc(collection(db, "invitations"))
      await setDoc(inviteRef, {
        email: inviteEmail,
        workspaceId,
        createdAt: Date.now(),
        status: "pending",
      })

      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${inviteEmail}.`,
      })

      setInviteEmail("")
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingInvite(false)
    }
  }

  useEffect(() => {
    const fetchInvites = async () => {
      if (!workspaceId) return

      setIsLoadingInvites(true)
      try {
        const invitesList = await getWorkspaceInvites(workspaceId)
        setInvites(invitesList)
      } catch (error) {
        console.error("Error fetching invites:", error)
      } finally {
        setIsLoadingInvites(false)
      }
    }

    fetchInvites()
  }, [workspaceId])

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true)
    try {
      // Convert string values to numbers for the API
      const expirationHours = inviteExpiration ? parseInt(inviteExpiration) : undefined
      const minRank = selectedMinRank ? parseInt(selectedMinRank) : undefined
      
      // Store the rank name for display
      if (minRank && groupRoles.length > 0) {
        const rankInfo = groupRoles.find(role => role.id === minRank)
        if (rankInfo) {
          setMinRankName(rankInfo.name)
        }
      } else {
        setMinRankName(null)
      }
      
      // Generate the invite code with the minimum rank requirement
      const code = await generateInviteCode(workspaceId, expirationHours, minRank)
      setNewInviteCode(code)

      // Refresh invites list
      const invitesList = await getWorkspaceInvites(workspaceId)
      setInvites(invitesList)

      toast({
        title: "Invite generated",
        description: "New invite link has been created successfully.",
      })
    } catch (error) {
      console.error("Error generating invite:", error)
      toast({
        title: "Error",
        description: "Failed to generate invite link. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  const handleDeactivateInvite = async (inviteCode: string) => {
    try {
      await deactivateInvite(inviteCode)

      // Update local state
      setInvites((prev) => prev.filter((invite) => invite.code !== inviteCode))

      toast({
        title: "Invite deactivated",
        description: "The invite link has been deactivated.",
      })
    } catch (error) {
      console.error("Error deactivating invite:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate invite link. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchGroupInfo = async () => {
    if (!workspace?.groupId) return

    setIsLoadingGroupInfo(true)
    try {
      const response = await fetch(`/api/roblox/group-info?groupId=${workspace.groupId}`)
      if (response.ok) {
        const data = await response.json()
        setGroupInfo(data)
        if (data.shout) {
          setGroupShout(data.shout.body || "")
        }
      }
    } catch (error) {
      console.error("Error fetching group info:", error)
    } finally {
      setIsLoadingGroupInfo(false)
    }
  }

  const handleUpdateShout = async () => {
    if (!groupShout.trim() || !workspace?.robloxToken || !workspace?.groupId) {
      toast({
        title: "Error",
        description: "Please enter a shout message and link your Roblox account first.",
        variant: "destructive",
      })
      return
    }

    setIsUpdatingShout(true)
    try {
      const response = await fetch("/api/roblox/update-shout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: workspace.groupId,
          message: groupShout,
          apiKey: workspace.robloxToken,
        }),
      })

      if (response.ok) {
        toast({
          title: "Shout Updated",
          description: "Group shout has been updated successfully.",
        })

        // Refresh group info to show the updated shout
        fetchGroupInfo()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: `Failed to update group shout: ${errorData.error || "Unknown error"}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating group shout:", error)
      toast({
        title: "Error",
        description: "Failed to update group shout. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingShout(false)
    }
  }

  useEffect(() => {
    if (workspace?.groupId) {
      fetchGroupInfo()
    }
  }, [workspace])

  const handleDeleteWorkspace = async () => {
    if (!workspaceId) return;
    
    setIsDeleting(true);
    
    try {
      // Update the workspace as deleted in Firestore
      await setDoc(
        doc(db, "workspaces", workspaceId),
        {
          isDeleted: true,
          deletedAt: Date.now(),
          deletedBy: "owner", // This indicates it was deleted by the owner, not by moderation
          deletionReason: "User requested deletion"
        },
        { merge: true }
      );
      
      toast({
        title: "Workspace Deleted",
        description: "Your workspace has been successfully deleted.",
      });
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast({
        title: "Error",
        description: "Failed to delete workspace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Workspace Settings</h1>
        <p className="text-muted-foreground">Configure your workspace and manage access</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-card">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          {/* Appearance tab removed */}
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="api">API Settings</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Information</CardTitle>
              <CardDescription>Basic settings for your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Workspace ID</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">{workspaceId}</div>
              </div>

              <div className="space-y-2">
                <Label>Group ID</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                  {workspace?.groupId}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Group Name</Label>
                <div className="flex items-center gap-2">
                  <Input value={workspace?.groupName} disabled />
                  {workspace?.isVerified && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md">
                      <BadgeCheck className="h-4 w-4" />
                      <span className="text-xs font-medium">Verified</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Add a description for your workspace..." rows={4} />
              </div>

              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Team Members</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>Send an invitation to join this workspace.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          placeholder="Enter email address"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Invitation Link</Label>
                        <div className="flex">
                          <div className="flex-1 p-3 bg-muted rounded-l-md border-y border-l text-sm truncate">
                            {`${window.location.origin}/invite/${workspaceId}`}
                          </div>
                          <Button variant="secondary" className="rounded-l-none" onClick={copyInviteLink}>
                            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          You can also share this link directly with team members.
                        </p>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button onClick={handleSendInvite} disabled={isSendingInvite || !inviteEmail.trim()}>
                        {isSendingInvite ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>Manage team members who have access to this workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search members..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {isLoadingMembers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredMembers.length > 0 ? (
                <div className="space-y-2">
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={
                              member.robloxUserId
                                ? `https://www.roblox.com/headshot-thumbnail/image?userId=${member.robloxUserId}&width=48&height=48&format=png`
                                : "/placeholder.svg?height=40&width=40"
                            }
                            alt={member.username}
                          />
                          <AvatarFallback>{member.username?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.username}</p>
                            {member.isOwner && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">Owner</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {member.robloxUsername ? `@${member.robloxUsername}` : member.email}
                          </p>
                        </div>
                      </div>

                      {!member.isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isRemovingMember === member.id}
                        >
                          {isRemovingMember === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          <span className="sr-only">Remove</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No members found</p>
                </div>
              )}

              <div className="pt-4">
                <h3 className="text-lg font-medium mb-2">Invite Links</h3>
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label>Expiration</Label>
                    <div className="flex gap-2">
                      <Select
                        value={inviteExpiration?.toString() || ""}
                        onValueChange={(val) => setInviteExpiration(val ? Number.parseInt(val) : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Never expires" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Never expires</SelectItem>
                          <SelectItem value="24">24 hours</SelectItem>
                          <SelectItem value="48">48 hours</SelectItem>
                          <SelectItem value="168">7 days</SelectItem>
                          <SelectItem value="720">30 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={selectedMinRank || ""}
                        onValueChange={(val) => setSelectedMinRank(val || null)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Minimum rank required" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No minimum rank</SelectItem>
                          {groupRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleGenerateInvite} disabled={isGeneratingInvite}>
                        {isGeneratingInvite ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          "Generate Invite Link"
                        )}
                      </Button>
                    </div>
                  </div>

                  {newInviteCode && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">New Invite Link</h4>
                        <div className="flex gap-2">
                          {minRankName && (
                            <Badge variant="outline" className="text-amber-500">
                              Min Rank: {minRankName}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-primary">
                            {inviteExpiration ? `Expires in ${inviteExpiration} hours` : "Never expires"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex">
                        <div className="flex-1 p-3 bg-muted rounded-l-md border-y border-l text-sm truncate">
                          {`${window.location.origin}/invite/${newInviteCode}`}
                        </div>
                        <Button
                          variant="secondary"
                          className="rounded-l-none"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/invite/${newInviteCode}`)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          }}
                        >
                          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-medium">Active Invite Links</h4>
                    {isLoadingInvites ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : invites.length > 0 ? (
                      <div className="space-y-2">
                        {invites.map((invite) => (
                          <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex-1 truncate mr-4">
                              <p className="font-medium text-sm">{`${window.location.origin}/invite/${invite.code}`}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  Created {new Date(invite.createdAt).toLocaleDateString()}
                                </p>
                                {invite.expiresAt && (
                                  <Badge variant="outline" className="text-xs">
                                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeactivateInvite(invite.code)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Deactivate</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No active invite links</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>Manage who can access this workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-medium">Rank Access</h3>
                <p className="text-sm text-muted-foreground">
                  Select which ranks in your group can access this workspace
                </p>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {groupRoles.length > 0 ? (
                    groupRoles.map((role) => (
                      <div key={role.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <Label htmlFor={`rank-${role.id}`} className="font-medium cursor-pointer">
                            {role.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">Rank {role.rank}</p>
                        </div>
                        <Switch
                          id={`rank-${role.id}`}
                          checked={selectedRanks.includes(role.id)}
                          onCheckedChange={() => handleRankToggle(role.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>Unable to load group roles. Please try again later.</p>
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveRanks} disabled={isSavingRanks}>
                  {isSavingRanks ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Update Access Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance TabsContent removed */}

        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5" />
                Workspace Verification
              </CardTitle>
              <CardDescription>Apply for verification to get a verified badge for your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted">
                <div className="p-2 rounded-full bg-primary/10">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Workspace Verification</h3>
                  <p className="text-sm text-muted-foreground">
                    Verified workspaces receive a badge that indicates authenticity. Verification is available for
                    official group workspaces with active members.
                  </p>
                </div>
              </div>

              {workspace?.isVerified ? (
                <Alert className="bg-primary/10 border-primary/20">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-primary">
                    This workspace is verified. The verification badge is visible to all members.
                  </AlertDescription>
                </Alert>
              ) : workspace?.verificationRequested ? (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Your verification request is pending review. We'll notify you once it's approved.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verification-reason">Reason for Verification</Label>
                    <Textarea
                      id="verification-reason"
                      placeholder="Explain why your workspace should be verified (e.g., official group, member count, etc.)"
                      value={verificationReason}
                      onChange={(e) => setVerificationReason(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={handleApplyForVerification}
                    disabled={isApplyingForVerification || !verificationReason.trim()}
                  >
                    {isApplyingForVerification ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        Apply for Verification
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Activity Tracking
              </CardTitle>
              <CardDescription>Monitor member activity and engagement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted">
                <div className="p-2 rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">
                    Activity tracking will allow you to monitor member engagement, track inactivity patterns, and
                    generate reports. This feature is currently in development.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Planned Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Member Activity Dashboard</h4>
                    <p className="text-sm text-muted-foreground">
                      View activity metrics for all members in your workspace
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Inactivity Reports</h4>
                    <p className="text-sm text-muted-foreground">
                      Generate reports on inactive members and inactivity patterns
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Automated Notifications</h4>
                    <p className="text-sm text-muted-foreground">Set up automated notifications for inactive members</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Activity Leaderboards</h4>
                    <p className="text-sm text-muted-foreground">Recognize and reward your most active members</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled>
                <Clock className="mr-2 h-4 w-4" />
                Coming Soon
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>Roblox Account</CardTitle>
              <CardDescription>Link your Roblox account to enable group management features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace?.robloxUsername ? (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={
                          workspace.robloxUserId
                            ? `https://www.roblox.com/headshot-thumbnail/image?userId=${workspace.robloxUserId}&width=150&height=150&format=png`
                            : "/placeholder.svg?height=150&width=150"
                        }
                        alt={workspace.robloxUsername}
                      />
                      <AvatarFallback>{workspace.robloxUsername?.charAt(0) || "R"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{workspace.robloxUsername}</h3>
                      <p className="text-sm text-muted-foreground">Linked Roblox Account</p>
                    </div>
                    <div className="ml-auto">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : showTokenConfirmation && robloxUserInfo ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex flex-col items-center text-center gap-3">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={robloxUserInfo.avatar} alt={robloxUserInfo.name} />
                        <AvatarFallback>{robloxUserInfo.name?.charAt(0) || "R"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-lg">{robloxUserInfo.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Roblox Account
                        </p>
                      </div>
                      <p className="mt-2">Is this the right account?</p>
                      <div className="flex gap-3 mt-2">
                        <Button variant="outline" onClick={handleCancelTokenConfirmation}>
                          No, Go Back
                        </Button>
                        <Button onClick={handleSaveToken} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Yes, Link Account"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Link your Roblox account to enable group management features. Your account token is used to
                      authenticate with Roblox and is stored securely.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="roblox-token">Roblox Account Token</Label>
                    <Input
                      id="roblox-token"
                      type="password"
                      placeholder="Enter your Roblox account token"
                      value={robloxToken}
                      onChange={(e) => setRobloxToken(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your token is stored securely and never shared with anyone.
                    </p>
                  </div>

                  <Button onClick={verifyRobloxToken} disabled={isVerifyingToken || !robloxToken.trim()}>
                    {isVerifyingToken ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <User className="mr-2 h-4 w-4" />
                        Verify Account
                      </>
                    )}
                  </Button>

                  {error && (
                    <Alert className="mt-4 bg-red-50 border-red-200 text-red-800" variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {workspace?.robloxToken && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-medium mb-4">Group Shout</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update your group's shout message directly from this dashboard
                  </p>

                  {isLoadingGroupInfo ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : groupInfo ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={`https://www.roblox.com/group-thumbnails/image?groupId=${workspace?.groupId}&width=420&height=420`}
                              alt={groupInfo.name}
                            />
                            <AvatarFallback>{groupInfo.name?.charAt(0) || "G"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{groupInfo.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Members: {groupInfo.memberCount?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {groupInfo.shout && (
                          <div className="mt-2 text-sm">
                            <p className="font-medium">Current Shout:</p>
                            <p className="italic mt-1">{groupInfo.shout.body || "No shout set"}</p>
                            {groupInfo.shout.poster && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Posted by {groupInfo.shout.poster.username} on{" "}
                                {new Date(groupInfo.shout.updated).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="group-shout">New Shout Message</Label>
                        <Textarea
                          id="group-shout"
                          placeholder="Enter your group shout message"
                          value={groupShout}
                          onChange={(e) => setGroupShout(e.target.value)}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum 255 characters. This will be visible to all group members.
                        </p>
                      </div>

                      <Button
                        onClick={handleUpdateShout}
                        disabled={isUpdatingShout || !groupShout.trim() || !workspace?.robloxToken}
                      >
                        {isUpdatingShout ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update Group Shout"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Unable to load group information. Please check your group ID and try again.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Actions here can permanently affect your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-destructive/20 p-4">
                <h3 className="text-lg font-medium mb-2">Delete Workspace</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete a workspace, there is no going back. Please be certain.
                </p>
                <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Workspace
                </Button>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-2">Transfer Ownership</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Transfer ownership of this workspace to another user.
                </p>
                <div className="flex gap-2">
                  <Input placeholder="Enter username" />
                  <Button variant="outline">Transfer</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {restrictions && (
        <Alert variant="warning" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Workspace Restrictions</AlertTitle>
          <AlertDescription>
            This workspace has been restricted from using certain features.
            <Button
              variant="link"
              className="p-0 h-auto text-amber-500"
              onClick={() => setIsRestrictionModalOpen(true)}
            >
              View details
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {restrictions && (
        <RestrictionDetailsModal
          isOpen={isRestrictionModalOpen}
          onClose={() => setIsRestrictionModalOpen(false)}
          restrictions={restrictions}
        />
      )}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workspace? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Workspace
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
