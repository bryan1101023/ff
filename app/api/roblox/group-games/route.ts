import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get("groupId")

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
  }

  try {
    // Fetch group games
    const response = await fetch(
      `https://games.roblox.com/v2/groups/${groupId}/games?accessFilter=All&sortOrder=Asc&limit=50`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )

    if (!response.ok) {
      console.error(`Roblox API returned ${response.status} for group games`)
      // Return empty games array instead of throwing an error
      return NextResponse.json({
        games: [],
        error: `Unable to fetch games (Status: ${response.status})`,
        success: false,
      })
    }

    const data = await response.json()
    const games = data.data || []

    // Fetch thumbnails for games
    const gameIds = games.map((game: any) => game.id)
    const thumbnails: Record<string, string> = {}

    if (gameIds.length > 0) {
      try {
        const thumbnailResponse = await fetch(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${gameIds.join(",")}&size=256x256&format=Png&isCircular=false`,
          {
            headers: {
              Accept: "application/json",
            },
          },
        )

        if (thumbnailResponse.ok) {
          const thumbnailData = await thumbnailResponse.json()

          thumbnailData.data.forEach((thumbnail: any) => {
            thumbnails[thumbnail.targetId] = thumbnail.imageUrl
          })
        }
      } catch (error) {
        console.error("Error fetching game thumbnails:", error)
      }
    }

    // Add thumbnails to games
    const gamesWithThumbnails = games.map((game: any) => ({
      id: game.id,
      name: game.name,
      description: game.description,
      playing: game.playing,
      visits: game.placeVisits,
      created: game.created,
      updated: game.updated,
      maxPlayers: game.maxPlayers,
      allowedGearGenres: game.allowedGearGenres,
      allowedGearCategories: game.allowedGearCategories,
      isAllGenresAllowed: game.isAllGenresAllowed,
      isFavoritedByUser: game.isFavoritedByUser,
      thumbnail: thumbnails[game.id] || null,
    }))

    return NextResponse.json({ games: gamesWithThumbnails, success: true })
  } catch (error) {
    console.error("Error fetching group games:", error)
    // Return empty games array instead of an error
    return NextResponse.json({
      games: [],
      error: "Failed to fetch group games from Roblox",
      success: false,
    })
  }
}

