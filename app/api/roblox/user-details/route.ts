import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    // Fetch user details
    const userResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!userResponse.ok) {
      throw new Error(`Roblox API returned ${userResponse.status} for user details`)
    }

    const userData = await userResponse.json()

    // Use the Thumbnails API to get the avatar URL
    const avatarResponse = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )

    let avatarUrl = `/placeholder.svg?height=150&width=150&text=${encodeURIComponent(userData.name)}`

    if (avatarResponse.ok) {
      const avatarData = await avatarResponse.json()
      if (avatarData.data && avatarData.data.length > 0) {
        avatarUrl = avatarData.data[0].imageUrl
      }
    }

    // Fetch friends count
    const friendsResponse = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`, {
      headers: {
        Accept: "application/json",
      },
    })

    let friendsCount = 0

    if (friendsResponse.ok) {
      const friendsData = await friendsResponse.json()
      friendsCount = friendsData.count
    }

    // Calculate account age
    const createdAt = new Date(userData.created)
    const now = new Date()
    const accountAgeInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const accountAgeInYears = Math.floor(accountAgeInDays / 365)

    return NextResponse.json({
      id: userData.id,
      name: userData.name,
      displayName: userData.displayName,
      description: userData.description,
      created: userData.created,
      isBanned: userData.isBanned,
      avatar: avatarUrl,
      friendsCount: friendsCount,
      accountAge: {
        days: accountAgeInDays,
        years: accountAgeInYears,
        created: userData.created,
      },
      success: true,
    })
  } catch (error) {
    console.error("Error fetching user details:", error)

    // Even in error cases, try to return a useful response
    // If we have a userId, we can still construct a placeholder avatar URL
    if (userId) {
      return NextResponse.json({
        error: "Failed to fetch user details",
        avatar: `/placeholder.svg?height=150&width=150&text=${encodeURIComponent("User " + userId)}`,
        success: false,
      })
    }

    return NextResponse.json({
      error: "Failed to fetch user details",
      success: false,
    })
  }
}

