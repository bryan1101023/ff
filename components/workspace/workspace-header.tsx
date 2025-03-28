"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface WorkspaceHeaderProps {
  title: string
  description?: string
  workspace: any
}

export default function WorkspaceHeader({ title, description, workspace }: WorkspaceHeaderProps) {
  const router = useRouter()
  
  const handleBack = () => {
    router.back()
  }
  
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {workspace.groupIcon && (
          <img 
            src={workspace.groupIcon} 
            alt={workspace.groupName} 
            className="h-8 w-8 rounded-full"
          />
        )}
      </div>
    </div>
  )
}
