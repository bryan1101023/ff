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
  currentRankName: string; // Current rank name in the group
  recommendedRank: number; // Recommended rank in the group
  recommendedRankName: string; // Recommended rank name in the group
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
  currentRankName: string,
  recommendedRank: number,
  recommendedRankName: string,
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
      currentRankName,
      recommendedRank,
      recommendedRankName,
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
    console.log(`Searching for Roblox user: ${username}`);
    
    // Use our server-side API route which now uses the correct Roblox API
    const proxyUrl = `/api/roblox/user?username=${encodeURIComponent(username)}`;
    console.log(`Using server API: ${proxyUrl}`);
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`API error: ${response.status}`, errorText);
      throw new Error(`Failed to find user: ${response.status}`);
    }
    
    const userData = await response.json();
    console.log(`Found user:`, userData);
    
    if (!userData || !userData.id) {
      throw new Error(`User not found: ${username}`);
    }
    
    const userId = userData.id;
    const userName = userData.name;
    
    // Get the user's avatar
    const avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;
    
    return {
      id: userId.toString(),
      name: userName,
      displayName: userName,
      avatar: avatarUrl
    };
  
  } catch (error) {
    console.error("Error fetching Roblox user:", error);
    throw error;
  }
}

// Get group ranks for a specific group
export async function getGroupRanks(groupId: string): Promise<{ id: number, name: string, rank: number }[]> {
  try {
    if (!groupId) {
      console.error("No group ID provided to getGroupRanks");
      return [];
    }
    
    console.log(`Fetching group ranks for group ID: ${groupId}`);
    
    // Use server-side API route to avoid CORS issues
    const response = await fetch(`/api/roblox/group-roles?groupId=${encodeURIComponent(groupId)}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`API error: ${response.status}`, errorText);
      return []; // Return empty array instead of throwing
    }
    
    const data = await response.json();
    
    if (!data.roles) {
      console.warn("No roles found in API response");
      return [];
    }
    
    return data.roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      rank: role.rank
    }));
  } catch (error) {
    console.error("Error fetching group ranks:", error);
    return []; // Return empty array instead of throwing
  }
}

// Get user's current rank in a group
export async function getUserRankInGroup(userId: string, groupId: string): Promise<{ rankId: number, rankName: string, rank: number }> {
  try {
    if (!userId || !groupId) {
      console.error(`Missing parameters: userId=${userId}, groupId=${groupId}`);
      return { rankId: 0, rankName: "Unknown", rank: 0 };
    }
    
    console.log(`Fetching rank for user ${userId} in group ${groupId}`);
    
    // Use server-side API route to avoid CORS issues
    const response = await fetch(`/api/roblox/user-rank?userId=${encodeURIComponent(userId)}&groupId=${encodeURIComponent(groupId)}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`API error: ${response.status}`, errorText);
      return { rankId: 0, rankName: "Unknown", rank: 0 };
    }
    
    const rankData = await response.json();
    console.log("User rank data:", rankData);
    
    if (!rankData || !rankData.rankName) {
      return { rankId: 0, rankName: "Guest", rank: 0 };
    }
    
    return {
      rankId: rankData.rankId || 0,
      rankName: rankData.rankName || "Unknown",
      rank: rankData.rank || 0
    };
  } catch (error) {
    console.error("Error fetching user rank in group:", error);
    return { rankId: 0, rankName: "Unknown", rank: 0 }; // Return default value instead of throwing
  }
}
