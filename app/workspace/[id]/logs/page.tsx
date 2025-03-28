"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Download, Filter, Clock, User, FileText, AlertTriangle } from "lucide-react"
import { getWorkspaceLogs, type LogEntry, getActionDescription, type LogAction } from "@/lib/logs-utils"
import { format } from "date-fns"

export default function LogsPage() {
  const { id: workspaceId } = useParams<{ id: string }>()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<string | null>(null)

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const logsData = await getWorkspaceLogs(workspaceId as string)
        setLogs(logsData)
        setFilteredLogs(logsData)
      } catch (error) {
        console.error("Error fetching logs:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [workspaceId])

  useEffect(() => {
    let filtered = [...logs]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.username.toLowerCase().includes(query) ||
          getActionDescription(log.action).toLowerCase().includes(query) ||
          JSON.stringify(log.details).toLowerCase().includes(query),
      )
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter((log) => {
        if (selectedCategory === "member") return log.action.includes("member_")
        if (selectedCategory === "workspace") return log.action.includes("workspace_")
        if (selectedCategory === "announcement") return log.action.includes("announcement_")
        if (selectedCategory === "inactivity") return log.action.includes("inactivity_")
        if (selectedCategory === "session") return log.action.includes("session_")
        if (selectedCategory === "webhook") return log.action.includes("webhook_")
        if (selectedCategory === "automation") return log.action.includes("automation_")
        return true
      })
    }

    // Apply date range filter
    if (dateRange) {
      const now = Date.now()
      if (dateRange === "today") {
        const startOfDay = new Date().setHours(0, 0, 0, 0)
        filtered = filtered.filter((log) => log.timestamp >= startOfDay)
      } else if (dateRange === "yesterday") {
        const startOfYesterday = new Date().setHours(0, 0, 0, 0) - 86400000
        const endOfYesterday = new Date().setHours(0, 0, 0, 0) - 1
        filtered = filtered.filter((log) => log.timestamp >= startOfYesterday && log.timestamp <= endOfYesterday)
      } else if (dateRange === "week") {
        const startOfWeek = now - 7 * 86400000
        filtered = filtered.filter((log) => log.timestamp >= startOfWeek)
      } else if (dateRange === "month") {
        const startOfMonth = now - 30 * 86400000
        filtered = filtered.filter((log) => log.timestamp >= startOfMonth)
      }
    }

    setFilteredLogs(filtered)
  }, [logs, searchQuery, selectedCategory, dateRange])

  const getLogIcon = (action: LogAction) => {
    if (action.includes("member_")) return <User className="h-4 w-4" />
    if (action.includes("workspace_")) return <FileText className="h-4 w-4" />
    if (action.includes("announcement_")) return <AlertTriangle className="h-4 w-4" />
    if (action.includes("session_")) return <Clock className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const getLogColor = (action: LogAction) => {
    if (action.includes("_created")) return "bg-green-100 text-green-800"
    if (action.includes("_updated")) return "bg-blue-100 text-blue-800"
    if (action.includes("_deleted")) return "bg-red-100 text-red-800"
    if (action.includes("_triggered")) return "bg-purple-100 text-purple-800"
    if (action.includes("_started")) return "bg-yellow-100 text-yellow-800"
    if (action.includes("_ended")) return "bg-gray-100 text-gray-800"
    return "bg-gray-100 text-gray-800"
  }

  const exportLogs = () => {
    const csvContent = [
      ["Timestamp", "User", "Action", "Details"],
      ...filteredLogs.map((log) => [
        new Date(log.timestamp).toISOString(),
        log.username,
        getActionDescription(log.action),
        JSON.stringify(log.details),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `workspace-logs-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Activity Logs</h1>
        <p className="text-muted-foreground">Track all actions and changes in your workspace</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Workspace Logs</CardTitle>
          <CardDescription>A detailed history of all actions taken in this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search logs..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory || ""} onValueChange={(value) => setSelectedCategory(value || null)}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>{selectedCategory ? `Filter: ${selectedCategory}` : "All categories"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="member">Members</SelectItem>
                  <SelectItem value="workspace">Workspace</SelectItem>
                  <SelectItem value="announcement">Announcements</SelectItem>
                  <SelectItem value="inactivity">Inactivity</SelectItem>
                  <SelectItem value="session">Sessions</SelectItem>
                  <SelectItem value="webhook">Webhooks</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange || ""} onValueChange={(value) => setDateRange(value || null)}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{dateRange ? `Time: ${dateRange}` : "All time"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Logs</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredLogs.length > 0 ? (
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border">
                      <div className="p-2 rounded-full bg-muted">{getLogIcon(log.action)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{getActionDescription(log.action)}</p>
                          <Badge className={getLogColor(log.action)}>{log.action.split("_")[1]}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          By {log.username} • {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        <div className="text-sm bg-muted p-2 rounded-md overflow-x-auto">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No logs found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="members" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs
                    .filter((log) => log.action.includes("member_"))
                    .map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border">
                        <div className="p-2 rounded-full bg-muted">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{getActionDescription(log.action)}</p>
                            <Badge className={getLogColor(log.action)}>{log.action.split("_")[1]}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            By {log.username} • {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          <div className="text-sm bg-muted p-2 rounded-md overflow-x-auto">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sessions" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs
                    .filter((log) => log.action.includes("session_"))
                    .map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border">
                        <div className="p-2 rounded-full bg-muted">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{getActionDescription(log.action)}</p>
                            <Badge className={getLogColor(log.action)}>{log.action.split("_")[1]}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            By {log.username} • {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          <div className="text-sm bg-muted p-2 rounded-md overflow-x-auto">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="webhooks" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs
                    .filter((log) => log.action.includes("webhook_"))
                    .map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border">
                        <div className="p-2 rounded-full bg-muted">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{getActionDescription(log.action)}</p>
                            <Badge className={getLogColor(log.action)}>{log.action.split("_")[1]}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            By {log.username} • {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          <div className="text-sm bg-muted p-2 rounded-md overflow-x-auto">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="automation" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs
                    .filter((log) => log.action.includes("automation_"))
                    .map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border">
                        <div className="p-2 rounded-full bg-muted">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{getActionDescription(log.action)}</p>
                            <Badge className={getLogColor(log.action)}>{log.action.split("_")[1]}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            By {log.username} • {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          <div className="text-sm bg-muted p-2 rounded-md overflow-x-auto">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

