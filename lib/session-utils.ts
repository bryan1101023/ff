import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore"
import { db } from "./firebase"
import { createLogEntry } from "./logging-utils"

export interface Session {
  id?: string
  workspaceId: string
  title: string
  description: string
  date: number
  duration: number // in minutes
  location: string
  host: {
    userId: string
    username: string
  }
  coHosts: {
    userId: string
    username: string
  }[]
  trainers: {
    userId: string
    username: string
  }[]
  helpers: {
    userId: string
    username: string
  }[]
  attendees: {
    userId: string
    username: string
    attended: boolean
  }[]
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  createdBy: string
  createdAt: number
  updatedAt: number
  notes?: string
  type?: "training" | "shift"
  attachments?: {
    name: string
    url: string
    type: string
  }[]
}

export async function createSession(session: Omit<Session, "id" | "createdAt" | "updatedAt">): Promise<string> {
  console.log("createSession called with:", JSON.stringify(session, null, 2));
  
  try {
    // Validate required fields
    if (!session.workspaceId || !session.title || !session.host || !session.createdBy) {
      console.error("Missing required fields for session:", { 
        workspaceId: session.workspaceId, 
        title: session.title,
        host: session.host,
        createdBy: session.createdBy
      });
      throw new Error("Missing required fields for session");
    }
    
    // Create a clean session object with only the fields we need
    const sessionData = {
      workspaceId: session.workspaceId,
      title: session.title,
      description: session.description || "",
      date: session.date,
      duration: session.duration,
      location: session.location,
      host: session.host,
      coHosts: session.coHosts || [],
      trainers: session.trainers || [],
      helpers: session.helpers || [],
      attendees: session.attendees || [],
      status: session.status,
      createdBy: session.createdBy,
      type: session.type || "training",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    console.log("Adding session to Firestore:", JSON.stringify(sessionData, null, 2));
    const sessionRef = await addDoc(collection(db, "sessions"), sessionData);
    console.log("Session added with ID:", sessionRef.id);

    // Log the action
    try {
      await createLogEntry({
        type: "session_created",
        userId: session.createdBy,
        username: session.host?.username || "", 
        workspaceId: session.workspaceId,
        details: {
          sessionId: sessionRef.id,
          sessionTitle: session.title,
          sessionType: session.type || "training",
        },
      });
      console.log("Session creation logged successfully");
    } catch (logError) {
      console.error("Error logging session creation:", logError);
      // Continue even if logging fails
    }

    return sessionRef.id;
  } catch (error) {
    console.error("Error creating session:", error);
    throw new Error("Failed to create session: " + (error instanceof Error ? error.message : String(error)));
  }
}

export async function getWorkspaceSessions(
  workspaceId: string,
  options?: {
    status?: Session["status"] | Session["status"][]
    upcoming?: boolean
    past?: boolean
    limit?: number
  },
): Promise<Session[]> {
  try {
    let q = query(collection(db, "sessions"), where("workspaceId", "==", workspaceId))

    if (options?.status) {
      if (Array.isArray(options.status)) {
        q = query(q, where("status", "in", options.status))
      } else {
        q = query(q, where("status", "==", options.status))
      }
    }

    const now = Date.now()

    if (options?.upcoming) {
      q = query(q, where("date", ">=", now))
    }

    if (options?.past) {
      q = query(q, where("date", "<", now))
    }

    q = query(q, orderBy("date", "asc"))

    if (options?.limit) {
      q = query(q, limit(options.limit))
    }

    const querySnapshot = await getDocs(q)

    const sessions: Session[] = []
    querySnapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      } as Session)
    })

    return sessions
  } catch (error) {
    console.error("Error getting workspace sessions:", error)
    return []
  }
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  try {
    const sessionDoc = await getDoc(doc(db, "sessions", sessionId))

    if (!sessionDoc.exists()) {
      return null
    }

    return {
      id: sessionDoc.id,
      ...sessionDoc.data(),
    } as Session
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

export async function updateSession(
  sessionId: string,
  updates: Partial<Omit<Session, "id" | "workspaceId" | "createdBy" | "createdAt">>,
  userId: string,
): Promise<void> {
  try {
    const sessionRef = doc(db, "sessions", sessionId)
    const sessionDoc = await getDoc(sessionRef)

    if (!sessionDoc.exists()) {
      throw new Error("Session not found")
    }

    const session = sessionDoc.data() as Session

    await updateDoc(sessionRef, {
      ...updates,
      updatedAt: Date.now(),
    })

    // Log the action
    await createLogEntry({
      type: "session_updated",
      userId,
      workspaceId: session.workspaceId,
      details: {
        sessionId,
        updates,
      },
    })
  } catch (error) {
    console.error("Error updating session:", error)
    throw new Error("Failed to update session")
  }
}

export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  try {
    const sessionRef = doc(db, "sessions", sessionId)
    const sessionDoc = await getDoc(sessionRef)

    if (!sessionDoc.exists()) {
      throw new Error("Session not found")
    }

    const session = sessionDoc.data() as Session

    await deleteDoc(sessionRef)

    // Log the action
    await createLogEntry({
      type: "session_deleted",
      userId,
      workspaceId: session.workspaceId,
      details: {
        sessionId,
        sessionTitle: session.title,
      },
    })
  } catch (error) {
    console.error("Error deleting session:", error)
    throw new Error("Failed to delete session")
  }
}

export async function startSession(sessionId: string, userId: string, username?: string): Promise<void> {
  console.log("Starting session:", { sessionId, userId, username });
  
  try {
    const sessionRef = doc(db, "sessions", sessionId)
    const sessionDoc = await getDoc(sessionRef)

    if (!sessionDoc.exists()) {
      throw new Error("Session not found")
    }

    const session = sessionDoc.data() as Session
    console.log("Found session:", session);

    await updateDoc(sessionRef, {
      status: "in_progress",
      updatedAt: Date.now(),
    })
    console.log("Session status updated to in_progress");

    // Log the action
    try {
      await createLogEntry({
        type: "session_started",
        userId,
        username: username || "", 
        workspaceId: session.workspaceId,
        details: {
          sessionId,
          sessionTitle: session.title,
        },
      })
      console.log("Session start logged successfully");
    } catch (logError) {
      console.error("Error logging session start:", logError);
      // Continue even if logging fails
    }
  } catch (error) {
    console.error("Error starting session:", error)
    throw new Error("Failed to start session: " + (error instanceof Error ? error.message : String(error)))
  }
}

export async function endSession(sessionId: string, userId: string, notes?: string): Promise<void> {
  try {
    const sessionRef = doc(db, "sessions", sessionId)
    const sessionDoc = await getDoc(sessionRef)

    if (!sessionDoc.exists()) {
      throw new Error("Session not found")
    }

    const session = sessionDoc.data() as Session

    // Create an update object without undefined values
    const updateData: Record<string, any> = {
      status: "completed",
      updatedAt: Date.now(),
    }
    
    // Only add notes to the update if it's defined
    if (notes !== undefined) {
      updateData.notes = notes
    } else if (session.notes) {
      // Keep existing notes if available
      updateData.notes = session.notes
    }

    await updateDoc(sessionRef, updateData)

    // Log the action
    await createLogEntry({
      type: "session_ended",
      userId,
      workspaceId: session.workspaceId,
      details: {
        sessionId,
        sessionTitle: session.title,
        notes: notes || session.notes || "",
      },
    })
  } catch (error) {
    console.error("Error ending session:", error)
    throw new Error("Failed to end session")
  }
}

export async function markAttendance(
  sessionId: string,
  attendeeId: string,
  attended: boolean,
  userId: string,
): Promise<void> {
  try {
    const sessionRef = doc(db, "sessions", sessionId)
    const sessionDoc = await getDoc(sessionRef)

    if (!sessionDoc.exists()) {
      throw new Error("Session not found")
    }

    const session = sessionDoc.data() as Session

    const updatedAttendees = session.attendees.map((attendee) => {
      if (attendee.userId === attendeeId) {
        return {
          ...attendee,
          attended,
        }
      }
      return attendee
    })

    await updateDoc(sessionRef, {
      attendees: updatedAttendees,
      updatedAt: Date.now(),
    })
  } catch (error) {
    console.error("Error marking attendance:", error)
    throw new Error("Failed to mark attendance")
  }
}
