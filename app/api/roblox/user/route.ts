import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  try {
    // First try the newer API endpoint
    const response = await fetch(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Roblox API returned ${response.status}`)
    }

    const data = await response.json()

    // Find exact username match
    const exactMatch = data.data.find((user: any) => user.name.toLowerCase() === username.toLowerCase())

    if (exactMatch) {
      return NextResponse.json({ id: exactMatch.id, name: exactMatch.name })
    }

    // If no exact match, try the legacy API as fallback
    const legacyResponse = await fetch(
      `https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(username)}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )

    if (!legacyResponse.ok) {
      throw new Error(`Legacy Roblox API returned ${legacyResponse.status}`)
    }

    const legacyData = await legacyResponse.json()

    if (legacyData && legacyData.Id) {
      return NextResponse.json({ id: legacyData.Id, name: legacyData.Username })
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 })
  } catch (error) {
    console.error("Error fetching Roblox user:", error)
    return NextResponse.json({ error: "Failed to fetch user data from Roblox" }, { status: 500 })
  }
}

