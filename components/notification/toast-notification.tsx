"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, AlertCircle, XCircle, Info } from "lucide-react"

interface ToastNotificationProps {
  message: string
  type?: "success" | "error" | "info" | "warning"
  duration?: number
  onClose?: () => void
}

export default function ToastNotification({
  message,
  type = "info",
  duration = 5000,
  onClose,
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onClose) setTimeout(onClose, 300) // Allow animation to complete
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-500/10 border-green-500/20"
      case "error":
        return "bg-red-500/10 border-red-500/20"
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/20"
      default:
        return "bg-blue-500/10 border-blue-500/20"
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4"
        >
          <div
            className={`rounded-lg shadow-lg border px-4 py-3 flex items-center gap-3 ${getBackgroundColor()}`}
          >
            {getIcon()}
            <p className="text-sm flex-1">{message}</p>
            <button
              onClick={() => {
                setIsVisible(false)
                if (onClose) setTimeout(onClose, 300)
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Create a container for managing multiple notifications
export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4 space-y-2">
      {children}
    </div>
  )
}
