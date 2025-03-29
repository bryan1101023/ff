import { db } from "./firebase"
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  serverTimestamp 
} from "firebase/firestore"

export interface Announcement {
  id: string
  workspaceId: string
  title: string
  content: string
  authorId: string
  authorName: string
  createdAt: Timestamp
  isPinned: boolean
  likes: number
  comments: number
}

// Create a new announcement
export async function createAnnouncement(
  workspaceId: string,
  title: string,
  content: string,
  authorId: string,
  authorName: string,
  isPinned: boolean = false
): Promise<{ id: string }> {
  try {
    const announcementData = {
      workspaceId,
      title,
      content,
      authorId,
      authorName,
      createdAt: serverTimestamp(),
      isPinned,
      likes: 0,
      comments: 0
    }

    const docRef = await addDoc(collection(db, "workspaces", workspaceId, "announcements"), announcementData)
    
    return { id: docRef.id }
  } catch (error) {
    console.error("Error creating announcement:", error)
    throw new Error("Failed to create announcement")
  }
}

// Get all announcements for a workspace
export async function getWorkspaceAnnouncements(workspaceId: string): Promise<Announcement[]> {
  try {
    const q = query(
      collection(db, "workspaces", workspaceId, "announcements"),
      orderBy("createdAt", "desc")
    )
    
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Announcement[]
  } catch (error) {
    console.error("Error fetching announcements:", error)
    throw new Error("Failed to fetch announcements")
  }
}

// Get pinned announcements for a workspace
export async function getPinnedAnnouncements(workspaceId: string): Promise<Announcement[]> {
  try {
    const q = query(
      collection(db, "workspaces", workspaceId, "announcements"),
      where("isPinned", "==", true),
      orderBy("createdAt", "desc")
    )
    
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Announcement[]
  } catch (error) {
    console.error("Error fetching pinned announcements:", error)
    throw new Error("Failed to fetch pinned announcements")
  }
}

// Update an announcement
export async function updateAnnouncement(
  workspaceId: string,
  announcementId: string,
  updates: Partial<Announcement>
): Promise<void> {
  try {
    const announcementRef = doc(db, "workspaces", workspaceId, "announcements", announcementId)
    await updateDoc(announcementRef, updates)
  } catch (error) {
    console.error("Error updating announcement:", error)
    throw new Error("Failed to update announcement")
  }
}

// Delete an announcement
export async function deleteAnnouncement(workspaceId: string, announcementId: string): Promise<void> {
  try {
    const announcementRef = doc(db, "workspaces", workspaceId, "announcements", announcementId)
    await deleteDoc(announcementRef)
  } catch (error) {
    console.error("Error deleting announcement:", error)
    throw new Error("Failed to delete announcement")
  }
}

// Toggle pin status for an announcement
export async function toggleAnnouncementPin(
  workspaceId: string,
  announcementId: string,
  isPinned: boolean
): Promise<void> {
  try {
    const announcementRef = doc(db, "workspaces", workspaceId, "announcements", announcementId)
    await updateDoc(announcementRef, { isPinned })
  } catch (error) {
    console.error("Error toggling announcement pin:", error)
    throw new Error("Failed to toggle announcement pin")
  }
}

// Format timestamp to relative time (e.g., "2 hours ago")
export function formatRelativeTime(timestamp: Timestamp): string {
  if (!timestamp) return "Just now"
  
  const now = new Date()
  const date = timestamp.toDate()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return "Just now"
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} ${days === 1 ? "day" : "days"} ago`
  } else if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800)
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`
  } else {
    return date.toLocaleDateString()
  }
}
