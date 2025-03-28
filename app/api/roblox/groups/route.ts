import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Roblox API returned ${response.status}`)
    }

    const data = await response.json()

    // Process the groups data to include icons
    const groups = await Promise.all(
      data.data.map(async (group: any) => {
        let iconUrl = "/placeholder.svg?height=150&width=150"

        try {
          const iconResponse = await fetch(
            `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${group.group.id}&size=150x150&format=Png`,
            {
              headers: {
                Accept: "application/json",
              },
            },
          )

          if (iconResponse.ok) {
            const iconData = await iconResponse.json()
            if (iconData.data && iconData.data.length > 0 && iconData.data[0].imageUrl) {
              iconUrl = iconData.data[0].imageUrl
            }
          }
        } catch (error) {
          console.error(`Error fetching icon for group ${group.group.id}:`, error)
        }

        return {
          id: group.group.id,
          name: group.group.name,
          memberCount: group.group.memberCount,
          role: group.role.name,
          rank: group.role.rank,
          icon: iconUrl,
        }
      }),
    )

    return NextResponse.json(groups)
  } catch (error) {
    console.error("Error fetching Roblox groups:", error)
    return NextResponse.json({ error: "Failed to fetch group data from Roblox" }, { status: 500 })
  }
}

