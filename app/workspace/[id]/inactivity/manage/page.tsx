"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { collection, query, getDocs, doc, updateDoc, getDoc, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"
import { sendNotification } from "@/lib/notification-utils"

export default function ManageInactivityPage({ params }: { params: { id: string } }) {
  const [notices, setNotices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState("")
  const { toast } = useToast()
  const { id: workspaceId } = params

  useEffect(() => {
    fetchInactivityNotices()
  }, [workspaceId])

  const fetchInactivityNotices = async () => {
    setIsLoading(true)
    try {
      // Get workspace info to check permissions
      const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId))
      if (!workspaceDoc.exists()) {
        setError("Workspace not found")
        setIsLoading(false)
        return
      }

      // Query inactivity notices for this workspace with pending status
      const noticesQuery = query(
        collection(db, "workspaces", workspaceId, "inactivityNotices"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
      )

      const noticesSnapshot = await getDocs(noticesQuery)
      const noticesList: any[] = []

      noticesSnapshot.forEach((doc) => {
        noticesList.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      setNotices(noticesList)
    } catch (err: any) {
      console.error("Error fetching inactivity notices:", err)
      setError(err.message || "Failed to load inactivity notices")
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessNotice = async (noticeId: string, approved: boolean) => {
    setProcessingId(noticeId)
    try {
      const notice = notices.find((n) => n.id === noticeId)
      if (!notice) {
        throw new Error("Notice not found")
      }

      // Update the notice status
      await updateDoc(doc(db, "workspaces", workspaceId, "inactivityNotices", noticeId), {
        status: approved ? "approved" : "denied",
        adminNote: adminNote,
        processedAt: new Date(),
      })

      // Send notification to the user
      const userDoc = await getDoc(doc(db, "users", notice.firebaseUserId || ""))
      if (userDoc.exists()) {
        const userData = userDoc.data()

        await sendNotification({
          userId: notice.firebaseUserId,
          title: approved ? "Inactivity Notice Approved" : "Inactivity Notice Denied",
          message: approved
            ? `Your inactivity notice from ${formatDate(notice.startDate)} to ${formatDate(notice.endDate)} has been approved.`
            : `Your inactivity notice from ${formatDate(notice.startDate)} to ${formatDate(notice.endDate)} has been denied.`,
          type: approved ? "success" : "error",
          link: `/workspace/${workspaceId}/inactivity`,
          additionalData: {
            adminNote: adminNote,
          },
        })
      }

      // Update local state
      setNotices(notices.filter((n) => n.id !== noticeId))

      toast({
        title: approved ? "Notice approved" : "Notice denied",
        description: `The inactivity notice has been ${approved ? "approved" : "denied"}.`,
      })

      setAdminNote("")
    } catch (err: any) {
      console.error("Error processing notice:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to process notice",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (date: any) => {
    if (!date) return "Unknown"

    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Manage Inactivity Notices</h1>
        <p className="text-white/60">Review and process inactivity notice requests</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notices.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground">No pending inactivity notices</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {notices.map((notice) => (
            <Card key={notice.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Inactivity Notice from {notice.username}</span>
                  <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full">Pending</span>
                </CardTitle>
                <CardDescription>Submitted on {formatDate(notice.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-1">Duration</h3>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {formatDate(notice.startDate)} - {formatDate(notice.endDate)}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Reason</h3>
                  <p className="text-sm p-3 bg-muted rounded-md">{notice.reason}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Admin Note</h3>
                  <Textarea
                    placeholder="Add a note (optional)"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="text-destructive"
                    disabled={processingId === notice.id}
                    onClick={() => handleProcessNotice(notice.id, false)}
                  >
                    {processingId === notice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Deny
                  </Button>
                  <Button disabled={processingId === notice.id} onClick={() => handleProcessNotice(notice.id, true)}>
                    {processingId === notice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

