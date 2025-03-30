import { NextResponse } from "next/server"
import { collection, query, where, getDocs } from "firebase/firestore"
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

// Hardcode Firebase config directly in this file
const firebaseConfig = {
  apiKey: "AIzaSyCYb_AD2mPoBv6o-oaJUBv9ZWvGcQ6LY8I",
  authDomain: "loll-8b3ea.firebaseapp.com",
  databaseURL: "https://loll-8b3ea-default-rtdb.firebaseio.com",
  projectId: "loll-8b3ea",
  storageBucket: "loll-8b3ea.firebasestorage.app",
  messagingSenderId: "953906832856",
  appId: "1:953906832856:web:4536b15a8dc9683d743ead",
}

// Initialize Firebase directly in this route
const app = initializeApp(firebaseConfig, 'check-roblox-linked')
const db = getFirestore(app)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")
  const userId = searchParams.get("userId")

  if (!username || !userId) {
    return NextResponse.json({ error: "Username and userId are required" }, { status: 400 })
  }

  try {
    console.log('Checking if Roblox account is linked:', { username, userId })
    
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

    return NextResponse.json({ isLinked: false })
  } catch (error) {
    console.error("Error checking if Roblox account is linked:", error)
    return NextResponse.json({ error: "Failed to check if Roblox account is linked" }, { status: 500 })
  }
}
