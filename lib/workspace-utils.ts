import { doc, setDoc, collection, addDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "./firebase"

// Update workspace theme
export async function updateWorkspaceTheme(workspaceId: string, theme: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "workspaces", workspaceId),
      {
        theme,
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error updating workspace theme:", error)
    throw new Error("Failed to update workspace theme")
  }
}

// Update workspace allowed ranks
export async function updateWorkspaceAllowedRanks(workspaceId: string, allowedRanks: number[]): Promise<void> {
  try {
    await setDoc(
      doc(db, "workspaces", workspaceId),
      {
        allowedRanks,
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error updating workspace allowed ranks:", error)
    throw new Error("Failed to update workspace allowed ranks")
  }
}

// Apply for workspace verification
export async function applyForVerification(workspaceId: string, reason: string): Promise<void> {
  try {
    // Update workspace to mark as verification requested
    await setDoc(
      doc(db, "workspaces", workspaceId),
      {
        verificationRequested: true,
        verificationReason: reason,
        verificationRequestedAt: Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error applying for verification:", error)
    throw new Error("Failed to apply for verification")
  }
}

// Add member to workspace
export async function addMemberToWorkspace(workspaceId: string, userId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "workspaces", workspaceId),
      {
        members: arrayUnion(userId),
        updatedAt: Date.now(),
      },
      { merge: true },
    )

    // Add workspace to user's workspaces
    await setDoc(
      doc(db, "users", userId),
      {
        workspaces: arrayUnion(workspaceId),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error adding member to workspace:", error)
    throw new Error("Failed to add member to workspace")
  }
}

// Remove member from workspace
export async function removeMemberFromWorkspace(workspaceId: string, userId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "workspaces", workspaceId),
      {
        members: arrayRemove(userId),
        updatedAt: Date.now(),
      },
      { merge: true },
    )

    // Remove workspace from user's workspaces
    await setDoc(
      doc(db, "users", userId),
      {
        workspaces: arrayRemove(workspaceId),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error removing member from workspace:", error)
    throw new Error("Failed to remove member from workspace")
  }
}

// Verify a workspace (admin only)
export async function verifyWorkspace(workspaceId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "workspaces", workspaceId),
      {
        isVerified: true,
        verifiedAt: Date.now(),
        verificationRequested: false,
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error verifying workspace:", error)
    throw new Error("Failed to verify workspace")
  }
}

// Reject workspace verification (admin only)
export async function rejectVerification(workspaceId: string, reason: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "workspaces", workspaceId),
      {
        verificationRequested: false,
        verificationRejectedReason: reason,
        verificationRejectedAt: Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error rejecting verification:", error)
    throw new Error("Failed to reject verification")
  }
}

// Save inactivity notice
export async function saveInactivityNotice(
  workspaceId: string,
  userId: string,
  robloxUsername: string,
  startDate: Date,
  endDate: Date,
  reason: string,
): Promise<void> {
  try {
    await addDoc(collection(db, "inactivityNotices"), {
      workspaceId,
      userId,
      robloxUsername,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      reason,
      status: "active",
      createdAt: Date.now(),
    })
  } catch (error) {
    console.error("Error saving inactivity notice:", error)
    throw new Error("Failed to save inactivity notice")
  }
}

// Get inactivity notices for a workspace
export async function getInactivityNotices(workspaceId: string): Promise<any[]> {
  try {
    const querySnapshot = await collection(db, "inactivityNotices")
      .where("workspaceId", "==", workspaceId)
      .where("status", "==", "active")
      .get()

    const notices: any[] = []
    querySnapshot.forEach((doc) => {
      notices.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return notices
  } catch (error) {
    console.error("Error getting inactivity notices:", error)
    return []
  }
}

