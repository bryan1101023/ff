"use client"

import { useEffect } from "react"
import Notification from "@/components/ui/notification"
import { useToast } from "@/components/ui/use-toast"

export default function WorkspaceNotificationListener() {
  const { toast } = useToast()

  useEffect(() => {
    // Listen for workspace restricted events
    const handleWorkspaceRestricted = (event: CustomEvent) => {
      const { workspaceName, features, reason, duration } = event.detail

      // Create a notification element
      const notificationElement = document.createElement("div")
      notificationElement.id = "workspace-restriction-notification"
      document.body.appendChild(notificationElement)

      // Render the notification component
      const notification = (
        <Notification
          message={`Your workspace "${workspaceName}" has been restricted from using: ${features.join(", ")}. Reason: ${reason}`}
          type="warning"
          duration={10000} // 10 seconds
          actionText="View Details"
          additionalData={{
            restrictionDetails: {
              features,
              reason,
              duration,
            },
          }}
        />
      )

      // Mount the notification
      // Note: In a real implementation, you'd use ReactDOM.render or similar
      // For this example, we'll use the toast system as a fallback
      toast({
        title: "Workspace Restricted",
        description: `Your workspace "${workspaceName}" has been restricted from using: ${features.join(", ")}. Reason: ${reason}`,
        variant: "destructive",
        duration: 10000,
      })
    }

    // Listen for workspace unrestricted events
    const handleWorkspaceUnrestricted = (event: CustomEvent) => {
      const { workspaceName } = event.detail

      toast({
        title: "Restrictions Removed",
        description: `All restrictions have been removed from your workspace "${workspaceName}".`,
        variant: "success",
        duration: 5000,
      })
    }

    // Add event listeners
    window.addEventListener("workspace-restricted", handleWorkspaceRestricted as EventListener)
    window.addEventListener("workspace-unrestricted", handleWorkspaceUnrestricted as EventListener)

    // Clean up
    return () => {
      window.removeEventListener("workspace-restricted", handleWorkspaceRestricted as EventListener)
      window.removeEventListener("workspace-unrestricted", handleWorkspaceUnrestricted as EventListener)
    }
  }, [toast])

  return null // This component doesn't render anything
}

