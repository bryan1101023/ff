import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const username = searchParams.get("username")

  // If neither userId nor username is provided, return an error
  if (!userId && !username) {
    return NextResponse.json({ error: "Either userId or username is required" }, { status: 400 })
  }
  
  // If username is provided, first search for the user ID
  let userIdToUse = userId
  
  if (username && !userId) {
    try {
      console.log(`Searching for user by username: ${username}`)
      
      // First try to get the user by exact username
      const userByNameResponse = await fetch(`https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(username)}`, {
        headers: {
          Accept: "application/json",
        },
      })
      
      if (userByNameResponse.ok) {
        const userData = await userByNameResponse.json()
        if (userData && userData.Id) {
          userIdToUse = userData.Id.toString()
          console.log(`Found user ID: ${userIdToUse} for username: ${username} using get-by-username endpoint`)
        } else {
          throw new Error("User data not found in response")
        }
      } else {
        // Fall back to search endpoint if get-by-username fails
        console.log(`Falling back to search endpoint for username: ${username}`)
        const searchResponse = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`, {
          headers: {
            Accept: "application/json",
          },
        })
        
        if (!searchResponse.ok) {
          throw new Error(`Roblox API returned ${searchResponse.status} for user search`)
        }
        
        const searchData = await searchResponse.json()
        
        if (!searchData.data || searchData.data.length === 0) {
          return NextResponse.json({ error: "User not found" }, { status: 404 })
        }
        
        // Try to find exact match first
        const exactMatch = searchData.data.find((user: any) => 
          user.name.toLowerCase() === username.toLowerCase()
        )
        
        if (exactMatch) {
          userIdToUse = exactMatch.id.toString()
        } else {
          // Otherwise use the first result
          userIdToUse = searchData.data[0].id.toString()
        }
        
        console.log(`Found user ID: ${userIdToUse} for username: ${username} using search endpoint`)
      }
    } catch (error) {
      console.error("Error searching for user by username:", error)
      return NextResponse.json({
        error: "Failed to search for user",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 })
    }
  }

  try {
    // Fetch user details
    const userResponse = await fetch(`https://users.roblox.com/v1/users/${userIdToUse}`, {
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
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIdToUse}&size=420x420&format=Png&isCircular=false`,
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
    const friendsResponse = await fetch(`https://friends.roblox.com/v1/users/${userIdToUse}/friends/count`, {
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
    if (userIdToUse) {
      return NextResponse.json({
        error: "Failed to fetch user details",
        id: userIdToUse,
        name: username || `User ${userIdToUse}`,
        displayName: username || `User ${userIdToUse}`,
        avatar: `/placeholder.svg?height=150&width=150&text=${encodeURIComponent(username || "User " + userIdToUse)}`,
        success: false,
      })
    }

    return NextResponse.json({
      error: "Failed to fetch user details",
      success: false,
    })
  }
}

