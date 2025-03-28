"use client"

import { useState, useEffect } from "react"
import AdminLogin from "@/components/admin/admin-login"
import CreateUserForm from "@/components/admin/create-user-form"
import UserManagement from "@/components/admin/user-management"
import WorkspaceManagement from "@/components/admin/workspace-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAllUsers } from "@/lib/auth-utils"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, limit, startAfter } from "firebase/firestore"
import BugReportsList from "@/components/admin/bug-reports-list"
import SendNotificationForm from "@/components/admin/send-notification-form"
import WorkspaceReportsList from "@/components/admin/workspace-reports-list"
import JobApplicationsList from "@/components/admin/job-applications-list"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [workspacesPage, setWorkspacesPage] = useState(1)
  const [hasMoreWorkspaces, setHasMoreWorkspaces] = useState(true)
  const WORKSPACES_PER_PAGE = 20

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated])
  
  // Function to load more workspaces
  const loadMoreWorkspaces = async () => {
    if (isLoadingMore) return
    
    setIsLoadingMore(true)
    const nextPage = workspacesPage + 1
    
    try {
      // Get the last workspace as the starting point
      const lastWorkspace = workspaces[workspaces.length - 1]
      
      // Fetch next batch of workspaces
      const workspacesQuery = await getDocs(query(
        collection(db, "workspaces"),
        orderBy("createdAt", "desc"),
        // Start after the last document
        ...(lastWorkspace?.createdAt ? [startAfter(lastWorkspace.createdAt)] : []),
        limit(WORKSPACES_PER_PAGE)
      ))
      
      const newWorkspaceList: any[] = []
      workspacesQuery.forEach((doc) => {
        newWorkspaceList.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      
      // Add owner names to new workspaces
      const newWorkspacesWithOwners = newWorkspaceList.map((workspace) => {
        const owner = users.find((user) => user.uid === workspace.ownerId)
        return {
          ...workspace,
          ownerName: owner ? owner.username : "Unknown",
        }
      })
      
      // Append new workspaces to existing ones
      setWorkspaces([...workspaces, ...newWorkspacesWithOwners])
      setWorkspacesPage(nextPage)
      
      // Check if there are more workspaces to load
      setHasMoreWorkspaces(newWorkspaceList.length === WORKSPACES_PER_PAGE)
    } catch (error) {
      console.error("Error loading more workspaces:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const fetchData = async (reset = true) => {
    if (reset) {
      setIsLoading(true)
      setWorkspacesPage(1)
      setWorkspaces([])
    }

    try {
      // Fetch users and workspaces in parallel for better performance
      const [userList, workspacesQuery] = await Promise.all([
        getAllUsers(),
        getDocs(query(
          collection(db, "workspaces"),
          orderBy("createdAt", "desc"),
          limit(WORKSPACES_PER_PAGE)
        ))
      ])
      
      setUsers(userList)
      
      const workspaceList: any[] = []
      workspacesQuery.forEach((doc) => {
        workspaceList.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      
      // Check if there are more workspaces to load
      setHasMoreWorkspaces(workspaceList.length === WORKSPACES_PER_PAGE)

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
            <TabsTrigger value="jobs">Job Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UserManagement users={users} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="workspaces" className="space-y-4">
            <WorkspaceManagement workspaces={workspaces} onRefresh={fetchData} />
            {hasMoreWorkspaces && (
              <div className="flex justify-center mt-4">
                <button
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-md flex items-center gap-2"
                  onClick={loadMoreWorkspaces}
                >
                  <span>Load More</span>
                  {isLoadingMore && <span className="animate-spin">⟳</span>}
                </button>
              </div>
            )}
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

          <TabsContent value="jobs" className="space-y-4">
            <JobApplicationsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
