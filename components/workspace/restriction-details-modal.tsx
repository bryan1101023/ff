"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Ban, Calendar, Clock, Info, Shield, X } from "lucide-react"
import { motion } from "framer-motion"

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

// Modern restriction details modal with animations and improved UI
export default function RestrictionDetailsModal({ isOpen, onClose, restrictions }: RestrictionDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-0 shadow-xl">
        <div className="bg-gradient-to-r from-amber-500/20 to-red-500/20 dark:from-amber-900/40 dark:to-red-900/40 p-6">
          <DialogHeader className="gap-2">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <DialogTitle className="text-xl font-bold">Workspace Restrictions</DialogTitle>
            </motion.div>
            <DialogDescription className="text-base opacity-90">
              Your workspace has been restricted from using certain features
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Ban className="h-4 w-4 text-amber-500" />
              Restricted Features
            </h3>
            <div className="space-y-2">
              {restrictions.features.map((feature: string, index) => (
                <motion.div 
                  key={feature} 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + (index * 0.05), duration: 0.3 }}
                  className="flex items-center p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50"
                >
                  <X className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
                  <span className="text-sm font-medium">{formatFeatureName(feature)}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              Reason
            </h3>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-md text-sm border border-blue-100 dark:border-blue-900/50">
              {restrictions.reason}
            </div>
          </motion.div>

          {restrictions.duration && (
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                Duration
              </h3>
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-md text-sm border border-purple-100 dark:border-purple-900/50">
                <div className="font-medium">{restrictions.duration}</div>
                {restrictions.expiresAt && (
                  <div className="mt-2 text-sm flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <Calendar className="h-3.5 w-3.5" />
                    Expires on: {formatDate(restrictions.expiresAt)}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Applied On
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md text-sm border border-gray-100 dark:border-gray-700">
              {formatDate(restrictions.appliedAt)}
            </div>
          </motion.div>
        </div>

        <div className="p-4 border-t bg-muted/30 flex justify-end">
          <Button 
            onClick={onClose} 
            className="px-6"
            variant="default"
          >
            Close
          </Button>
        </div>
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
