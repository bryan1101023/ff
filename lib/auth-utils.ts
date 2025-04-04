import { auth, db } from "./firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type UserCredential,
} from "firebase/auth"
import { doc, setDoc, getDoc, collection, query, getDocs, arrayUnion, where, documentId, orderBy, limit } from "firebase/firestore"

// User types
export interface User {
  uid: string
  email: string
  username: string
  robloxUsername?: string
  robloxUserId?: number
  robloxVerified?: boolean
  selectedGroup?: {
    id: number
    name: string
  }
  role: "admin" | "user"
  createdAt: number
  isImmune?: boolean
  immuneGrantedAt?: number | null
  workspaces?: string[]
  isBanned?: boolean
  isWarned?: boolean
}

// Sign up a new user
export async function createUser(
  email: string,
  password: string,
  username: string,
  role: "admin" | "user" = "user",
): Promise<User> {
  try {
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const { user } = userCredential

    // Create user document in Firestore
    const userData: User = {
      uid: user.uid,
      email,
      username,
      role,
      createdAt: Date.now(),
    }

    await setDoc(doc(db, "users", user.uid), userData)

    return userData
  } catch (error: any) {
    console.error("Error creating user:", error)
    throw new Error(error.message || "Failed to create user")
  }
}

// Sign in a user
export async function signIn(email: string, password: string): Promise<UserCredential> {
  try {
    return await signInWithEmailAndPassword(auth, email, password)
  } catch (error: any) {
    console.error("Error signing in:", error)
    throw new Error(error.message || "Failed to sign in")
  }
}

// Sign out
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth)
  } catch (error: any) {
    console.error("Error signing out:", error)
    throw new Error(error.message || "Failed to sign out")
  }
}

// Get current user data
export async function getCurrentUserData(uid: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid))
    if (userDoc.exists()) {
      return userDoc.data() as User
    }
    return null
  } catch (error) {
    console.error("Error getting user data:", error)
    return null
  }
}

// Update user's Roblox username
export async function updateRobloxUsername(uid: string, robloxUsername: string): Promise<void> {
  try {
    await setDoc(doc(db, "users", uid), { robloxUsername }, { merge: true })
  } catch (error) {
    console.error("Error updating Roblox username:", error)
    throw new Error("Failed to update Roblox username")
  }
}

// Update user's selected group
export async function updateSelectedGroup(uid: string, groupId: number, groupName: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        selectedGroup: { id: groupId, name: groupName },
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error updating selected group:", error)
    throw new Error("Failed to update selected group")
  }
}

// Get all users (for admin)
export async function getAllUsers(): Promise<User[]> {
  try {
    const usersQuery = query(collection(db, "users"))
    const querySnapshot = await getDocs(usersQuery)

    const users: User[] = []
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as User)
    })

    return users
  } catch (error) {
    console.error("Error getting all users:", error)
    return []
  }
}

// Verify admin password
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    // Get the admin password from environment variables
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    const storedHash = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_HASH;
    
    // First check if we have a direct password match (not recommended for production)
    if (adminPassword && password === adminPassword) {
      return true;
    }
    
    // Then check against the hash (more secure approach)
    if (storedHash) {
      const hashedPassword = await hashPassword(password);
      return hashedPassword === storedHash;
    }
    
    // If no environment variables are set, log a warning
    console.warn("Admin password not configured in environment variables. This is a security risk.");
    return false;
  } catch (error) {
    console.error("Error verifying admin password:", error);
    return false;
  }
}

// A simple password hashing function
// In production, use a proper hashing library like bcrypt
async function hashPassword(password: string): Promise<string> {
  // Convert the string to an ArrayBuffer
  const encoder = new TextEncoder()
  const data = encoder.encode(password + "hyre_admin_salt")
  
  // Use the browser's crypto API to hash the password
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  
  // Convert the hash to a hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex
}

// Update user's Roblox verification status
export async function updateRobloxVerification(
  uid: string,
  robloxUsername: string,
  robloxUserId: number,
  isVerified: boolean,
): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        robloxUsername,
        robloxUserId,
        robloxVerified: isVerified,
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error updating Roblox verification:", error)
    throw new Error("Failed to update verification status")
  }
}

// Create a new workspace
export async function createWorkspace(
  uid: string,
  groupId: number,
  groupName: string,
  allowedRanks: number[],
  groupIcon?: string,
): Promise<{ id: string }> {
  try {
    // Create a new workspace document
    const workspaceRef = doc(collection(db, "workspaces"))

    const workspaceData = {
      id: workspaceRef.id,
      groupId,
      groupName,
      allowedRanks,
      ownerId: uid,
      members: [uid],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
      icon: groupIcon || null, // Store the group icon URL
    }

    await setDoc(workspaceRef, workspaceData)

    // Add workspace to user's workspaces
    await setDoc(
      doc(db, "users", uid),
      {
        workspaces: arrayUnion(workspaceRef.id),
        activeWorkspace: workspaceRef.id,
      },
      { merge: true },
    )

    return { id: workspaceRef.id }
  } catch (error) {
    console.error("Error creating workspace:", error)
    throw new Error("Failed to create workspace")
  }
}

// Get user's workspaces
export async function getUserWorkspaces(uid: string): Promise<any[]> {
  try {
    const userData = await getDoc(doc(db, "users", uid))

    if (!userData.exists() || !userData.data().workspaces) {
      return []
    }

    const workspaceIds = userData.data().workspaces

    if (!workspaceIds.length) {
      return []
    }

    // Limit to 50 workspaces max to avoid performance issues
    const batchSize = 10;
    const workspaces: any[] = [];
    
    // Process workspaces in smaller batches for better performance
    for (let i = 0; i < Math.min(workspaceIds.length, 50); i += batchSize) {
      const batch = workspaceIds.slice(i, i + batchSize);
      
      const workspaceDocs = await getDocs(query(
        collection(db, "workspaces"),
        where(documentId(), "in", batch)
      ));
      
      workspaceDocs.forEach((doc) => {
        workspaces.push({
          id: doc.id,
          ...doc.data(),
        });
      });
    }

    return workspaces;
  } catch (error) {
    console.error("Error getting user workspaces:", error)
    return []
  }
}

// Delete a workspace
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  try {
    // Mark workspace as deleted
    await setDoc(
      doc(db, "workspaces", workspaceId),
      {
        isDeleted: true,
        deletedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error deleting workspace:", error)
    throw new Error("Failed to delete workspace")
  }
}

// Ban a user
export async function banUser(uid: string, reason: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        isBanned: true,
        banReason: reason,
        bannedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error banning user:", error)
    throw new Error("Failed to ban user")
  }
}

// Unban a user
export async function unbanUser(uid: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        isBanned: false,
        banReason: null,
        bannedAt: null,
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error unbanning user:", error)
    throw new Error("Failed to unban user")
  }
}

// Unverify a user
export async function unverifyUser(uid: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        robloxVerified: false,
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error unverifying user:", error)
    throw new Error("Failed to unverify user")
  }
}

// Add a function to warn a user
export async function warnUser(uid: string, reason: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        isWarned: true,
        warnReason: reason,
        warnedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error warning user:", error)
    throw new Error("Failed to warn user")
  }
}

// Add a function to remove a warning
export async function removeWarning(uid: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        isWarned: false,
        warnReason: null,
        warnedAt: null,
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error removing warning:", error)
    throw new Error("Failed to remove warning")
  }
}

// Update the canAccessWorkspace function to properly check rank permissions
export async function canAccessWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  try {
    // Get the workspace
    const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId))

    if (!workspaceDoc.exists()) {
      return false
    }

    const workspaceData = workspaceDoc.data()

    // Check if workspace is deleted
    if (workspaceData.isDeleted) {
      return false
    }

    // If user is the workspace owner, they always have access
    if (workspaceData.ownerId === userId) {
      return true
    }

    // Check if user is a member
    if (!workspaceData.members.includes(userId)) {
      return false
    }

    // Get user data to check Roblox verification
    const userData = await getCurrentUserData(userId)

    if (!userData?.robloxVerified || !userData?.robloxUserId) {
      return false
    }

    // Check if user's rank is allowed
    try {
      // Fetch user's groups
      const response = await fetch(`https://groups.roblox.com/v1/users/${userData.robloxUserId}/groups/roles`)

      if (!response.ok) {
        return false
      }

      const data = await response.json()

      // Find the group that matches this workspace
      const matchingGroup = data.data.find((g: any) => g.group.id === workspaceData.groupId)

      if (!matchingGroup) {
        return false
      }

      // Check if user's role is in the allowed ranks
      const userRoleId = matchingGroup.role.id
      return workspaceData.allowedRanks.includes(userRoleId)
    } catch (error) {
      console.error("Error checking user's group ranks:", error)
      return false
    }
  } catch (error) {
    console.error("Error checking workspace access:", error)
    return false
  }
}

// Function to get user's groups from Roblox API
async function getUserGroups(robloxUserId: number): Promise<any[]> {
  // Maximum number of retry attempts
  const maxRetries = 3;
  let retryCount = 0;
  let lastError: any = null;
  
  // Add a delay function for exponential backoff
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  while (retryCount < maxRetries) {
    try {
      // Add headers to avoid CORS and rate limiting issues
      const response = await fetch(`https://groups.roblox.com/v1/users/${robloxUserId}/groups/roles`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Hyre/1.0',
          'Cache-Control': 'no-cache'
        },
        // Add a cache-busting parameter
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const responseText = await response.text();
        console.warn(`Attempt ${retryCount + 1}/${maxRetries}: Failed to fetch user groups: Status ${response.status}`, responseText);
        
        // If we get a rate limit error (429) or server error (5xx), retry
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`Roblox API returned status ${response.status}: ${responseText}`);
          // Exponential backoff: wait longer between each retry
          await delay(Math.pow(2, retryCount) * 1000);
          retryCount++;
          continue;
        } else {
          // For other errors, don't retry
          return [];
        }
      }
      
      const data = await response.json();
      
      // Validate the response structure
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.warn("Invalid response format from Roblox API:", data);
        return [];
      }
      
      console.log(`Successfully fetched ${data.data.length} groups for user ${robloxUserId}`);
      return data.data;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${retryCount + 1}/${maxRetries}: Error fetching user groups:`, {
        robloxUserId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Wait before retrying with exponential backoff
      await delay(Math.pow(2, retryCount) * 1000);
      retryCount++;
    }
  }
  
  // If we've exhausted all retries, log a detailed error and return empty array
  console.error("Failed to fetch user groups after multiple attempts:", {
    robloxUserId,
    attempts: maxRetries,
    lastError: lastError instanceof Error ? lastError.message : String(lastError)
  });
  return [];
}

// Update the checkAndAddToEligibleWorkspaces function to respect rank permissions
export async function checkAndAddToEligibleWorkspaces(userId: string, robloxUserId: number): Promise<void> {
  try {
    // Get user's Roblox groups and ranks
    const userGroups = await getUserGroups(robloxUserId)

    if (!userGroups || userGroups.length === 0) {
      return
    }

    // Get user's current workspaces
    const userData = await getCurrentUserData(userId)
    const userWorkspaceIds = userData?.workspaces || []
    
    // Get only the most recent 20 workspaces for performance
    const workspacesSnapshot = await getDocs(query(
      collection(db, "workspaces"),
      orderBy("createdAt", "desc"),
      limit(20)
    ))
    
    const allWorkspaces: any[] = []
    workspacesSnapshot.forEach((doc) => {
      allWorkspaces.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    // Prepare batch updates for better performance
    const workspaceUpdates: {id: string, members: string[]}[] = [];
    const userWorkspaceUpdates: string[] = [];

    // Check each workspace to see if user should have access
    for (const workspace of allWorkspaces) {
      // Skip if workspace is deleted or user is already a member
      if (workspace.isDeleted || workspace.members?.includes(userId) || userWorkspaceIds.includes(workspace.id)) {
        continue
      }

      // Find if user is in this group
      const userGroup = userGroups.find((g) => g.id === workspace.groupId)

      if (userGroup) {
        // Check if user's role is in the allowed ranks
        const userRoleId = userGroup.role.id

        if (workspace.allowedRanks?.includes(userRoleId)) {
          // Add to batch updates
          workspaceUpdates.push({
            id: workspace.id,
            members: [...(workspace.members || []), userId]
          });
          
          userWorkspaceUpdates.push(workspace.id);
        }
      }
    }
    
    // Apply updates in batches for better performance
    if (workspaceUpdates.length > 0) {
      // Update workspaces in parallel
      await Promise.all(workspaceUpdates.map(update => 
        setDoc(
          doc(db, "workspaces", update.id),
          { members: update.members },
          { merge: true }
        )
      ));
      
      // Update user's workspaces
      if (userWorkspaceUpdates.length > 0) {
        await setDoc(
          doc(db, "users", userId),
          { workspaces: arrayUnion(...userWorkspaceUpdates) },
          { merge: true }
        );
      }
    }
  } catch (error) {
    console.error("Error checking eligible workspaces:", error)
  }
}

// Update workspace settings to store Roblox token
export async function updateWorkspaceRobloxToken(workspaceId: string, token: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "workspaces", workspaceId),
      {
        robloxToken: token,
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error updating workspace Roblox token:", error)
    throw new Error("Failed to update workspace Roblox token")
  }
}

// Function to set user immunity
export async function setUserImmune(uid: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        isImmune: true,
        immuneGrantedAt: Date.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error setting user immunity:", error)
    throw new Error("Failed to set user immunity")
  }
}

// Function to remove user immunity
export async function removeUserImmunity(uid: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        isImmune: false,
        immuneGrantedAt: null,
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error removing user immunity:", error)
    throw new Error("Failed to remove user immunity")
  }
}
