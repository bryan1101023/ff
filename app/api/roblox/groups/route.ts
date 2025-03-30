import { NextResponse } from "next/server"

interface RobloxGroup {
  id: number;
  name: string;
  memberCount: number;
}

interface RobloxRole {
  id: number;
  name: string;
  rank: number;
}

interface RobloxGroupRole {
  group: RobloxGroup;
  role: RobloxRole;
}

interface RobloxGroupsResponse {
  data: RobloxGroupRole[];
}

interface RobloxIconResponse {
  data: {
    imageUrl: string;
  }[];
}

interface GroupData {
  id: number;
  name: string;
  memberCount: number;
  role: string;
  rank: number;
  icon: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    console.log(`Fetching groups for user ${userId}`)
    
    const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, {
      headers: {
        'Accept': "application/json",
        'User-Agent': 'Mozilla/5.0 (compatible; HeroService/1.0)',
      },
      // Use no-store to prevent caching issues
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Roblox API error (${response.status}):`, errorText)
      return NextResponse.json({
        error: `Roblox API returned ${response.status}`,
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('Roblox API data structure:', Object.keys(data))
    
    // Check if data has the expected structure
    if (!data || !Array.isArray(data.data)) {
      console.error('Invalid response format from Roblox API:', JSON.stringify(data))
      return NextResponse.json({
        error: 'Invalid response format from Roblox API',
        receivedData: JSON.stringify(data)
      }, { status: 500 })
    }

    // Process the groups data with proper error handling
    const groups = await Promise.all(
      data.data.map(async (group: RobloxGroupRole) => {
        let iconUrl = ''
        try {
          // Fetch group icon
          const iconResponse = await fetch(
            `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${group.group.id}&size=150x150&format=Png`,
            {
              headers: {
                'Accept': "application/json",
                'User-Agent': 'Mozilla/5.0 (compatible; HeroService/1.0)',
              },
              cache: 'no-store'
            }
          )

          if (iconResponse.ok) {
            const iconData = await iconResponse.json() as RobloxIconResponse
            if (iconData.data?.[0]?.imageUrl) {
              iconUrl = iconData.data[0].imageUrl
            }
          } else {
            console.warn(`Could not fetch icon for group ${group.group.id}, status: ${iconResponse.status}`)
          }
        } catch (error) {
          console.error(`Error fetching icon for group ${group.group.id}:`, error)
          // Continue without the icon
        }

        // Convert all fields to primitive values
        const formattedGroup: GroupData = {
          id: Number(group.group.id || 0),
          name: String(group.group.name || ''),
          memberCount: Number(group.group.memberCount || 0),
          role: String(group.role.name || ''),
          rank: Number(group.role.rank || 0),
          icon: String(iconUrl || '')
        }
        
        return formattedGroup
      })
    )

    console.log(`Successfully processed ${groups.length} groups`)
    return NextResponse.json(groups)
  } catch (error) {
    console.error("Error fetching Roblox groups:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch group data from Roblox. Please try again later.",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
}
