"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  Play,
  Square,
  User,
  UserPlus,
  Search,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { getDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  createSession,
  getWorkspaceSessions,
  deleteSession,
  startSession,
  endSession,
  type Session,
} from "@/lib/session-utils"
import { format } from "date-fns"

export default function SessionsPage() {
  const { id: workspaceId } = useParams<{ id: string }>()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [isUpdatingSession, setIsUpdatingSession] = useState(false)
  const [newSession, setNewSession] = useState<Partial<Session>>({
    title: "",
    description: "",
    date: Date.now() + 86400000, // Tomorrow
    duration: 60, // 1 hour
    location: "Main Group Game",
    host: { userId: "", username: "" },
    coHosts: [],
    trainers: [],
    helpers: [],
    attendees: [],
    status: "scheduled",
  })

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch user data
        const userDataFromStorage = localStorage.getItem("userData")
        if (userDataFromStorage) {
          const parsedUserData = JSON.parse(userDataFromStorage)
          setUserData(parsedUserData)

          // Set the current user as the host
          setNewSession((prev) => ({
            ...prev,
            host: {
              userId: parsedUserData.uid,
              username: parsedUserData.username || parsedUserData.email,
            },
          }))
        }

        // Fetch sessions
        const sessionsData = await getWorkspaceSessions(workspaceId as string)
        setSessions(sessionsData)
        setFilteredSessions(sessionsData)

        // Fetch members
        await fetchMembers()
      } catch (error) {
        console.error("Error fetching data:", error instanceof Error ? error.message : String(error))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [workspaceId])

  const fetchMembers = async () => {
    setIsLoadingMembers(true)
    try {
      const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId as string))

      if (workspaceDoc.exists()) {
        const workspaceData = workspaceDoc.data()
        const memberIds = workspaceData.members || []

        const memberData = []

        for (const memberId of memberIds) {
          const memberDoc = await getDoc(doc(db, "users", memberId))
          if (memberDoc.exists()) {
            memberData.push({
              id: memberId,
              ...memberDoc.data(),
            })
          }
        }

        setMembers(memberData)
      }
    } catch (error) {
      console.error("Error fetching members:", error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoadingMembers(false)
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSessions(sessions)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredSessions(
        sessions.filter(
          (session) =>
            session.title.toLowerCase().includes(query) ||
            session.description.toLowerCase().includes(query) ||
            session.location.toLowerCase().includes(query) ||
            session.host.username.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, sessions])

  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.date || !userData?.uid) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsCreatingSession(true)
    try {
      // Add selected members as attendees
      const attendees = [...members]
        .filter(
          (member) =>
            member.id !== newSession.host?.userId &&
            !newSession.coHosts?.some((coHost) => coHost.userId === member.id) &&
            !newSession.trainers?.some((trainer) => trainer.userId === member.id) &&
            !newSession.helpers?.some((helper) => helper.userId === member.id),
        )
        .map((member) => ({
          userId: member.id,
          username: member.username || member.email,
          attended: false,
        }))

      const sessionId = await createSession({
        ...(newSession as Session),
        workspaceId: workspaceId as string,
        createdBy: userData.uid,
        attendees,
      })

      // Add the new session to the state
      const createdSession = {
        id: sessionId,
        ...(newSession as Session),
        workspaceId: workspaceId as string,
        createdBy: userData.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attendees,
      }

      setSessions((prev) => [...prev, createdSession])
      setFilteredSessions((prev) => [...prev, createdSession])

      // Reset the form
      setNewSession({
        title: "",
        description: "",
        date: Date.now() + 86400000, // Tomorrow
        duration: 60, // 1 hour
        location: "Main Group Game",
        host: { userId: userData.uid, username: userData.username || userData.email },
        coHosts: [],
        trainers: [],
        helpers: [],
        attendees: [],
        status: "scheduled",
      })

      toast({
        title: "Success",
        description: "Session created successfully",
      })
    } catch (error) {
      console.error("Error creating session:", error instanceof Error ? error.message : String(error))
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      })
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId, userData.uid)

      // Remove the session from the state
      setSessions((prev) => prev.filter((session) => session.id !== sessionId))
      setFilteredSessions((prev) => prev.filter((session) => session.id !== sessionId))

      toast({
        title: "Success",
        description: "Session deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting session:", error instanceof Error ? error.message : String(error))
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      })
    }
  }

  const handleStartSession = async (sessionId: string) => {
    try {
      await startSession(sessionId, userData.uid)

      // Update the session in the state
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, status: "in_progress", updatedAt: Date.now() } : session,
        ),
      )
      setFilteredSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, status: "in_progress", updatedAt: Date.now() } : session,
        ),
      )

      toast({
        title: "Success",
        description: "Session started successfully",
      })
    } catch (error) {
      console.error("Error starting session:", error instanceof Error ? error.message : String(error))
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive",
      })
    }
  }

  const handleEndSession = async (sessionId: string) => {
    try {
      await endSession(sessionId, userData.uid)

      // Update the session in the state
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, status: "completed", updatedAt: Date.now() } : session,
        ),
      )
      setFilteredSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, status: "completed", updatedAt: Date.now() } : session,
        ),
      )

      toast({
        title: "Success",
        description: "Session ended successfully",
      })
    } catch (error) {
      console.error("Error ending session:", error instanceof Error ? error.message : String(error))
      toast({
        title: "Error",
        description: "Failed to end session",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  // Create session dialog content
  const createSessionDialogContent = (
    <>
      <DialogHeader>
        <DialogTitle>Create Training Session</DialogTitle>
        <DialogDescription>Schedule a new training session for your group members</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="session-title">Session Title *</Label>
          <Input
            id="session-title"
            placeholder="Enter a title for this session"
            value={newSession.title}
            onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="session-description">Description</Label>
          <Textarea
            id="session-description"
            placeholder="Enter a description for this session"
            value={newSession.description}
            onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="session-date">Date and Time *</Label>
            <Input
              id="session-date"
              type="datetime-local"
              value={new Date(newSession.date || Date.now()).toISOString().slice(0, 16)}
              onChange={(e) => setNewSession({ ...newSession, date: new Date(e.target.value).getTime() })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-duration">Duration (minutes) *</Label>
            <Input
              id="session-duration"
              type="number"
              min="15"
              step="15"
              value={newSession.duration}
              onChange={(e) => setNewSession({ ...newSession, duration: Number.parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="session-location">Location *</Label>
          <Input
            id="session-location"
            placeholder="Enter the location (game, Discord, etc.)"
            value={newSession.location}
            onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Session Roles</h3>

          <div className="space-y-2">
            <Label htmlFor="session-host">Host *</Label>
            <Select
              value={newSession.host?.userId || ""}
              onValueChange={(value) => {
                const selectedMember = members.find((member) => member.id === value)
                if (selectedMember) {
                  setNewSession({
                    ...newSession,
                    host: {
                      userId: selectedMember.id,
                      username: selectedMember.username || selectedMember.email,
                    },
                  })
                }
              }}
            >
              <SelectTrigger id="session-host">
                <SelectValue placeholder="Select a host" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.username || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Co-Hosts</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {newSession.coHosts?.map((coHost) => (
                <Badge key={coHost.userId} variant="secondary" className="flex items-center gap-1">
                  {coHost.username}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => {
                      setNewSession({
                        ...newSession,
                        coHosts: newSession.coHosts?.filter((h) => h.userId !== coHost.userId),
                      })
                    }}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(value) => {
                if (!value) return

                const selectedMember = members.find((member) => member.id === value)
                if (selectedMember) {
                  // Check if already added
                  if (
                    newSession.host?.userId === value ||
                    newSession.coHosts?.some((h) => h.userId === value) ||
                    newSession.trainers?.some((t) => t.userId === value) ||
                    newSession.helpers?.some((h) => h.userId === value)
                  ) {
                    return
                  }

                  setNewSession({
                    ...newSession,
                    coHosts: [
                      ...(newSession.coHosts || []),
                      {
                        userId: selectedMember.id,
                        username: selectedMember.username || selectedMember.email,
                      },
                    ],
                  })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add co-host" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter(
                    (member) =>
                      member.id !== newSession.host?.userId &&
                      !newSession.coHosts?.some((h) => h.userId === member.id) &&
                      !newSession.trainers?.some((t) => t.userId === member.id) &&
                      !newSession.helpers?.some((h) => h.userId === member.id),
                  )
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.username || member.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trainers</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {newSession.trainers?.map((trainer) => (
                <Badge key={trainer.userId} variant="secondary" className="flex items-center gap-1">
                  {trainer.username}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => {
                      setNewSession({
                        ...newSession,
                        trainers: newSession.trainers?.filter((t) => t.userId !== trainer.userId),
                      })
                    }}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(value) => {
                if (!value) return

                const selectedMember = members.find((member) => member.id === value)
                if (selectedMember) {
                  // Check if already added
                  if (
                    newSession.host?.userId === value ||
                    newSession.coHosts?.some((h) => h.userId === value) ||
                    newSession.trainers?.some((t) => t.userId === value) ||
                    newSession.helpers?.some((h) => h.userId === value)
                  ) {
                    return
                  }

                  setNewSession({
                    ...newSession,
                    trainers: [
                      ...(newSession.trainers || []),
                      {
                        userId: selectedMember.id,
                        username: selectedMember.username || selectedMember.email,
                      },
                    ],
                  })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add trainer" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter(
                    (member) =>
                      member.id !== newSession.host?.userId &&
                      !newSession.coHosts?.some((h) => h.userId === member.id) &&
                      !newSession.trainers?.some((t) => t.userId === member.id) &&
                      !newSession.helpers?.some((h) => h.userId === member.id),
                  )
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.username || member.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Helpers</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {newSession.helpers?.map((helper) => (
                <Badge key={helper.userId} variant="secondary" className="flex items-center gap-1">
                  {helper.username}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => {
                      setNewSession({
                        ...newSession,
                        helpers: newSession.helpers?.filter((h) => h.userId !== helper.userId),
                      })
                    }}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(value) => {
                if (!value) return

                const selectedMember = members.find((member) => member.id === value)
                if (selectedMember) {
                  // Check if already added
                  if (
                    newSession.host?.userId === value ||
                    newSession.coHosts?.some((h) => h.userId === value) ||
                    newSession.trainers?.some((t) => t.userId === value) ||
                    newSession.helpers?.some((h) => h.userId === value)
                  ) {
                    return
                  }

                  setNewSession({
                    ...newSession,
                    helpers: [
                      ...(newSession.helpers || []),
                      {
                        userId: selectedMember.id,
                        username: selectedMember.username || selectedMember.email,
                      },
                    ],
                  })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add helper" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter(
                    (member) =>
                      member.id !== newSession.host?.userId &&
                      !newSession.coHosts?.some((h) => h.userId === member.id) &&
                      !newSession.trainers?.some((t) => t.userId === member.id) &&
                      !newSession.helpers?.some((h) => h.userId === member.id),
                  )
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.username || member.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleCreateSession} disabled={isCreatingSession}>
          {isCreatingSession ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Session"
          )}
        </Button>
      </DialogFooter>
    </>
  )

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Training Sessions</h1>
        <p className="text-muted-foreground">Schedule and manage training sessions for your group</p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past Sessions</TabsTrigger>
            <TabsTrigger value="all">All Sessions</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search sessions..."
                className="pl-9 w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Session
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">{createSessionDialogContent}</DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="upcoming" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSessions.filter((session) => session.date > Date.now() && session.status !== "cancelled").length >
            0 ? (
            <div className="grid gap-4">
              {filteredSessions
                .filter((session) => session.date > Date.now() && session.status !== "cancelled")
                .sort((a, b) => a.date - b.date)
                .map((session) => (
                  <Card key={session.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle>{session.title}</CardTitle>
                            {getStatusBadge(session.status)}
                          </div>
                          <CardDescription>{session.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {session.status === "scheduled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleStartSession(session.id!)}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}
                          {session.status === "in_progress" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleEndSession(session.id!)}
                            >
                              <Square className="h-4 w-4 mr-1" />
                              End
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteSession(session.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(session.date), "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {format(new Date(session.date), "h:mm a")} ({session.duration} minutes)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{session.location}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Host: <span className="font-medium">{session.host.username}</span>
                            </span>
                          </div>
                          {session.coHosts && session.coHosts.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Co-Hosts: {session.coHosts.map((coHost) => coHost.username).join(", ")}</span>
                            </div>
                          )}
                          {session.trainers && session.trainers.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Trainers: {session.trainers.map((trainer) => trainer.username).join(", ")}</span>
                            </div>
                          )}
                          {session.helpers && session.helpers.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Helpers: {session.helpers.map((helper) => helper.username).join(", ")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{session.attendees?.length || 0} attendees</span>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No upcoming sessions</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Schedule your first training session to get started
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">{createSessionDialogContent}</DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSessions.filter((session) => session.date < Date.now() || session.status === "completed").length >
            0 ? (
            <div className="grid gap-4">
              {filteredSessions
                .filter((session) => session.date < Date.now() || session.status === "completed")
                .sort((a, b) => b.date - a.date)
                .map((session) => (
                  <Card key={session.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle>{session.title}</CardTitle>
                            {getStatusBadge(session.status)}
                          </div>
                          <CardDescription>{session.description}</CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteSession(session.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(session.date), "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {format(new Date(session.date), "h:mm a")} ({session.duration} minutes)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{session.location}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Host: <span className="font-medium">{session.host.username}</span>
                            </span>
                          </div>
                          {session.coHosts && session.coHosts.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Co-Hosts: {session.coHosts.map((coHost) => coHost.username).join(", ")}</span>
                            </div>
                          )}
                          {session.trainers && session.trainers.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Trainers: {session.trainers.map((trainer) => trainer.username).join(", ")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 mr-4">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{session.attendees?.length || 0} attendees</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            {session.attendees?.filter((a) => a.attended).length || 0} attended
                          </span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No past sessions</h3>
                <p className="text-muted-foreground text-center">Past and completed sessions will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="grid gap-4">
              {filteredSessions
                .sort((a, b) => b.date - a.date)
                .map((session) => (
                  <Card key={session.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle>{session.title}</CardTitle>
                            {getStatusBadge(session.status)}
                          </div>
                          <CardDescription>{session.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {session.status === "scheduled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleStartSession(session.id!)}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}
                          {session.status === "in_progress" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleEndSession(session.id!)}
                            >
                              <Square className="h-4 w-4 mr-1" />
                              End
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteSession(session.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(session.date), "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {format(new Date(session.date), "h:mm a")} ({session.duration} minutes)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{session.location}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Host: <span className="font-medium">{session.host.username}</span>
                            </span>
                          </div>
                          {session.coHosts && session.coHosts.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Co-Hosts: {session.coHosts.map((coHost) => coHost.username).join(", ")}</span>
                            </div>
                          )}
                          {session.trainers && session.trainers.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Trainers: {session.trainers.map((trainer) => trainer.username).join(", ")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No sessions found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first training session to get started
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">{createSessionDialogContent}</DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

