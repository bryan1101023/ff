import { db } from "./firebase"
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc, 
  Timestamp, 
  serverTimestamp 
} from "firebase/firestore"
import { containsBadWords } from "./bad-words"
import { warnUser } from "./auth-utils"
import { createNotification } from "./notification-utils"

// Types for feed messages
export interface FeedMessage {
  id: string
  workspaceId: string
  userId: string
  username: string
  userAvatar?: string
  content: string
  createdAt: Timestamp
  isReported: boolean
  reportReason?: string
  reportedBy?: string
  reportedAt?: Timestamp
  isDeleted: boolean
  deletedAt?: Timestamp
  deletedBy?: string
  deletionReason?: string
}

// Post a new message to the workspace feed
export async function postFeedMessage(
  workspaceId: string, 
  userId: string, 
  username: string, 
  content: string,
  userAvatar?: string
): Promise<{ id: string; automaticWarning: boolean }> {
  try {
    // Check for bad words
    const badWordsCheck = containsBadWords(content);
    
    // Create the message
    const messageData = {
      workspaceId,
      userId,
      username,
      userAvatar,
      content,
      createdAt: serverTimestamp(),
      isReported: false,
      isDeleted: false
    };
    
    // Add the message to Firestore
    const docRef = await addDoc(collection(db, "feed-messages"), messageData);
    console.log("Added new message with ID:", docRef.id);
    
    // If the message contains bad words, automatically warn the user
    let automaticWarning = false;
    if (badWordsCheck.contains) {
      automaticWarning = true;
      
      // Mark the message as reported and deleted
      await updateDoc(doc(db, "feed-messages", docRef.id), {
        isReported: true,
        reportReason: `Automatic detection of inappropriate language: ${badWordsCheck.words.join(", ")}`,
        reportedBy: "system",
        reportedAt: serverTimestamp(),
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: "system",
        deletionReason: "Automatic removal due to inappropriate language"
      });
      
      // Issue a warning to the user
      await warnUser(userId, `Disrespect (Automation was used while making this decision). Inappropriate language detected: ${badWordsCheck.words.join(", ")}`);
      
      // Send a notification to the user
      await createNotification(
        userId,
        `Your message in the workspace feed was automatically removed and you have received a warning for using inappropriate language.`,
        "admin",
        `/workspace/${workspaceId}`,
        "View Workspace"
      );
    }
    
    return { 
      id: docRef.id,
      automaticWarning
    };
  } catch (error) {
    console.error("Error posting feed message:", error);
    throw new Error("Failed to post message to feed");
  }
}

// Get messages for a workspace feed
export async function getWorkspaceFeedMessages(
  workspaceId: string,
  messageLimit: number = 50
): Promise<FeedMessage[]> {
  try {
    console.log("Fetching messages for workspace:", workspaceId);
    
    // Check if the collection exists first
    const collectionRef = collection(db, "feed-messages");
    
    const messagesQuery = query(
      collectionRef,
      where("workspaceId", "==", workspaceId),
      where("isDeleted", "==", false),
      orderBy("createdAt", "desc"),
      limit(messageLimit)
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    console.log("Messages query result count:", messagesSnapshot.size);
    
    const messages: FeedMessage[] = [];
    
    messagesSnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt as Timestamp
      } as FeedMessage);
    });
    
    console.log("Processed messages:", messages.length);
    return messages;
  } catch (error) {
    console.error("Error getting feed messages:", error);
    throw new Error("Failed to load feed messages");
  }
}

// Report a message
export async function reportFeedMessage(
  messageId: string,
  reportedBy: string,
  reportReason: string
): Promise<void> {
  try {
    // Get the message data
    const messageDoc = await getDoc(doc(db, "feed-messages", messageId));
    
    if (!messageDoc.exists()) {
      throw new Error("Message not found");
    }
    
    const messageData = messageDoc.data();
    
    // Update the message as reported
    await updateDoc(doc(db, "feed-messages", messageId), {
      isReported: true,
      reportReason,
      reportedBy,
      reportedAt: serverTimestamp()
    });
    
    // Check for bad words in the message
    const badWordsCheck = containsBadWords(messageData.content);
    
    // If bad words are found, automatically delete the message and warn the user
    if (badWordsCheck.contains) {
      // Delete the message
      await updateDoc(doc(db, "feed-messages", messageId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: "system",
        deletionReason: `Automatic removal due to reported inappropriate language: ${badWordsCheck.words.join(", ")}`
      });
      
      // Issue a warning to the user
      await warnUser(
        messageData.userId, 
        `Disrespect (Automation was used while making this decision). Inappropriate language detected after report: ${badWordsCheck.words.join(", ")}`
      );
      
      // Send a notification to the user
      await createNotification(
        messageData.userId,
        `Your reported message in the workspace feed was automatically removed and you have received a warning for using inappropriate language.`,
        "admin",
        `/workspace/${messageData.workspaceId}`,
        "View Workspace"
      );
    } else {
      // If no bad words, just notify the user their message was reported
      await createNotification(
        messageData.userId,
        "Your message in the workspace feed has been reported and will be reviewed by our team.",
        "admin",
        `/workspace/${messageData.workspaceId}`,
        "View Workspace"
      );
    }
  } catch (error) {
    console.error("Error reporting feed message:", error);
    throw new Error("Failed to report message");
  }
}

// Delete a message (admin or message owner)
export async function deleteFeedMessage(
  messageId: string,
  deletedBy: string,
  deletionReason: string,
  isAdmin: boolean = false
): Promise<void> {
  try {
    // Get the message data
    const messageDoc = await getDoc(doc(db, "feed-messages", messageId));
    
    if (!messageDoc.exists()) {
      throw new Error("Message not found");
    }
    
    const messageData = messageDoc.data();
    
    // Only allow deletion by the message owner or an admin
    if (messageData.userId !== deletedBy && !isAdmin) {
      throw new Error("Unauthorized to delete this message");
    }
    
    // Update the message as deleted
    await updateDoc(doc(db, "feed-messages", messageId), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy,
      deletionReason
    });
    
    // If deleted by admin, notify the user
    if (isAdmin && messageData.userId !== deletedBy) {
      await createNotification(
        messageData.userId,
        `Your message in the workspace feed has been removed by an administrator. Reason: ${deletionReason}`,
        "admin",
        `/workspace/${messageData.workspaceId}`,
        "View Workspace"
      );
    }
  } catch (error) {
    console.error("Error deleting feed message:", error);
    throw new Error("Failed to delete message");
  }
}
