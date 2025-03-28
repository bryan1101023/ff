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
import { createLogEntry } from "./logs-utils"

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
  attachments?: {
    name: string
    url: string
    type: string
  }[]
}

export async function createSession(session: Omit<Session, "createdAt" | "updatedAt">): Promise<string> {
  try {
    const sessionRef = await addDoc(collection(db, "sessions"), {
      ...session,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // Log the action
    await createLogEntry({
      workspaceId: session.workspaceId,
      userId: session.createdBy,
      username: "", // This should be filled with the actual username
      action: "session_created",
      details: {
        sessionId: sessionRef.id,
        sessionTitle: session.title,
      },
    })

    return sessionRef.id
  } catch (error) {
    console.error("Error creating session:", error)
    throw new Error("Failed to create session")
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
      workspaceId: session.workspaceId,
      userId,
      username: "", // This should be filled with the actual username
      action: "session_updated",
      details: {
        sessionId,
        sessionTitle: session.title,
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
      workspaceId: session.workspaceId,
      userId,
      username: "", // This should be filled with the actual username
      action: "session_deleted",
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

export async function startSession(sessionId: string, userId: string): Promise<void> {
  try {
    const sessionRef = doc(db, "sessions", sessionId)
    const sessionDoc = await getDoc(sessionRef)

    if (!sessionDoc.exists()) {
      throw new Error("Session not found")
    }

    const session = sessionDoc.data() as Session

    await updateDoc(sessionRef, {
      status: "in_progress",
      updatedAt: Date.now(),
    })

    // Log the action
    await createLogEntry({
      workspaceId: session.workspaceId,
      userId,
      username: "", // This should be filled with the actual username
      action: "session_started",
      details: {
        sessionId,
        sessionTitle: session.title,
      },
    })
  } catch (error) {
    console.error("Error starting session:", error)
    throw new Error("Failed to start session")
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

    await updateDoc(sessionRef, {
      status: "completed",
      notes: notes || session.notes,
      updatedAt: Date.now(),
    })

    // Log the action
    await createLogEntry({
      workspaceId: session.workspaceId,
      userId,
      username: "", // This should be filled with the actual username
      action: "session_ended",
      details: {
        sessionId,
        sessionTitle: session.title,
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

