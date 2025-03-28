"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, Search, Users, ArrowUpDown, Eye, RefreshCw, AlertTriangle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { getAuth } from "firebase/auth"

export default function MembersPage({ params }: { params: { id: string } }) {
  const [workspace, setWorkspace] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [members, setMembers] = useState<any[]>([])
  const [filteredMembers, setFilteredMembers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "rank",
    direction: "desc",
  })
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("information")
  const [logEntry, setLogEntry] = useState("")
  const [logType, setLogType] = useState("promotion")
  const [note, setNote] = useState("")
  const [logEntries, setLogEntries] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const { id: workspaceId } = params
  const [viewMode, setViewMode] = useState<"roles" | "members">("roles")
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [membersList, setMembersList] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreMembers, setHasMoreMembers] = useState(false)
  const [membersFetchError, setMembersFetchError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId))
        if (workspaceDoc.exists()) {
          const workspaceData = workspaceDoc.data()
          setWorkspace(workspaceData)

          // Fetch group members
          try {
            console.log("Fetching members for group:", workspaceData.groupId)
            const response = await fetch(`/api/roblox/group-members?groupId=${workspaceData.groupId}`)
            const data = await response.json()

            if (!data.success) {
              console.warn("API returned unsuccessful response:", data.error)
              setLoadError(data.error || "Failed to load members from Roblox API")
            } else {
              setMembers(data.members || [])
              setFilteredMembers(data.members || [])

              // Check if we're in role view mode
              if (data.isRoleView) {
                console.log("Using role view mode instead of individual members")
              }
            }
          } catch (error: any) {
            console.error("Error fetching group members:", error)
            setLoadError(error.message || "Failed to load members. Please try refreshing the page.")
          }
        } else {
          setLoadError("Workspace not found")
        }
      } catch (error: any) {
        console.error("Error fetching workspace:", error)
        setLoadError(error.message || "Failed to load workspace data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkspace()
  }, [workspaceId])

  useEffect(() => {
    // Filter and sort members when search query or sort config changes
    let result = [...members]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (member) => member.username.toLowerCase().includes(query) || member.role.name.toLowerCase().includes(query),
      )
    }

    // Sort members
    result.sort((a, b) => {
      let aValue, bValue

      if (sortConfig.key === "username") {
        aValue = a.username.toLowerCase()
        bValue = b.username.toLowerCase()
      } else if (sortConfig.key === "rank") {
        aValue = a.role.rank
        bValue = b.role.rank
      } else {
        aValue = a[sortConfig.key]
        bValue = b[sortConfig.key]
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1
      }
      return 0
    })

    setFilteredMembers(result)
  }, [members, searchQuery, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }))
  }

  // Update the handleViewMember function to properly handle permissions and ensure consistent avatar display
  const handleViewMember = async (member: any) => {
    setSelectedMember(member)
    setIsDialogOpen(true)
    setIsLoadingUserDetails(true)
    setUserDetails(null)
    setActiveTab("information") // Reset to information tab when opening a new member

    // Check if user is trying to manage their own card
    const currentUser = await getCurrentUser() // You'll need to implement this function
    const isSelfManagement =
      currentUser &&
      currentUser.robloxUsername &&
      currentUser.robloxUsername.toLowerCase() === member.username.toLowerCase()

    if (isSelfManagement && !currentUser.isAdmin) {
      setUserDetails({
        error: "permission_denied",
        message: "ERROR 303: You cannot manage your own member card, logbook or activity.",
      })
      setIsLoadingUserDetails(false)
      return
    }

    // Fetch member logs and notes
    try {
      // Fetch logs
      const logsQuery = query(
        collection(db, "workspaces", workspaceId, "memberLogs"),
        where("userId", "==", member.userId),
      )
      const logsSnapshot = await getDocs(logsQuery)
      const logs: any[] = []
      logsSnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      setLogEntries(logs.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()))

      // Fetch notes
      const notesQuery = query(
        collection(db, "workspaces", workspaceId, "memberNotes"),
        where("userId", "==", member.userId),
      )
      const notesSnapshot = await getDocs(notesQuery)
      const memberNotes: any[] = []
      notesSnapshot.forEach((doc) => {
        memberNotes.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      setNotes(memberNotes.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()))

      // Fetch inactivity notices
      const inactivityQuery = query(
        collection(db, "workspaces", workspaceId, "inactivityNotices"),
        where("userId", "==", member.userId),
      )
      const inactivitySnapshot = await getDocs(inactivityQuery)
      const inactivityCount = inactivitySnapshot.size

      // Fetch user details from Roblox API
      try {
        const response = await fetch(`/api/roblox/user-details?userId=${member.userId}`)
        if (response.ok) {
          const data = await response.json()
          // Store the inactivity count with the user details
          setUserDetails({ ...data, inactivityCount })
        } else {
          console.error("Failed to fetch user details")
          setUserDetails({ error: "api_error", inactivityCount })
        }
      } catch (error) {
        console.error("Error fetching user details:", error)
        setUserDetails({ error: "fetch_error", inactivityCount })
      } finally {
        setIsLoadingUserDetails(false)
      }
    } catch (error) {
      console.error("Error fetching member data:", error)
      setIsLoadingUserDetails(false)
    }
  }

  // Add this function to get the current user
  const getCurrentUser = async () => {
    try {
      const auth = getAuth()
      const currentUser = auth.currentUser

      if (!currentUser) return null

      const userDoc = await getDoc(doc(db, "users", currentUser.uid))
      if (userDoc.exists()) {
        return userDoc.data()
      }
      return null
    } catch (error) {
      console.error("Error getting current user:", error)
      return null
    }
  }

  const handleAddLogEntry = async () => {
    if (!logEntry.trim() || !selectedMember) return

    try {
      await addDoc(collection(db, "workspaces", workspaceId, "memberLogs"), {
        userId: selectedMember.userId,
        username: selectedMember.username,
        type: logType,
        content: logEntry,
        timestamp: serverTimestamp(),
      })

      // Show success toast
      toast({
        title: "Log entry added",
        description: "The log entry has been saved successfully.",
      })

      // Refresh logs
      const logsQuery = query(
        collection(db, "workspaces", workspaceId, "memberLogs"),
        where("userId", "==", selectedMember.userId),
      )
      const logsSnapshot = await getDocs(logsQuery)
      const logs: any[] = []
      logsSnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      setLogEntries(logs.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()))

      // Clear form
      setLogEntry("")
    } catch (error) {
      console.error("Error adding log entry:", error)
      toast({
        title: "Error",
        description: "Failed to save log entry. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddNote = async () => {
    if (!note.trim() || !selectedMember) return

    try {
      await addDoc(collection(db, "workspaces", workspaceId, "memberNotes"), {
        userId: selectedMember.userId,
        username: selectedMember.username,
        content: note,
        timestamp: serverTimestamp(),
      })

      // Show success toast
      toast({
        title: "Note added",
        description: "The note has been saved successfully.",
      })

      // Refresh notes
      const notesQuery = query(
        collection(db, "workspaces", workspaceId, "memberNotes"),
        where("userId", "==", selectedMember.userId),
      )
      const notesSnapshot = await getDocs(notesQuery)
      const memberNotes: any[] = []
      notesSnapshot.forEach((doc) => {
        memberNotes.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      setNotes(memberNotes.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()))

      // Clear form
      setNote("")
    } catch (error) {
      console.error("Error adding note:", error)
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case "promotion":
        return "bg-green-500"
      case "demotion":
        return "bg-red-500"
      case "warning":
        return "bg-amber-500"
      case "other":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setLoadError(null)
    window.location.reload()
  }

  const handleShowMembers = async () => {
    if (viewMode === "members") {
      // Switch back to roles view
      setViewMode("roles")
      return
    }

    setIsLoadingMembers(true)
    setMembersFetchError(null)

    try {
      // Fetch actual members for the selected role or all members
      const response = await fetch(
        `/api/roblox/group-members-list?groupId=${workspace?.groupId}&page=${currentPage}&limit=100`,
      )
      const data = await response.json()

      if (!data.success) {
        setMembersFetchError(data.error || "Failed to load members from Roblox API")
      } else {
        setMembersList(data.members || [])
        setHasMoreMembers(data.hasMore || false)
        setViewMode("members")
      }
    } catch (error: any) {
      console.error("Error fetching group members:", error)
      setMembersFetchError(error.message || "Failed to load members. Please try refreshing the page.")
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const handleLoadMoreMembers = async () => {
    setIsLoadingMembers(true)

    try {
      const nextPage = currentPage + 1
      const response = await fetch(
        `/api/roblox/group-members-list?groupId=${workspace?.groupId}&page=${nextPage}&limit=100`,
      )
      const data = await response.json()

      if (data.success) {
        setMembersList([...membersList, ...(data.members || [])])
        setHasMoreMembers(data.hasMore || false)
        setCurrentPage(nextPage)
      }
    } catch (error) {
      console.error("Error fetching more members:", error)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Group Members</h1>
          <p className="text-white/60">Manage members of {workspace?.groupName}</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Unable to Load Members</h3>
              <p className="text-red-500 mb-6">{loadError}</p>
              <Alert variant="destructive" className="mb-6 max-w-md mx-auto">
                <AlertDescription>
                  Due to Roblox API limitations, we cannot fetch individual members for this group. The Roblox API has
                  restricted access to group member data for privacy and performance reasons. You can still use other
                  features of the workspace.
                </AlertDescription>
              </Alert>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Button variant="outline" onClick={() => window.history.back()}>
                  Go Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Group Members</h1>
        <p className="text-white/60">Manage members of {workspace?.groupName}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {viewMode === "roles" ? "Group Roles" : "Group Members"}
              </CardTitle>
              <CardDescription>
                {viewMode === "roles"
                  ? "View roles and member counts in your group"
                  : "View and manage individual members in your group"}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleShowMembers} disabled={isLoadingMembers}>
              {isLoadingMembers ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : viewMode === "roles" ? (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Show Members
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Show Roles
                </>
              )}
            </Button>
          </div>
          {filteredMembers.length > 0 && filteredMembers[0].isRoleGroup && viewMode === "roles" && (
            <Alert className="mt-4">
              <AlertDescription>
                Due to Roblox API limitations, we can only show roles and member counts by default. Click "Show Members"
                to view individual members (limited to 100 per page).
              </AlertDescription>
            </Alert>
          )}
          {membersFetchError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{membersFetchError}</AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            <>
              {viewMode === "roles" ? (
                // Roles view (existing code)
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">
                          <Button variant="ghost" className="p-0 font-semibold" onClick={() => handleSort("username")}>
                            Username
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" className="p-0 font-semibold" onClick={() => handleSort("rank")}>
                            Role
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow key={member.userId}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {member.isRoleGroup ? (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                  <Users className="h-4 w-4" />
                                </div>
                              ) : (
                                <img
                                  src={member.avatar || "/placeholder.svg?height=32&width=32"}
                                  alt={member.username}
                                  className="w-8 h-8 rounded-full"
                                />
                              )}
                              {member.username}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${member.role.rank >= 200 ? "bg-red-500" : member.role.rank >= 100 ? "bg-amber-500" : "bg-blue-500"}`}
                            >
                              {member.role.name}
                            </Badge>
                            {member.isRoleGroup && member.memberCount > 0 && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {member.memberCount.toLocaleString()} members
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {member.isRoleGroup ? (
                              <Button variant="outline" size="sm" disabled>
                                <Users className="h-4 w-4 mr-2" />
                                Role Group
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleViewMember(member)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Manage
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                // Members view (new code)
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {membersList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8">
                              {isLoadingMembers ? (
                                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                              ) : (
                                <p className="text-muted-foreground">No members found</p>
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          membersList.map((member) => (
                            <TableRow key={member.userId}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={member.avatar || "/placeholder.svg?height=32&width=32"}
                                    alt={member.username}
                                    className="w-8 h-8 rounded-full"
                                  />
                                  {member.username}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${member.role.rank >= 200 ? "bg-red-500" : member.role.rank >= 100 ? "bg-amber-500" : "bg-blue-500"}`}
                                >
                                  {member.role.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleViewMember(member)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Manage
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {hasMoreMembers && (
                    <div className="flex justify-center mt-4">
                      <Button variant="outline" onClick={handleLoadMoreMembers} disabled={isLoadingMembers}>
                        {isLoadingMembers ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Load More Members"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Member Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMember && (
                <>
                  <img
                    src={userDetails?.avatar || selectedMember.avatar || "/placeholder.svg?height=32&width=32"}
                    alt={selectedMember.username}
                    className="w-8 h-8 rounded-full"
                  />
                  {selectedMember.username}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="information">Information</TabsTrigger>
              <TabsTrigger value="logbook" disabled={userDetails?.error === "permission_denied"}>
                Logbook
              </TabsTrigger>
              <TabsTrigger value="activity" disabled={userDetails?.error === "permission_denied"}>
                Activity
              </TabsTrigger>
              <TabsTrigger value="notes" disabled={userDetails?.error === "permission_denied"}>
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="information" className="space-y-4">
              {selectedMember && (
                <>
                  {userDetails?.error === "permission_denied" ? (
                    <div className="flex items-center justify-center h-40 bg-black rounded-lg">
                      <p className="text-white text-lg font-medium">{userDetails.message}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 mb-4">
                        {isLoadingUserDetails ? (
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : (
                          <img
                            src={userDetails?.avatar || selectedMember.avatar || "/placeholder.svg?height=96&width=96"}
                            alt={selectedMember.username}
                            className="w-24 h-24 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <h3 className="text-xl font-bold">{selectedMember.username}</h3>
                          <p className="text-muted-foreground">User ID: {selectedMember.userId}</p>
                          <Badge
                            className={`mt-2 ${selectedMember.role.rank >= 200 ? "bg-red-500" : selectedMember.role.rank >= 100 ? "bg-amber-500" : "bg-blue-500"}`}
                          >
                            {selectedMember.role.name}
                          </Badge>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Group Information</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Role:</span>
                              <span>{selectedMember.role.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rank:</span>
                              <span>{selectedMember.role.rank}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Inactivity Notices:</span>
                              <span>{userDetails?.inactivityCount || 0}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Roblox Information</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Account Age:</span>
                              <span>
                                {userDetails?.accountAge
                                  ? `${userDetails.accountAge.years} years (${userDetails.accountAge.days} days)`
                                  : "Loading..."}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Friends:</span>
                              <span>
                                {userDetails?.friendsCount !== undefined
                                  ? userDetails.friendsCount.toLocaleString()
                                  : "Loading..."}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Profile:</span>
                              <a
                                href={`https://www.roblox.com/users/${selectedMember.userId}/profile`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                View Profile
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="logbook" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="logEntry">Log Entry</Label>
                    <Textarea
                      id="logEntry"
                      placeholder="Enter details about this action..."
                      value={logEntry}
                      onChange={(e) => setLogEntry(e.target.value)}
                      className="h-20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="logType">Entry Type</Label>
                    <Select value={logType} onValueChange={setLogType}>
                      <SelectTrigger id="logType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="demotion">Demotion</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button className="w-full mt-2" onClick={handleAddLogEntry} disabled={!logEntry.trim()}>
                      Add Entry
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Log History</h4>

                  {logEntries.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No log entries yet</p>
                  ) : (
                    <div className="space-y-3">
                      {logEntries.map((entry) => (
                        <div key={entry.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <Badge className={getLogTypeColor(entry.type)}>
                              {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</span>
                          </div>
                          <p className="text-sm">{entry.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Activity tracking coming soon</p>
                  <p className="text-xs text-muted-foreground">
                    This feature will track member activity in group games and events
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="note">Add Note</Label>
                  <Textarea
                    id="note"
                    placeholder="Add a note about this member..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-20"
                  />
                  <Button className="mt-2" onClick={handleAddNote} disabled={!note.trim()}>
                    Add Note
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Notes</h4>

                  {notes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No notes yet</p>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((noteItem) => (
                        <div key={noteItem.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium">Note</span>
                            <span className="text-xs text-muted-foreground">{formatDate(noteItem.timestamp)}</span>
                          </div>
                          <p className="text-sm">{noteItem.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {userDetails?.error === "permission_denied" && (
            <Alert variant="destructive">
              <AlertDescription>{userDetails.message}</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

