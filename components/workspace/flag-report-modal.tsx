"use client"

import { useState } from "react"
import { Flag, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { createNotification } from "@/lib/notification-utils"
import ToastNotification from "@/components/notification/toast-notification"

interface FlagReportModalProps {
  isOpen: boolean
  onClose: () => void
  workspace: any
  userData: any
}

export default function FlagReportModal({ isOpen, onClose, workspace, userData }: FlagReportModalProps) {
  const [reason, setReason] = useState<string>("")
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const reasonOptions = [
    { id: "inappropriate", label: "Inappropriate Content" },
    { id: "copyright", label: "Copyright Violation" },
    { id: "illegal", label: "Illegal Content" },
    { id: "other", label: "Other" },
  ]

  const handleReasonToggle = (reasonId: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonId) ? prev.filter((id) => id !== reasonId) : [...prev, reasonId]
    )
  }

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one reason for your report.",
        variant: "destructive",
      })
      return
    }

    if (reason.trim() === "") {
      toast({
        title: "Error",
        description: "Please provide details about your report.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create the report in Firestore
      await addDoc(collection(db, "workspace-reports"), {
        workspaceId: workspace.id,
        workspaceName: workspace.groupName,
        reportedBy: userData.uid,
        reporterUsername: userData.username,
        reasons: selectedReasons,
        details: reason,
        status: "pending", // pending, approved, rejected
        createdAt: serverTimestamp(),
      })

      // Send a notification to the user
      await createNotification(
        userData.uid,
        "We have received your report and we will investigate it. We will update you soon.",
        "system"
      )

      // Show success toast notification
      setShowSuccessToast(true)

      // Reset form and close modal
      setReason("")
      setSelectedReasons([])
      onClose()
    } catch (error) {
      console.error("Error submitting report:", error)
      toast({
        title: "Error",
        description: "Failed to submit your report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {showSuccessToast && (
        <ToastNotification
          message="We have received your report and we will investigate it. We will update you soon."
          type="success"
          duration={5000}
          onClose={() => setShowSuccessToast(false)}
        />
      )}
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Flag Workspace
            </DialogTitle>
            <DialogDescription>
              Flag this workspace for inappropriate, abusive, or illegal content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reason(s)*</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reasonOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={selectedReasons.includes(option.id)}
                      onCheckedChange={() => handleReasonToggle(option.id)}
                    />
                    <Label htmlFor={option.id} className="text-sm font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-details" className="text-sm font-medium">
                Please provide your reasoning for flagging this workspace*
              </Label>
              <Textarea
                id="report-details"
                placeholder="Additional information..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="flex space-x-2 sm:space-x-0">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
