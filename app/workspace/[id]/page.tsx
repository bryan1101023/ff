"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, AlertCircle, Users, MessageSquare, Calendar, RefreshCw, Bell, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function WorkspaceOverviewPage({ params }: { params: { id: string } }) {
  const [workspace, setWorkspace] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [groupShout, setGroupShout] = useState("")
  const [isUpdatingShout, setIsUpdatingShout] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [groupInfo, setGroupInfo] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [inactivityCount, setInactivityCount] = useState(0)
  const [announcementCount, setAnnouncementCount] = useState(0)
  const router = useRouter()
  const { id: workspaceId } = params

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId))
        if (workspaceDoc.exists()) {
          const workspaceData = workspaceDoc.data()
          setWorkspace(workspaceData)

          // Fetch group info
          try {
            const response = await fetch(`/api/roblox/group-info?groupId=${workspaceData.groupId}`)
            if (response.ok) {
              const data = await response.json()
              setGroupInfo(data)
              setGroupShout(data.shout?.body || "")
            }
          } catch (error) {
            console.error("Error fetching group info:", error)
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
    const fetchWorkspaceData = async () => {
      if (!workspaceId) return

      try {
        // Fetch inactivity notices count
        const inactivityQuery = query(
          collection(db, "workspaces", workspaceId, "inactivityNotices"),
          where("status", "==", "active"),
        )
        const inactivitySnapshot = await getDocs(inactivityQuery)
        setInactivityCount(inactivitySnapshot.size)

        // Fetch announcements count
        const announcementsQuery = query(collection(db, "workspaces", workspaceId, "announcements"))
        const announcementsSnapshot = await getDocs(announcementsQuery)
        setAnnouncementCount(announcementsSnapshot.size)

        // Fetch recent activity
        const activityQuery = query(
          collection(db, "workspaces", workspaceId, "activity"),
          orderBy("timestamp", "desc"),
          limit(5),
        )
        const activitySnapshot = await getDocs(activityQuery)

        const activities: any[] = []
        activitySnapshot.forEach((doc) => {
          activities.push({
            id: doc.id,
            ...doc.data(),
          })
        })

        setRecentActivity(activities)
      } catch (error) {
        console.error("Error fetching workspace data:", error)
      }
    }

    fetchWorkspaceData()
  }, [workspaceId])

  const handleUpdateShout = async () => {
    setIsUpdatingShout(true)
    setError(null)
    setSuccess(null)

    try {
      // Make API call to update group shout
      const response = await fetch("/api/roblox/update-shout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: workspace.groupId,
          message: groupShout,
          workspaceId: workspaceId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update group shout")
      }

      setSuccess("Group shout updated successfully!")

      // Add to recent activity
      setRecentActivity([
        {
          type: "shout",
          title: "Group shout updated",
          description: "You updated the group shout",
          time: "Just now",
        },
        ...recentActivity.slice(0, 4), // Keep only the 5 most recent activities
      ])
    } catch (error: any) {
      console.error("Error updating group shout:", error)
      setError(error.message || "Failed to update group shout. Please try again.")
    } finally {
      setIsUpdatingShout(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030303]">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{workspace?.groupName || "Celésta"}</h1>
          <p className="text-white/60">Manage your group workspace</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5 text-white/70" />
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4">
        <Card className="bg-[#111] border-[#222] text-white">
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Group Overview</h2>
              <p className="text-white/60">Manage your Roblox group</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-[#1A1A1A] border-[#333] text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-5 w-5 text-white/70" />
                    <h3 className="font-medium">Members</h3>
                  </div>
                  <p className="text-sm text-white/60 mb-2">Total group members</p>
                  <div className="text-3xl font-bold mb-1">{groupInfo?.memberCount?.toLocaleString() || "12,345"}</div>
                  <p className="text-sm text-white/60">+123 this week</p>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333] text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-5 w-5 text-white/70" />
                    <h3 className="font-medium">Announcements</h3>
                  </div>
                  <p className="text-sm text-white/60 mb-2">Recent announcements</p>
                  <div className="text-3xl font-bold mb-1">{announcementCount}</div>
                  <p className="text-sm text-white/60">
                    {announcementCount > 0 ? `${announcementCount} total announcements` : "No announcements yet"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333] text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-5 w-5 text-white/70" />
                    <h3 className="font-medium">Inactivity Notices</h3>
                  </div>
                  <p className="text-sm text-white/60 mb-2">Active notices</p>
                  <div className="text-3xl font-bold mb-1">{inactivityCount}</div>
                  <p className="text-sm text-white/60">
                    {inactivityCount > 0 ? `${inactivityCount} active notices` : "No active notices"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Group shout */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 bg-green-500/10 text-green-500 border-green-500/20">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Group Shout</h3>
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter your group shout message..."
                  value={groupShout}
                  onChange={(e) => setGroupShout(e.target.value)}
                  className="min-h-[100px] bg-[#1A1A1A] border-[#333] text-white"
                  maxLength={255}
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-white/60">{groupShout.length}/255 characters</p>
                  <Button
                    onClick={handleUpdateShout}
                    disabled={isUpdatingShout || groupShout.length === 0}
                    className="bg-white text-black hover:bg-white/90"
                  >
                    {isUpdatingShout ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Shout"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Two column layout for activity and actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#1A1A1A] border-[#333] text-white">
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-2">Recent Activity</h3>
                  <p className="text-sm text-white/60 mb-4">Latest actions in your group</p>

                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 pb-4 border-b border-[#333] last:border-0">
                        <div className="mt-1 p-2 rounded-full bg-[#222]">
                          {activity.type === "member" ? (
                            <Users className="h-4 w-4 text-white/70" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-white/70" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h4 className="font-medium">{activity.title}</h4>
                            <span className="text-xs text-white/40">{activity.time}</span>
                          </div>
                          <p className="text-sm text-white/60">{activity.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333] text-white">
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-2">Quick Actions</h3>
                  <p className="text-sm text-white/60 mb-4">Common tasks for group management</p>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center justify-center border-[#333] hover:bg-[#222]"
                      onClick={() => router.push(`/workspace/${workspaceId}/members`)}
                    >
                      <Users className="h-6 w-6 mb-2 text-white/70" />
                      <span>Manage Members</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center justify-center border-[#333] hover:bg-[#222]"
                      onClick={() => router.push(`/workspace/${workspaceId}/announcements`)}
                    >
                      <MessageSquare className="h-6 w-6 mb-2 text-white/70" />
                      <span>Post Announcement</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center justify-center border-[#333] hover:bg-[#222]"
                      onClick={() => router.push(`/workspace/${workspaceId}/inactivity`)}
                    >
                      <Calendar className="h-6 w-6 mb-2 text-white/70" />
                      <span>Submit Inactivity</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center justify-center border-[#333] hover:bg-[#222]"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw className="h-6 w-6 mb-2 text-white/70" />
                      <span>Refresh Data</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

