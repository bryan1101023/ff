"use client"

import { useEffect } from "react"
import Notification from "@/components/ui/notification"
import { showToast } from "@/lib/notification-utils"

export default function WorkspaceNotificationListener() {

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
      // Use our new black toast style
      showToast(
        "Workspace Restricted",
        `Your workspace "${workspaceName}" has been restricted from using: ${features.join(", ")}. Reason: ${reason}`,
        10000
      )
    }

    // Listen for workspace unrestricted events
    const handleWorkspaceUnrestricted = (event: CustomEvent) => {
      const { workspaceName } = event.detail

      showToast(
        "Restrictions Removed",
        `All restrictions have been removed from your workspace "${workspaceName}".`,
        5000
      )
    }

    // Add event listeners
    window.addEventListener("workspace-restricted", handleWorkspaceRestricted as EventListener)
    window.addEventListener("workspace-unrestricted", handleWorkspaceUnrestricted as EventListener)

    // Clean up
    return () => {
      window.removeEventListener("workspace-restricted", handleWorkspaceRestricted as EventListener)
      window.removeEventListener("workspace-unrestricted", handleWorkspaceUnrestricted as EventListener)
    }
  }, [])

  return null // This component doesn't render anything
}

