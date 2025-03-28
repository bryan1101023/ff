"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, CheckCircle } from "lucide-react"

interface WorkspaceSettingsProps {
  workspaceId: string
  groupId: number
}

export default function WorkspaceSettings({ workspaceId, groupId }: WorkspaceSettingsProps) {
  const [robloxToken, setRobloxToken] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const inviteLink = `${window.location.origin}/invite/${workspaceId}`

  const handleSaveToken = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    // Show success message or handle in UI
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Tabs defaultValue="general">
      <TabsList className="mb-4">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="access">Access Control</TabsTrigger>
        <TabsTrigger value="api">API Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Information</CardTitle>
            <CardDescription>Basic settings for your workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Workspace ID</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">{workspaceId}</div>
            </div>

            <div className="space-y-2">
              <Label>Group ID</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">{groupId}</div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="access">
        <Card>
          <CardHeader>
            <CardTitle>Invite Staff Members</CardTitle>
            <CardDescription>Share this link with your staff to give them access to the workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex">
                <div className="flex-1 p-3 bg-muted rounded-l-md border-y border-l text-sm truncate">{inviteLink}</div>
                <Button variant="secondary" className="rounded-l-none" onClick={copyInviteLink}>
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Staff members will need to verify their Roblox account before accessing the workspace.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="api">
        <Card>
          <CardHeader>
            <CardTitle>Roblox API Token</CardTitle>
            <CardDescription>Add your Roblox API token to enable group management features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="mb-4">
              <AlertDescription>
                This token is used to update your group shout and manage other group features. Never share your token
                with anyone else.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="roblox-token">Roblox API Token</Label>
              <Input
                id="roblox-token"
                type="password"
                placeholder="Enter your Roblox API token"
                value={robloxToken}
                onChange={(e) => setRobloxToken(e.target.value)}
              />
            </div>

            <Button onClick={handleSaveToken} disabled={isSaving || !robloxToken}>
              {isSaving ? "Saving..." : "Save Token"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

