"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { getCurrentUserData } from "@/lib/auth-utils"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import WorkspaceSettings from "@/components/dashboard/workspace-settings"
import { Loader2 } from "lucide-react"

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser)

        // Get additional user data from Firestore
        const data = await getCurrentUserData(authUser.uid)
        setUserData(data)

        // Check if user has a workspace
        if (!data?.selectedGroup || !data?.workspace) {
          router.push("/dashboard")
        }
      } else {
        // Not logged in, redirect to beta login
        router.push("/beta")
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  if (!userData?.selectedGroup) {
    return null // Will redirect in useEffect
  }

  return (
    <DashboardLayout groupName={userData.selectedGroup.name}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Workspace Settings</h1>
        <p className="text-white/60">Configure your workspace and manage access</p>
      </div>

      <WorkspaceSettings workspaceId={userData.workspace?.id || "ws_default"} groupId={userData.selectedGroup.id} />
    </DashboardLayout>
  )
}

