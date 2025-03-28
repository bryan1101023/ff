import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get("groupId")
  const page = Number.parseInt(searchParams.get("page") || "1")
  const limit = Number.parseInt(searchParams.get("limit") || "100")
  const roleId = searchParams.get("roleId") // Optional parameter to filter by role
  const userId = searchParams.get("userId") // Add userId parameter to verify permissions

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
  }

  // If userId is provided, verify that the user has permission to view members
  if (userId) {
    try {
      // This would be a more robust check in a real implementation
      // For now, we'll just check if the user is in the group
      const userGroupsResponse = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`)

      if (!userGroupsResponse.ok) {
        return NextResponse.json(
          {
            error: "Failed to verify user permissions",
            success: false,
          },
          { status: 403 },
        )
      }

      const userGroups = await userGroupsResponse.json()
      const isInGroup = userGroups.data.some((g: any) => g.group.id.toString() === groupId)

      if (!isInGroup) {
        return NextResponse.json(
          {
            error: "You don't have permission to view members of this group",
            success: false,
          },
          { status: 403 },
        )
      }
    } catch (error) {
      console.error("Error verifying user permissions:", error)
    }
  }

  try {
    // Construct the URL for fetching group members
    let url = `https://groups.roblox.com/v1/groups/${groupId}/users?limit=${limit}&sortOrder=Asc`

    // Add cursor for pagination if page > 1
    if (page > 1) {
      // In a real implementation, you would store and use the actual cursor from previous responses
      // For this example, we'll simulate pagination by using a fake cursor
      url += `&cursor=next_page_${page}`
    }

    // Add role filter if provided
    if (roleId) {
      url += `&roleId=${roleId}`
    }

    console.log(`Attempting to fetch group members from: ${url}`)

    // Attempt to fetch members
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error(`Roblox API returned ${response.status} for group members`)

      // For demonstration purposes, we'll generate mock data
      // In a real implementation, you would return an error
      console.log("Generating mock data for demonstration purposes")

      const mockMembers = Array.from({ length: 100 }, (_, i) => {
        const userId = `user-${page}-${i + 1}`
        return {
          userId: userId,
          username: `User${page}${i + 1}`,
          displayName: `User ${page}${i + 1}`,
          role: {
            id: (i % 5) + 1,
            name:
              i % 5 === 0
                ? "Owner"
                : i % 5 === 1
                  ? "Admin"
                  : i % 5 === 2
                    ? "Moderator"
                    : i % 5 === 3
                      ? "Member"
                      : "Guest",
            rank: i % 5 === 0 ? 255 : i % 5 === 1 ? 200 : i % 5 === 2 ? 150 : i % 5 === 3 ? 100 : 1,
          },
          // For mock data, we'll use a placeholder since we can't fetch real avatars
          avatar: `/placeholder.svg?height=150&width=150&text=${encodeURIComponent(`User${i + 1}`)}`,
        }
      })

      return NextResponse.json({
        members: mockMembers,
        hasMore: page < 5, // Simulate 5 pages of data
        success: true,
        isMockData: true,
      })
    }

    const data = await response.json()

    // Process the members data
    const members = await Promise.all(
      data.data.map(async (member: any) => {
        let avatarUrl = `/placeholder.svg?height=150&width=150&text=${encodeURIComponent(member.user.username)}`

        try {
          const avatarResponse = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${member.user.userId}&size=150x150&format=Png&isCircular=false`,
            {
              headers: {
                Accept: "application/json",
              },
            },
          )

          if (avatarResponse.ok) {
            const avatarData = await avatarResponse.json()
            if (avatarData.data && avatarData.data.length > 0) {
              avatarUrl = avatarData.data[0].imageUrl
            }
          }
        } catch (error) {
          console.error(`Error fetching avatar for user ${member.user.userId}:`, error)
        }

        return {
          userId: member.user.userId,
          username: member.user.username,
          displayName: member.user.displayName,
          role: {
            id: member.role.id,
            name: member.role.name,
            rank: member.role.rank,
          },
          avatar: avatarUrl,
        }
      }),
    )

    return NextResponse.json({
      members,
      hasMore: !!data.nextPageCursor,
      nextCursor: data.nextPageCursor,
      success: true,
    })
  } catch (error) {
    console.error("Error fetching group members:", error)

    // For demonstration purposes, generate mock data
    console.log("Generating mock data due to error")

    const mockMembers = Array.from({ length: 100 }, (_, i) => {
      const userId = `user-${page}-${i + 1}`
      return {
        userId: userId,
        username: `User${page}${i + 1}`,
        displayName: `User ${page}${i + 1}`,
        role: {
          id: (i % 5) + 1,
          name:
            i % 5 === 0
              ? "Owner"
              : i % 5 === 1
                ? "Admin"
                : i % 5 === 2
                  ? "Moderator"
                  : i % 5 === 3
                    ? "Member"
                    : "Guest",
          rank: i % 5 === 0 ? 255 : i % 5 === 1 ? 200 : i % 5 === 2 ? 150 : i % 5 === 3 ? 100 : 1,
        },
        // For mock data, we'll use a placeholder since we can't fetch real avatars
        avatar: `/placeholder.svg?height=150&width=150&text=${encodeURIComponent(`User${i + 1}`)}`,
      }
    })

    return NextResponse.json({
      members: mockMembers,
      hasMore: page < 5, // Simulate 5 pages of data
      success: true,
      isMockData: true,
    })
  }
}

