"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ShieldAlert } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription } from "@/components/ui/card"

interface RestrictionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (features: string[], reason: string, duration?: string) => void
  workspaceName: string
}

export default function RestrictionModal({ isOpen, onClose, onConfirm, workspaceName }: RestrictionModalProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [duration, setDuration] = useState("")

  const features = [
    {
      id: "inactivityNotice",
      label: "Inactivity Notices",
      description: "Ability to submit and manage inactivity notices",
    },
    { id: "timeTracking", label: "Time Tracking", description: "Access to time tracking features and reports" },
    { id: "automation", label: "Automation Rules", description: "Ability to create and manage automation rules" },
    { id: "announcements", label: "Announcements", description: "Ability to post and manage announcements" },
    { id: "memberManagement", label: "Member Management", description: "Ability to add, remove, and manage members" },
  ]

  const handleToggleFeature = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId],
    )
  }

  const handleSubmit = () => {
    if (selectedFeatures.length === 0) {
      return
    }

    setIsSubmitting(true)

    // Call the onConfirm callback with the selected features, reason, and duration
    onConfirm(selectedFeatures, reason, duration || undefined)

    // Reset the form
    setSelectedFeatures([])
    setReason("")
    setDuration("")
    setIsSubmitting(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <ShieldAlert className="h-5 w-5" />
            Restrict Workspace
          </DialogTitle>
          <DialogDescription>Restrict access to specific features for workspace "{workspaceName}"</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select features to restrict</Label>
            <div className="space-y-3">
              {features.map((feature) => (
                <Card
                  key={feature.id}
                  className={`cursor-pointer transition-all ${
                    selectedFeatures.includes(feature.id)
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                      : "hover:border-muted-foreground/20"
                  }`}
                  onClick={() => handleToggleFeature(feature.id)}
                >
                  <CardContent className="p-3 flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        selectedFeatures.includes(feature.id)
                          ? "bg-amber-500 text-white"
                          : "border border-muted-foreground/30"
                      }`}
                    >
                      {selectedFeatures.includes(feature.id) && (
                        <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                            fill="currentColor"
                            fillRule="evenodd"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{feature.label}</h4>
                      <CardDescription className="text-xs mt-1">{feature.description}</CardDescription>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="restriction-reason" className="text-sm font-medium">
              Reason for restriction
            </Label>
            <Textarea
              id="restriction-reason"
              placeholder="Explain why these features are being restricted"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="restriction-duration" className="text-sm font-medium">
              Duration (optional)
            </Label>
            <Input
              id="restriction-duration"
              placeholder="e.g., 7 days, 2 weeks, 1 month"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leave blank for indefinite restriction</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedFeatures.length === 0 || !reason.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply Restrictions"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

