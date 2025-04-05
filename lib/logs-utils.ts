import { collection, addDoc, query, where, orderBy, getDocs, limit } from "firebase/firestore"
import { db } from "./firebase"

export type LogAction =
  | "member_added"
  | "member_removed"
  | "workspace_created"
  | "workspace_updated"
  | "workspace_deleted"
  | "announcement_created"
  | "announcement_updated"
  | "announcement_deleted"
  | "inactivity_notice_created"
  | "inactivity_notice_updated"
  | "inactivity_notice_deleted"
  | "session_created"
  | "session_updated"
  | "session_deleted"
  | "session_started"
  | "session_ended"
  | "webhook_created"
  | "webhook_updated"
  | "webhook_deleted"
  | "webhook_triggered"
  | "automation_created"
  | "automation_updated"
  | "automation_deleted"
  | "automation_triggered"

export interface LogEntry {
  id?: string
  workspaceId: string
  userId: string
  username: string
  action: LogAction
  details: any
  timestamp: number
  ipAddress?: string
}

export async function createLogEntry(entry: Omit<LogEntry, "timestamp">): Promise<string> {
  try {
    const logRef = await addDoc(collection(db, "logs"), {
      ...entry,
      timestamp: Date.now(),
    })

    return logRef.id
  } catch (error) {
    console.error("Error creating log entry:", error)
    throw new Error("Failed to create log entry")
  }
}

export async function getWorkspaceLogs(
  workspaceId: string,
  options?: {
    limit?: number
    startAfter?: number
    filterByAction?: LogAction | LogAction[]
    filterByUser?: string
  },
): Promise<LogEntry[]> {
  try {
    let q = query(collection(db, "logs"), where("workspaceId", "==", workspaceId), orderBy("timestamp", "desc"))

    if (options?.startAfter) {
      q = query(q, where("timestamp", "<", options.startAfter))
    }

    if (options?.filterByAction) {
      if (Array.isArray(options.filterByAction)) {
        q = query(q, where("action", "in", options.filterByAction))
      } else {
        q = query(q, where("action", "==", options.filterByAction))
      }
    }

    if (options?.filterByUser) {
      q = query(q, where("userId", "==", options.filterByUser))
    }

    if (options?.limit) {
      q = query(q, limit(options.limit))
    }

    const querySnapshot = await getDocs(q)

    const logs: LogEntry[] = []
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      } as LogEntry)
    })

    return logs
  } catch (error) {
    console.error("Error getting workspace logs:", error)
    return []
  }
}

// Helper function to get a human-readable description of a log action
export function getActionDescription(action?: LogAction): string {
  if (!action) return "Performed an action";
  
  const actionMap: Record<LogAction, string> = {
    member_added: "Added a member",
    member_removed: "Removed a member",
    workspace_created: "Created workspace",
    workspace_updated: "Updated workspace",
    workspace_deleted: "Deleted workspace",
    announcement_created: "Created announcement",
    announcement_updated: "Updated announcement",
    announcement_deleted: "Deleted announcement",
    inactivity_notice_created: "Created inactivity notice",
    inactivity_notice_updated: "Updated inactivity notice",
    inactivity_notice_deleted: "Deleted inactivity notice",
    session_created: "Created session",
    session_updated: "Updated session",
    session_deleted: "Deleted session",
    session_started: "Started session",
    session_ended: "Ended session",
    webhook_created: "Created webhook",
    webhook_updated: "Updated webhook",
    webhook_deleted: "Deleted webhook",
    webhook_triggered: "Triggered webhook",
    automation_created: "Created automation",
    automation_updated: "Updated automation",
    automation_deleted: "Deleted automation",
    automation_triggered: "Triggered automation",
  }

  return actionMap[action] || "Performed an action"
}
