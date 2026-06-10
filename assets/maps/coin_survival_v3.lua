-- ============================================================
-- COIN SURVIVAL v3
-- Paste into a Custom Text trigger.
-- Separate Init trigger calls InitGame() on Map Initialization.
-- ============================================================

-- STATE
local gameStarted    = false
local gameEnded      = false
local respawning     = {}
local heroRef        = {}  -- heroRef[playerIndex] = hero unit handle
local eliminated     = {}
local coinCount      = 0
local coinsPickedUp  = {}  -- coinsPickedUp[playerIndex] = count
local MAX_COINS      = 15
local elapsedMinutes = 0


-- ============================================================
-- HELPERS
-- ============================================================

local function randX(r) return GetRandomReal(GetRectMinX(r), GetRectMaxX(r)) end
local function randY(r) return GetRandomReal(GetRectMinY(r), GetRectMaxY(r)) end

local function isPlaying(p)
    return GetPlayerSlotState(p) == PLAYER_SLOT_STATE_PLAYING
end

local function subtractGold(p, amt)
    local g = GetPlayerState(p, PLAYER_STATE_RESOURCE_GOLD)
    SetPlayerState(p, PLAYER_STATE_RESOURCE_GOLD, math.max(0, g - amt))
end

local function randomZone()
    local z = { gg_rct_ZoneA, gg_rct_ZoneB, gg_rct_ZoneC, gg_rct_ZoneD }
    return z[GetRandomInt(1, 4)]
end

local function getHero(p)
    local g = GetUnitsOfPlayerAll(p)
    local u = FirstOfGroup(g)
    DestroyGroup(g)
    return u
end

local function countAlive()
    local n = 0
    for i = 0, 6 do
        local p = Player(i)
        if isPlaying(p) and not eliminated[i] then
            local h = getHero(p)
            if h ~= nil and UnitAlive(h) then n = n + 1 end
        end
    end
    return n
end

-- ============================================================
-- END GAME  — victory dialog instead of force-close
-- ============================================================
local function endGame()
    if gameEnded then return end
    gameEnded = true

    local winPlayer, winCoins = nil, -1
    for i = 0, 6 do
        local p = Player(i)
        if isPlaying(p) and not eliminated[i] then
            local c = coinsPickedUp[i] or 0
            if c > winCoins then winCoins = c; winPlayer = p end
        end
    end

    local msg
    if winPlayer == nil then
        msg = "|cffff0000No survivors. The spirits claim all.|r"
    else
        local winHero = getHero(winPlayer)
        for i = 0, 6 do
            local p = Player(i)
            if isPlaying(p) and winHero ~= nil then
                PanCameraToTimedForPlayer(p, GetUnitX(winHero), GetUnitY(winHero), 2)
            end
        end
        msg = "|cffd4af37" .. GetPlayerName(winPlayer) .. " wins with " .. winCoins .. " coins!|r"
    end

    DisplayTextToForce(GetPlayersAll(), msg)

    -- Show a "Leave Game" dialog per player instead of force-closing
    TimerStart(CreateTimer(), 3, false, function()
        for i = 0, 6 do
            local p = Player(i)
            if isPlaying(p) then
                local d = DialogCreate()
                DialogSetMessage(d, "Game Over!")
                local btn = DialogAddButton(d, "Leave Game", 0)
                local t = CreateTrigger()
                TriggerRegisterDialogButtonEvent(t, btn)
                TriggerAddAction(t, function()
                    if GetLocalPlayer() == p then
                        DialogDisplay(p, d, false)
                    end
                    GameOver(p)
                end)
                if GetLocalPlayer() == p then
                    DialogDisplay(p, d, true)
                end
            end
        end
    end)
end



-- ============================================================
-- PASSIVE GOLD  (+10 every 5s to living players)
-- ============================================================
local function initPassiveGold()
    TimerStart(CreateTimer(), 5, true, function()
        for i = 0, 6 do
            local p = Player(i)
            if isPlaying(p) and not eliminated[i] and not respawning[i] then
                local h = getHero(p)
                if h ~= nil and UnitAlive(h) then
                    AdjustPlayerStateBJ(10, p, PLAYER_STATE_RESOURCE_GOLD)
                end
            end
        end
    end)
end

-- ============================================================
-- XP TRICKLE  — ~3.75 XP/s so heroes hit level 3 by ~8 min
-- ============================================================
local function initXpTrickle()
    TimerStart(CreateTimer(), 2, true, function()
        for i = 0, 6 do
            local h = heroRef[i]
            if h ~= nil and UnitAlive(h) and not eliminated[i] then
                AddHeroXP(h, 2, false)
            end
        end
    end)
end

-- ============================================================
-- BOOK OF EXPERIENCE SPAWNING  (max 3, every 90-120s)
-- ============================================================
local bookCount = 0
local MAX_BOOKS = 3

local function initBookSpawning()
    local t = CreateTrigger()
    TriggerRegisterAnyUnitEventBJ(t, EVENT_PLAYER_UNIT_PICKUP_ITEM)
    TriggerAddAction(t, function()
        local itm = GetManipulatedItem()
        if GetItemTypeId(itm) == FourCC('bexp') then
            bookCount = bookCount - 1
        end
    end)

    local function scheduleNext()
        TimerStart(CreateTimer(), GetRandomReal(90, 120), false, function()
            if bookCount < MAX_BOOKS then
                CreateItem(FourCC('bexp'), randX(gg_rct_GameArea), randY(gg_rct_GameArea))
                bookCount = bookCount + 1
            end
            scheduleNext()
        end)
    end

    scheduleNext()
end

-- ============================================================
-- COIN SPAWNING
-- 0-3 min:  1 coin every 10s
-- 3-7 min:  1-2 coins every 7s
-- 7-10 min: 1-3 coins every 5s
-- max 15 on map at once
-- ============================================================
local function initCoinSpawning()
    local t = CreateTrigger()
    TriggerRegisterAnyUnitEventBJ(t, EVENT_PLAYER_UNIT_PICKUP_ITEM)
    TriggerAddAction(t, function()
        local itm = GetManipulatedItem()
        if GetItemTypeId(itm) == FourCC('gold') then
            coinCount = coinCount - 1
            local p = GetOwningPlayer(GetTriggerUnit())
            local i = GetPlayerId(p)
            coinsPickedUp[i] = (coinsPickedUp[i] or 0) + 1
        end
    end)

    local function spawnCoins(num)
        if coinCount >= MAX_COINS then return end
        for _ = 1, num do
            if coinCount < MAX_COINS then
                CreateItem(FourCC('gold'), randX(gg_rct_GameArea), randY(gg_rct_GameArea))
                coinCount = coinCount + 1
            end
        end
    end

    TimerStart(CreateTimer(), 6, true, function()
        if elapsedMinutes < 3 then spawnCoins(GetRandomInt(2,3)) end
    end)
    TimerStart(CreateTimer(), 4, true, function()
        if elapsedMinutes >= 3 and elapsedMinutes < 7 then spawnCoins(GetRandomInt(3,4)) end
    end)
    TimerStart(CreateTimer(), 3, true, function()
        if elapsedMinutes >= 7 then spawnCoins(GetRandomInt(4,5)) end
    end)
end

-- ============================================================
-- ENEMY SPAWNING
-- 0-3 min:  4 spi1 every 4s, 15s life
-- 3-7 min:  6 spi2 every 4s, 12s life
-- 7-10 min: 8 spi3 every 4s, 10s life
-- ============================================================
local function initEnemySpawning()
    TimerStart(CreateTimer(), 60, true, function()
        elapsedMinutes = elapsedMinutes + 1
    end)

    TimerStart(CreateTimer(), 4, true, function()
        local uid, count, life
        if elapsedMinutes >= 7 then
            uid = FourCC('spi3') ; count = 8 ; life = 10
        elseif elapsedMinutes >= 3 then
            uid = FourCC('spi2') ; count = 6 ; life = 12
        else
            uid = FourCC('spi1') ; count = 4 ; life = 15
        end

        local zone = randomZone()
        for _ = 1, count do
            local u = CreateUnit(Player(22), uid, randX(zone), randY(zone), 0)
            UnitApplyTimedLife(u, FourCC('BTLF'), life)
            IssuePointOrder(u, "patrol", randX(gg_rct_GameArea), randY(gg_rct_GameArea))
        end
    end)
end

-- ============================================================
-- PHASE SPIRITS  (random flicker spirits, 1s life, all over map)
-- ============================================================
local function initPhaseSpirits()
    local spirits = { FourCC('spi1'), FourCC('spi2'), FourCC('spi3') }

    local function spawnPhase()
        local uid = spirits[GetRandomInt(1, 3)]
        local u = CreateUnit(Player(22), uid,
            randX(gg_rct_GameArea), randY(gg_rct_GameArea), 0)
        UnitApplyTimedLife(u, FourCC('BTLF'), 1)

        -- Schedule next phase spirit at a random interval 0.5-2s
        TimerStart(CreateTimer(), GetRandomReal(0.5, 2.0), false, spawnPhase)
    end

    -- Kick off the chain after a short initial delay
    TimerStart(CreateTimer(), 1.0, false, spawnPhase)
end

-- ============================================================
-- DEATH & RESPAWN
-- ============================================================
local function initDeathRespawn()
    local t = CreateTrigger()
    TriggerRegisterAnyUnitEventBJ(t, EVENT_PLAYER_UNIT_DEATH)
    TriggerAddAction(t, function()
        local u = GetTriggerUnit()
        local p = GetOwningPlayer(u)
        local i = GetPlayerId(p)

        if i < 0 or i > 6 then return end
        if not isPlaying(p) then return end
        if eliminated[i] then return end

        local gold = GetPlayerState(p, PLAYER_STATE_RESOURCE_GOLD)
        local name = GetPlayerName(p)
        local sx   = GetRectCenterX(gg_rct_PlayerSpawn)
        local sy   = GetRectCenterY(gg_rct_PlayerSpawn)

        if gold == 0 then
            eliminated[i] = true
            DisplayTextToForce(GetPlayersAll(),
                "|cffff0000" .. name .. " eliminated!|r")
        else
            subtractGold(p, 100)
            DisplayTextToForce(GetPlayersAll(),
                "|cffff8800" .. name .. " has fallen! (-100 gold)|r")
            respawning[i] = true
            TimerStart(CreateTimer(), 10, false, function()
                respawning[i] = false
                ReviveHero(u, sx, sy, true)
            end)
        end

        TimerStart(CreateTimer(), 0.5, false, function()
            if countAlive() <= 1 and not gameEnded then endGame() end
        end)
    end)
end

-- ============================================================
-- GAME TIMER  (10 minutes)
-- ============================================================
local function initGameTimer()
    local t = CreateTimer()
    TimerStart(t, 600, false, function() endGame() end)
    local td = CreateTimerDialog(t)
    TimerDialogSetTitle(td, "Game Ends")
    TimerDialogDisplay(td, true)
end

-- ============================================================
-- TORAH QUOTES  (random quote every 15s during gameplay)
-- ============================================================
local torahQuotes = {
    "\"Love your neighbor as yourself.\" — Leviticus 19:18",
    "\"Choose life, that you and your offspring may live.\" — Deuteronomy 30:19",
    "\"Hear O Israel, God is our Lord, God is One.\" — Deuteronomy 6:4",
    "\"Do not stand idly by the blood of your neighbor.\" — Leviticus 19:16",
    "\"Do not oppress the stranger, for you were strangers in Egypt.\" — Exodus 23:9",
    "\"A righteous man falls seven times and gets up.\" — Proverbs 24:16",
    "\"If I am not for myself, who will be for me? And if not now, when?\" — Hillel, Ethics of the Fathers 1:14",
    "\"Who is wise? One who learns from every person.\" — Ben Zoma, Ethics of the Fathers 4:1",
    "\"Who is strong? One who controls their own impulses.\" — Ben Zoma, Ethics of the Fathers 4:1",
    "\"Who is rich? One who is satisfied with their lot.\" — Ben Zoma, Ethics of the Fathers 4:1",
    "\"It is not upon you to complete the work, but you are not free to desist from it.\" — Pirkei Avot 2:21",
    "\"The world stands on three things: Torah, prayer, and acts of kindness.\" — Pirkei Avot 1:2",
    "\"Do not separate yourself from the community.\" — Pirkei Avot 2:5",
    "\"A fence for wisdom is silence.\" — Pirkei Avot 3:17",
    "\"According to the effort is the reward.\" — Ethics of the Fathers 5:26",
    "\"In the beginning, God created the heavens and the earth.\" — Genesis 1:1",
    "\"Remember the Sabbath day, to keep it holy.\" — Exodus 20:8",
    "\"Love the stranger, for you were strangers in the land of Egypt.\" — Deuteronomy 10:19",
    "\"You shall not take vengeance or bear a grudge. Love your neighbor as yourself.\" — Leviticus 19:18",
    "\"The soul of man is the lamp of the Lord.\" — Proverbs 20:27",
    "\"Justice, justice shall you pursue.\" — Deuteronomy 16:20",
    "\"You shall love the Lord your God with all your heart, soul, and might.\" — Deuteronomy 6:5",
    "\"Justice shall flow like water, and righteousness like a mighty stream.\" — Amos 5:24",
    "\"If you do well, shall you not be lifted up?\" — Genesis 4:7",
    "\"I have put before you life and death, blessing and curse — therefore choose life.\" — Deuteronomy 30:19",
}

local function initTorahQuotes()
    local lastIndex = 0
    TimerStart(CreateTimer(), 15, true, function()
        local idx
        repeat
            idx = GetRandomInt(1, #torahQuotes)
        until idx ~= lastIndex
        lastIndex = idx
        DisplayTextToForce(GetPlayersAll(),
            "|cffadd8e6" .. torahQuotes[idx] .. "|r")
    end)
end

-- ============================================================
-- CHAT COMMAND: -shekels
-- ============================================================
local function initShekelCommand()
    local t = CreateTrigger()
    for i = 0, 6 do
        TriggerRegisterPlayerChatEvent(t, Player(i), "-shekels", true)
    end
    TriggerAddAction(t, function()
        local msg = "|cffd4af37-- Shekels --"
        for i = 0, 6 do
            local p = Player(i)
            if isPlaying(p) then
                msg = msg .. "\n" .. GetPlayerName(p) .. ": " .. tostring(coinsPickedUp[i] or 0) .. " coins"
            end
        end
        msg = msg .. "|r"
        DisplayTextToForce(GetPlayersAll(), msg)
    end)
end

-- ============================================================
-- START ALL SYSTEMS
-- ============================================================
local function startGameSystems()
    if gameStarted then return end
    gameStarted = true

    initPassiveGold()
    initXpTrickle()
    initBookSpawning()
    initShekelCommand()
    initTorahQuotes()
    initCoinSpawning()
    initEnemySpawning()
    initPhaseSpirits()
    initDeathRespawn()
    initGameTimer()
end

-- ============================================================
-- SPAWN PALADINS + LOCK CAMERAS
-- ============================================================
local function spawnAllPlayers()
    local sx = GetRectCenterX(gg_rct_PlayerSpawn)
    local sy = GetRectCenterY(gg_rct_PlayerSpawn)
    for i = 0, 6 do
        local p = Player(i)
        if isPlaying(p) then
            local hero = CreateUnit(p, FourCC('Hpal'), sx, sy, 270)
            heroRef[i] = hero
            if GetLocalPlayer() == p then
                SetCameraTargetController(hero, 0, 0, false)
            end
        end
    end
    startGameSystems()
end

-- ============================================================
-- CINEMATIC INTRO
-- South edge → center pan over 8s with staggered text
-- ============================================================
local function playIntro()
    local bounds  = GetWorldBounds()
    local southY  = GetRectMinY(bounds)
    local centerX = GetRectCenterX(gg_rct_PlayerSpawn)
    local centerY = GetRectCenterY(gg_rct_PlayerSpawn)

    CinematicModeBJ(true, GetPlayersAll())

    if GetLocalPlayer() ~= nil then
        SetCameraPosition(centerX, southY)
        PanCameraToTimed(centerX, centerY, 14)
    end

    TimerStart(CreateTimer(), 2, false, function()
        DisplayTextToForce(GetPlayersAll(),
            "|cffd4af37Collect gold coins scattered across the map.|r")
    end)
    TimerStart(CreateTimer(), 5, false, function()
        DisplayTextToForce(GetPlayersAll(),
            "|cffd4af37Spirits are ethereal — they won't attack, but touching one deals damage.|r")
    end)
    TimerStart(CreateTimer(), 8, false, function()
        DisplayTextToForce(GetPlayersAll(),
            "|cffd4af37If you die, you lose 100 gold and respawn after 10 seconds.|r")
    end)
    TimerStart(CreateTimer(), 11, false, function()
        DisplayTextToForce(GetPlayersAll(),
            "|cffd4af37Last player standing wins instantly — or survive the full 10 minutes.|r")
    end)
    TimerStart(CreateTimer(), 13, false, function()
        DisplayTextToForce(GetPlayersAll(),
            "|cffd4af37Most coins collected when time runs out wins.|r")
    end)
    TimerStart(CreateTimer(), 15, false, function()
        DisplayTextToForce(GetPlayersAll(),
            "|cffd4af37Type -shekels at any time to see the current coin standings.|r")
    end)

    TimerStart(CreateTimer(), 16.5, false, function()
        CinematicModeBJ(false, GetPlayersAll())
        spawnAllPlayers()
    end)
end

-- ============================================================
-- INIT GAME
-- ============================================================
function InitGame()
    -- Set alliances: spirits (P23) are enemy to all human players
    for i = 0, 6 do
        local p = Player(i)
        SetPlayerAlliance(Player(22), p, ALLIANCE_PASSIVE, false)
        SetPlayerAlliance(p, Player(22), ALLIANCE_PASSIVE, false)
    end

    TimerStart(CreateTimer(), 0.5, false, function()
        playIntro()
    end)
end
