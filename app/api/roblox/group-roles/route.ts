import { NextResponse } from "next/server"
import { cookies } from 'next/headers'

interface RobloxRole {
  id: number;
  name: string;
  rank: number;
  memberCount?: number;
}

interface RobloxRolesResponse {
  roles: Array<{
    id: number | string;
    name: string;
    rank: number | string;
    memberCount?: number | string;
  }>;
}

export async function GET(request: Request) {
  // Add detailed error logging
  console.log('Group roles API called with URL:', request.url);
  
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get("groupId")

  console.log('Received groupId:', groupId);

  if (!groupId) {
    console.error('Missing groupId parameter');
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
  }

  try {
    // Construct the URL carefully and log it
    const apiUrl = `https://groups.roblox.com/v1/groups/${groupId}/roles`;
    console.log('Fetching from Roblox API URL:', apiUrl);
    
    // Fetch group roles from Roblox API
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HeroService/1.0)',
      },
      cache: 'no-store', // Use no-store instead of no-cache to prevent caching issues
    })

    console.log('Roblox API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Roblox API error (${response.status}):`, errorText)
      return NextResponse.json({ 
        error: `Roblox API returned error ${response.status}`, 
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json() as RobloxRolesResponse
    console.log('Raw Roblox API response structure:', Object.keys(data));

    // Check if data has the expected structure
    if (!data || !Array.isArray(data.roles)) {
      console.error('Invalid response format from Roblox API:', JSON.stringify(data));
      return NextResponse.json({ 
        error: 'Invalid response format from Roblox API',
        receivedData: JSON.stringify(data)
      }, { status: 500 })
    }

    // Format the roles data to match our expected structure
    const formattedRoles: RobloxRole[] = data.roles.map(role => ({
      id: Number(role.id),
      name: String(role.name),
      rank: Number(role.rank),
      memberCount: role.memberCount ? Number(role.memberCount) : undefined
    }))

    console.log('Successfully formatted roles, returning count:', formattedRoles.length);

    // Return the formatted roles
    return NextResponse.json(formattedRoles)
  } catch (error) {
    console.error("Error fetching group roles:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch group roles. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
}
