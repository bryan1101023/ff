"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { sendNotificationToAllUsers, sendNotificationToUsers } from "@/lib/notification-utils"
import { BellRing, AlertCircle, Loader2, CheckCircle } from "lucide-react"

interface User {
  uid: string
  username: string
  email: string
}

export default function SendNotificationForm({ users }: { users: User[] }) {
  const [message, setMessage] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(filteredUsers.map((user) => user.uid))
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Update the handleSendToAll function to ensure it's properly sending notifications
  const handleSendToAll = async () => {
    if (!message.trim()) {
      setError("Please enter a message")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      console.log("Sending notification to all users:", message)
      const result = await sendNotificationToAllUsers(message, "admin")
      console.log("Notification send result:", result)

      setSuccess(true)
      setMessage("")

      // Reset success state after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error("Error sending notification to all users:", err)
      setError("Failed to send notification. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update the handleSendToSelected function to ensure it's properly sending notifications
  const handleSendToSelected = async () => {
    if (!message.trim()) {
      setError("Please enter a message")
      return
    }

    if (selectedUserIds.length === 0) {
      setError("Please select at least one user")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      console.log("Sending notification to selected users:", selectedUserIds)
      const result = await sendNotificationToUsers(selectedUserIds, message, "admin")
      console.log("Notification send result:", result)

      setSuccess(true)
      setMessage("")
      setSelectedUserIds([])

      // Reset success state after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error("Error sending notification to selected users:", err)
      setError("Failed to send notification. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          Send Notifications
        </CardTitle>
        <CardDescription>Send notifications to users</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Notification sent successfully!</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Users</TabsTrigger>
            <TabsTrigger value="selected">Selected Users</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="all-message">Message</Label>
              <Textarea
                id="all-message"
                placeholder="Enter your notification message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <Button onClick={handleSendToAll} disabled={isSubmitting || !message.trim()} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send to All Users"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="selected" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="selected-message">Message</Label>
              <Textarea
                id="selected-message"
                placeholder="Enter your notification message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Select Users</Label>
                <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-7 text-xs">
                  {selectedUserIds.length === filteredUsers.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <div className="relative">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-2"
                />
              </div>

              <div className="border rounded-md max-h-[200px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No users found</div>
                ) : (
                  <div className="divide-y">
                    {filteredUsers.map((user) => (
                      <div key={user.uid} className="flex items-center p-2 hover:bg-muted/50">
                        <Checkbox
                          id={`user-${user.uid}`}
                          checked={selectedUserIds.includes(user.uid)}
                          onCheckedChange={() => handleSelectUser(user.uid)}
                          className="mr-2"
                        />
                        <Label htmlFor={`user-${user.uid}`} className="flex-1 cursor-pointer flex justify-between">
                          <span>{user.username}</span>
                          <span className="text-muted-foreground text-sm">{user.email}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-muted-foreground">
                  {selectedUserIds.length} user{selectedUserIds.length !== 1 ? "s" : ""} selected
                </span>
              </div>
            </div>

            <Button
              onClick={handleSendToSelected}
              disabled={isSubmitting || !message.trim() || selectedUserIds.length === 0}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send to Selected Users"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

