"use client"

import { useState, useEffect } from "react"
import AdminLogin from "@/components/admin/admin-login"
import CreateUserForm from "@/components/admin/create-user-form"
import UserManagement from "@/components/admin/user-management"
import WorkspaceManagement from "@/components/admin/workspace-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAllUsers } from "@/lib/auth-utils"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import BugReportsList from "@/components/admin/bug-reports-list"
import SendNotificationForm from "@/components/admin/send-notification-form"
import WorkspaceReportsList from "@/components/admin/workspace-reports-list"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated])

  const fetchData = async () => {
    setIsLoading(true)

    try {
      // Fetch users
      const userList = await getAllUsers()
      setUsers(userList)

      // Fetch workspaces
      const workspacesQuery = await getDocs(collection(db, "workspaces"))
      const workspaceList: any[] = []

      workspacesQuery.forEach((doc) => {
        workspaceList.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      // Add owner names to workspaces
      const workspacesWithOwners = workspaceList.map((workspace) => {
        const owner = userList.find((user) => user.uid === workspace.ownerId)
        return {
          ...workspace,
          ownerName: owner ? owner.username : "Unknown",
        }
      })

      setWorkspaces(workspacesWithOwners)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030303] p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />

        <div className="w-full max-w-md z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Hyre Admin</h1>
            <p className="text-white/60">Access the administrative panel</p>
          </div>

          <AdminLogin onLogin={() => setIsAuthenticated(true)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030303] p-4 md:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Hyre Admin Panel</h1>
          <p className="text-white/60">Manage users, workspaces, and platform settings</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
            <TabsTrigger value="create">Create User</TabsTrigger>
            <TabsTrigger value="bugs">Bug Reports</TabsTrigger>
            <TabsTrigger value="reports">Workspace Reports</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UserManagement users={users} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="workspaces" className="space-y-4">
            <WorkspaceManagement workspaces={workspaces} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <CreateUserForm />
          </TabsContent>

          <TabsContent value="bugs" className="space-y-4">
            <BugReportsList />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <WorkspaceReportsList />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <SendNotificationForm users={users} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
