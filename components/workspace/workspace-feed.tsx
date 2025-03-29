"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { showToast } from "@/lib/notification-utils"
import { formatDistanceToNow } from "date-fns"
import { Send, MoreVertical, Flag, Trash, RefreshCw } from "lucide-react"
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp,
  onSnapshot,
  getDoc
} from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { warnUser } from "@/lib/auth-utils"

interface WorkspaceFeedProps {
  workspaceId: string
  workspaceName: string
}

// Message type
interface FeedMessage {
  id: string
  workspaceId: string
  userId: string
  username: string
  email: string
  robloxUsername: string
  userAvatar?: string
  content: string
  createdAt: Timestamp
  isReported: boolean
  reportReason?: string
  reportedBy?: string
  reportedByUsername?: string
  reportedAt?: Timestamp
  isDeleted: boolean
  containsBadWords?: boolean
  isEdited?: boolean
  editedAt?: Timestamp
  editReason?: string
}

export default function WorkspaceFeed({ workspaceId, workspaceName }: WorkspaceFeedProps) {
  const { user } = useAuth()
  // Keep the original toast for compatibility
  const { toast } = useToast()
  const [messages, setMessages] = useState<FeedMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<FeedMessage | null>(null)
  const [reportReason, setReportReason] = useState("")
  const [userData, setUserData] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Get the current user ID directly from auth
  const userId = auth.currentUser?.uid;
  
  // Fetch user data from Firestore when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      // Get the current user ID directly from Firebase Auth
      const currentUserId = auth.currentUser?.uid;
      
      if (!currentUserId) {
        console.log("No authenticated user found");
        setUserData(null);
        return;
      }
      
      try {
        console.log("Fetching user data for:", currentUserId);
        const userDocRef = doc(db, "users", currentUserId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log("User data found:", data);
          setUserData(data);
        } else {
          console.log("No user document found for ID:", currentUserId);
          setUserData(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserData(null);
      }
    };
    
    fetchUserData();
    
    // Also set up an auth state listener
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        console.log("Auth state changed: User is logged in", authUser.uid);
        fetchUserData();
      } else {
        console.log("Auth state changed: User is logged out");
        setUserData(null);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Debug user authentication
  useEffect(() => {
    console.log("Current user state:", user ? "Logged in" : "Not logged in")
    if (user) {
      console.log("User ID:", user.uid)
      console.log("Username:", user.username || "No username")
      console.log("Full user object:", user)
    }
  }, [user])
  
  // Set up Firestore listener for messages
  useEffect(() => {
    if (!workspaceId) return
    
    console.log("Setting up Firestore listener for workspace:", workspaceId)
    
    // Create a dummy welcome message
    const dummyWelcomeMessage: FeedMessage = {
      id: "welcome",
      workspaceId,
      userId: "system",
      username: "System",
      email: "",
      robloxUsername: "",
      content: `Welcome to the ${workspaceName || "workspace"} team chat! This is where you can communicate with your team members.`,
      createdAt: Timestamp.now(),
      isReported: false,
      isDeleted: false
    }
    
    // Show welcome message immediately to avoid loading skeletons
    setMessages([dummyWelcomeMessage])
    
    // Query for messages
    const messagesQuery = query(
      collection(db, "feed-messages"),
      where("workspaceId", "==", workspaceId),
      where("isDeleted", "==", false),
      orderBy("createdAt", "desc"),
      limit(50)
    )
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      console.log("Got snapshot with", snapshot.size, "messages")
      
      if (snapshot.empty) {
        // If no messages, keep showing welcome message
        setMessages([dummyWelcomeMessage])
      } else {
        // Process messages from Firestore
        const fetchedMessages: FeedMessage[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          fetchedMessages.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt as Timestamp
          } as FeedMessage)
        })
        
        // Add welcome message at the end (it will appear at the top since we're sorting desc)
        fetchedMessages.push(dummyWelcomeMessage)
        setMessages(fetchedMessages)
      }
    }, (error) => {
      console.error("Error fetching messages:", error)
      // Show welcome message on error
      setMessages([dummyWelcomeMessage])
      
      showToast(
        "Error",
        "Failed to load messages. Using offline mode."
      )
    })
    
    // Cleanup listener on unmount
    return () => unsubscribe()
  }, [workspaceId, workspaceName, toast])
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])
  
  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    
    // Save the message content before clearing it
    const messageContent = newMessage;
    
    // Clear input immediately to allow for more messages
    setNewMessage("");
    setIsSending(true);
    
    try {
      // Get current user ID directly from Firebase Auth
      const currentUserId = auth.currentUser?.uid;
      
      if (!currentUserId || !userData) {
        showToast(
          "Authentication Required",
          "You must be logged in to send messages."
        );
        setIsSending(false);
        return;
      }
      
      // Get user info from our cached userData
      const username = userData.robloxUsername || userData.username || currentUserId;
      const email = userData.email || "";
      const robloxUsername = userData.robloxUsername || "";
      
      console.log("Sending message with user info:", { userId: currentUserId, username, email, robloxUsername });
      
      // Create the message with just the necessary fields
      const messageData = {
        workspaceId,
        userId: currentUserId,
        username,
        email,
        robloxUsername,
        content: messageContent,
        createdAt: serverTimestamp(),
        isReported: false,
        isDeleted: false
      }
      
      console.log("Sending message data:", messageData);
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, "feed-messages"), messageData);
      console.log("Message sent successfully with ID:", docRef.id);
      
      // Success toast with black style
      showToast(
        "Message Sent",
        "Your message has been sent to the team chat."
      );
    } catch (error) {
      console.error("Error sending message:", error);
      showToast(
        "Error",
        "Failed to send your message. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  }
  
  // Handle reporting a message
  const handleReportMessage = async () => {
    if (!selectedMessage || !reportReason.trim()) return
    
    try {
      // Get current user ID directly from Firebase Auth
      const currentUserId = auth.currentUser?.uid;
      
      if (!currentUserId || !userData) {
        showToast(
          "Authentication Required",
          "You must be logged in to report messages."
        );
        return;
      }
      
      // Close the modal immediately
      setIsReportModalOpen(false);
      setReportReason("");
      
      // Check if the message contains bad words
      const lowerCaseMessage = selectedMessage.content.toLowerCase();
      const badWords = ["dumb", "stupid", "idiot", "retard", "moron", "ass", "asshole", "fuck", "shit", "bitch", "damn", "crap", "hell"];
      const containsBadWord = badWords.some(word => lowerCaseMessage.includes(word));
      
      // Update the message as reported
      await updateDoc(doc(db, "feed-messages", selectedMessage.id), {
        isReported: true,
        reportReason,
        reportedBy: currentUserId,
        reportedByUsername: userData.robloxUsername || userData.username || currentUserId,
        reportedAt: serverTimestamp(),
        containsBadWords: containsBadWord
      });
      
      // Show appropriate message based on whether bad words were found
      if (containsBadWord) {
        showToast(
          "Thank you for your report!",
          "We've detected inappropriate content and will take action."
        );
        
        // If bad words are detected, wait 5 seconds, then issue a warning and edit the message
        if (selectedMessage.userId) {
          // Use setTimeout to wait 5 seconds
          setTimeout(async () => {
            try {
              // Issue a warning to the user who sent the message
              await warnUser(selectedMessage.userId, "Your message in workspace chat contained inappropriate language. Please review our community guidelines.");
              
              console.log("Warning issued to user:", selectedMessage.userId);
              
              // Edit the message content to [CONTENT DELETED]
              await updateDoc(doc(db, "feed-messages", selectedMessage.id), {
                content: "[CONTENT DELETED]",
                isEdited: true,
                editedAt: serverTimestamp(),
                editReason: "Content removed due to violation of community guidelines"
              });
              
              console.log("Message content deleted:", selectedMessage.id);
              
              // Show confirmation that action was taken
              showToast(
                "Action Taken",
                "The reported message has been removed and the user has been warned."
              );
            } catch (error) {
              console.error("Error processing violation after delay:", error);
            }
          }, 5000); // 5 seconds delay
        }
      } else {
        // No bad words found, just acknowledge the report
        showToast(
          "Report Received",
          "Thank you for your report. No inappropriate content was detected, so no action will be taken."
        );
      }
      
      setSelectedMessage(null);
      
    } catch (error) {
      console.error("Error reporting message:", error);
      showToast(
        "Error",
        "Failed to report the message. Please try again."
      );
    }
  }
  
  // Handle deleting a message
  const handleDeleteMessage = async (message: FeedMessage) => {
    if (!user) return
    
    try {
      // Mark as deleted
      await updateDoc(doc(db, "feed-messages", message.id), {
        isDeleted: true
      })
      
      showToast(
        "Message Deleted",
        "The message has been deleted successfully."
      )
    } catch (error) {
      console.error("Error deleting message:", error)
      showToast(
        "Error",
        "Failed to delete the message. Please try again."
      )
    }
  }
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b">
        <h2 className="text-lg sm:text-xl font-semibold">Team Chat</h2>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {messages.length} messages
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 flex flex-col-reverse">
        {messages.map((message) => (
          <Card key={message.id} className="mb-2 sm:mb-4 w-full">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                  <AvatarFallback>{getInitials(message.username)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0"> {/* Added min-w-0 to allow truncation */}
                  <p className="font-medium text-sm sm:text-base truncate">{message.username}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {message.createdAt instanceof Timestamp 
                      ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true })
                      : "Just now"}
                  </p>
                </div>
              </div>
              
              {message.id !== "welcome" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-8 sm:w-8 p-0">
                      <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="sr-only">Message options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!message.isReported && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedMessage(message)
                          setIsReportModalOpen(true)
                        }}
                        className="text-destructive"
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Report Message
                      </DropdownMenuItem>
                    )}
                    
                    {(message.userId === user?.uid || user?.role === "admin") && (
                      <DropdownMenuItem
                        onClick={() => handleDeleteMessage(message)}
                        className="text-destructive"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete Message
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardHeader>
            
            <CardContent className="p-3 sm:p-4 pt-1 sm:pt-2">
              <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
            </CardContent>
            
            {message.isReported && (
              <CardFooter className="p-4 pt-0">
                <p className="text-xs text-muted-foreground italic">
                  This message has been reported and is under review.
                </p>
              </CardFooter>
            )}
            
            {message.isEdited && (
              <CardFooter className="p-4 pt-0">
                <p className="text-xs text-muted-foreground italic">
                  This message has been edited due to a violation of community guidelines.
                </p>
              </CardFooter>
            )}
          </Card>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-2 sm:p-4 border-t bg-background sticky bottom-0">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Textarea
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="resize-none text-sm sm:text-base"
              rows={2}
              disabled={isSending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim()) {
                    handleSendMessage();
                  }
                }
              }}
            />
          </div>
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || isSending}
            className="h-9 sm:h-10 px-2 sm:px-4"
            size="sm"
          >
            {isSending ? (
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Report Message Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Message</DialogTitle>
            <DialogDescription>
              Please provide a reason for reporting this message. Our team will review it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason for Report</Label>
              <Textarea
                id="report-reason"
                placeholder="Please explain why you're reporting this message..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="resize-none"
                rows={4}
              />
            </div>
            
            {selectedMessage && (
              <div className="space-y-2">
                <Label>Reported Message</Label>
                <div className="p-3 rounded-md bg-muted">
                  <p className="font-medium text-sm">{selectedMessage.username}</p>
                  <p className="text-sm mt-1">{selectedMessage.content}</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => {
              setIsReportModalOpen(false);
              setReportReason("");
              setSelectedMessage(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleReportMessage} 
              disabled={!reportReason.trim()}
              variant="destructive"
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
