import { db } from "./firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

/**
 * Log types for different user actions
 */
export type LogType = 
  | "session_created"
  | "session_updated"
  | "session_deleted"
  | "session_started"
  | "session_ended"
  | "automation_created"
  | "automation_updated"
  | "automation_deleted"
  | "automation_triggered"
  | "feed_message_sent"
  | "feed_message_deleted"
  | "recommendation_created"
  | "recommendation_supported"
  | "recommendation_unsupported"
  | "knowledge_category_created"
  | "knowledge_document_created"
  | "knowledge_link_created"
  | "user_joined"
  | "user_left"
  | "user_promoted"
  | "user_demoted"

/**
 * Interface for log entries
 */
export interface LogEntry {
  type: LogType
  userId: string
  username?: string
  workspaceId: string
  timestamp: any // Firestore timestamp
  details?: any // Additional details specific to the action
  ipAddress?: string
  userAgent?: string
}

/**
 * Create a log entry for user actions
 * @param logEntry The log entry to create
 * @returns Promise with the log entry ID
 */
export async function createLogEntry(logEntry: Omit<LogEntry, "timestamp">): Promise<string> {
  try {
    // Validate required fields
    if (!logEntry.type || !logEntry.userId || !logEntry.workspaceId) {
      console.error("Missing required fields for log entry:", { 
        type: logEntry.type, 
        userId: logEntry.userId, 
        workspaceId: logEntry.workspaceId 
      });
      return "";
    }
    
    // Ensure all fields are properly defined and formatted
    const sanitizedLogEntry = {
      type: logEntry.type,
      userId: logEntry.userId,
      username: logEntry.username || "",
      workspaceId: String(logEntry.workspaceId), // Ensure it's a string
      timestamp: serverTimestamp(),
      details: logEntry.details || {},
      ipAddress: logEntry.ipAddress || "",
      userAgent: logEntry.userAgent || ""
    };
    
    // Add to logs collection
    const docRef = await addDoc(collection(db, "logs"), sanitizedLogEntry);
    
    // Also add to workspace-specific logs subcollection
    await addDoc(
      collection(db, "workspaces", sanitizedLogEntry.workspaceId, "logs"),
      sanitizedLogEntry
    );
    
    console.log(`Log entry created: ${sanitizedLogEntry.type}`, sanitizedLogEntry);
    return docRef.id;
  } catch (error) {
    console.error("Error creating log entry:", error);
    return "";
  }
}

/**
 * Helper function to get user IP address (client-side)
 * @returns User's IP address or empty string if not available
 */
export async function getUserIpAddress(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org?format=json")
    const data = await response.json()
    return data.ip || ""
  } catch (error) {
    console.error("Error getting IP address:", error)
    return ""
  }
}
