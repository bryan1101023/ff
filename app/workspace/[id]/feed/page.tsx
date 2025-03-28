"use client"

import React, { use } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import WorkspaceFeed from "@/components/workspace/workspace-feed"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

// Helper function to safely get the workspace ID
function getWorkspaceId(params: any): string {
  // For Next.js 14+, params should be unwrapped with use()
  if (typeof params === 'object' && params !== null) {
    if (params.then && typeof params.then === 'function') {
      // It's a Promise-like object, use React.use
      const unwrappedParams = use(params) as { id?: string }
      return unwrappedParams.id || ""
    } else {
      // It's a regular object
      return params.id || ""
    }
  }
  return ""
}

// Simple header component
function WorkspaceHeader({ title, workspace }: { title: string; workspace: any }) {
  const router = useRouter()
  
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">Chat with your team members</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {workspace?.groupIcon && (
          <img 
            src={workspace.groupIcon} 
            alt={workspace.groupName || "Workspace"} 
            className="h-8 w-8 rounded-full"
          />
        )}
      </div>
    </div>
  )
}

export default function WorkspaceFeedPage({ params }: { params: any }) {
  const workspaceId = getWorkspaceId(params)
  const { user } = useAuth()
  const [workspace, setWorkspace] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!workspaceId) return
      
      try {
        setIsLoading(true)
        
        // Fetch workspace data
        const workspaceDoc = await getDoc(doc(db, "workspaces", workspaceId))
        
        if (workspaceDoc.exists()) {
          setWorkspace({ id: workspaceDoc.id, ...workspaceDoc.data() })
        } else {
          // If workspace doesn't exist, create a dummy one to avoid errors
          setWorkspace({
            id: workspaceId,
            groupName: "Workspace",
            description: "Team workspace"
          })
        }
      } catch (error) {
        console.error("Error fetching workspace:", error)
        // Create a dummy workspace on error
        setWorkspace({
          id: workspaceId,
          groupName: "Workspace",
          description: "Team workspace"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchWorkspace()
  }, [workspaceId])
  
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Skeleton className="h-16 w-full" />
        <div className="flex-1 m-4">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    )
  }
  
  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Workspace Not Found</h1>
          <p className="text-muted-foreground">
            The workspace you are looking for does not exist.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <WorkspaceHeader
        title={`${workspace.groupName} Feed`}
        workspace={workspace}
      />
      
      <div className="flex-1 overflow-hidden border rounded-lg m-4">
        <WorkspaceFeed
          workspaceId={workspace.id}
          workspaceName={workspace.groupName}
        />
      </div>
    </div>
  )
}
