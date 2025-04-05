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
import { SessionTypeSelector } from "@/components/workspace/session-type-selector"
import {
  createSession,
  getWorkspaceSessions,
  deleteSession,
  startSession,
  endSession,
  type Session,
} from "@/lib/session-utils"
import { format } from "date-fns"
import { createLogEntry } from "@/lib/logging-utils"

export default function SessionsPage() {
  const { id: workspaceId } = useParams<{ id: string }>()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [isUpdatingSession, setIsUpdatingSession] = useState(false)
  const [showSessionTypeSelector, setShowSessionTypeSelector] = useState(false)
  const [sessionType, setSessionType] = useState<'training' | 'shift' | null>(null)
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
  const [activeTab, setActiveTab] = useState("upcoming")

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get auth state directly
        const { getAuth, onAuthStateChanged } = await import("firebase/auth");
        const auth = getAuth();
        
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            console.log("Auth state changed, user is signed in:", user);
            
            // Get additional user data from Firestore if needed
            try {
              const { doc, getDoc } = await import("firebase/firestore");
              const { db } = await import("@/lib/firebase");
              
              const userDocRef = doc(db, "users", user.uid);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                const userData = {
                  uid: user.uid,
                  email: user.email,
                  ...userDoc.data()
                };
                console.log("User data from Firestore:", userData);
                setUserData(userData);
                
                // Update host in newSession
                setNewSession(prev => ({
                  ...prev,
                  host: {
                    userId: userData.uid,
                    username: userData.username || userData.email
                  }
                }));
              } else {
                // Just use the auth user data
                const basicUserData = {
                  uid: user.uid,
                  email: user.email
                };
                console.log("Basic user data from Auth:", basicUserData);
                setUserData(basicUserData);
                
                // Update host in newSession
                setNewSession(prev => ({
                  ...prev,
                  host: {
                    userId: user.uid,
                    username: user.email || user.uid
                  }
                }));
              }
            } catch (error) {
              console.error("Error getting user data from Firestore:", error);
              // Use basic auth data as fallback
              const basicUserData = {
                uid: user.uid,
                email: user.email
              };
              console.log("Fallback to basic user data from Auth:", basicUserData);
              setUserData(basicUserData);
              
              // Update host in newSession
              setNewSession(prev => ({
                ...prev,
                host: {
                  userId: user.uid,
                  username: user.email || user.uid
                }
              }));
            }
          } else {
            console.log("Auth state changed, no user is signed in");
            setUserData(null);
          }
        });
      } catch (error) {
        console.error("Error setting up auth state listener:", error);
      }
    };
    
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
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

  useEffect(() => {
    // Filter for today's sessions
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todaySessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= todayStart && sessionDate <= todayEnd;
    });
  }, [sessions]);

  const handleCreateSession = async () => {
    console.log("Create button clicked", { newSession, userData, workspaceId });
    
    // Set submitting state immediately
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      if (!newSession.title || !newSession.host || !workspaceId || !userData) {
        console.log("Missing required fields", { 
          title: newSession.title, 
          host: newSession.host, 
          workspaceId, 
          userData 
        });
        
        toast({
          title: "Missing required fields",
          description: "Please fill in all required fields or try again after signing in",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      console.log("Creating session with data:", {
        ...newSession,
        workspaceId: workspaceId as string,
        createdBy: userData.uid,
        type: sessionType || "training"
      });
      
      // Add createdBy field to the session
      const sessionToCreate = {
        ...newSession,
        workspaceId: workspaceId as string,
        createdBy: userData.uid,
        type: sessionType || "training"
      } as Session;
      
      // Create the session
      const sessionId = await createSession(sessionToCreate);
      console.log("Session created with ID:", sessionId);

      // Refresh sessions
      const updatedSessions = await getWorkspaceSessions(workspaceId as string);
      console.log("Updated sessions:", updatedSessions);
      setSessions(updatedSessions);
      setFilteredSessions(updatedSessions);

      // Close the dialog
      setIsCreatingSession(false);
      
      // Switch to Today's Sessions tab
      setActiveTab("today");
      
      toast({
        title: "Session created",
        description: "Your session has been created successfully",
      });

      // Reset form
      setNewSession({
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
      });
    } catch (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create session",
        variant: "destructive",
      });
    } finally {
      // Always reset the submitting state
      setIsSubmitting(false);
      console.log("Session creation process completed");
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return
    if (!userData?.uid || !workspaceId) return

    setIsUpdatingSession(true)
    try {
      await deleteSession(sessionId, userData.uid)

      // Log the session deletion
      if (userData) {
        await createLogEntry({
          type: "session_deleted",
          userId: userData.uid,
          username: userData.username || userData.email,
          workspaceId: String(workspaceId),
          details: { sessionId },
        })
      }

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
    } finally {
      setIsUpdatingSession(false)
    }
  }

  const handleStartSession = async (sessionId: string) => {
    if (!userData?.uid || !workspaceId) {
      toast({
        title: "Error",
        description: "Workspace ID or user data is missing",
        variant: "destructive",
      })
      return
    }

    setIsUpdatingSession(true)
    try {
      // Pass username to startSession function to ensure proper logging
      await startSession(sessionId, userData.uid, userData.username || userData.email)

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
    } finally {
      setIsUpdatingSession(false)
    }
  }

  const handleEndSession = async (sessionId: string) => {
    if (!userData?.uid || !workspaceId) {
      toast({
        title: "Error",
        description: "Workspace ID or user data is missing",
        variant: "destructive",
      })
      return
    }
    
    setIsUpdatingSession(true)
    try {
      await endSession(sessionId, userData.uid)
      
      // Log the session end
      if (userData) {
        await createLogEntry({
          type: "session_ended",
          userId: userData.uid,
          username: userData.username || userData.email,
          workspaceId: String(workspaceId),
          details: { sessionId }
        })
      }
      
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
    } finally {
      setIsUpdatingSession(false)
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

  // Test function to create a session directly
  const testCreateSession = async () => {
    try {
      // Get workspace ID from params
      const wsId = workspaceId as string;
      if (!wsId) {
        console.error("No workspace ID found");
        return;
      }

      // Get user data from local storage
      const userDataStr = localStorage.getItem("userData");
      if (!userDataStr) {
        console.error("No user data found in localStorage");
        return;
      }

      const user = JSON.parse(userDataStr);
      console.log("User data:", user);

      // Create a simple test session
      const testSession = {
        workspaceId: wsId,
        title: "Test Session " + new Date().toLocaleTimeString(),
        description: "This is a test session",
        date: Date.now() + 3600000, // 1 hour from now
        duration: 60,
        location: "Test Location",
        host: {
          userId: user.uid,
          username: user.username || user.email
        },
        coHosts: [],
        trainers: [],
        helpers: [],
        attendees: [],
        status: "scheduled",
        createdBy: user.uid,
        type: "training"
      };

      console.log("Creating test session:", testSession);

      // Add directly to Firestore
      const { addDoc, collection } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const sessionRef = await addDoc(collection(db, "sessions"), {
        ...testSession,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      console.log("Test session created with ID:", sessionRef.id);
      
      toast({
        title: "Test session created",
        description: "Session ID: " + sessionRef.id,
      });

      // Refresh sessions
      const updatedSessions = await getWorkspaceSessions(wsId);
      setSessions(updatedSessions);
      setFilteredSessions(updatedSessions);
      setActiveTab("today");
    } catch (error) {
      console.error("Error in test function:", error);
      toast({
        title: "Error in test function",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  // Test function to create a session using auth state
  const testCreateSessionWithAuth = async () => {
    try {
      // Get workspace ID from params
      const wsId = workspaceId as string;
      if (!wsId) {
        console.error("No workspace ID found");
        toast({
          title: "Error",
          description: "No workspace ID found",
          variant: "destructive",
        });
        return;
      }

      // Get auth state directly
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error("No user is signed in");
        toast({
          title: "Error",
          description: "No user is signed in. Please sign in first.",
          variant: "destructive",
        });
        return;
      }

      console.log("Current user:", currentUser);

      // Create a simple test session
      const testSession = {
        workspaceId: wsId,
        title: "Test Session " + new Date().toLocaleTimeString(),
        description: "This is a test session",
        date: Date.now() + 3600000, // 1 hour from now
        duration: 60,
        location: "Test Location",
        host: {
          userId: currentUser.uid,
          username: currentUser.email || currentUser.uid
        },
        coHosts: [],
        trainers: [],
        helpers: [],
        attendees: [],
        status: "scheduled",
        createdBy: currentUser.uid,
        type: "training"
      };

      console.log("Creating test session:", testSession);

      // Add directly to Firestore
      const { addDoc, collection } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const sessionRef = await addDoc(collection(db, "sessions"), {
        ...testSession,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      console.log("Test session created with ID:", sessionRef.id);
      
      toast({
        title: "Test session created",
        description: "Session ID: " + sessionRef.id,
      });

      // Refresh sessions
      const updatedSessions = await getWorkspaceSessions(wsId);
      setSessions(updatedSessions);
      setFilteredSessions(updatedSessions);
      setActiveTab("today");
    } catch (error) {
      console.error("Error in test function:", error);
      toast({
        title: "Error in test function",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

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

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <Button onClick={() => setShowSessionTypeSelector(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Host Session
          </Button>
        </div>

        {/* Session Type Selector Dialog */}
        <SessionTypeSelector
          isOpen={showSessionTypeSelector}
          onClose={() => setShowSessionTypeSelector(false)}
          onSelectTraining={() => {
            setShowSessionTypeSelector(false);
            setSessionType('training');
            setNewSession(prev => ({
              ...prev,
              title: "Training Session",
              type: "training"
            }));
            setIsCreatingSession(true);
          }}
          onSelectShift={() => {
            setShowSessionTypeSelector(false);
            setSessionType('shift');
            setNewSession(prev => ({
              ...prev,
              title: "Shift",
              type: "shift"
            }));
            setIsCreatingSession(true);
          }}
        />

        {/* Main Session Creation Dialog */}
        <Dialog open={isCreatingSession} onOpenChange={(open) => {
          if (!isSubmitting) {
            setIsCreatingSession(open);
          }
        }}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{sessionType === 'training' ? 'Create Training Session' : 'Create Shift'}</DialogTitle>
              <DialogDescription>
                {sessionType === 'training' 
                  ? 'Schedule a new training session for your group members.'
                  : 'Schedule a new shift for your group.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="session-title">Session Title *</Label>
                <Input
                  id="session-title"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  placeholder="e.g., Training for new staff"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="session-description">Description</Label>
                <Textarea
                  id="session-description"
                  value={newSession.description}
                  onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                  placeholder="Describe the purpose and details of this session"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session-date">Date *</Label>
                  <Input
                    id="session-date"
                    type="datetime-local"
                    value={new Date(newSession.date || Date.now()).toISOString().slice(0, 16)}
                    onChange={(e) =>
                      setNewSession({
                        ...newSession,
                        date: new Date(e.target.value).getTime(),
                      })
                    }
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
                    onChange={(e) =>
                      setNewSession({
                        ...newSession,
                        duration: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="session-location">Location *</Label>
                <Input
                  id="session-location"
                  value={newSession.location}
                  onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
                  placeholder="e.g., Main Group Game"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (!isSubmitting) {
                    handleCreateSession();
                  }
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past Sessions</TabsTrigger>
            <TabsTrigger value="all">All Sessions</TabsTrigger>
            <TabsTrigger value="today">Today's Sessions</TabsTrigger>
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

        <TabsContent value="today" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSessions.filter((session) => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            const sessionDate = new Date(session.date);
            return sessionDate >= todayStart && sessionDate <= todayEnd;
          }).length > 0 ? (
            <div className="grid gap-4">
              {filteredSessions.filter((session) => {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);
                const sessionDate = new Date(session.date);
                return sessionDate >= todayStart && sessionDate <= todayEnd;
              }).sort((a, b) => a.date - b.date).map((session) => (
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
                <h3 className="text-lg font-medium mb-2">No sessions today</h3>
                <p className="text-muted-foreground text-center">Schedule a session for today to get started</p>
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
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
