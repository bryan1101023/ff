import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "./firebase"

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  link,
  additionalData,
  actionText,
}: {
  userId: string
  title: string
  message: string
  type?: "info" | "success" | "warning" | "error" | "white"
  link?: string
  additionalData?: any
  actionText?: string
}) {
  try {
    console.log(`Sending notification to user ${userId}: ${title} - ${message}`)

    // Add the notification to Firestore
    await addDoc(collection(db, "users", userId, "notifications"), {
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
      link,
      additionalData,
      actionText,
    })

    console.log(`Notification sent successfully to user ${userId}`)
    return true
  } catch (error) {
    console.error("Error sending notification:", error)
    return false
  }
}

