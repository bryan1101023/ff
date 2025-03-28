import { doc, collection, setDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "./firebase"
import { nanoid } from "nanoid"

// Generate a unique invite code
export async function generateInviteCode(workspaceId: string, expiresIn?: number): Promise<string> {
  try {
    // Generate a unique code
    const inviteCode = nanoid(10)

    // Calculate expiration time if provided (in hours)
    const expiresAt = expiresIn ? Date.now() + expiresIn * 60 * 60 * 1000 : null

    // Create the invite in Firestore
    const inviteRef = doc(collection(db, "invites"))
    await setDoc(inviteRef, {
      id: inviteRef.id,
      code: inviteCode,
      workspaceId,
      createdAt: Date.now(),
      expiresAt,
      isActive: true,
    })

    return inviteCode
  } catch (error) {
    console.error("Error generating invite code:", error)
    throw new Error("Failed to generate invite code")
  }
}

// Deactivate an invite
export async function deactivateInvite(inviteCode: string): Promise<boolean> {
  try {
    const invitesQuery = query(collection(db, "invites"), where("code", "==", inviteCode))

    const querySnapshot = await getDocs(invitesQuery)

    if (querySnapshot.empty) {
      return false
    }

    await setDoc(doc(db, "invites", querySnapshot.docs[0].id), { isActive: false }, { merge: true })

    return true
  } catch (error) {
    console.error("Error deactivating invite:", error)
    return false
  }
}

// Get all active invites for a workspace
export async function getWorkspaceInvites(workspaceId: string): Promise<any[]> {
  try {
    const invitesQuery = query(
      collection(db, "invites"),
      where("workspaceId", "==", workspaceId),
      where("isActive", "==", true),
    )

    const querySnapshot = await getDocs(invitesQuery)

    const invites: any[] = []
    querySnapshot.forEach((doc) => {
      invites.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return invites
  } catch (error) {
    console.error("Error getting workspace invites:", error)
    return []
  }
}

