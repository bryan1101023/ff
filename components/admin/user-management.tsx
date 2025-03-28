"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  banUser,
  unbanUser,
  unverifyUser,
  warnUser,
  setUserImmune,
  removeUserImmunity,
  updateRobloxVerification,
} from "@/lib/auth-utils"
import { Users, Ban, AlertTriangle, CheckCircle, XCircle, Shield } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"

interface UserManagementProps {
  users: any[]
  onRefresh: () => void
}

export default function UserManagement({ users, onRefresh }: UserManagementProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
  const [isUnverifyDialogOpen, setIsUnverifyDialogOpen] = useState(false)
  const [banReason, setBanReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add state for warning dialog
  const [isWarnDialogOpen, setIsWarnDialogOpen] = useState(false)
  const [warnReason, setWarnReason] = useState("")

  // Add state for immunity confirmation
  const [isImmunityDialogOpen, setIsImmunityDialogOpen] = useState(false)

  // Add the manual verify dialog state and function
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false)
  const [robloxUsername, setRobloxUsername] = useState("")
  const [robloxUserId, setRobloxUserId] = useState("")

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) return

    setIsSubmitting(true)

    try {
      await banUser(selectedUser.uid, banReason)
      toast({
        title: "User banned",
        description: `${selectedUser.username} has been banned from the platform.`,
      })
      setIsBanDialogOpen(false)
      setBanReason("")
      onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to ban user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnbanUser = async (user: any) => {
    try {
      await unbanUser(user.uid)
      toast({
        title: "User unbanned",
        description: `${user.username} has been unbanned.`,
      })
      onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unban user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnverifyUser = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)

    try {
      await unverifyUser(selectedUser.uid)
      toast({
        title: "User unverified",
        description: `${selectedUser.username}'s Roblox verification has been removed.`,
      })
      setIsUnverifyDialogOpen(false)
      onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unverify user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add this function after handleUnverifyUser
  const handleManualVerify = async () => {
    if (!selectedUser || !robloxUsername || !robloxUserId) return

    setIsSubmitting(true)

    try {
      // Update the user's Roblox verification status
      await updateRobloxVerification(selectedUser.uid, robloxUsername, Number.parseInt(robloxUserId, 10), true)

      toast({
        title: "User verified",
        description: `${selectedUser.username} has been manually verified with Roblox account ${robloxUsername}.`,
      })
      setIsVerifyDialogOpen(false)
      setRobloxUsername("")
      setRobloxUserId("")
      onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add the warnUser function
  const handleWarnUser = async () => {
    if (!selectedUser || !warnReason.trim()) return

    setIsSubmitting(true)

    try {
      await warnUser(selectedUser.uid, warnReason) // Call the actual warnUser function
      toast({
        title: "User warned",
        description: `${selectedUser.username} has been warned.`,
      })
      setIsWarnDialogOpen(false)
      setWarnReason("")
      onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to warn user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add function to toggle user immunity
  const handleToggleImmunity = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)

    try {
      if (selectedUser.isImmune) {
        await removeUserImmunity(selectedUser.uid)
        toast({
          title: "Immunity removed",
          description: `${selectedUser.username} can no longer recreate deleted workspaces.`,
        })
      } else {
        await setUserImmune(selectedUser.uid)
        toast({
          title: "Immunity granted",
          description: `${selectedUser.username} can now recreate previously deleted workspaces.`,
        })
      }
      setIsImmunityDialogOpen(false)
      onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user immunity. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>View and manage all users on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">
                        {user.username}
                        {user.isImmune && (
                          <Badge variant="outline" className="ml-2 bg-amber-500/10 text-amber-500">
                            Immune
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.isBanned ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <Ban className="h-3 w-3" /> Banned
                          </Badge>
                        ) : user.robloxVerified ? (
                          <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                            <CheckCircle className="h-3 w-3" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Add the Immunity toggle button */}
                          <Button
                            variant={user.isImmune ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              setIsImmunityDialogOpen(true)
                            }}
                          >
                            {user.isImmune ? "Remove Immunity" : "Grant Immunity"}
                          </Button>

                          {user.isBanned ? (
                            <Button variant="outline" size="sm" onClick={() => handleUnbanUser(user)}>
                              Unban
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setIsWarnDialogOpen(true)
                                }}
                              >
                                Warn
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setIsBanDialogOpen(true)
                                }}
                              >
                                Ban
                              </Button>
                            </div>
                          )}

                          {user.robloxVerified && !user.isBanned && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setIsUnverifyDialogOpen(true)
                              }}
                            >
                              Unverify
                            </Button>
                          )}
                          {/* Add this button in the actions section for unverified users */}
                          {/* Find the section with user.robloxVerified and !user.isBanned and add this button */}
                          {/* Inside the <div className="flex items-center gap-2 flex-wrap"> section where other buttons are */}
                          {!user.robloxVerified && !user.isBanned && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setIsVerifyDialogOpen(true)
                              }}
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ban User Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              This will prevent the user from accessing the platform. They will be logged out and unable to log back in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
              <div className="font-medium">{selectedUser?.username}</div>
              <div className="text-sm text-muted-foreground">{selectedUser?.email}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for ban</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for banning this user"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBanUser} disabled={isSubmitting || !banReason.trim()}>
              {isSubmitting ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unverify User Dialog */}
      <Dialog open={isUnverifyDialogOpen} onOpenChange={setIsUnverifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Roblox Verification</DialogTitle>
            <DialogDescription>
              This will remove the user's Roblox verification. They will need to verify their account again to access
              workspaces.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
            <div className="font-medium">{selectedUser?.username}</div>
            <div className="text-sm text-muted-foreground">{selectedUser?.robloxUsername}</div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div className="text-sm">
              This action cannot be undone. The user will need to go through the verification process again.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnverifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnverifyUser} disabled={isSubmitting}>
              {isSubmitting ? "Removing..." : "Remove Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add the Warn User Dialog after the other dialogs */}
      {/* Warn User Dialog */}
      <Dialog open={isWarnDialogOpen} onOpenChange={setIsWarnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warn User</DialogTitle>
            <DialogDescription>
              This will send a warning to the user. They will need to acknowledge the warning before continuing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
              <div className="font-medium">{selectedUser?.username}</div>
              <div className="text-sm text-muted-foreground">{selectedUser?.email}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warnReason">Reason for warning</Label>
              <Textarea
                id="warnReason"
                placeholder="Enter the reason for warning this user"
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWarnDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleWarnUser} disabled={isSubmitting || !warnReason.trim()}>
              {isSubmitting ? "Warning..." : "Warn User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add the Immunity Dialog */}
      <Dialog open={isImmunityDialogOpen} onOpenChange={setIsImmunityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.isImmune ? "Remove Workspace Immunity" : "Grant Workspace Immunity"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.isImmune
                ? "This will remove the user's ability to recreate previously deleted workspaces."
                : "This will allow the user to recreate workspaces for groups that were previously deleted."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
            <div className="font-medium">{selectedUser?.username}</div>
            <div className="text-sm text-muted-foreground">{selectedUser?.email}</div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-500">
            <Shield className="h-5 w-5 mt-0.5" />
            <div className="text-sm">
              {selectedUser?.isImmune
                ? "Removing immunity will prevent this user from recreating deleted workspaces."
                : "Granting immunity is a powerful permission that should be given carefully. This user will be able to recreate workspaces that were previously deleted, potentially bypassing moderation actions."}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImmunityDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={selectedUser?.isImmune ? "destructive" : "default"}
              onClick={handleToggleImmunity}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? selectedUser?.isImmune
                  ? "Removing..."
                  : "Granting..."
                : selectedUser?.isImmune
                  ? "Remove Immunity"
                  : "Grant Immunity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add this dialog after the other dialogs */}
      {/* Manual Verify Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manually Verify User</DialogTitle>
            <DialogDescription>
              This will manually verify the user with a Roblox account. Use this only when the normal verification
              process isn't working.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
              <div className="font-medium">{selectedUser?.username}</div>
              <div className="text-sm text-muted-foreground">{selectedUser?.email}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="robloxUsername">Roblox Username</Label>
              <Input
                id="robloxUsername"
                placeholder="Enter the Roblox username"
                value={robloxUsername}
                onChange={(e) => setRobloxUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="robloxUserId">Roblox User ID</Label>
              <Input
                id="robloxUserId"
                placeholder="Enter the Roblox user ID"
                value={robloxUserId}
                onChange={(e) => setRobloxUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You can find the Roblox User ID by visiting the user's profile on Roblox and checking the URL.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleManualVerify}
              disabled={isSubmitting || !robloxUsername.trim() || !robloxUserId.trim()}
            >
              {isSubmitting ? "Verifying..." : "Verify User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
