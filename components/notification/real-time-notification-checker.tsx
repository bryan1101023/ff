"use client"

import { useEffect, useState } from "react"
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import Notification from "@/components/ui/notification"

export default function RealTimeNotificationChecker() {
  const { user } = useAuth()
  const [activeNotification, setActiveNotification] = useState<any>(null)

  useEffect(() => {
    if (!user?.uid) return

    const checkForNotifications = async () => {
      try {
        // Query for unshown real-time notifications
        const q = query(collection(db, "users", user.uid, "realtime-notifications"), where("shown", "==", false))

        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          // Get the oldest notification
          const notifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))

          // Sort by creation time
          notifications.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0
            const bTime = b.createdAt?.toMillis() || 0
            return aTime - bTime
          })

          const notification = notifications[0]

          // Mark as shown
          await updateDoc(doc(db, "users", user.uid, "realtime-notifications", notification.id), {
            shown: true,
          })

          // Set the active notification
          setActiveNotification(notification)

          // Auto-dismiss after duration
          setTimeout(() => {
            setActiveNotification(null)
          }, notification.duration || 5000)
        }
      } catch (error) {
        console.error("Error checking for real-time notifications:", error)
      }
    }

    // Check immediately on mount
    checkForNotifications()

    // Then check periodically
    const interval = setInterval(checkForNotifications, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [user])

  if (!activeNotification) return null

  return (
    <Notification
      message={activeNotification.message}
      type={activeNotification.type || "info"}
      duration={activeNotification.duration || 5000}
      actionText={activeNotification.actionText}
      additionalData={activeNotification.additionalData}
      isVisible={true}
      onClose={() => setActiveNotification(null)}
    />
  )
}

