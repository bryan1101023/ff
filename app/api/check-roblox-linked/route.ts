import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")
  const userId = searchParams.get("userId")

  if (!username || !userId) {
    return NextResponse.json({ error: "Username and userId are required" }, { status: 400 })
  }

  try {
    // Check if any user has this Roblox username
    const usernameQuery = query(collection(db, "users"), where("robloxUsername", "==", username))

    const usernameSnapshot = await getDocs(usernameQuery)

    if (!usernameSnapshot.empty) {
      return NextResponse.json({ isLinked: true })
    }

    // Check if any user has this Roblox user ID
    const userIdQuery = query(collection(db, "users"), where("robloxUserId", "==", Number(userId)))

    const userIdSnapshot = await getDocs(userIdQuery)

    if (!userIdSnapshot.empty) {
      return NextResponse.json({ isLinked: true })
    }

    // If we get here, the Roblox account is not linked to any Hyre account
    return NextResponse.json({ isLinked: false })
  } catch (error) {
    console.error("Error checking Roblox account:", error)
    return NextResponse.json({ error: "Failed to check Roblox account status" }, { status: 500 })
  }
}

