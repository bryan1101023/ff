"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, Clock, BarChart3, Users, Activity, Calendar } from "lucide-react"

export default function WorkspaceAnalyticsPage({ params }: { params: { id: string } }) {
  const [workspace, setWorkspace] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { id: workspaceId } = params

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId))
        if (workspaceDoc.exists()) {
          setWorkspace(workspaceDoc.data())
        }
      } catch (error) {
        console.error("Error fetching workspace:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkspace()
  }, [workspaceId])

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
        <h1 className="text-3xl font-bold mb-2">Analytics & Activity Tracking</h1>
        <p className="text-muted-foreground">Monitor member activity and workspace engagement</p>
      </div>

      <Alert className="mb-6 bg-primary/10 border-primary/20">
        <Clock className="h-4 w-4 text-primary" />
        <AlertDescription className="text-primary">
          Activity tracking features are coming soon. This page shows a preview of upcoming functionality.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Member Activity</TabsTrigger>
          <TabsTrigger value="inactivity">Inactivity Tracking</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workspace.members?.length || 0}</div>
                <p className="text-xs text-muted-foreground">+0 this week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Inactive Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Activity Overview</CardTitle>
              <CardDescription>Member activity over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Activity tracking charts will appear here soon</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions in your workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[200px]">
                  <div className="text-center">
                    <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Activity feed coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inactivity Notices</CardTitle>
                <CardDescription>Current and upcoming member absences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[200px]">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Inactivity calendar coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Member Activity</CardTitle>
              <CardDescription>Track and monitor individual member activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Member activity tracking coming soon</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This feature will allow you to see login times, participation, and engagement metrics for each
                    member
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactivity">
          <Card>
            <CardHeader>
              <CardTitle>Inactivity Tracking</CardTitle>
              <CardDescription>Monitor and manage member inactivity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Inactivity tracking coming soon</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This feature will allow you to track inactive members, manage inactivity notices, and set up
                    automated reminders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Activity Reports</CardTitle>
              <CardDescription>Generate detailed reports on workspace activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Activity reports coming soon</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This feature will allow you to generate and export detailed reports on member activity and workspace
                    engagement
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

