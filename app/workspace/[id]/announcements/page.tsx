"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, Loader2, Clock, Pin, PinOff, ThumbsUp, MessageCircle } from "lucide-react"

export default function AnnouncementsPage() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isPinned, setIsPinned] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !content) {
      setError("Please fill in all fields")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSuccess(true)
    } catch (err) {
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
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Announcements</h1>
        <p className="text-white/60">Post and manage group announcements</p>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
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
              <div className="space-y-6">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center">
                      <Pin className="h-4 w-4 mr-2 text-amber-500" />
                      Important Group Update
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" /> 2 hours ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    We're updating our group policies. Please review the new rules in the group description.
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center">
                        <ThumbsUp className="h-3 w-3 mr-1" /> 24 likes
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="h-3 w-3 mr-1" /> 5 comments
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Weekly Event Schedule</h3>
                    <span className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" /> 1 day ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Check out our upcoming events for this week. We have training on Tuesday and a group game on Friday!
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center">
                        <ThumbsUp className="h-3 w-3 mr-1" /> 18 likes
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="h-3 w-3 mr-1" /> 3 comments
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">New Staff Members</h3>
                    <span className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" /> 3 days ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please welcome our new staff members: User123 and User456. They'll be helping with moderation.
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center">
                        <ThumbsUp className="h-3 w-3 mr-1" /> 32 likes
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="h-3 w-3 mr-1" /> 8 comments
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Load More
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="pinned">
          <Card>
            <CardHeader>
              <CardTitle>Pinned Announcements</CardTitle>
              <CardDescription>Important announcements that are pinned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center">
                      <Pin className="h-4 w-4 mr-2 text-amber-500" />
                      Important Group Update
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" /> 2 hours ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    We're updating our group policies. Please review the new rules in the group description.
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center">
                        <ThumbsUp className="h-3 w-3 mr-1" /> 24 likes
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="h-3 w-3 mr-1" /> 5 comments
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <PinOff className="h-3 w-3 mr-1" /> Unpin
                      </Button>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center">
                      <Pin className="h-4 w-4 mr-2 text-amber-500" />
                      Group Rules
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" /> 1 week ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please read and follow our group rules. Respect all members and follow staff instructions.
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center">
                        <ThumbsUp className="h-3 w-3 mr-1" /> 45 likes
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="h-3 w-3 mr-1" /> 12 comments
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <PinOff className="h-3 w-3 mr-1" /> Unpin
                      </Button>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

