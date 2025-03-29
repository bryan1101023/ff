import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, serverTimestamp, orderBy, limit, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface Recommendation {
  id: string;
  workspaceId: string;
  userId: string; // User who created the recommendation
  username: string; // Username of the recommender
  userAvatar: string; // Avatar URL of the recommender
  targetRobloxUsername: string; // Roblox username of the person being recommended
  targetRobloxUserId: string; // Roblox user ID of the person being recommended
  targetRobloxAvatar: string; // Roblox avatar URL of the person being recommended
  currentRank: number; // Current rank in the group
  recommendedRank: number; // Recommended rank in the group
  reason: string; // Justification for the recommendation
  supporters: string[]; // Array of user IDs who support this recommendation
  createdAt: any; // Timestamp
  status: "pending" | "approved" | "rejected"; // Status of the recommendation
}

// Create a new recommendation
export async function createRecommendation(
  workspaceId: string,
  userId: string,
  username: string,
  userAvatar: string,
  targetRobloxUsername: string,
  targetRobloxUserId: string,
  targetRobloxAvatar: string,
  currentRank: number,
  recommendedRank: number,
  reason: string
): Promise<string> {
  try {
    // Check if there's already a pending recommendation for this user and rank
    const existingQuery = query(
      collection(db, "workspaces", workspaceId, "recommendations"),
      where("targetRobloxUserId", "==", targetRobloxUserId),
      where("recommendedRank", "==", recommendedRank),
      where("status", "==", "pending")
    );
    
    const existingDocs = await getDocs(existingQuery);
    if (!existingDocs.empty) {
      throw new Error("A pending recommendation already exists for this user and rank");
    }

    const docRef = await addDoc(collection(db, "workspaces", workspaceId, "recommendations"), {
      workspaceId,
      userId,
      username,
      userAvatar,
      targetRobloxUsername,
      targetRobloxUserId,
      targetRobloxAvatar,
      currentRank,
      recommendedRank,
      reason,
      supporters: [userId], // Creator automatically supports
      createdAt: serverTimestamp(),
      status: "pending"
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating recommendation:", error);
    throw error;
  }
}

// Get all recommendations for a workspace
export async function getWorkspaceRecommendations(
  workspaceId: string,
  status: "pending" | "approved" | "rejected" | "all" = "all",
  sortBy: "createdAt" | "supporters" = "createdAt",
  sortOrder: "asc" | "desc" = "desc",
  limitCount: number = 50
): Promise<Recommendation[]> {
  try {
    let recommendationsQuery;
    
    if (status === "all") {
      recommendationsQuery = query(
        collection(db, "workspaces", workspaceId, "recommendations"),
        orderBy(sortBy, sortOrder),
        limit(limitCount)
      );
    } else {
      recommendationsQuery = query(
        collection(db, "workspaces", workspaceId, "recommendations"),
        where("status", "==", status),
        orderBy(sortBy, sortOrder),
        limit(limitCount)
      );
    }
    
    const recommendationsSnapshot = await getDocs(recommendationsQuery);
    
    const recommendations: Recommendation[] = [];
    recommendationsSnapshot.forEach((doc) => {
      recommendations.push({
        id: doc.id,
        ...doc.data()
      } as Recommendation);
    });
    
    return recommendations;
  } catch (error) {
    console.error("Error getting recommendations:", error);
    throw error;
  }
}

// Support a recommendation
export async function supportRecommendation(
  workspaceId: string,
  recommendationId: string,
  userId: string
): Promise<void> {
  try {
    const recommendationRef = doc(db, "workspaces", workspaceId, "recommendations", recommendationId);
    const recommendationDoc = await getDoc(recommendationRef);
    
    if (!recommendationDoc.exists()) {
      throw new Error("Recommendation not found");
    }
    
    const recommendation = recommendationDoc.data();
    if (recommendation.status !== "pending") {
      throw new Error("Cannot support a recommendation that is not pending");
    }
    
    if (recommendation.supporters.includes(userId)) {
      throw new Error("You already support this recommendation");
    }
    
    await updateDoc(recommendationRef, {
      supporters: arrayUnion(userId)
    });
  } catch (error) {
    console.error("Error supporting recommendation:", error);
    throw error;
  }
}

// Unsupport a recommendation
export async function unsupportRecommendation(
  workspaceId: string,
  recommendationId: string,
  userId: string
): Promise<void> {
  try {
    const recommendationRef = doc(db, "workspaces", workspaceId, "recommendations", recommendationId);
    const recommendationDoc = await getDoc(recommendationRef);
    
    if (!recommendationDoc.exists()) {
      throw new Error("Recommendation not found");
    }
    
    const recommendation = recommendationDoc.data();
    if (recommendation.status !== "pending") {
      throw new Error("Cannot unsupport a recommendation that is not pending");
    }
    
    if (!recommendation.supporters.includes(userId)) {
      throw new Error("You don't support this recommendation");
    }
    
    // If the user is the creator, they cannot unsupport
    if (recommendation.userId === userId) {
      throw new Error("As the creator, you cannot unsupport your own recommendation");
    }
    
    const newSupporters = recommendation.supporters.filter((id: string) => id !== userId);
    
    await updateDoc(recommendationRef, {
      supporters: newSupporters
    });
  } catch (error) {
    console.error("Error unsupporting recommendation:", error);
    throw error;
  }
}

// Update recommendation status
export async function updateRecommendationStatus(
  workspaceId: string,
  recommendationId: string,
  status: "approved" | "rejected",
  adminId: string,
  adminNote?: string
): Promise<void> {
  try {
    const recommendationRef = doc(db, "workspaces", workspaceId, "recommendations", recommendationId);
    
    await updateDoc(recommendationRef, {
      status,
      processedAt: serverTimestamp(),
      processedBy: adminId,
      adminNote: adminNote || ""
    });
  } catch (error) {
    console.error("Error updating recommendation status:", error);
    throw error;
  }
}

// Delete a recommendation
export async function deleteRecommendation(
  workspaceId: string,
  recommendationId: string,
  userId: string
): Promise<void> {
  try {
    const recommendationRef = doc(db, "workspaces", workspaceId, "recommendations", recommendationId);
    const recommendationDoc = await getDoc(recommendationRef);
    
    if (!recommendationDoc.exists()) {
      throw new Error("Recommendation not found");
    }
    
    const recommendation = recommendationDoc.data();
    
    // Only the creator or a workspace admin can delete a recommendation
    if (recommendation.userId !== userId) {
      // Check if user is an admin (you would need to implement this check)
      // For now, we'll just throw an error
      throw new Error("Only the creator can delete this recommendation");
    }
    
    await deleteDoc(recommendationRef);
  } catch (error) {
    console.error("Error deleting recommendation:", error);
    throw error;
  }
}

// Fetch Roblox user data by username
export async function fetchRobloxUserByUsername(username: string): Promise<{ id: string, name: string, displayName: string, avatar: string }> {
  try {
    // First, get the user ID from the username
    const response = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=1`);
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error("Roblox user not found");
    }
    
    const userId = data.data[0].id;
    
    // Then get the user details including avatar
    const userResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    const userData = await userResponse.json();
    
    // Get the user's avatar
    const avatarResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`);
    const avatarData = await avatarResponse.json();
    
    return {
      id: userId.toString(),
      name: userData.name,
      displayName: userData.displayName,
      avatar: avatarData.data[0].imageUrl
    };
  } catch (error) {
    console.error("Error fetching Roblox user:", error);
    throw error;
  }
}

// Get group ranks for a specific group
export async function getGroupRanks(groupId: string): Promise<{ id: number, name: string, rank: number }[]> {
  try {
    const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/roles`);
    const data = await response.json();
    
    if (!data.roles) {
      throw new Error("Failed to fetch group roles");
    }
    
    return data.roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      rank: role.rank
    }));
  } catch (error) {
    console.error("Error fetching group ranks:", error);
    throw error;
  }
}

// Get user's current rank in a group
export async function getUserRankInGroup(userId: string, groupId: string): Promise<{ rankId: number, rankName: string, rank: number }> {
  try {
    const response = await fetch(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
    const data = await response.json();
    
    if (!data.data) {
      throw new Error("Failed to fetch user's groups");
    }
    
    const group = data.data.find((g: any) => g.group.id.toString() === groupId);
    
    if (!group) {
      return { rankId: 0, rankName: "Guest", rank: 0 };
    }
    
    return {
      rankId: group.role.id,
      rankName: group.role.name,
      rank: group.role.rank
    };
  } catch (error) {
    console.error("Error fetching user rank in group:", error);
    throw error;
  }
}
