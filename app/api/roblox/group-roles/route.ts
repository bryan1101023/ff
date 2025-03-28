import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get("groupId")

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
  }

  try {
    // Fetch group roles from Roblox API
    const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/roles`)

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.message || "Failed to fetch group roles" },
        { status: response.status },
      )
    }

    const data = await response.json()

    // Return the roles data
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching group roles:", error)
    return NextResponse.json({ error: "An error occurred while fetching group roles" }, { status: 500 })
  }
}

