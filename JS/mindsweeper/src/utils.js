// Format time for display
function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${remainingSeconds}s`;
    }
}

// Get elapsed time since game start
function getElapsedTime() {
    if (!gameStartTime) return 0;
    return Date.now() - gameStartTime;
}

// Function to get a random solution index
function getRandomSolutionIndex(maxIndex) {
    return Math.floor(Math.random() * maxIndex);
}

// Function to get a random solution index excluding completed caves
function getRandomUncompletedSolutionIndex(maxIndex) {
    const completedCaves = loadCompletedCaves();
    const completedCaveNumbers = completedCaves.map(cave => cave.caveNumber);
    const availableCaves = [];
    
    // Build list of uncompleted caves
    for (let i = 0; i < maxIndex; i++) {
        if (!completedCaveNumbers.includes(i)) {
            availableCaves.push(i);
        }
    }
    
    // If all caves are completed, return a random cave anyway
    if (availableCaves.length === 0) {
        console.log('All caves completed! Selecting from all caves.');
        return getRandomSolutionIndex(maxIndex);
    }
    
    // Select random uncompleted cave
    const randomIndex = Math.floor(Math.random() * availableCaves.length);
    return availableCaves[randomIndex];
}

// Function to get player sprite coordinates based on level
function getPlayerSpriteCoords(level) {
    if (level >= 1 && level <= 5) {
        return { x: 0, y: 5 };
    } else if (level >= 6 && level <= 10) {
        return { x: 1, y: 5 };
    } else if (level >= 11 && level <= 17) {
        return { x: 2, y: 5 };
    } else { // 17+
        return { x: 3, y: 5 };
    }
}

// ========== THEME AND ENTITY FUNCTIONS (delegated to theme-manager.js) ==========

// ========== THEME AND ENTITY FUNCTIONS ==========
// YOUR CODE IS THE ONLY FUTURE: No backwards compatibility, themeManager MUST exist

function getEntityDisplayData(entityKey) {
    assert(window.themeManager, 'themeManager MUST be initialized - old tile_types system deprecated');
    return window.themeManager.getEntityDisplayData(entityKey);
}

function getEntityKeyFromTileData(tileData) {
    assert(window.themeManager, 'themeManager MUST be initialized - old entity_key system deprecated');
    assert(tileData, 'tileData MUST be provided');
    return window.themeManager.getEntityKeyFromTileData(tileData);
}

function getThemedEntityLevel(tileData) {
    assert(window.themeManager, 'themeManager MUST be initialized - old level fallback system deprecated');
    assert(tileData, 'tileData MUST be provided');
    return window.themeManager.getThemedEntityLevel(tileData);
}

async function switchTheme(themeName) {
    assert(window.themeManager, 'themeManager MUST be initialized for theme switching');
    assert(themeName, 'themeName MUST be provided');
    return window.themeManager.switchTheme(themeName);
}

function loadSpriteSheets() {
    assert(window.themeManager, 'themeManager MUST be initialized for sprite loading');
    return window.themeManager.loadSpriteSheets();
}

function drawLayeredSprite(canvas, layers) {
    assert(window.themeManager, 'themeManager MUST be initialized for sprite rendering');
    assert(canvas, 'canvas MUST be provided');
    assert(layers, 'layers MUST be provided');
    return window.themeManager.drawLayeredSprite(canvas, layers);
}

// ========== RIGHT CLICK HANDLING ==========

function handleRightClick(event) {
    event.preventDefault();
    
    const cell = event.currentTarget;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
         const tileData = JSON.parse(cell.dataset.tileData);
     
     console.log(`Right-clicked tile at [${row}, ${col}]:`, tileData);
     
     // Show annotation popover
     showAnnotationPopover(cell, row, col, event);
 }

// Function to safely get the healing amount from config
function getHealAmount() {
    return gameConfig.game_state.treasure_heal_amount || 8;
}