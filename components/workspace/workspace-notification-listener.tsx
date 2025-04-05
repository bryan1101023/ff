"use client"

import { useEffect } from "react"
import Notification from "@/components/ui/notification"
import { showToast } from "@/lib/notification-utils"

export default function WorkspaceNotificationListener() {

  useEffect(() => {
    // Listen for workspace restricted events
    const handleWorkspaceRestricted = (event: CustomEvent) => {
      // Extract data from the event detail, with fallbacks to prevent errors
      const detail = event.detail || {};
      const workspaceName = detail.workspaceName || "Workspace";
      const restrictions = detail.restrictions || {};
      const features = restrictions.features || [];
      const reason = restrictions.reason || "No reason provided";
      const duration = restrictions.duration || "";

      // Safely create the message
      let message = `Your workspace "${workspaceName}" has been restricted`;
      if (features && Array.isArray(features) && features.length > 0) {
        message += ` from using: ${features.join(", ")}`;
      }
      if (reason) {
        message += `. Reason: ${reason}`;
      }

      // Create a notification element
      const notificationElement = document.createElement("div")
      notificationElement.id = "workspace-restriction-notification"
      document.body.appendChild(notificationElement)

      // Use our new black toast style
      showToast(
        "Workspace Restricted",
        message,
        10000
      );
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
