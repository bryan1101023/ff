import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDoc, updateDoc } from "firebase/firestore"

export async function POST(request: Request) {
  try {
    // Verify API key
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = authHeader.substring(7) // Remove "Bearer " prefix

    // Get the workspace ID from the request
    const data = await request.json()
    if (!data.workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })
    }

    // Validate the API key against the workspace's stored key
    const workspaceDoc = await getDoc(doc(db, "workspaces", data.workspaceId))
    if (!workspaceDoc.exists()) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    const workspace = workspaceDoc.data()
    if (workspace.robloxToken !== apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    // Validate required fields
    if (!data.userId || !data.totalTime || !data.sessionTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Store time tracking data
    const timeRef = doc(collection(db, "workspaces", data.workspaceId, "timeTracking"), data.userId.toString())

    // Check if document exists
    const timeDoc = await getDoc(timeRef)

    if (timeDoc.exists()) {
      // Update existing document
      await updateDoc(timeRef, {
        totalTime: data.totalTime,
        lastSessionTime: data.sessionTime,
        lastSeen: data.timestamp || Date.now(),
        username: data.username,
        updatedAt: Date.now(),
      })
    } else {
      // Create new document
      await setDoc(timeRef, {
        userId: data.userId.toString(),
        username: data.username,
        totalTime: data.totalTime,
        lastSessionTime: data.sessionTime,
        lastSeen: data.timestamp || Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    // Store session data
    const sessionRef = doc(collection(db, "workspaces", data.workspaceId, "timeSessions"))
    await setDoc(sessionRef, {
      userId: data.userId.toString(),
      username: data.username,
      sessionTime: data.sessionTime,
      timestamp: data.timestamp || Date.now(),
    })

    // Add to activity log
    const activityRef = doc(collection(db, "workspaces", data.workspaceId, "activity"))
    await setDoc(activityRef, {
      type: "time_tracking",
      title: "Player time tracked",
      description: `${data.username} played for ${Math.floor(data.sessionTime / 60)} minutes`,
      timestamp: Date.now(),
      time: "Just now",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing time tracking data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

