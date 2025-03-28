"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs, doc, getDoc, setDoc, query, where, serverTimestamp, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, Search, BadgeCheck, CheckCircle, XCircle, AlertTriangle, Trash2, ShieldOff } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import RestrictionModal from "./restriction-modal"
import { createNotification } from "@/lib/notification"
import {
  sendRealTimeNotification,
  createWorkspaceDeletedNotification,
  createWorkspaceRestrictedNotification,
} from "@/lib/notification-utils"

export default function WorkspaceManagement() {
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [filteredWorkspaces, setFilteredWorkspaces] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [verificationRequests, setVerificationRequests] = useState<any[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null)
  const [verificationNote, setVerificationNote] = useState("")
  const [isProcessingVerification, setIsProcessingVerification] = useState(false)
  const [workspaceToDelete, setWorkspaceToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false)
  const [workspaceToRestrict, setWorkspaceToRestrict] = useState<any>(null)
  const [isUnrestricting, setIsUnrestricting] = useState(false)
  const [workspaceRestrictions, setWorkspaceRestrictions] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    const fetchWorkspaces = async () => {
      setIsLoading(true)
      try {
        const workspacesSnapshot = await getDocs(collection(db, "workspaces"))
        const workspacesData: any[] = []
        const restrictionsMap: { [key: string]: boolean } = {}

        for (const workspaceDoc of workspacesSnapshot.docs) {
          const workspaceData = workspaceDoc.data()

          // Get owner info
          let ownerData = null
          if (workspaceData.ownerId) {
            const ownerDoc = await getDoc(doc(db, "users", workspaceData.ownerId))
            if (ownerDoc.exists()) {
              ownerData = ownerDoc.data()
            }
          }

          // Check if workspace has active restrictions
          const restrictionDoc = await getDoc(doc(db, "workspaces", workspaceDoc.id, "restrictions", "current"))
          const hasRestrictions = restrictionDoc.exists() && restrictionDoc.data()?.isActive === true
          restrictionsMap[workspaceDoc.id] = hasRestrictions

          workspacesData.push({
            id: workspaceDoc.id,
            ...workspaceData,
            owner: ownerData,
          })
        }

        setWorkspaces(workspacesData)
        setFilteredWorkspaces(workspacesData)
        setWorkspaceRestrictions(restrictionsMap)
      } catch (error) {
        console.error("Error fetching workspaces:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const fetchVerificationRequests = async () => {
      try {
        const q = query(
          collection(db, "workspaces"),
          where("verificationRequested", "==", true),
          where("isVerified", "==", false),
        )

        const requestsSnapshot = await getDocs(q)
        const requestsData: any[] = []

        for (const requestDoc of requestsSnapshot.docs) {
          const requestData = requestDoc.data()

          // Get owner info
          let ownerData = null
          if (requestData.ownerId) {
            const ownerDoc = await getDoc(doc(db, "users", requestData.ownerId))
            if (ownerDoc.exists()) {
              ownerData = ownerDoc.data()
            }
          }

          requestsData.push({
            id: requestDoc.id,
            ...requestData,
            owner: ownerData,
          })
        }

        setVerificationRequests(requestsData)
      } catch (error) {
        console.error("Error fetching verification requests:", error)
      }
    }

    fetchWorkspaces()
    fetchVerificationRequests()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredWorkspaces(workspaces)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredWorkspaces(
        workspaces.filter(
          (workspace) =>
            workspace.groupName?.toLowerCase().includes(query) ||
            workspace.owner?.username?.toLowerCase().includes(query) ||
            workspace.id.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, workspaces])

  const handleVerifyWorkspace = async (workspaceId: string, approved: boolean) => {
    setIsProcessingVerification(true)

    try {
      await setDoc(
        doc(db, "workspaces", workspaceId),
        {
          isVerified: approved,
          verificationRequested: false,
          verificationProcessedAt: Date.now(),
          verificationNote: verificationNote,
          verificationApproved: approved,
        },
        { merge: true },
      )

      // Update local state
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === workspaceId
            ? {
                ...workspace,
                isVerified: approved,
                verificationRequested: false,
                verificationProcessedAt: Date.now(),
                verificationNote: verificationNote,
                verificationApproved: approved,
              }
            : workspace,
        ),
      )

      setVerificationRequests((prev) => prev.filter((request) => request.id !== workspaceId))

      toast({
        title: approved ? "Workspace verified" : "Verification declined",
        description: approved
          ? "The workspace has been verified successfully."
          : "The verification request has been declined.",
      })

      setSelectedWorkspace(null)
      setVerificationNote("")
    } catch (error) {
      console.error("Error processing verification:", error)
      toast({
        title: "Error",
        description: "Failed to process verification. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessingVerification(false)
    }
  }

  const handleDeleteWorkspace = async (workspaceId: string) => {
    setIsDeleting(true)

    try {
      // Get workspace data before deleting
      const workspace = workspaces.find((w) => w.id === workspaceId)
      const ownerId = workspace?.ownerId
      const workspaceName = workspace?.groupName || "Unknown Workspace"

      await setDoc(
        doc(db, "workspaces", workspaceId),
        {
          isDeleted: true,
          deletedAt: Date.now(),
        },
        { merge: true },
      )

      // Update local state
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === workspaceId
            ? {
                ...workspace,
                isDeleted: true,
                deletedAt: Date.now(),
              }
            : workspace,
        ),
      )

      // Update filtered workspaces too
      setFilteredWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === workspaceId
            ? {
                ...workspace,
                isDeleted: true,
                deletedAt: Date.now(),
              }
            : workspace,
        ),
      )

      // Send notification to the workspace owner
      if (ownerId) {
        await createWorkspaceDeletedNotification(ownerId, workspaceName)
      }

      toast({
        title: "Workspace deleted",
        description: "The workspace has been successfully deleted.",
      })

      setWorkspaceToDelete(null)
    } catch (error) {
      console.error("Error deleting workspace:", error)
      toast({
        title: "Error",
        description: "Failed to delete workspace. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleApplyRestrictions = async (features: string[], reason: string, duration?: string) => {
    if (!workspaceToRestrict) return

    try {
      // Create a restrictions document in the workspace
      const restrictionData = {
        features,
        reason,
        appliedAt: serverTimestamp(),
        appliedBy: "admin", // You might want to store the actual admin ID here
        isActive: true,
      }

      // Add duration if provided
      if (duration) {
        restrictionData.duration = duration
        restrictionData.expiresAt = new Date(Date.now() + parseDuration(duration))
      }

      await setDoc(doc(db, "workspaces", workspaceToRestrict.id, "restrictions", "current"), restrictionData, {
        merge: true,
      })

      // Send notification to workspace owner
      if (workspaceToRestrict.ownerId) {
        // Use the new function to create a restriction notification
        await createWorkspaceRestrictedNotification(
          workspaceToRestrict.ownerId,
          workspaceToRestrict.groupName,
          workspaceToRestrict.id,
          features,
          reason,
        )
      }

      // Update local state
      setWorkspaceRestrictions((prev) => ({
        ...prev,
        [workspaceToRestrict.id]: true,
      }))

      toast({
        title: "Restrictions applied",
        description: `Restrictions have been applied to workspace "${workspaceToRestrict.groupName}".`,
      })

      setWorkspaceToRestrict(null)
      setIsRestrictionModalOpen(false)
    } catch (error) {
      console.error("Error applying restrictions:", error)
      toast({
        title: "Error",
        description: "Failed to apply restrictions. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Add a function to handle unrestricting a workspace
  const handleUnrestrictWorkspace = async (workspaceId: string, workspaceName: string, ownerId: string) => {
    setIsUnrestricting(true)

    try {
      // Delete the restrictions document
      await deleteDoc(doc(db, "workspaces", workspaceId, "restrictions", "current"))

      // Update local state
      setWorkspaceRestrictions((prev) => ({
        ...prev,
        [workspaceId]: false,
      }))

      // Send notification to workspace owner
      if (ownerId) {
        // Send regular notification
        await createNotification(
          ownerId,
          `All restrictions have been removed from your workspace "${workspaceName}". You now have full access to all features.`,
          "workspace",
          `/workspace/${workspaceId}/settings`,
          "View Workspace",
        )

        // Send real-time notification
        await sendRealTimeNotification(ownerId, {
          title: "Workspace Restrictions Removed",
          message: `All restrictions have been removed from your workspace "${workspaceName}". You now have full access to all features.`,
          type: "success",
          link: `/workspace/${workspaceId}/settings`,
          actionText: "View Workspace",
        })
      }

      toast({
        title: "Restrictions removed",
        description: `All restrictions have been removed from workspace "${workspaceName}".`,
        variant: "success",
      })
    } catch (error) {
      console.error("Error removing restrictions:", error)
      toast({
        title: "Error",
        description: "Failed to remove restrictions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUnrestricting(false)
    }
  }

  const parseDuration = (durationStr: string): number => {
    const durationLower = durationStr.toLowerCase()
    const value = Number.parseInt(durationStr)

    if (isNaN(value)) return 0

    if (durationLower.includes("day")) return value * 24 * 60 * 60 * 1000
    if (durationLower.includes("week")) return value * 7 * 24 * 60 * 60 * 1000
    if (durationLower.includes("month")) return value * 30 * 24 * 60 * 60 * 1000

    return value * 24 * 60 * 60 * 1000 // Default to days
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Management</CardTitle>
        <CardDescription>Manage all workspaces in the system</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Workspaces</TabsTrigger>
            <TabsTrigger value="verification" className="relative">
              Verification Requests
              {verificationRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {verificationRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search workspaces..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredWorkspaces.length > 0 ? (
              <div className="space-y-4">
                {filteredWorkspaces.map((workspace) => (
                  <div key={workspace.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={workspace.icon || "/placeholder.svg?height=40&width=40"}
                          alt={workspace.groupName}
                        />
                        <AvatarFallback>{workspace.groupName?.charAt(0) || "W"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{workspace.groupName}</h3>
                          {workspace.isVerified && <BadgeCheck className="h-4 w-4 text-primary" />}
                          {workspaceRestrictions[workspace.id] && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-xs rounded-full flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Restricted
                            </span>
                          )}
                          {workspace.isDeleted && (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs rounded-full flex items-center gap-1">
                              <Trash2 className="h-3 w-3" />
                              Deleted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>ID: {workspace.id.substring(0, 8)}</span>
                          <span>•</span>
                          <span>Owner: {workspace.owner?.username || "Unknown"}</span>
                          {workspace.isDeleted && (
                            <>
                              <span>•</span>
                              <span>Deleted: {new Date(workspace.deletedAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!workspace.isDeleted && (
                        <>
                          {workspace.isVerified ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                setSelectedWorkspace(workspace)
                                setVerificationNote("")
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Revoke Verification
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedWorkspace(workspace)
                                setVerificationNote("")
                              }}
                            >
                              <BadgeCheck className="h-4 w-4 mr-2" />
                              Verify Workspace
                            </Button>
                          )}

                          {workspaceRestrictions[workspace.id] ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-500"
                              onClick={() =>
                                handleUnrestrictWorkspace(workspace.id, workspace.groupName, workspace.ownerId)
                              }
                              disabled={isUnrestricting}
                            >
                              {isUnrestricting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <ShieldOff className="h-4 w-4 mr-2" />
                              )}
                              Unrestrict
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-500"
                              onClick={() => {
                                setWorkspaceToRestrict(workspace)
                                setIsRestrictionModalOpen(true)
                              }}
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Restrict
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setWorkspaceToDelete(workspace)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </>
                      )}
                      {workspace.isDeleted && (
                        <span className="text-sm text-muted-foreground italic">No actions available</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No workspaces found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="verification" className="space-y-4 mt-4">
            {verificationRequests.length > 0 ? (
              <div className="space-y-4">
                {verificationRequests.map((request) => (
                  <div key={request.id} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={request.icon || "/placeholder.svg?height=40&width=40"}
                            alt={request.groupName}
                          />
                          <AvatarFallback>{request.groupName?.charAt(0) || "W"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{request.groupName}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>ID: {request.id.substring(0, 8)}</span>
                            <span>•</span>
                            <span>Owner: {request.owner?.username || "Unknown"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs rounded-full flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Pending Verification
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <Label className="text-sm font-medium">Verification Reason</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                        {request.verificationReason || "No reason provided"}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          setSelectedWorkspace(request)
                          setVerificationNote("")
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedWorkspace(request)
                          setVerificationNote("")
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No verification requests pending</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Verification Dialog */}
        {selectedWorkspace && (
          <Dialog open={!!selectedWorkspace} onOpenChange={(open) => !open && setSelectedWorkspace(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedWorkspace.isVerified
                    ? "Revoke Verification"
                    : selectedWorkspace.verificationRequested
                      ? "Process Verification Request"
                      : "Verify Workspace"}
                </DialogTitle>
                <DialogDescription>
                  {selectedWorkspace.isVerified
                    ? "Are you sure you want to revoke verification for this workspace?"
                    : selectedWorkspace.verificationRequested
                      ? "Review and process this verification request."
                      : "Verify this workspace to add a verification badge."}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={selectedWorkspace.icon || "/placeholder.svg?height=40&width=40"}
                      alt={selectedWorkspace.groupName}
                    />
                    <AvatarFallback>{selectedWorkspace.groupName?.charAt(0) || "W"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedWorkspace.groupName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Owner: {selectedWorkspace.owner?.username || "Unknown"}
                    </p>
                  </div>
                </div>

                {selectedWorkspace.verificationRequested && (
                  <div className="mb-4">
                    <Label className="text-sm font-medium">Verification Reason</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                      {selectedWorkspace.verificationReason || "No reason provided"}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="verification-note">Admin Note</Label>
                  <Textarea
                    id="verification-note"
                    placeholder="Add a note about this verification decision (optional)"
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                {selectedWorkspace.isVerified ? (
                  <Button
                    variant="destructive"
                    onClick={() => handleVerifyWorkspace(selectedWorkspace.id, false)}
                    disabled={isProcessingVerification}
                  >
                    {isProcessingVerification ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Revoke Verification
                      </>
                    )}
                  </Button>
                ) : selectedWorkspace.verificationRequested ? (
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleVerifyWorkspace(selectedWorkspace.id, false)}
                      disabled={isProcessingVerification}
                    >
                      {isProcessingVerification ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Decline
                        </>
                      )}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleVerifyWorkspace(selectedWorkspace.id, true)}
                      disabled={isProcessingVerification}
                    >
                      {isProcessingVerification ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleVerifyWorkspace(selectedWorkspace.id, true)}
                    disabled={isProcessingVerification}
                  >
                    {isProcessingVerification ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        Verify Workspace
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {/* Delete Confirmation Dialog */}
        {workspaceToDelete && (
          <Dialog open={!!workspaceToDelete} onOpenChange={(open) => !open && setWorkspaceToDelete(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Workspace</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this workspace? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={workspaceToDelete.icon || "/placeholder.svg?height=40&width=40"}
                      alt={workspaceToDelete.groupName}
                    />
                    <AvatarFallback>{workspaceToDelete.groupName?.charAt(0) || "W"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{workspaceToDelete.groupName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Owner: {workspaceToDelete.owner?.username || "Unknown"}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setWorkspaceToDelete(null)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteWorkspace(workspaceToDelete.id)}
                  disabled={isDeleting}
                >
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
        )}
        {workspaceToRestrict && (
          <RestrictionModal
            isOpen={isRestrictionModalOpen}
            onClose={() => {
              setIsRestrictionModalOpen(false)
              setWorkspaceToRestrict(null)
            }}
            onConfirm={handleApplyRestrictions}
            workspaceName={workspaceToRestrict.groupName || "Unknown"}
          />
        )}
      </CardContent>
    </Card>
  )
}

