import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }
  
  try {
    // Search for user
    const searchResponse = await fetch(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=1`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );
    
    if (!searchResponse.ok) {
      return NextResponse.json(
        { error: `Roblox API error: ${searchResponse.status}` }, 
        { status: searchResponse.status }
      );
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = searchData.data[0].id;
    
    // Get user details
    const userResponse = await fetch(
      `https://users.roblox.com/v1/users/${userId}`,
      { next: { revalidate: 60 } }
    );
    
    if (!userResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch user details: ${userResponse.status}` }, 
        { status: userResponse.status }
      );
    }
    
    const userData = await userResponse.json();
    
    // Get avatar
    const avatarResponse = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`,
      { next: { revalidate: 60 } }
    );
    
    let avatarUrl = "https://tr.rbxcdn.com/53eb9b17fe1432a809c73a13889b5006/150/150/Image/Png"; // Default
    
    if (avatarResponse.ok) {
      const avatarData = await avatarResponse.json();
      if (avatarData.data && avatarData.data.length > 0) {
        avatarUrl = avatarData.data[0].imageUrl;
      }
    }
    
    return NextResponse.json({
      id: userId.toString(),
      name: userData.name,
      displayName: userData.displayName,
      avatar: avatarUrl
    });
    
  } catch (error) {
    console.error('Error in Roblox user search API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Roblox API' }, 
      { status: 500 }
    );
  }
}
