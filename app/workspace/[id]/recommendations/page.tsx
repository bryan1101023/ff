"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Loader2, ArrowUp, Check, X, AlertTriangle, UserPlus, ChevronUp, ChevronDown, RefreshCw, Info } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { 
  Recommendation, 
  createRecommendation, 
  getWorkspaceRecommendations, 
  supportRecommendation, 
  unsupportRecommendation,
  fetchRobloxUserByUsername,
  getGroupRanks,
  getUserRankInGroup
} from "@/lib/recommendation-utils"
import { getCurrentUserData } from "@/lib/auth-utils"
import { formatDistanceToNow } from "date-fns"
import { createLogEntry } from "@/lib/logging-utils"

export default function RecommendationsPage() {
  // Get workspaceId from params and ensure it's a string
  const params = useParams<{ id: string }>()
  const workspaceId = params?.id || ""
  
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const isAuthenticated = !!user
  
  const [isLoading, setIsLoading] = useState(true)
  
  // Define proper type for workspace
  interface WorkspaceData {
    id: string;
    groupId?: string;
    robloxGroupId?: string;
    groupName?: string;
    icon?: string;
    isVerified?: boolean;
    ownerId?: string;
    [key: string]: any; // For any other properties
  }
  
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [sortBy, setSortBy] = useState<"createdAt" | "supporters">("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  
  // Create recommendation state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [targetUsername, setTargetUsername] = useState("")
  const [isSearchingUser, setIsSearchingUser] = useState(false)
  const [foundUser, setFoundUser] = useState<any>(null)
  const [recommendedRank, setRecommendedRank] = useState("")
  const [justification, setJustification] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [groupRanks, setGroupRanks] = useState<any[]>([])
  const [userCurrentRank, setUserCurrentRank] = useState<any>(null)
  
  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle authentication directly
  useEffect(() => {
    console.log("Setting up auth listener")
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser ? "User authenticated" : "No user")
      setUser(currentUser)
      
      // Fetch full user data from Firestore if authenticated
      if (currentUser) {
        try {
          const fullUserData = await getCurrentUserData(currentUser.uid)
          console.log("Fetched full user data:", fullUserData)
          setUserData(fullUserData)
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
      
      setAuthLoading(false)
    })
    
    return () => unsubscribe()
  }, [])
  
  // Handle data loading after authentication is determined
  useEffect(() => {
    console.log("Auth state:", { authLoading, isAuthenticated, workspaceId })
    
    if (!authLoading) {
      if (isAuthenticated && workspaceId) {
        console.log("Fetching data for authenticated user")
        // Load data sequentially to avoid race conditions
        fetchWorkspaceData()
          .then(() => fetchRecommendations())
          .catch(error => {
            console.error("Error in data loading:", error)
            setIsLoading(false)
          })
      } else {
        // If not authenticated or no workspaceId, still set loading to false
        console.log("Not authenticated or no workspaceId, ending loading state")
        setIsLoading(false)
      }
    }
    
    // Add a safety timeout to ensure loading state is eventually reset
    const safetyTimer = setTimeout(() => {
      if (isLoading) {
        console.log("Safety timeout triggered - forcing loading state to false")
        setIsLoading(false)
      }
    }, 5000) // 5 second safety timeout
    
    return () => clearTimeout(safetyTimer)
  }, [authLoading, isAuthenticated, workspaceId])
  
  // Separate effect for tab/sort changes to avoid refetching workspace data
  useEffect(() => {
    if (isAuthenticated && workspaceId) {
      fetchRecommendations()
    }
  }, [activeTab, sortBy, sortOrder])

  const fetchWorkspaceData = async () => {
    console.log("Starting fetchWorkspaceData for workspaceId:", workspaceId)
    if (!workspaceId) {
      console.error("No workspaceId provided")
      setIsLoading(false)
      return
    }
    
    try {
      const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId))
      if (workspaceDoc.exists()) {
        const workspaceData: WorkspaceData = { 
          id: workspaceDoc.id, 
          ...workspaceDoc.data() as Omit<WorkspaceData, 'id'>
        }
        setWorkspace(workspaceData)
        
        // Fetch group ranks
        if (workspaceData.groupId || workspaceData.robloxGroupId) {
          const groupId = workspaceData.groupId || workspaceData.robloxGroupId
          if (groupId) {
            const ranks = await getGroupRanks(groupId)
            setGroupRanks(ranks)
          }
        }
      } else {
        console.log("Workspace document does not exist")
      }
    } catch (error) {
      console.error("Error fetching workspace:", error)
      toast({
        title: "Error",
        description: "Failed to load workspace data",
        variant: "destructive",
      })
    } finally {
      console.log("Finished fetchWorkspaceData")
      setIsLoading(false)
    }
  }

  const fetchRecommendations = async () => {
    console.log("Starting fetchRecommendations for workspaceId:", workspaceId)
    if (!workspaceId) {
      console.error("No workspaceId provided")
      setIsRefreshing(false)
      return
    }
    
    setIsRefreshing(true)
    try {
      const status = activeTab === "all" ? "all" : activeTab === "pending" ? "pending" : activeTab === "approved" ? "approved" : "rejected"
      const recommendations = await getWorkspaceRecommendations(workspaceId, status, sortBy, sortOrder)
      setRecommendations(recommendations)
    } catch (error) {
      console.error("Error fetching recommendations:", error)
      toast({
        title: "Error",
        description: "Failed to load recommendations",
        variant: "destructive",
      })
    } finally {
      console.log("Finished fetchRecommendations")
      setIsRefreshing(false)
    }
  }

  const handleSearchUser = async () => {
    if (!targetUsername.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Roblox username",
        variant: "destructive",
      })
      return
    }
    
    setIsSearchingUser(true)
    setFoundUser(null)
    console.log(`Searching for user: ${targetUsername}`)
    
    try {
      const user = await fetchRobloxUserByUsername(targetUsername)
      console.log("Found user:", user)
      setFoundUser(user)
      
      // Get user's current rank in the group
      if (workspace?.groupId || workspace?.robloxGroupId) {
        const groupId = workspace.groupId || workspace.robloxGroupId
        if (groupId) {
          console.log(`Getting rank for user ${user.id} in group ${groupId}`)
          const rankInfo = await getUserRankInGroup(user.id, groupId)
          console.log("User rank info:", rankInfo)
          setUserCurrentRank(rankInfo)
        } else {
          console.warn("No valid groupId found in workspace")
        }
      } else {
        console.warn("No groupId or robloxGroupId in workspace data")
      }
    } catch (error) {
      console.error("Error searching for user:", error)
      toast({
        title: "User Not Found",
        description: error instanceof Error ? error.message : "Could not find a Roblox user with that username",
        variant: "destructive",
      })
      setFoundUser(null)
    } finally {
      setIsSearchingUser(false)
    }
  }

  const handleCreateRecommendation = async () => {
    if (!user || !foundUser || !recommendedRank || !justification.trim() || !workspace || !workspaceId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Get the recommender's information from the full user data
      let recommenderUsername = "";
      let recommenderAvatar = "";
      
      // Use the full user data from Firestore
      if (userData) {
        // Prefer Roblox username if verified
        recommenderUsername = userData.robloxUsername || userData.username || user.displayName || "";
        
        // Use Roblox avatar if available
        if (userData.robloxUserId) {
          recommenderAvatar = `https://www.roblox.com/headshot-thumbnail/image?userId=${userData.robloxUserId}&width=150&height=150&format=png`;
        } else {
          recommenderAvatar = user.photoURL || "";
        }
        
        console.log("Using recommender info:", { recommenderUsername, recommenderAvatar });
      } else {
        console.warn("No user data available, using fallback information");
        recommenderUsername = user.displayName || "";
        recommenderAvatar = user.photoURL || "";
      }
      
      // Find the current rank name and recommended rank name
      const currentRankObj = groupRanks.find(r => r.rank === (userCurrentRank?.rank || 0));
      const recommendedRankObj = groupRanks.find(r => r.rank === parseInt(recommendedRank));
      
      const recommendationId = await createRecommendation(
        workspaceId,
        user.uid,
        recommenderUsername,
        recommenderAvatar,
        foundUser.name,
        foundUser.id,
        foundUser.avatar,
        userCurrentRank?.rank || 0,
        currentRankObj?.name || "Unknown",
        parseInt(recommendedRank),
        recommendedRankObj?.name || "Unknown",
        justification
      );
      
      // Log the recommendation creation
      if (user) {
        await createLogEntry({
          type: "recommendation_created",
          userId: user.uid,
          username: recommenderUsername,
          workspaceId: String(workspaceId),
          details: {
            recommendationId,
            targetUserId: foundUser.id,
            targetUsername: foundUser.name,
            currentRank: userCurrentRank?.rank || 0,
            currentRankName: currentRankObj?.name || "Unknown",
            recommendedRank: parseInt(recommendedRank),
            recommendedRankName: recommendedRankObj?.name || "Unknown"
          }
        });
      }
      
      toast({
        title: "Recommendation Created",
        description: "Your promotion recommendation has been submitted successfully",
      })
      
      // Reset form and close dialog
      setTargetUsername("")
      setFoundUser(null)
      setRecommendedRank("")
      setJustification("")
      setIsCreateDialogOpen(false)
      
      // Refresh recommendations
      fetchRecommendations()
    } catch (error: any) {
      console.error("Error creating recommendation:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create recommendation",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSupport = async (recommendationId: string) => {
    if (!user || !workspaceId) return
    
    try {
      await supportRecommendation(workspaceId, recommendationId, user.uid)
      
      // Log the support action
      if (user) {
        await createLogEntry({
          type: "recommendation_supported",
          userId: user.uid,
          username: userData?.username || user.displayName || user.email || "",
          workspaceId: String(workspaceId),
          details: { recommendationId }
        })
      }
      
      // Update recommendations list
      setRecommendations(prevRecommendations => 
        prevRecommendations.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, supporters: [...rec.supporters, user.uid] } 
            : rec
        )
      )
      
      toast({
        title: "Support Added",
        description: "You have supported this recommendation",
      })
    } catch (error: any) {
      console.error("Error supporting recommendation:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to support recommendation",
        variant: "destructive",
      })
    }
  }

  const handleUnsupport = async (recommendationId: string) => {
    if (!user || !workspaceId || typeof workspaceId !== 'string') return
    
    try {
      await unsupportRecommendation(workspaceId, recommendationId, user.uid)
      
      // Log the unsupport action
      if (user) {
        await createLogEntry({
          type: "recommendation_unsupported",
          userId: user.uid,
          username: userData?.username || user.displayName || user.email || "",
          workspaceId: workspaceId,
          details: { recommendationId }
        })
      }
      
      // Update recommendations list
      setRecommendations(prevRecommendations => 
        prevRecommendations.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, supporters: rec.supporters.filter(id => id !== user.uid) } 
            : rec
        )
      )
      
      toast({
        title: "Support Removed",
        description: "You have removed your support for this recommendation",
      })
    } catch (error: any) {
      console.error("Error unsupporting recommendation:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove support",
        variant: "destructive",
      })
    }
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Just now"
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      return "Invalid date"
    }
  }

  if (authLoading || isLoading) {
    console.log("Rendering loading state", { authLoading, isLoading })
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">
          {authLoading ? "Checking authentication..." : "Loading workspace data..."}
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
        <p className="text-muted-foreground text-center mb-4">
          Please sign in to view this workspace's recommendations
        </p>
        <Button onClick={() => window.location.href = "/login"}>Sign In</Button>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Workspace Not Found</h1>
        <p className="text-muted-foreground text-center mb-4">
          The workspace you're looking for doesn't exist or you don't have access to it
        </p>
        <Button onClick={() => window.location.href = "/dashboard"}>Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotion Recommendations</h1>
          <p className="text-muted-foreground">
            Recommend members for promotion and view existing recommendations
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchRecommendations}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Recommendation Approval Process</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p>Recommendations are automatically processed based on support:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Approval:</strong> A recommendation needs at least 6 supporters to be automatically approved.</li>
                  <li><strong>Denial:</strong> If a recommendation doesn't reach the required support threshold, it will be denied.</li>
                  <li><strong>Support:</strong> Click the "Support" button on a recommendation to add your support.</li>
                </ul>
                <div className="flex items-center gap-2 bg-muted p-3 rounded">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm">Only verified workspace members can support recommendations.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Recommendation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Promotion Recommendation</DialogTitle>
                <DialogDescription>
                  Recommend a member for promotion to a higher rank in the group
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Roblox Username</Label>
                  <div className="flex gap-2">
                    <Input
                      id="username"
                      placeholder="Enter Roblox username"
                      value={targetUsername}
                      onChange={(e) => setTargetUsername(e.target.value)}
                      disabled={isSearchingUser || !!foundUser}
                    />
                    {foundUser ? (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => {
                          setFoundUser(null)
                          setUserCurrentRank(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSearchUser} 
                        disabled={isSearchingUser || !targetUsername.trim()}
                      >
                        {isSearchingUser ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Search"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                {foundUser && (
                  <div className="border rounded-md p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={foundUser.avatar} alt={foundUser.name} />
                        <AvatarFallback>{foundUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{foundUser.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {userCurrentRank ? `Current Rank: ${userCurrentRank.rankName} (${userCurrentRank.rank})` : 'Not in group'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {foundUser && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="rank">Promote To</Label>
                      <Select value={recommendedRank} onValueChange={setRecommendedRank}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rank" />
                        </SelectTrigger>
                        <SelectContent>
                          {groupRanks
                            .filter(rank => rank.rank > (userCurrentRank?.rank || 0)) // Only show ranks higher than current
                            .map(rank => (
                              <SelectItem key={rank.id} value={rank.rank.toString()}>
                                {rank.name} (Rank {rank.rank})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="justification">Justification</Label>
                      <Textarea
                        id="justification"
                        placeholder="Explain why this member should be promoted"
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        rows={4}
                      />
                    </div>
                  </>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateRecommendation} 
                  disabled={isSubmitting || !foundUser || !recommendedRank || !justification.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Recommendation"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as "createdAt" | "supporters")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="supporters">Support Count</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-3 mb-4">
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Recommendations Found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {activeTab === "all" 
                ? "There are no promotion recommendations for this workspace yet." 
                : `There are no ${activeTab} recommendations.`}
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create Recommendation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {recommendations.map((recommendation) => (
            <Card key={recommendation.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={recommendation.targetRobloxAvatar} alt={recommendation.targetRobloxUsername} />
                      <AvatarFallback>{recommendation.targetRobloxUsername.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{recommendation.targetRobloxUsername}</CardTitle>
                      <CardDescription>
                        {recommendation.currentRankName ? 
                          `${recommendation.currentRankName} (${recommendation.currentRank}) → ${recommendation.recommendedRankName} (${recommendation.recommendedRank})` : 
                          `Rank ${recommendation.currentRank} → Rank ${recommendation.recommendedRank}`}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                    <ArrowUp className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{recommendation.supporters.length}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pb-2">
                <div className="mb-3">
                  <h4 className="text-sm font-medium mb-1">Justification:</h4>
                  <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={recommendation.userAvatar} alt={recommendation.username} />
                    <AvatarFallback>{recommendation.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>Recommended by {recommendation.username}</span>
                  <span>•</span>
                  <span>{formatTimestamp(recommendation.createdAt)}</span>
                </div>
                
                {recommendation.status !== "pending" && (
                  <div className={`mt-2 text-xs px-2 py-1 rounded inline-flex items-center ${
                    recommendation.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {recommendation.status === "approved" ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Approved
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Rejected
                      </>
                    )}
                  </div>
                )}
              </CardContent>
              
              {recommendation.status === "pending" && (
                <CardFooter className="pt-2">
                  {user && recommendation.supporters.includes(user.uid) ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleUnsupport(recommendation.id)}
                      disabled={recommendation.userId === user.uid} // Creator cannot unsupport
                    >
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Supported
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleSupport(recommendation.id)}
                    >
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Support
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
