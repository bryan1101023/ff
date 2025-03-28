import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const groupId = searchParams.get("groupId")

  if (!userId || !groupId) {
    return NextResponse.json({ error: "User ID and Group ID are required" }, { status: 400 })
  }

  try {
    // Fetch user's groups with roles
    const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Roblox API returned ${response.status}`)
    }

    const data = await response.json()

    // Find the specific group
    const group = data.data.find((g: any) => g.group.id.toString() === groupId)

    if (!group) {
      return NextResponse.json({
        verified: false,
        message: "User is not a member of this group",
      })
    }

    // Check if user has a high enough rank (typically 255 is owner, 254 is admin)
    // We'll consider ranks 100+ as having ownership/management permissions
    const hasOwnership = group.role.rank >= 100

    if (hasOwnership) {
      return NextResponse.json({
        verified: true,
        role: group.role.name,
        rank: group.role.rank,
        ranks: await getGroupRanks(groupId),
      })
    } else {
      return NextResponse.json({
        verified: false,
        message: "User does not have sufficient permissions in this group",
        role: group.role.name,
        rank: group.role.rank,
      })
    }
  } catch (error) {
    console.error("Error verifying group ownership:", error)
    return NextResponse.json(
      {
        error: "Failed to verify group ownership",
      },
      { status: 500 },
    )
  }
}

// Helper function to get all ranks in a group
async function getGroupRanks(groupId: string) {
  try {
    const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/roles`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      rank: role.rank,
      memberCount: role.memberCount,
    }))
  } catch (error) {
    console.error("Error fetching group ranks:", error)
    return []
  }
}

