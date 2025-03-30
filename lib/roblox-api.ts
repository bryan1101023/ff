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
    console.log(`Fetching groups for user ID: ${userId}`);
    
    if (!userId) {
      console.error('Invalid userId provided to getUserGroups:', userId);
      throw new Error('Invalid user ID');
    }
    
    const response = await fetch(`/api/roblox/groups?userId=${userId}`, {
      // Add cache control to prevent caching issues
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });

    // Log response status
    console.log(`Groups API response status: ${response.status}`);
    
    if (!response.ok) {
      // Check content type before trying to parse JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        console.error('Error response from groups API:', errorData);
        throw new Error(errorData.error || "Failed to fetch group data");
      } else {
        // Handle non-JSON error responses
        const errorText = await response.text();
        console.error(`Non-JSON error response (${response.status}):`, errorText.substring(0, 200));
        throw new Error(`API returned ${response.status}: Non-JSON response`);
      }
    }

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', text.substring(0, 200));
      throw new Error('Invalid response format: not JSON');
    }

    const data = await response.json();
    console.log(`Received groups data: ${JSON.stringify(data).substring(0, 100)}...`);

    if (Array.isArray(data)) {
      console.log(`Found ${data.length} groups for user`);
      return data;
    }
    
    console.warn('Response was not an array, returning empty array');
    return [];
  } catch (error) {
    console.error("Error fetching Roblox user groups:", error);
    // Return empty array instead of throwing to prevent UI from breaking
    return [];
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
