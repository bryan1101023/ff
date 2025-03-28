import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get("groupId")

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
  }

  try {
    // Fetch group info
    const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Roblox API returned ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      id: data.id,
      name: data.name,
      description: data.description,
      memberCount: data.memberCount,
      shout: data.shout,
      owner: data.owner,
      created: data.created,
      hasVerifiedBadge: data.hasVerifiedBadge,
    })
  } catch (error) {
    console.error("Error fetching group info:", error)
    return NextResponse.json({ error: "Failed to fetch group info from Roblox" }, { status: 500 })
  }
}

