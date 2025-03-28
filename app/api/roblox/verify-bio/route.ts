import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")
  const verificationCode = searchParams.get("code")

  if (!username || !verificationCode) {
    return NextResponse.json({ error: "Username and verification code are required" }, { status: 400 })
  }

  try {
    // First get the user ID
    const userResponse = await fetch(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )

    if (!userResponse.ok) {
      throw new Error(`Roblox API returned ${userResponse.status}`)
    }

    const userData = await userResponse.json()

    // Find exact username match
    const exactMatch = userData.data.find((user: any) => user.name.toLowerCase() === username.toLowerCase())

    if (!exactMatch) {
      return NextResponse.json({
        verified: false,
        message: "User not found",
      })
    }

    const userId = exactMatch.id

    // Now fetch the user's profile
    const profileResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!profileResponse.ok) {
      throw new Error(`Roblox API returned ${profileResponse.status}`)
    }

    const profileData = await profileResponse.json()

    // Check if the verification code is in the bio
    const bio = profileData.description || ""
    const isVerified = bio.includes(verificationCode)

    return NextResponse.json({
      verified: isVerified,
      userId: userId,
      username: exactMatch.name,
      message: isVerified ? "Verification successful" : "Verification code not found in bio",
    })
  } catch (error) {
    console.error("Error verifying bio:", error)
    return NextResponse.json(
      {
        error: "Failed to verify bio",
      },
      { status: 500 },
    )
  }
}

