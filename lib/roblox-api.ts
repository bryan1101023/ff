// Roblox API helper functions

// Get user ID from username
export async function getUserIdFromUsername(username: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/roblox/user?username=${encodeURIComponent(username)}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to fetch user data")
    }

    const data = await response.json()

    if (data && data.id) {
      return data.id
    }
    return null
  } catch (error) {
    console.error("Error fetching Roblox user ID:", error)
    throw error
  }
}

// Get user's groups
export async function getUserGroups(userId: number) {
  try {
    const response = await fetch(`/api/roblox/groups?userId=${userId}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to fetch group data")
    }

    const data = await response.json()

    if (Array.isArray(data)) {
      return data
    }
    return []
  } catch (error) {
    console.error("Error fetching Roblox user groups:", error)
    throw error
  }
}

// Verify group ownership
export async function verifyGroupOwnership(userId: number, groupId: number) {
  try {
    const response = await fetch(`/api/roblox/verify-ownership?userId=${userId}&groupId=${groupId}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to verify ownership")
    }

    return await response.json()
  } catch (error) {
    console.error("Error verifying group ownership:", error)
    throw error
  }
}

// Generate a verification code
export function generateVerificationCode() {
  // Generate a random emoji code (5 emojis)
  const emojis = [
    "🍎",
    "🍌",
    "🍒",
    "🍓",
    "🍊",
    "🍋",
    "🍉",
    "🍇",
    "🍍",
    "🥭",
    "🍐",
    "🥝",
    "🍅",
    "🥑",
    "🥦",
    "🥕",
    "🌽",
    "🥔",
    "🍆",
    "🥜",
  ]
  let code = ""

  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * emojis.length)
    code += emojis[randomIndex]
  }

  return code
}

// Verify bio code
export async function verifyBioCode(username: string, code: string) {
  try {
    const response = await fetch(
      `/api/roblox/verify-bio?username=${encodeURIComponent(username)}&code=${encodeURIComponent(code)}`,
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to verify bio")
    }

    return await response.json()
  } catch (error) {
    console.error("Error verifying bio code:", error)
    throw error
  }
}

