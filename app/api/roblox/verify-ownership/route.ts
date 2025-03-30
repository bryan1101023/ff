import { NextResponse } from "next/server"

interface RobloxRole {
  id: number;
  name: string;
  rank: number;
  memberCount?: number;
}

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
      cache: 'no-cache',
      next: { revalidate: 60 }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Roblox API error (${response.status}):`, errorText)
      throw new Error(`Roblox API returned ${response.status}: ${errorText}`)
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
      // Get group ranks and ensure they're properly formatted
      const ranks = await getGroupRanks(groupId)
      
      return NextResponse.json({
        verified: true,
        role: group.role.name,
        rank: group.role.rank,
        ranks: ranks,
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
        verified: false,
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 },
    )
  }
}

// Helper function to get all ranks in a group
async function getGroupRanks(groupId: string): Promise<RobloxRole[]> {
  try {
    const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/roles`, {
      headers: {
        Accept: "application/json",
      },
      cache: 'no-cache',
      next: { revalidate: 60 }
    })

    if (!response.ok) {
      console.error(`Failed to fetch group roles: ${response.status}`)
      return []
    }

    const data = await response.json()
    
    if (!data || !Array.isArray(data.roles)) {
      console.error('Invalid response format from Roblox API:', data)
      return []
    }
    
    // Ensure each role is properly formatted with the correct types
    return data.roles.map((role: any): RobloxRole => ({
      id: Number(role.id),
      name: String(role.name || ''),
      rank: Number(role.rank),
      memberCount: role.memberCount ? Number(role.memberCount) : undefined
    }))
  } catch (error) {
    console.error("Error fetching group ranks:", error)
    return []
  }
}
