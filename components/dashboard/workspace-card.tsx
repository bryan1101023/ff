"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface WorkspaceCardProps {
  workspace: {
    id: string
    groupName: string
    groupId: number
    isDeleted?: boolean
    icon?: string
  }
  isActive?: boolean
  onSelect: (id: string) => void
}

export default function WorkspaceCard({ workspace, isActive, onSelect }: WorkspaceCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSelect = () => {
    if (workspace.isDeleted) {
      // Just call the onSelect function which will handle the notification
      onSelect(workspace.id)
      return
    }

    setIsLoading(true)
    onSelect(workspace.id)
  }

  return (
    <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
      <Card
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all hover:shadow-md",
          isActive ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50",
          workspace.isDeleted ? "opacity-80" : "",
        )}
        onClick={handleSelect}
      >
        <div className="aspect-video relative">
          {workspace.isDeleted ? (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <p className="text-white font-medium text-xl">Workspace Deleted</p>
            </div>
          ) : null}

          <Image
            src={workspace.icon || "/placeholder.svg?height=200&width=400"}
            alt={workspace.groupName}
            fill
            className="object-cover"
          />
        </div>

        <div className="bg-[#111] p-3">
          <h3 className="font-medium text-white truncate">{workspace.groupName}</h3>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-400">ID: {workspace.id.substring(0, 8)}</p>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-white hover:text-white/80"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect()
                }}
              >
                {workspace.isDeleted ? "View" : "Open"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

