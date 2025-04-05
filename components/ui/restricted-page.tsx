"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Ban, Info } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

interface RestrictedPageProps {
  workspaceId: string
  restrictions: {
    features: string[]
    reason: string
    appliedAt: Date | { toDate: () => Date }
    expiresAt?: Date | { toDate: () => Date } | null
    duration?: string
  }
  featureName: string
}

export default function RestrictedPage({ workspaceId, restrictions, featureName }: RestrictedPageProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center"
            >
              <Ban className="h-12 w-12 text-amber-500" />
            </motion.div>
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="absolute -bottom-2 -right-2 bg-red-100 dark:bg-red-900/30 p-2 rounded-full"
            >
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </motion.div>
          </div>
          
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl sm:text-3xl font-bold mb-3"
          >
            Uh oh! Access Restricted
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-muted-foreground mb-6 max-w-sm"
          >
            This {featureName} has been restricted for your workspace due to violation of our community guidelines.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 w-full justify-center"
          >
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setShowDetailsModal(true)}
            >
              <Info className="h-4 w-4" />
              View Restriction Details
            </Button>
            
            <Button asChild>
              <Link href={`/workspace/${workspaceId}`} className="gap-2">
                Return to Workspace
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Workspace Restrictions
            </DialogTitle>
            <DialogDescription>
              Your workspace has been restricted from using certain features
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Restricted Features</h3>
              <div className="space-y-2">
                {restrictions.features.map((feature: string) => (
                  <div key={feature} className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                    <Ban className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">{formatFeatureName(feature)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Reason</h3>
              <div className="p-3 bg-muted rounded-md text-sm">{restrictions.reason}</div>
            </div>

            {restrictions.duration && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Duration</h3>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {restrictions.duration}
                  {restrictions.expiresAt && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Expires on: {formatDate(restrictions.expiresAt)}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Applied On</h3>
              <div className="p-3 bg-muted rounded-md text-sm">
                {formatDate(restrictions.appliedAt)}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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

// Helper function to safely handle Firestore timestamps or Date objects
function formatDate(dateValue: Date | { toDate: () => Date } | null | undefined): string {
  if (!dateValue) return "Unknown";
  
  // Handle Firestore timestamp
  if (typeof dateValue === 'object' && 'toDate' in dateValue) {
    return dateValue.toDate().toLocaleString();
  }
  
  // Handle regular Date object
  if (dateValue instanceof Date) {
    return dateValue.toLocaleString();
  }
  
  return "Invalid date";
}
