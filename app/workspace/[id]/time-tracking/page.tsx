"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, Search, Clock, Users, BarChart3, Calendar } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function TimeTrackingPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true)
  const [timeData, setTimeData] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredData, setFilteredData] = useState<any[]>([])
  const { id: workspaceId } = params

  useEffect(() => {
    const fetchTimeData = async () => {
      setIsLoading(true)
      try {
        // Fetch time tracking data
        const timeQuery = query(
          collection(db, "workspaces", workspaceId, "timeTracking"),
          orderBy("totalTime", "desc"),
          limit(50),
        )

        const timeSnapshot = await getDocs(timeQuery)
        const timeEntries: any[] = []

        timeSnapshot.forEach((doc) => {
          timeEntries.push({
            id: doc.id,
            ...doc.data(),
          })
        })

        setTimeData(timeEntries)
        setFilteredData(timeEntries)

        // Fetch recent sessions
        const sessionQuery = query(
          collection(db, "workspaces", workspaceId, "timeSessions"),
          orderBy("timestamp", "desc"),
          limit(20),
        )

        const sessionSnapshot = await getDocs(sessionQuery)
        const sessionEntries: any[] = []

        sessionSnapshot.forEach((doc) => {
          sessionEntries.push({
            id: doc.id,
            ...doc.data(),
          })
        })

        setSessions(sessionEntries)
      } catch (error) {
        console.error("Error fetching time tracking data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTimeData()
  }, [workspaceId])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredData(timeData)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredData(
        timeData.filter((entry) => entry.username?.toLowerCase().includes(query) || entry.userId?.includes(query)),
      )
    }
  }, [searchQuery, timeData])

  // Format time function
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Format date function
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

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
        <h1 className="text-3xl font-bold mb-2">Time Tracking</h1>
        <p className="text-muted-foreground">Monitor player activity in your Roblox games</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Total Tracked Time</h3>
            </div>
            <div className="text-3xl font-bold">
              {formatTime(timeData.reduce((total, entry) => total + (entry.totalTime || 0), 0))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Across all players</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Tracked Players</h3>
            </div>
            <div className="text-3xl font-bold">{timeData.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Unique players tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Recent Sessions</h3>
            </div>
            <div className="text-3xl font-bold">{sessions.length}</div>
            <p className="text-sm text-muted-foreground mt-1">In the last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="players" className="space-y-6">
        <TabsList>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle>Player Time</CardTitle>
              <CardDescription>View time spent by each player in your games</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search players..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Total Time</TableHead>
                      <TableHead>Last Session</TableHead>
                      <TableHead>Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length > 0 ? (
                      filteredData.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={`https://www.roblox.com/headshot-thumbnail/image?userId=${entry.userId}&width=48&height=48&format=png`}
                                  alt={entry.username}
                                />
                                <AvatarFallback>{entry.username?.charAt(0) || "U"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{entry.username}</p>
                                <p className="text-xs text-muted-foreground">ID: {entry.userId}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatTime(entry.totalTime || 0)}</TableCell>
                          <TableCell>{formatTime(entry.lastSessionTime || 0)}</TableCell>
                          <TableCell>{formatDate(entry.lastSeen || entry.updatedAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          {searchQuery ? "No players found matching your search" : "No player data available"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>View recent player sessions in your games</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Session Time</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.length > 0 ? (
                      sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={`https://www.roblox.com/headshot-thumbnail/image?userId=${session.userId}&width=48&height=48&format=png`}
                                  alt={session.username}
                                />
                                <AvatarFallback>{session.username?.charAt(0) || "U"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{session.username}</p>
                                <p className="text-xs text-muted-foreground">ID: {session.userId}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatTime(session.sessionTime || 0)}</TableCell>
                          <TableCell>{formatDate(session.timestamp)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          No recent sessions available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Time Analytics</CardTitle>
              <CardDescription>Visualize player activity patterns</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center p-12 border rounded-lg bg-muted/30">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Analytics Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md">
                    Detailed analytics and visualizations for player activity will be available in a future update.
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

