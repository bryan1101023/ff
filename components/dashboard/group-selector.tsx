"use client"

import type React from "react"

import { useState } from "react"
import { getUserIdFromUsername, getUserGroups } from "@/lib/roblox-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Users2 } from "lucide-react"
import Image from "next/image"

// Update the GroupSelectorProps interface to include the icon in the callback
interface GroupSelectorProps {
  userId: string
  initialRobloxUsername?: string
  robloxUserId?: number
  robloxVerified?: boolean
  onGroupSelected: (groupId: number, groupName: string, robloxUserId: number, groupIcon?: string) => void
}

interface Group {
  id: number
  name: string
  memberCount: number
  role: string
  rank: number
  icon: string
}

export default function GroupSelector({
  userId,
  initialRobloxUsername,
  robloxUserId: initialRobloxUserId,
  robloxVerified,
  onGroupSelected,
}: GroupSelectorProps) {
  const [robloxUsername, setRobloxUsername] = useState(initialRobloxUsername || "")
  const [isSearching, setIsSearching] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [robloxUserId, setRobloxUserId] = useState<string | undefined>(initialRobloxUserId?.toString())

  // Update the handleSearch function to properly handle and convert the Roblox user ID
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSearching(true)
    setGroups([])

    try {
      // If we already have a robloxUserId from props, use it
      let currentRobloxUserId = initialRobloxUserId || null

      // Otherwise, get it from the username
      if (!currentRobloxUserId) {
        const userId = await getUserIdFromUsername(robloxUsername)
        if (userId) {
          currentRobloxUserId = userId
          // Make sure to set the state with the numeric value
          setRobloxUserId(userId.toString())
        }
      }

      if (!currentRobloxUserId) {
        setError("Roblox username not found. Please check the spelling and try again.")
        return
      }

      const userGroups = await getUserGroups(currentRobloxUserId)

      if (userGroups.length === 0) {
        setError("No groups found for this user. The user might not be in any groups.")
        return
      }

      // Update user's Roblox username in Firebase if needed
      if (!robloxVerified && robloxUsername) {
        try {
          // Import the correct function from auth-utils
          const { updateRobloxUsername } = await import("@/lib/auth-utils")
          await updateRobloxUsername(userId, robloxUsername)
        } catch (error) {
          console.error("Error updating Roblox username:", error)
        }
      }

      setGroups(userGroups)
    } catch (err: any) {
      console.error("Group search error:", err)
      setError(err.message || "Failed to fetch groups. Please try again later.")
    } finally {
      setIsSearching(false)
    }
  }

  // Update the handleGroupSelected function to ensure we're passing primitives
  const handleSelectGroup = async (group: Group) => {
    try {
      // Ensure all values passed to onGroupSelected are primitives
      const groupId = typeof group.id === 'number' ? group.id : Number(group.id || 0);
      const groupName = typeof group.name === 'string' ? group.name : String(group.name || '');
      const userId = initialRobloxUserId || (robloxUserId ? Number.parseInt(robloxUserId) : 0);
      const iconUrl = typeof group.icon === 'string' ? group.icon : '';
      
      // Log for debugging
      console.log('Selecting group with data:', { 
        groupId, 
        groupName, 
        userId, 
        iconUrl 
      });
      
      // Call the parent component's handler with validated data
      onGroupSelected(groupId, groupName, userId, iconUrl);
    } catch (err: any) {
      console.error('Error in handleSelectGroup:', err);
      setError(err.message || "Failed to select group");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Select Your Roblox Group
        </CardTitle>
        <CardDescription>Enter your Roblox username to find your groups</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSearch} className="space-y-4 mb-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="robloxUsername" className="sr-only">
                Roblox Username
              </Label>
              <Input
                id="robloxUsername"
                placeholder="Enter your Roblox username"
                value={robloxUsername}
                onChange={(e) => setRobloxUsername(e.target.value)}
                disabled={isSearching}
                required
              />
            </div>
            <Button type="submit" disabled={isSearching || !robloxUsername}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </form>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>
              {error}
              {error.includes("Failed to fetch") && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Troubleshooting tips:</p>
                  <ul className="text-sm list-disc pl-5 mt-1">
                    <li>Check your internet connection</li>
                    <li>The Roblox API might be temporarily unavailable</li>
                    <li>Try again in a few minutes</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isSearching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedGroupId === group.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleSelectGroup(group)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted">
                    <Image
                      src={group.icon || "/placeholder.svg?height=48&width=48"}
                      alt={group.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.role ? String(group.role) : 'Member'} • {typeof group.memberCount === 'number' ? group.memberCount.toLocaleString() : '0'} members
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}