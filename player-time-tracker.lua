-- Player Time Tracker
-- This script tracks the time players spend in your game and saves it to DataStore

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")

-- Configure these values
local SAVE_INTERVAL = 60 -- How often to save data (in seconds)
local API_ENDPOINT = "https://your-api-endpoint.com/api/time-tracking" -- Your API endpoint
local API_KEY = "YOUR_WORKSPACE_API_KEY" -- Get this from your workspace settings
local WORKSPACE_ID = "YOUR_WORKSPACE_ID" -- Your workspace ID

-- Create DataStores
local TimeDataStore = DataStoreService:GetDataStore("PlayerTimeTracker")
local SessionDataStore = DataStoreService:GetDataStore("PlayerSessions")

-- Tables to store player data
local playerData = {}
local playerJoinTimes = {}

-- Function to format time
local function formatTime(seconds)
    local hours = math.floor(seconds / 3600)
    local minutes = math.floor((seconds % 3600) / 60)
    local secs = seconds % 60
    
    return string.format("%02d:%02d:%02d", hours, minutes, secs)
end

-- Function to load player data
local function loadPlayerData(player)
    local success, data = pcall(function()
        return TimeDataStore:GetAsync(tostring(player.UserId))
    end)
    
    if success and data then
        return data
    else
        return {
            totalTime = 0,
            lastSeen = os.time(),
            sessions = {}
        }
    end
end

-- Function to save player data
local function savePlayerData(player, data)
    local success, errorMessage = pcall(function()
        TimeDataStore:SetAsync(tostring(player.UserId), data)
    end)
    
    if not success then
        warn("Failed to save data for player " .. player.Name .. ": " .. errorMessage)
    end
    
    -- Send data to external API
    if API_ENDPOINT and API_KEY and WORKSPACE_ID then
        pcall(function()
            HttpService:RequestAsync({
                Url = API_ENDPOINT,
                Method = "POST",
                Headers = {
                    ["Content-Type"] = "application/json",
                    ["Authorization"] = "Bearer " .. API_KEY
                },
                Body = HttpService:JSONEncode({
                    userId = player.UserId,
                    username = player.Name,
                    totalTime = data.totalTime,
                    sessionTime = os.time() - playerJoinTimes[player.UserId],
                    timestamp = os.time(),
                    workspaceId = WORKSPACE_ID
                })
            })
        end)
    end
end

-- Function to create a new session
local function createSession(player)
    local sessionId = HttpService:GenerateGUID(false)
    local session = {
        id = sessionId,
        startTime = os.time(),
        endTime = nil,
        duration = 0
    }
    
    -- Save session start
    pcall(function()
        SessionDataStore:SetAsync(sessionId, {
            userId = player.UserId,
            username = player.Name,
            startTime = session.startTime
        })
    end)
    
    return session
end

-- Function to end a session
local function endSession(player, sessionId)
    local currentTime = os.time()
    
    if playerData[player.UserId] and playerData[player.UserId].currentSession then
        local session = playerData[player.UserId].currentSession
        session.endTime = currentTime
        session.duration = currentTime - session.startTime
        
        -- Update session in DataStore
        pcall(function()
            SessionDataStore:UpdateAsync(sessionId, function(oldData)
                if oldData then
                    oldData.endTime = session.endTime
                    oldData.duration = session.duration
                    return oldData
                end
                return nil
            end)
        end)
        
        -- Add to sessions history
        table.insert(playerData[player.UserId].sessions, session)
        
        -- Keep only last 10 sessions
        if #playerData[player.UserId].sessions > 10 then
            table.remove(playerData[player.UserId].sessions, 1)
        end
    end
end

-- Function to update player time
local function updatePlayerTime(player)
    if not player or not playerJoinTimes[player.UserId] then return end
    
    local currentTime = os.time()
    local sessionTime = currentTime - playerJoinTimes[player.UserId]
    
    if playerData[player.UserId] then
        playerData[player.UserId].totalTime = playerData[player.UserId].totalTime + SAVE_INTERVAL
        playerData[player.UserId].lastSeen = currentTime
        
        -- Save data periodically
        savePlayerData(player, playerData[player.UserId])
        
        -- Print debug info
        print(player.Name .. " has played for " .. formatTime(playerData[player.UserId].totalTime) .. " total")
        print("Current session: " .. formatTime(sessionTime))
    end
end

-- When a player joins
Players.PlayerAdded:Connect(function(player)
    print(player.Name .. " joined the game")
    
    -- Record join time
    playerJoinTimes[player.UserId] = os.time()
    
    -- Load player data
    playerData[player.UserId] = loadPlayerData(player)
    
    -- Create a new session
    playerData[player.UserId].currentSession = createSession(player)
    
    -- Welcome message with stats
    if playerData[player.UserId].totalTime > 0 then
        local formattedTime = formatTime(playerData[player.UserId].totalTime)
        game:GetService("StarterGui"):SetCore("ChatMakeSystemMessage", {
            Text = "Welcome back " .. player.Name .. "! You've played for " .. formattedTime .. " total.",
            Color = Color3.fromRGB(0, 255, 0),
            Font = Enum.Font.SourceSansBold
        })
    end
end)

-- When a player leaves
Players.PlayerRemoving:Connect(function(player)
    print(player.Name .. " left the game")
    
    if playerData[player.UserId] then
        -- Calculate final session time
        local sessionTime = os.time() - playerJoinTimes[player.UserId]
        playerData[player.UserId].totalTime = playerData[player.UserId].totalTime + sessionTime
        playerData[player.UserId].lastSeen = os.time()
        
        -- End current session
        if playerData[player.UserId].currentSession then
            endSession(player, playerData[player.UserId].currentSession.id)
        end
        
        -- Save final data
        savePlayerData(player, playerData[player.UserId])
        
        -- Clean up
        playerData[player.UserId] = nil
        playerJoinTimes[player.UserId] = nil
    end
end)

-- Periodic saving
while true do
    wait(SAVE_INTERVAL)
    
    for _, player in pairs(Players:GetPlayers()) do
        updatePlayerTime(player)
    end
end

