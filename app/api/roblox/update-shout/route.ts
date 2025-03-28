import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { groupId, message, apiKey } = await request.json()

    if (!groupId || !message || !apiKey) {
      return NextResponse.json({ error: "Group ID, message, and API key are required" }, { status: 400 })
    }

    // First, we need to get a CSRF token
    const csrfResponse = await fetch("https://auth.roblox.com/v2/logout", {
      method: "POST",
      headers: {
        Cookie: `.ROBLOSECURITY=${apiKey}`,
      },
    })

    if (!csrfResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to authenticate with Roblox",
          details: "Invalid API key or Roblox authentication failed",
        },
        { status: 401 },
      )
    }

    const csrfToken = csrfResponse.headers.get("x-csrf-token")

    if (!csrfToken) {
      return NextResponse.json(
        {
          error: "Failed to get CSRF token from Roblox",
          details: "Could not retrieve security token",
        },
        { status: 500 },
      )
    }

    // Update group shout using Roblox API
    const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
        Cookie: `.ROBLOSECURITY=${apiKey}`,
      },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        {
          error: "Failed to update group shout",
          details: errorData,
        },
        { status: response.status },
      )
    }

    return NextResponse.json({ success: true, message: "Group shout updated successfully" })
  } catch (error) {
    console.error("Error updating group shout:", error)
    return NextResponse.json({ error: "Failed to update group shout" }, { status: 500 })
  }
}

