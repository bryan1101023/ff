import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const groupId = searchParams.get('groupId');
  
  if (!userId || !groupId) {
    return NextResponse.json({ error: 'User ID and Group ID are required' }, { status: 400 });
  }
  
  try {
    // Fetch user's group roles from Roblox API
    const response = await fetch(
      `https://groups.roblox.com/v2/users/${userId}/groups/roles`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Roblox API error: ${response.status}` }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    if (!data.data) {
      return NextResponse.json({ error: 'No data found in API response' }, { status: 404 });
    }
    
    const group = data.data.find((g: any) => g.group.id.toString() === groupId);
    
    if (!group) {
      return NextResponse.json({ 
        rankId: 0, 
        rankName: "Guest", 
        rank: 0 
      });
    }
    
    return NextResponse.json({
      rankId: group.role.id,
      rankName: group.role.name,
      rank: group.role.rank
    });
    
  } catch (error) {
    console.error('Error in Roblox user rank API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Roblox API' }, 
      { status: 500 }
    );
  }
}
