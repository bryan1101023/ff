"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import RestrictionDetailsModal from "../workspace/restriction-details-modal"

interface NotificationProps {
  message: string
  type?: "info" | "success" | "warning" | "error" | "white"
  duration?: number
  onClose?: () => void
  isVisible?: boolean
  actionText?: string
  additionalData?: any
}

export default function Notification({
  message,
  type = "info",
  duration = 5000,
  onClose,
  isVisible = true,
  actionText,
  additionalData,
}: NotificationProps) {
  const [isOpen, setIsOpen] = useState(isVisible)
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false)

  useEffect(() => {
    setIsOpen(isVisible)
  }, [isVisible])

  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        setIsOpen(false)
        onClose?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-500 text-white"
      case "warning":
        return "bg-amber-500 text-white"
      case "error":
        return "bg-red-500 text-white"
      case "white":
        return "bg-white text-black border border-gray-200"
      default:
        return "bg-white text-black"
    }
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (additionalData?.restrictionDetails) {
      setIsRestrictionModalOpen(true)
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg",
              "flex items-center justify-between min-w-[300px] max-w-md",
              getTypeStyles(),
            )}
          >
            <div>
              <span>{message}</span>
              {actionText && (
                <button onClick={handleActionClick} className="ml-2 text-white underline text-sm font-medium">
                  {actionText}
                </button>
              )}
            </div>
            <button onClick={handleClose} className="ml-4 p-1 rounded-full hover:bg-black/10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {additionalData?.restrictionDetails && (
        <RestrictionDetailsModal
          isOpen={isRestrictionModalOpen}
          onClose={() => setIsRestrictionModalOpen(false)}
          restrictions={{
            features: additionalData.restrictionDetails.features,
            reason: additionalData.restrictionDetails.reason,
            appliedAt: new Date(),
            expiresAt: null,
          }}
        />
      )}
    </>
  )
}

