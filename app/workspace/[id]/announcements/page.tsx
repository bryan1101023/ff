"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, Loader2, Clock, Pin, PinOff, ThumbsUp, MessageCircle, Trash2, Edit } from "lucide-react"
import { auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { getCurrentUserData } from "@/lib/auth-utils"
import { 
  createAnnouncement,
  getWorkspaceAnnouncements,
  getPinnedAnnouncements,
  toggleAnnouncementPin,
  deleteAnnouncement,
  formatRelativeTime,
  type Announcement
} from "@/lib/announcement-utils"

export default function AnnouncementsPage() {
  const { id: workspaceId } = useParams() as { id: string }
  const [user] = useAuthState(auth)
  const [userData, setUserData] = useState<any>(null)
  
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isPinned, setIsPinned] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("create")

  // Fetch user data and announcements on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          // Get user data
          const data = await getCurrentUserData(user.uid)
          setUserData(data)
          
          // Fetch announcements
          await fetchAnnouncements()
        } catch (error) {
          console.error("Error fetching data:", error)
          setError("Failed to load announcements. Please try again.")
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    fetchData()
  }, [user, workspaceId])
  
  // Function to fetch all announcements
  const fetchAnnouncements = async () => {
    try {
      const allAnnouncements = await getWorkspaceAnnouncements(workspaceId)
      setAnnouncements(allAnnouncements)
      
      const pinned = await getPinnedAnnouncements(workspaceId)
      setPinnedAnnouncements(pinned)
    } catch (error) {
      console.error("Error fetching announcements:", error)
      setError("Failed to load announcements. Please try again.")
    }
  }
  
  // Handle form submission to create a new announcement
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !content) {
      setError("Please fill in all fields")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (!user || !userData) {
        throw new Error("User not authenticated")
      }
      
      // Create the announcement in Firestore
      await createAnnouncement(
        workspaceId,
        title,
        content,
        user.uid,
        userData.username || user.email,
        isPinned
      )
      
      // Refresh the announcements list
      await fetchAnnouncements()
      
      setSuccess(true)
    } catch (err) {
      console.error("Error creating announcement:", err)
      setError("Failed to post announcement. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setContent("")
    setIsPinned(false)
    setSuccess(false)
    setActiveTab("all") // Switch to the announcements tab after creating one
  }
  
  // Handle toggling pin status
  const handleTogglePin = async (announcementId: string, currentPinned: boolean) => {
    try {
      await toggleAnnouncementPin(workspaceId, announcementId, !currentPinned)
      await fetchAnnouncements() // Refresh the lists
    } catch (error) {
      console.error("Error toggling pin status:", error)
      setError("Failed to update announcement. Please try again.")
    }
  }
  
  // Handle deleting an announcement
  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) {
      return
    }
    
    try {
      await deleteAnnouncement(workspaceId, announcementId)
      await fetchAnnouncements() // Refresh the lists
    } catch (error) {
      console.error("Error deleting announcement:", error)
      setError("Failed to delete announcement. Please try again.")
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Announcements</h1>
        <p className="text-white/60">Post and manage group announcements</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Announcement</TabsTrigger>
          <TabsTrigger value="all">All Announcements</TabsTrigger>
          <TabsTrigger value="pinned">Pinned</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create Announcement</CardTitle>
              <CardDescription>Post an announcement to your group members</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Announcement Posted!</h3>
                  <p className="text-muted-foreground mb-6">Your announcement has been posted successfully.</p>
                  <Button onClick={resetForm}>Create Another</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      placeholder="Announcement title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      placeholder="Write your announcement..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="pin-announcement"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="pin-announcement" className="text-sm font-medium">
                      Pin this announcement
                    </label>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      "Post Announcement"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Announcements</CardTitle>
              <CardDescription>View all announcements for your group</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No announcements yet</p>
                  <Button 
                    onClick={() => setActiveTab("create")} 
                    className="mt-4"
                  >
                    Create Your First Announcement
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium flex items-center">
                          {announcement.isPinned && (
                            <Pin className="h-4 w-4 mr-2 text-amber-500" />
                          )}
                          {announcement.title}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" /> {formatRelativeTime(announcement.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {announcement.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center">
                            <ThumbsUp className="h-3 w-3 mr-1" /> {announcement.likes} likes
                          </span>
                          <span className="flex items-center">
                            <MessageCircle className="h-3 w-3 mr-1" /> {announcement.comments} comments
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleTogglePin(announcement.id, announcement.isPinned)}
                            title={announcement.isPinned ? "Unpin announcement" : "Pin announcement"}
                          >
                            {announcement.isPinned ? (
                              <PinOff className="h-4 w-4" />
                            ) : (
                              <Pin className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            title="Delete announcement"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {announcements.length > 0 && (
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={fetchAnnouncements}>
                  Refresh Announcements
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="pinned">
          <Card>
            <CardHeader>
              <CardTitle>Pinned Announcements</CardTitle>
              <CardDescription>Important announcements that are pinned</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : pinnedAnnouncements.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No pinned announcements yet</p>
                  <Button 
                    onClick={() => setActiveTab("create")} 
                    className="mt-4"
                  >
                    Create a Pinned Announcement
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {pinnedAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium flex items-center">
                          <Pin className="h-4 w-4 mr-2 text-amber-500" />
                          {announcement.title}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" /> {formatRelativeTime(announcement.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {announcement.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center">
                            <ThumbsUp className="h-3 w-3 mr-1" /> {announcement.likes} likes
                          </span>
                          <span className="flex items-center">
                            <MessageCircle className="h-3 w-3 mr-1" /> {announcement.comments} comments
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleTogglePin(announcement.id, true)}
                            title="Unpin announcement"
                          >
                            <PinOff className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            title="Delete announcement"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


