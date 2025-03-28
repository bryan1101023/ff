"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X } from "lucide-react"
import { Label } from "@/components/ui/label"

interface RestrictionDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  restrictions: {
    features: string[]
    reason: string
    appliedAt: Date | { toDate: () => Date }
    expiresAt?: Date | { toDate: () => Date } | null
    duration?: string
  }
}

// Make sure the modal properly displays all restriction details including duration
export default function RestrictionDetailsModal({ isOpen, onClose, restrictions }: RestrictionDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            Workspace Restrictions
          </DialogTitle>
          <DialogDescription>Your workspace has been restricted from using certain features</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Restricted Features</Label>
            <div className="space-y-2">
              {restrictions.features.map((feature: string) => (
                <div key={feature} className="flex items-center space-x-2">
                  <X className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">{formatFeatureName(feature)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Reason</Label>
            <div className="p-3 bg-muted rounded-md text-sm">{restrictions.reason}</div>
          </div>

          {restrictions.duration && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Duration</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {restrictions.duration}
                {restrictions.expiresAt && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Expires on: {new Date(restrictions.expiresAt.toDate()).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Applied On</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {restrictions.appliedAt ? new Date(restrictions.appliedAt.toDate()).toLocaleString() : "Unknown"}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to format feature names
function formatFeatureName(feature: string): string {
  const featureMap: Record<string, string> = {
    inactivityNotice: "Inactivity Notices",
    timeTracking: "Time Tracking",
    automation: "Automation Rules",
    announcements: "Announcements",
    memberManagement: "Member Management",
  }

  return featureMap[feature] || feature
}

