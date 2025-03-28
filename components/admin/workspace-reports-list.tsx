"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { db } from "@/lib/firebase"
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from "firebase/firestore"
import { 
  createWorkspaceReportApprovedNotification, 
  createWorkspaceReportRejectedNotification 
} from "@/lib/notification-utils"
import { formatDistanceToNow } from "date-fns"
import { Flag, Search, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"

interface WorkspaceReport {
  id: string
  workspaceId: string
  workspaceName: string
  reportedBy: string
  reporterUsername: string
  reasons: string[]
  details: string
  status: "pending" | "approved" | "rejected"
  createdAt: Timestamp
  reviewedAt?: Timestamp
  reviewedBy?: string
  reviewNotes?: string
}

export default function WorkspaceReportsList() {
  const [reports, setReports] = useState<WorkspaceReport[]>([])
  const [filteredReports, setFilteredReports] = useState<WorkspaceReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedReport, setSelectedReport] = useState<WorkspaceReport | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      filterReportsByStatus(activeTab)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredReports(
        reports.filter(
          (report) =>
            report.workspaceName?.toLowerCase().includes(query) ||
            report.reporterUsername?.toLowerCase().includes(query) ||
            report.details?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, reports, activeTab])

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const q = query(
        collection(db, "workspace-reports"),
        orderBy("createdAt", "desc")
      )
      const reportsSnapshot = await getDocs(q)
      const reportsData: WorkspaceReport[] = []

      reportsSnapshot.forEach((doc) => {
        reportsData.push({
          id: doc.id,
          ...doc.data(),
        } as WorkspaceReport)
      })

      setReports(reportsData)
      filterReportsByStatus("pending")
    } catch (error) {
      console.error("Error fetching reports:", error)
      toast({
        title: "Error",
        description: "Failed to fetch workspace reports.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterReportsByStatus = (status: string) => {
    if (status === "all") {
      setFilteredReports(reports)
    } else {
      setFilteredReports(reports.filter((report) => report.status === status))
    }
    setActiveTab(status)
  }

  const handleReviewReport = (report: WorkspaceReport) => {
    setSelectedReport(report)
    setReviewNotes("")
    setIsReviewModalOpen(true)
  }

  const handleApproveReport = async () => {
    if (!selectedReport) return
    await processReport("approved")
  }

  const handleRejectReport = async () => {
    if (!selectedReport) return
    await processReport("rejected")
  }

  const processReport = async (status: "approved" | "rejected") => {
    if (!selectedReport) return

    setIsProcessing(true)
    try {
      // Update the report status in Firestore
      await updateDoc(doc(db, "workspace-reports", selectedReport.id), {
        status,
        reviewedAt: Timestamp.now(),
        reviewedBy: "admin", // You might want to use the actual admin ID here
        reviewNotes: reviewNotes,
      })

      // Send notification to the user who reported the workspace
      if (status === "approved") {
        await createWorkspaceReportApprovedNotification(selectedReport.reportedBy)
      } else {
        await createWorkspaceReportRejectedNotification(selectedReport.reportedBy)
      }

      // Update local state
      setReports((prev) =>
        prev.map((report) =>
          report.id === selectedReport.id
            ? {
                ...report,
                status,
                reviewedAt: Timestamp.now() as any,
                reviewedBy: "admin",
                reviewNotes,
              }
            : report
        )
      )

      // Filter reports based on active tab
      filterReportsByStatus(activeTab)

      toast({
        title: status === "approved" ? "Report Approved" : "Report Rejected",
        description: `The report has been ${status === "approved" ? "approved" : "rejected"} successfully.`,
      })

      setIsReviewModalOpen(false)
      setSelectedReport(null)
      setReviewNotes("")
    } catch (error) {
      console.error(`Error ${status} report:`, error)
      toast({
        title: "Error",
        description: `Failed to ${status} the report. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getReasonLabels = (reasons: string[]) => {
    const reasonMap: { [key: string]: string } = {
      inappropriate: "Inappropriate Content",
      copyright: "Copyright Violation",
      illegal: "Illegal Content",
      other: "Other",
    }

    return reasons.map((reason) => reasonMap[reason] || reason).join(", ")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Approved</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatTime = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp || !timestamp.toDate) return "Just now"
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true })
    } catch (error) {
      console.error("Error formatting timestamp:", error)
      return "Recently"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Workspace Reports
        </CardTitle>
        <CardDescription>Review and manage workspace reports</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={fetchReports} className="flex-shrink-0">
              Refresh
            </Button>
          </div>

          <Tabs defaultValue="pending" onValueChange={filterReportsByStatus}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All Reports</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No reports found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <Card key={report.id} className="overflow-hidden">
                      <div className="p-4 border-b border-border">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg">{report.workspaceName}</h3>
                            <p className="text-sm text-muted-foreground">
                              Reported by {report.reporterUsername} {formatTime(report.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(report.status)}
                            {report.status === "pending" && (
                              <Button size="sm" onClick={() => handleReviewReport(report)}>
                                Review
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="space-y-2">
                          <div>
                            <Label className="text-sm font-medium">Reasons:</Label>
                            <p className="text-sm">{getReasonLabels(report.reasons)}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Details:</Label>
                            <p className="text-sm whitespace-pre-line">{report.details}</p>
                          </div>
                          {report.status !== "pending" && report.reviewNotes && (
                            <div>
                              <Label className="text-sm font-medium">Review Notes:</Label>
                              <p className="text-sm whitespace-pre-line">{report.reviewNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </CardContent>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Review the report for workspace "{selectedReport?.workspaceName}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Reported by:</Label>
              <p className="text-sm">{selectedReport?.reporterUsername}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Reasons:</Label>
              <p className="text-sm">{selectedReport && getReasonLabels(selectedReport.reasons)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Details:</Label>
              <p className="text-sm whitespace-pre-line">{selectedReport?.details}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-notes" className="text-sm font-medium">
                Review Notes (optional):
              </Label>
              <Textarea
                id="review-notes"
                placeholder="Add notes about your decision..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="flex space-x-2 sm:space-x-0">
            <Button
              variant="outline"
              onClick={() => setIsReviewModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                onClick={handleRejectReport}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reject
              </Button>
              <Button
                variant="default"
                onClick={handleApproveReport}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Approve
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
