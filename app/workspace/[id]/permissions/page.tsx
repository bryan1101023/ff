"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, Save, ShieldCheck, Info } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// Define permission types
interface Permission {
  id: string
  name: string
  description: string
  category: "members" | "announcements" | "inactivity" | "settings"
}

// Define available permissions
const availablePermissions: Permission[] = [
  // Members permissions
  {
    id: "view_members",
    name: "View Members",
    description: "Can view the list of members in the workspace",
    category: "members",
  },
  {
    id: "manage_members",
    name: "Manage Members",
    description: "Can add or remove members from the workspace",
    category: "members",
  },
  {
    id: "view_logbook",
    name: "View Logbook",
    description: "Can view member logbook entries",
    category: "members",
  },
  {
    id: "add_logbook_entry",
    name: "Add Logbook Entry",
    description: "Can add entries to member logbooks",
    category: "members",
  },
  {
    id: "add_member_note",
    name: "Add Member Notes",
    description: "Can add notes to member profiles",
    category: "members",
  },

  // Announcements permissions
  {
    id: "view_announcements",
    name: "View Announcements",
    description: "Can view workspace announcements",
    category: "announcements",
  },
  {
    id: "create_announcement",
    name: "Create Announcement",
    description: "Can create new announcements",
    category: "announcements",
  },
  {
    id: "edit_announcement",
    name: "Edit Announcement",
    description: "Can edit existing announcements",
    category: "announcements",
  },
  {
    id: "delete_announcement",
    name: "Delete Announcement",
    description: "Can delete announcements",
    category: "announcements",
  },
  {
    id: "update_group_shout",
    name: "Update Group Shout",
    description: "Can update the Roblox group shout",
    category: "announcements",
  },

  // Inactivity permissions
  {
    id: "view_inactivity",
    name: "View Inactivity Notices",
    description: "Can view inactivity notices",
    category: "inactivity",
  },
  {
    id: "submit_inactivity",
    name: "Submit Inactivity Notice",
    description: "Can submit inactivity notices",
    category: "inactivity",
  },
  {
    id: "approve_inactivity",
    name: "Approve Inactivity Notice",
    description: "Can approve or reject inactivity notices",
    category: "inactivity",
  },
  {
    id: "manage_inactivity",
    name: "Manage Inactivity Notices",
    description: "Can manage all inactivity notices",
    category: "inactivity",
  },

  // Settings permissions
  {
    id: "view_settings",
    name: "View Settings",
    description: "Can view workspace settings",
    category: "settings",
  },
  {
    id: "edit_settings",
    name: "Edit Settings",
    description: "Can edit workspace settings",
    category: "settings",
  },
  {
    id: "manage_invites",
    name: "Manage Invites",
    description: "Can create and manage invite links",
    category: "settings",
  },
  {
    id: "manage_permissions",
    name: "Manage Permissions",
    description: "Can manage role permissions",
    category: "settings",
  },
]

export default function PermissionsPage({ params }: { params: { id: string } }) {
  const [workspace, setWorkspace] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [groupRoles, setGroupRoles] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})
  const [isSaving, setIsSaving] = useState(false)
  const { id: workspaceId } = params

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId))
        if (workspaceDoc.exists()) {
          const workspaceData = workspaceDoc.data()
          setWorkspace(workspaceData)

          // Fetch group roles
          if (workspaceData.groupId) {
            try {
              const response = await fetch(`/api/roblox/group-roles?groupId=${workspaceData.groupId}`)
              if (response.ok) {
                const data = await response.json()
                setGroupRoles(data.roles || [])

                // Set the first role as selected by default
                if (data.roles && data.roles.length > 0) {
                  setSelectedRole(data.roles[0].id.toString())
                }
              }
            } catch (error) {
              console.error("Error fetching group roles:", error)
            }
          }

          // Fetch permissions
          if (workspaceData.permissions) {
            setPermissions(workspaceData.permissions)
          }
        }
      } catch (error) {
        console.error("Error fetching workspace:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkspace()
  }, [workspaceId])

  const handlePermissionToggle = (permissionId: string) => {
    if (!selectedRole) return

    setPermissions((prev) => {
      const rolePermissions = prev[selectedRole] || []

      // Toggle the permission
      const updatedPermissions = rolePermissions.includes(permissionId)
        ? rolePermissions.filter((id) => id !== permissionId)
        : [...rolePermissions, permissionId]

      return {
        ...prev,
        [selectedRole]: updatedPermissions,
      }
    })
  }

  const handleSavePermissions = async () => {
    setIsSaving(true)

    try {
      await setDoc(
        doc(db, "workspaces", workspaceId),
        {
          permissions,
          updatedAt: Date.now(),
        },
        { merge: true },
      )

      toast({
        title: "Permissions saved",
        description: "Role permissions have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving permissions:", error)
      toast({
        title: "Error",
        description: "Failed to save permissions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Role Permissions</h1>
        <p className="text-muted-foreground">Configure what each role can do in your workspace</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Group Roles</CardTitle>
              <CardDescription>Select a role to configure</CardDescription>
            </CardHeader>
            <CardContent>
              {groupRoles.length > 0 ? (
                <div className="space-y-2">
                  {groupRoles.map((role) => (
                    <div
                      key={role.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRole === role.id.toString() ? "border-primary bg-primary/5" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedRole(role.id.toString())}
                    >
                      <p className="font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">Rank {role.rank}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No group roles found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          {selectedRole ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {groupRoles.find((r) => r.id.toString() === selectedRole)?.name || "Role"} Permissions
                </CardTitle>
                <CardDescription>Configure what this role can do in your workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    The workspace owner always has all permissions. Changes to permissions will apply to all members
                    with this role.
                  </AlertDescription>
                </Alert>

                <Tabs defaultValue="members" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="announcements">Announcements</TabsTrigger>
                    <TabsTrigger value="inactivity">Inactivity</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  {["members", "announcements", "inactivity", "settings"].map((category) => (
                    <TabsContent key={category} value={category} className="space-y-4">
                      {availablePermissions
                        .filter((permission) => permission.category === category)
                        .map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex-1">
                              <Label htmlFor={`permission-${permission.id}`} className="font-medium cursor-pointer">
                                {permission.name}
                              </Label>
                              <p className="text-sm text-muted-foreground">{permission.description}</p>
                            </div>
                            <Switch
                              id={`permission-${permission.id}`}
                              checked={(permissions[selectedRole] || []).includes(permission.id)}
                              onCheckedChange={() => handlePermissionToggle(permission.id)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            />
                          </div>
                        ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSavePermissions} disabled={isSaving} className="ml-auto">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Permissions
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Role</h3>
                <p className="text-muted-foreground text-center">
                  Select a role from the left to configure its permissions
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

