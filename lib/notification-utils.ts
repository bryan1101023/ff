import { db } from "./firebase"
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore"
import { toast as showToastOriginal } from "@/hooks/use-toast"

// Function to create a new notification
export async function createNotification(
  userId: string,
  message: string,
  type: "system" | "admin" | "workspace" = "system",
  link?: string,
  actionText?: string,
) {
  try {
    // Add console log for debugging
    console.log(`Creating notification for user ${userId}: ${message} (${type})`)

    // Ensure we have valid data
    if (!userId || !message) {
      console.error("Missing required data for notification:", { userId, message })
      return false
    }

    const notificationData = {
      userId,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
      link,
      actionText,
    }

    // Add the notification to Firestore
    const docRef = await addDoc(collection(db, "notifications"), notificationData)
    console.log("Notification created with ID:", docRef.id)
    return true
  } catch (error) {
    console.error("Error creating notification:", error)
    return false
  }
}

// Function to create a workspace deleted notification
export async function createWorkspaceDeletedNotification(userId: string, workspaceName: string): Promise<void> {
  try {
    // Create a notification in the main notifications collection
    const message = `Your workspace "${workspaceName}" has been deleted for violating Staffify rules.`
    await createNotification(userId, message, "workspace", "/dashboard", "Return to Dashboard")

    // Send real-time notification
    await sendRealTimeNotification(userId, {
      title: "Workspace Deleted",
      message,
      type: "error",
      link: `/dashboard`,
      actionText: "Return to Dashboard",
    })
  } catch (error) {
    console.error("Error creating workspace deleted notification:", error)
  }
}

// Function to create a workspace restricted notification
export async function createWorkspaceRestrictedNotification(
  userId: string,
  workspaceName: string,
  workspaceId: string,
  features: string[],
  reason: string,
): Promise<void> {
  try {
    // Create a notification in the main notifications collection
    const message = `Your workspace "${workspaceName}" has been restricted from using: ${features.join(", ")}. Reason: ${reason}`
    await createNotification(
      userId,
      message,
      "workspace",
      `/workspace/${workspaceId}/settings`,
      "Click here to learn more",
    )

    // Send real-time notification
    await sendRealTimeNotification(userId, {
      title: "Workspace Restricted",
      message,
      type: "warning",
      link: `/workspace/${workspaceId}/settings`,
      actionText: "Click here to learn more",
      additionalData: {
        restrictionDetails: {
          features,
          reason,
          workspaceId,
        },
      },
    })
  } catch (error) {
    console.error("Error creating workspace restricted notification:", error)
  }
}

// Function to create a workspace report approved notification
export async function createWorkspaceReportApprovedNotification(userId: string): Promise<void> {
  try {
    // Create a notification in the main notifications collection
    const message = "Update on your report! Our team has handled your report and a punishment has been issued."
    await createNotification(userId, message, "admin", "/dashboard", "Return to Dashboard")

    // Send real-time notification
    await sendRealTimeNotification(userId, {
      title: "Report Approved",
      message,
      type: "success",
      link: `/dashboard`,
      actionText: "Return to Dashboard",
    })
  } catch (error) {
    console.error("Error creating report approved notification:", error)
  }
}

// Function to create a workspace report rejected notification
export async function createWorkspaceReportRejectedNotification(userId: string): Promise<void> {
  try {
    // Create a notification in the main notifications collection
    const message = "Your report will not be handled as our team believes it is a misunderstanding or based on false evidence, grounds."
    await createNotification(userId, message, "admin", "/dashboard", "Return to Dashboard")

    // Send real-time notification
    await sendRealTimeNotification(userId, {
      title: "Report Rejected",
      message,
      type: "warning",
      link: `/dashboard`,
      actionText: "Return to Dashboard",
    })
  } catch (error) {
    console.error("Error creating report rejected notification:", error)
  }
}

// Function to send a notification to all users
export async function sendNotificationToAllUsers(message: string, type: "system" | "admin" = "admin") {
  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, "users"))

    // Create a notification for each user
    const promises = usersSnapshot.docs.map((doc) => {
      const userId = doc.id
      return createNotification(userId, message, type)
    })

    await Promise.all(promises)
    return true
  } catch (error) {
    console.error("Error sending notification to all users:", error)
    return false
  }
}

// Function to send a notification to specific users
export async function sendNotificationToUsers(userIds: string[], message: string, type: "system" | "admin" = "admin") {
  try {
    const promises = userIds.map((userId) => createNotification(userId, message, type))

    await Promise.all(promises)
    return true
  } catch (error) {
    console.error("Error sending notification to users:", error)
    return false
  }
}

// Update the sendNotification function to include actionText
export async function sendNotification({
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

    return true
  } catch (error) {
    console.error("Error sending notification:", error)
    return false
  }
}

// Function to send a real-time notification to a user
export async function sendRealTimeNotification(
  userId: string,
  notification: {
    title: string
    message: string
    type?: "info" | "success" | "warning" | "error" | "white"
    link?: string
    additionalData?: any
    actionText?: string
  },
) {
  try {
    // First, save the notification to Firestore
    await addDoc(collection(db, "users", userId, "notifications"), {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    })

    // Then, add a special flag to indicate this should be shown as a real-time notification
    await addDoc(collection(db, "users", userId, "realtime-notifications"), {
      ...notification,
      shown: false,
      createdAt: serverTimestamp(),
    })

    return true
  } catch (error) {
    console.error("Error sending real-time notification:", error)
    return false
  }
}

/**
 * Shows a black toast notification at the bottom right of the screen
 * @param title The title of the notification
 * @param description The description text
 * @param duration How long to show the notification (in ms)
 */
export function showToast(title: string, description?: string, duration: number = 5000) {
  return showToastOriginal({
    title,
    description,
    duration,
    variant: "black", // Use our new black variant
  });
}
