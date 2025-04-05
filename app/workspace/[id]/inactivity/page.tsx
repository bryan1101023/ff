"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getAuth } from "firebase/auth"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export default function InactivityPage({ params }: { params: { id: string } }) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeNotices, setActiveNotices] = useState<any[]>([])
  const [pastNotices, setPastNotices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRestricted, setIsRestricted] = useState(false)
  const { toast } = useToast()
  const { id: workspaceId } = params
  const router = useRouter()

  // Check for workspace restrictions
  useEffect(() => {
    // Set up real-time listener for workspace restrictions
    const unsubscribeRestrictions = onSnapshot(
      doc(db, "workspaces", workspaceId, "restrictions", "current"),
      (docSnapshot) => {
        if (docSnapshot.exists() && docSnapshot.data()?.isActive) {
          const restrictions = docSnapshot.data();
          
          // Check if inactivity notices are restricted
          if (restrictions.features && restrictions.features.includes("inactivityNotice")) {
            setIsRestricted(true);
            // No longer redirecting - the layout will handle showing the restricted page
          } else {
            setIsRestricted(false);
          }
        } else {
          // No restrictions
          setIsRestricted(false);
        }
      },
      (error) => {
        console.error("Error checking workspace restrictions:", error);
      }
    );

    // Clean up listener on unmount
    return () => {
      if (typeof unsubscribeRestrictions === 'function') {
        unsubscribeRestrictions();
      }
    };
  }, [workspaceId, router]);

  // Fetch inactivity notices when component mounts
  useEffect(() => {
    // Only fetch if not restricted
    if (!isRestricted) {
      fetchInactivityNotices();
    }
  }, [workspaceId, isRestricted])

  const fetchInactivityNotices = async () => {
    // Don't fetch if restricted
    if (isRestricted) {
      return;
    }
    
    setIsLoading(true)
    try {
      const auth = getAuth()
      const currentUser = auth.currentUser

      if (!currentUser) {
        setError("You must be logged in to view inactivity notices")
        setIsLoading(false)
        return
      }

      // Get user's Roblox info
      const userDoc = await getDoc(doc(db, "users", currentUser.uid))
      if (!userDoc.exists()) {
        setError("User data not found")
        setIsLoading(false)
        return
      }

      const userData = userDoc.data()
      const robloxUserId = userData.robloxUserId

      if (!robloxUserId) {
        setError("Roblox account not linked")
        setIsLoading(false)
        return
      }

      // Query inactivity notices for this user in this workspace
      const noticesQuery = query(
        collection(db, "workspaces", workspaceId, "inactivityNotices"),
        where("userId", "==", robloxUserId.toString()),
      )

      const noticesSnapshot = await getDocs(noticesQuery)
      const notices: any[] = []

      noticesSnapshot.forEach((doc) => {
        notices.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      // Sort and filter notices
      const now = new Date()
      const active = notices
        .filter((notice) => {
          const endDate = notice.endDate?.toDate ? notice.endDate.toDate() : new Date(notice.endDate)
          return endDate > now
        })
        .sort((a, b) => {
          const aEnd = a.endDate?.toDate ? a.endDate.toDate() : new Date(a.endDate)
          const bEnd = b.endDate?.toDate ? b.endDate.toDate() : new Date(b.endDate)
          return aEnd - bEnd
        })

      const past = notices
        .filter((notice) => {
          const endDate = notice.endDate?.toDate ? notice.endDate.toDate() : new Date(notice.endDate)
          return endDate <= now
        })
        .sort((a, b) => {
          const aEnd = a.endDate?.toDate ? a.endDate.toDate() : new Date(a.endDate)
          const bEnd = b.endDate?.toDate ? b.endDate.toDate() : new Date(b.endDate)
          return bEnd - aEnd // Past notices in reverse chronological order
        })

      setActiveNotices(active)
      setPastNotices(past)
    } catch (err: any) {
      console.error("Error fetching inactivity notices:", err)
      setError(err.message || "Failed to load inactivity notices")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate || !reason) {
      setError("Please fill in all fields")
      return
    }

    if (startDate > endDate) {
      setError("End date must be after start date")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const auth = getAuth()
      const currentUser = auth.currentUser

      if (!currentUser) {
        throw new Error("You must be logged in to submit an inactivity notice")
      }

      // Get user's Roblox info
      const userDoc = await getDoc(doc(db, "users", currentUser.uid))
      if (!userDoc.exists()) {
        throw new Error("User data not found")
      }

      const userData = userDoc.data()
      const robloxUserId = userData.robloxUserId
      const robloxUsername = userData.robloxUsername

      if (!robloxUserId || !robloxUsername) {
        throw new Error("Roblox account not linked")
      }

      // Add inactivity notice to Firestore
      await addDoc(collection(db, "workspaces", workspaceId, "inactivityNotices"), {
        userId: robloxUserId.toString(),
        username: robloxUsername,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
        status: "pending", // pending, approved, denied, completed
        createdAt: serverTimestamp(),
      })

      setSuccess(true)
      toast({
        title: "Inactivity notice submitted",
        description: "Your inactivity notice has been submitted for approval.",
      })

      // Refresh the notices list
      fetchInactivityNotices()
    } catch (err: any) {
      console.error("Error submitting inactivity notice:", err)
      setError(err.message || "Failed to submit inactivity notice. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setReason("")
    setSuccess(false)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="text-[10px] sm:text-xs bg-green-500/20 text-green-500 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">Approved</span>
      case "denied":
        return <span className="text-[10px] sm:text-xs bg-red-500/20 text-red-500 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">Denied</span>
      case "completed":
        return <span className="text-[10px] sm:text-xs bg-blue-500/20 text-blue-500 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">Completed</span>
      case "pending":
      default:
        return <span className="text-[10px] sm:text-xs bg-amber-500/20 text-amber-500 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">Pending</span>
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Inactivity Notices</h1>
            <p className="text-sm sm:text-base text-white/60">Submit and manage your inactivity notices</p>
          </div>
          <Button onClick={() => router.push(`/workspace/${workspaceId}/inactivity/manage`)} variant="outline" className="w-full sm:w-auto">
            <CheckCircle className="h-4 w-4 mr-2" />
            Manage Notices
          </Button>
        </div>
      </div>

      <Tabs defaultValue="submit" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full">
          <TabsTrigger value="submit" className="text-xs sm:text-sm">Submit Notice</TabsTrigger>
          <TabsTrigger value="active" className="text-xs sm:text-sm">Active ({activeNotices.length})</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">History ({pastNotices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="submit">
          <Card>
            <CardHeader>
              <CardTitle>Submit Inactivity Notice</CardTitle>
              <CardDescription>Let your group know when you'll be away</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success ? (
                <div className="text-center py-4 sm:py-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2">Notice Submitted!</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">Your inactivity notice has been submitted for approval.</p>
                  <Button onClick={resetForm} className="w-full sm:w-auto">Submit Another</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <DatePicker date={startDate} setDate={setStartDate} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <DatePicker date={endDate} setDate={setEndDate} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reason</label>
                    <Textarea
                      placeholder="Explain why you'll be inactive..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Inactivity Notice"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Notices</CardTitle>
              <CardDescription>Your currently active inactivity notices</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : activeNotices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You have no active inactivity notices</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeNotices.map((notice) => (
                    <div key={notice.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">
                          {notice.reason.length > 30 ? notice.reason.substring(0, 30) + "..." : notice.reason}
                        </h3>
                        {getStatusBadge(notice.status)}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {formatDate(notice.startDate)} - {formatDate(notice.endDate)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{notice.reason}</p>

                      {notice.adminNote && (
                        <div className="mt-2 p-2 bg-muted rounded-md">
                          <p className="text-xs font-medium">Admin Note:</p>
                          <p className="text-xs">{notice.adminNote}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Notice History</CardTitle>
              <CardDescription>Past inactivity notices you've submitted</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : pastNotices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You have no past inactivity notices</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastNotices.map((notice) => (
                    <div key={notice.id} className="rounded-lg border p-4 opacity-70">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">
                          {notice.reason.length > 30 ? notice.reason.substring(0, 30) + "..." : notice.reason}
                        </h3>
                        {getStatusBadge(notice.status)}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {formatDate(notice.startDate)} - {formatDate(notice.endDate)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{notice.reason}</p>
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
