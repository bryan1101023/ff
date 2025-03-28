import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore"
import { db } from "./firebase"
import { createLogEntry } from "./logs-utils"

export interface Webhook {
  id?: string
  workspaceId: string
  name: string
  url: string
  events: string[]
  createdBy: string
  createdAt: number
  updatedAt: number
  isActive: boolean
  secret?: string
}

export async function createWebhook(webhook: Omit<Webhook, "createdAt" | "updatedAt">): Promise<string> {
  try {
    const webhookRef = await addDoc(collection(db, "webhooks"), {
      ...webhook,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // Log the action
    await createLogEntry({
      workspaceId: webhook.workspaceId,
      userId: webhook.createdBy,
      username: "", // This should be filled with the actual username
      action: "webhook_created",
      details: {
        webhookId: webhookRef.id,
        webhookName: webhook.name,
      },
    })

    return webhookRef.id
  } catch (error) {
    console.error("Error creating webhook:", error)
    throw new Error("Failed to create webhook")
  }
}

export async function getWorkspaceWebhooks(workspaceId: string): Promise<Webhook[]> {
  try {
    const q = query(collection(db, "webhooks"), where("workspaceId", "==", workspaceId))

    const querySnapshot = await getDocs(q)

    const webhooks: Webhook[] = []
    querySnapshot.forEach((doc) => {
      webhooks.push({
        id: doc.id,
        ...doc.data(),
      } as Webhook)
    })

    return webhooks
  } catch (error) {
    console.error("Error getting workspace webhooks:", error)
    return []
  }
}

export async function updateWebhook(
  webhookId: string,
  updates: Partial<Omit<Webhook, "id" | "workspaceId" | "createdBy" | "createdAt">>,
  userId: string,
): Promise<void> {
  try {
    const webhookRef = doc(db, "webhooks", webhookId)
    const webhookDoc = await getDoc(webhookRef)

    if (!webhookDoc.exists()) {
      throw new Error("Webhook not found")
    }

    const webhook = webhookDoc.data() as Webhook

    await updateDoc(webhookRef, {
      ...updates,
      updatedAt: Date.now(),
    })

    // Log the action
    await createLogEntry({
      workspaceId: webhook.workspaceId,
      userId,
      username: "", // This should be filled with the actual username
      action: "webhook_updated",
      details: {
        webhookId,
        webhookName: webhook.name,
        updates,
      },
    })
  } catch (error) {
    console.error("Error updating webhook:", error)
    throw new Error("Failed to update webhook")
  }
}

export async function deleteWebhook(webhookId: string, userId: string): Promise<void> {
  try {
    const webhookRef = doc(db, "webhooks", webhookId)
    const webhookDoc = await getDoc(webhookRef)

    if (!webhookDoc.exists()) {
      throw new Error("Webhook not found")
    }

    const webhook = webhookDoc.data() as Webhook

    await deleteDoc(webhookRef)

    // Log the action
    await createLogEntry({
      workspaceId: webhook.workspaceId,
      userId,
      username: "", // This should be filled with the actual username
      action: "webhook_deleted",
      details: {
        webhookId,
        webhookName: webhook.name,
      },
    })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    throw new Error("Failed to delete webhook")
  }
}

export async function triggerWebhook(workspaceId: string, event: string, payload: any): Promise<void> {
  try {
    // Get all active webhooks for this workspace that are subscribed to this event
    const q = query(
      collection(db, "webhooks"),
      where("workspaceId", "==", workspaceId),
      where("events", "array-contains", event),
      where("isActive", "==", true),
    )

    const querySnapshot = await getDocs(q)

    // Send the payload to each webhook
    const promises = []
    querySnapshot.forEach((doc) => {
      const webhook = doc.data() as Webhook

      // Add the event type to the payload
      const webhookPayload = {
        event,
        workspaceId,
        timestamp: Date.now(),
        data: payload,
      }

      // Send the payload to the webhook URL
      promises.push(
        fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(webhook.secret ? { "X-Webhook-Secret": webhook.secret } : {}),
          },
          body: JSON.stringify(webhookPayload),
        })
          .then(async (response) => {
            // Log the webhook trigger
            await createLogEntry({
              workspaceId,
              userId: "system",
              username: "System",
              action: "webhook_triggered",
              details: {
                webhookId: doc.id,
                webhookName: webhook.name,
                event,
                success: response.ok,
                statusCode: response.status,
              },
            })

            return response
          })
          .catch(async (error) => {
            // Log the webhook failure
            await createLogEntry({
              workspaceId,
              userId: "system",
              username: "System",
              action: "webhook_triggered",
              details: {
                webhookId: doc.id,
                webhookName: webhook.name,
                event,
                success: false,
                error: error.message,
              },
            })

            throw error
          }),
      )
    })

    await Promise.allSettled(promises)
  } catch (error) {
    console.error("Error triggering webhooks:", error)
  }
}

