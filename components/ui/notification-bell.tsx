"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  type Timestamp,
  orderBy,
  limit,
} from "firebase/firestore"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"

// Update the NotificationItem interface to include actionText
interface NotificationItem {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error" | "white"
  read: boolean
  createdAt: any
  link?: string
  additionalData?: any
  actionText?: string
}

interface Notification {
  id: string
  userId: string
  message: string
  read: boolean
  createdAt: Timestamp
  type: "system" | "admin" | "workspace"
  link?: string
  actionText?: string
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (!userId) {
      console.log("No user ID provided to NotificationBell")
      return
    }

    console.log(`Setting up notification listener for user ${userId}`)

    // Query notifications for this user
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20),
    )

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log(`Notification snapshot received, count: ${querySnapshot.size}`)

        const notificationsList: Notification[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          console.log(`Notification data:`, data)

          notificationsList.push({
            id: doc.id,
            ...data,
          } as Notification)
        })

        setNotifications(notificationsList)
        setUnreadCount(notificationsList.filter((n) => !n.read).length)

        console.log(
          `Total notifications: ${notificationsList.length}, Unread: ${notificationsList.filter((n) => !n.read).length}`,
        )
      },
      (error) => {
        console.error("Error fetching notifications:", error)
      },
    )

    return () => unsubscribe()
  }, [userId])

  const markAsRead = async (notificationId: string, link?: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      })

      // Navigate to the link if provided
      if (link) {
        router.push(link)
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const promises = notifications
        .filter((n) => !n.read)
        .map((n) => updateDoc(doc(db, "notifications", n.id), { read: true }))

      await Promise.all(promises)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const formatTime = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp || !timestamp.toDate) return "Just now"
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true })
    } catch (error) {
      console.error("Error formatting timestamp:", error)
      return "Recently"
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "system":
        return "bg-blue-500"
      case "admin":
        return "bg-purple-500"
      case "workspace":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="relative hover:bg-white/10">
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 z-50"
          >
            <Card className="overflow-hidden shadow-lg border border-white/10 bg-[#0a0a0a]">
              <div className="p-3 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-medium">Notifications</h3>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7 px-2">
                    Mark all as read
                  </Button>
                )}
              </div>

              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 border-b border-white/10 hover:bg-white/5 transition-colors ${!notification.read ? "bg-white/[0.03]" : ""}`}
                        onClick={() => !notification.read && markAsRead(notification.id, notification.link)}
                      >
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${getNotificationColor(notification.type)}`} />
                          <div className="flex-1">
                            <p className={`text-sm ${!notification.read ? "font-medium text-white" : "text-white/80"}`}>
                              {notification.message}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground">{formatTime(notification.createdAt)}</p>
                              {notification.actionText && notification.link && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="text-xs p-0 h-auto text-blue-400 hover:text-blue-300"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(notification.id, notification.link)
                                  }}
                                >
                                  {notification.actionText}
                                </Button>
                              )}
                            </div>
                          </div>
                          {!notification.read && <div className="w-2 h-2 rounded-full bg-blue-500 self-start mt-2" />}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

