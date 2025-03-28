import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get("groupId")

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
  }

  try {
    // Try the correct endpoint for group members
    // Roblox API v1 endpoint for group members
    const url = `https://groups.roblox.com/v1/groups/${groupId}/roles`

    console.log(`Attempting to fetch group roles from: ${url}`)

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error(`Roblox API returned ${response.status} for group roles`)
      return NextResponse.json({
        members: [],
        total: 0,
        hasMore: false,
        error: `Unable to fetch group roles (Status: ${response.status})`,
        success: false,
      })
    }

    const data = await response.json()

    // Extract roles from the response
    const roles = data.roles || []

    if (roles.length === 0) {
      return NextResponse.json({
        members: [],
        total: 0,
        hasMore: false,
        success: true,
      })
    }

    // Create a simplified members array based on roles
    // Since we can't get actual members due to API limitations,
    // we'll just return the roles with their member counts
    const members = roles.map((role) => ({
      role: {
        id: role.id,
        name: role.name,
        rank: role.rank,
      },
      memberCount: role.memberCount,
      // We don't have actual user IDs, so we'll use role IDs as placeholders
      userId: `role-${role.id}`,
      username: `${role.name} (${role.memberCount} members)`,
      displayName: role.name,
      avatar: `/placeholder.svg?height=150&width=150`,
      isRoleGroup: true, // Flag to indicate this is a role group, not an actual member
    }))

    return NextResponse.json({
      members,
      total: members.length,
      hasMore: false,
      success: true,
      isRoleView: true, // Flag to indicate we're showing roles instead of individual members
    })
  } catch (error) {
    console.error("Error fetching group members:", error)
    return NextResponse.json({
      members: [],
      total: 0,
      hasMore: false,
      error: "Failed to fetch group members from Roblox. The API may have changed or the group ID may be invalid.",
      success: false,
    })
  }
}

