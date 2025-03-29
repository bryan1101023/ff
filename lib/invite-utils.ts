import { doc, collection, setDoc, query, where, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { nanoid } from "nanoid"

// Generate a unique invite code
export async function generateInviteCode(workspaceId: string, expiresIn?: number, minRank?: number): Promise<string> {
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
      minRank: minRank || null, // Store minimum rank requirement
    })

    return inviteCode
  } catch (error) {
    console.error("Error generating invite code:", error)
    throw new Error("Failed to generate invite code")
  }
}

// Get workspace ID from invite code
export async function getWorkspaceFromInviteCode(inviteCode: string): Promise<string | null> {
  try {
    // Query for the invite
    const invitesQuery = query(
      collection(db, "invites"),
      where("code", "==", inviteCode),
      where("isActive", "==", true),
    )

    const querySnapshot = await getDocs(invitesQuery)

    if (querySnapshot.empty) {
      return null
    }

    const invite = querySnapshot.docs[0].data()

    // Check if invite has expired
    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      // Deactivate expired invite
      await setDoc(doc(db, "invites", querySnapshot.docs[0].id), { isActive: false }, { merge: true })
      return null
    }

    return invite.workspaceId
  } catch (error) {
    console.error("Error getting workspace from invite code:", error)
    return null
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
