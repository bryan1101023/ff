"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BugIcon, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface BugReport {
  id: string
  title: string
  description: string
  status: string
  createdAt: any
  resolved: boolean
}

export default function BugReportsList() {
  const [reports, setReports] = useState<BugReport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "bugReports"), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bugReports: BugReport[] = []
      querySnapshot.forEach((doc) => {
        bugReports.push({
          id: doc.id,
          ...doc.data(),
        } as BugReport)
      })
      setReports(bugReports)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const markAsResolved = async (id: string) => {
    try {
      await updateDoc(doc(db, "bugReports", id), {
        resolved: true,
        status: "resolved",
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("Error updating bug report:", error)
    }
  }

  const markAsInProgress = async (id: string) => {
    try {
      await updateDoc(doc(db, "bugReports", id), {
        status: "in-progress",
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("Error updating bug report:", error)
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

  const getStatusBadge = (status: string, resolved: boolean) => {
    if (resolved) {
      return <Badge className="bg-green-500">Resolved</Badge>
    }

    switch (status) {
      case "new":
        return <Badge variant="destructive">New</Badge>
      case "in-progress":
        return <Badge className="bg-amber-500">In Progress</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const openReports = reports.filter((report) => !report.resolved)
  const resolvedReports = reports.filter((report) => report.resolved)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BugIcon className="h-5 w-5" />
          Bug Reports
        </CardTitle>
        <CardDescription>View and manage user-reported bugs</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-pulse text-center">
              <p className="text-muted-foreground">Loading reports...</p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No bug reports found</p>
          </div>
        ) : (
          <Tabs defaultValue="open">
            <TabsList className="mb-4">
              <TabsTrigger value="open">Open ({openReports.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedReports.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="open">
              <div className="space-y-4">
                {openReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{report.title}</h3>
                      {getStatusBadge(report.status, report.resolved)}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{report.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>Reported: {formatDate(report.createdAt)}</span>
                      </div>

                      <div className="flex gap-2">
                        {report.status === "new" && (
                          <Button size="sm" variant="outline" onClick={() => markAsInProgress(report.id)}>
                            Mark In Progress
                          </Button>
                        )}
                        <Button size="sm" onClick={() => markAsResolved(report.id)}>
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {openReports.length === 0 && (
                  <div className="text-center py-6">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No open bug reports</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="resolved">
              <div className="space-y-4">
                {resolvedReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 opacity-70">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{report.title}</h3>
                      {getStatusBadge(report.status, report.resolved)}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{report.description}</p>

                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Reported: {formatDate(report.createdAt)}</span>
                    </div>
                  </div>
                ))}

                {resolvedReports.length === 0 && (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No resolved bug reports</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

