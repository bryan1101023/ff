import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  console.log(`Searching for Roblox user: ${username}`)

  try {
    // Use the newer API endpoint as recommended
    console.log(`Using newer API endpoint for username lookup: ${username}`)
    
    const response = await fetch(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false
        })
      }
    )

    if (!response.ok) {
      console.error(`API error: ${response.status}`)
      throw new Error(`Roblox API returned ${response.status}`)
    }

    const data = await response.json()
    console.log(`API response:`, data)

    // Check if we found any users
    if (data.data && data.data.length > 0) {
      const user = data.data[0]
      console.log(`Found user: ${user.name} (${user.id})`)
      return NextResponse.json({ id: user.id, name: user.name })
    }

    // If we get here, no user was found
    console.log(`No user found with username: ${username}`)
    return NextResponse.json({ error: `User '${username}' not found` }, { status: 404 })
  } catch (error) {
    console.error(`Error fetching Roblox user '${username}':`, error)
    return NextResponse.json({ 
      error: "Failed to fetch user data from Roblox", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

