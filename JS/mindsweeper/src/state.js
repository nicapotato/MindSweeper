// ========== MIND GAME - CORE INTERACTIONS MODULE ==========
// ========== PLAYER STATS (moved to player-system.js) ==========
let playerLevel = 1;
let playerHealth = 0;
let playerMaxHealth = 0;
let playerExp = 0;
let playerMaxExp = 5;

// Crystal pattern system (uses object structure defined later in file)
const CRYSTAL_PATTERN_CORRECT = ['red', 'blue', 'yellow', 'green'];

// ========== FUNCTIONS THAT REMAIN IN MAIN GAME ==========
// These are the interaction and special effects functions that haven't been modularized yet

let currentBoard = []; // Store the processed board with full tile data
let gameState = []; // Store the current game state for each tile
let spriteSheets = {}; // Object to store multiple sprite sheets
let spriteStrips = {}; // Object to store multiple sprite strips
let entityCounts = {}; // Track counts of each entity type
let useSpriteMode = true; // Toggle between sprite mode and text mode
let activePopover = null; // Track the active popover element
let totalSolutions = 0; // Track the total number of available solutions
let settingsPopoverVisible = false; // Track if settings popover is visible
let isAdminUser = false; // Track if current user is admin
let entitiesPopoverVisible = false; // Track if entities popover is visible.
let howToPlayPopoverVisible = false; // Track if How to Play popover is visible
let allSolutions = []; // Store all solutions to avoid repeated HTTP calls
let tilesInAnimation = {}; // Track tiles currently in animation to prevent multiple clicks
let tileVariations = {}; // Store tile variations for each position
let dyingAnimations = {}; // Track dying animation state for each tile
let spyglassRevealedAreas = []; // Track 3x3 areas revealed by spyglasses to avoid overlaps
let crystalSpriteVariations = {}; // Store persistent sprite variations for each crystal

// Achievement system
let gameStartTime = null; // Track when the current map started
let achievementsEarned = []; // Track achievements earned this session
let firefliesKilled = 0; // Track fireflies killed for pacifist achievement

// Reset game-specific tracking
function resetGameTracking() {
    gameStartTime = Date.now();
    achievementsEarned = [];
    firefliesKilled = 0;
    crystalSpriteVariations = {}; // Clear crystal sprite variations for new game
}

// Theme system
let currentTheme = null; // Will be set from config


// FIXED STATE
// Add new constants for sprite layers
const SPRITE_LAYER = {
    BASE: 0,
    VARIATION: 1,
    ENTITY: 2
};

// Add tile variation types with rotation angles
const TILE_VARIATIONS = [
    // First variation with different rotations and flips
    { x: 0, y: 1, spriteSheet: 'tiles', rotation: 0, flipX: false },
    { x: 0, y: 1, spriteSheet: 'tiles', rotation: 90, flipX: false },
    { x: 0, y: 1, spriteSheet: 'tiles', rotation: 180, flipX: false },
    { x: 0, y: 1, spriteSheet: 'tiles', rotation: 270, flipX: false },
    { x: 0, y: 1, spriteSheet: 'tiles', rotation: 0, flipX: true },
    { x: 0, y: 1, spriteSheet: 'tiles', rotation: 90, flipX: true },
    
    // Second variation with different rotations and flips
    { x: 1, y: 1, spriteSheet: 'tiles', rotation: 0, flipX: false },
    { x: 1, y: 1, spriteSheet: 'tiles', rotation: 90, flipX: false },
    { x: 1, y: 1, spriteSheet: 'tiles', rotation: 180, flipX: false },
    { x: 1, y: 1, spriteSheet: 'tiles', rotation: 270, flipX: false },
    { x: 1, y: 1, spriteSheet: 'tiles', rotation: 0, flipX: true },
    { x: 1, y: 1, spriteSheet: 'tiles', rotation: 180, flipX: true },
    
    // Third variation with different rotations and flips
    { x: 2, y: 1, spriteSheet: 'tiles', rotation: 0, flipX: false },
    { x: 2, y: 1, spriteSheet: 'tiles', rotation: 90, flipX: false },
    { x: 2, y: 1, spriteSheet: 'tiles', rotation: 180, flipX: false },
    { x: 2, y: 1, spriteSheet: 'tiles', rotation: 270, flipX: false },
    { x: 2, y: 1, spriteSheet: 'tiles', rotation: 0, flipX: true },
    { x: 2, y: 1, spriteSheet: 'tiles', rotation: 270, flipX: true }
];

// Threat level color for numbers
const THREAT_LEVEL_COLOR = '#FF3333';

// Audio settings
// Audio is now handled by the gameAudio module from audio.js

// Other Stats
const chest_experience_reward = 5

// Crystal pattern tracking
let crystalPattern = {
    colors: [], // Track the order of crystal colors clicked
    maxPatterns: 2, // Can complete pattern twice (2 crystals of each color)
    completedPatterns: 0 // Track how many patterns have been completed
};

// Player stats
let playerStats = {
    level: undefined,
    health: undefined,
    maxHealth:undefined, 
    experience: 0,
    expToNextLevel: undefined
};

// New Dual State System
// Visibility states - what player can see
const VISIBILITY_STATE = {
    HIDDEN: 'hidden',
    REVEALED: 'revealed',
};

// Content states - entity lifecycle
const CONTENT_STATE = {
    ALIVE: 'alive',        // Entity exists and functional
    DYING: 'dying',        // In death animation
    DEAD: 'dead',          // Defeated enemy
    CLAIMED: 'claimed',    // Used treasure
    TRIGGERED: 'triggered', // Triggered trap
    EMPTY: 'empty'         // Nothing here
};

// Tile state tracking
let tileVisibility = []; // 2D array of VISIBILITY_STATE values
let tileContent = [];    // 2D array of CONTENT_STATE values
let tileCurrentEntity = []; // 2D array of current entity IDs
let tileTransitionedToEmpty = []; // 2D array tracking which tiles became empty through transitions

// Legacy compatibility (keep for gradual migration)
const TILE_STATE = {
    HIDDEN: 'hidden',
    REVEALED: 'revealed',
    DEAD: 'dead',
    DYING: 'dying',
    CLAIMED: 'claimed',
    CLEARED: 'cleared',
    FLAGGED: 'flagged',
    DROPPED_ITEM: 'dropped_item',
    CHEST_DROPPED_ITEM: 'chest_dropped_item',
    CRYSTAL_PATTERN_REWARD: 'crystal_pattern_reward',
    INDESTRUCTIBLE: 'indestructible'
};

// Annotation system for hidden tiles
let tileAnnotations = {}; // Store annotations for each tile in format "row,col": "annotation"

// Global animation state for death skull
let deathSkullAnimation = {
    frame: 0,
    startTime: 0,
    isAnimating: false
};

// ========== NEW DUAL STATE MANAGEMENT FUNCTIONS ==========

function initializeGameStates(rows, cols) {
    tileVisibility = Array(rows).fill().map(() => Array(cols).fill(VISIBILITY_STATE.HIDDEN));
    tileContent = Array(rows).fill().map(() => Array(cols).fill(CONTENT_STATE.ALIVE));
    tileCurrentEntity = Array(rows).fill().map(() => Array(cols).fill(null));
    tileTransitionedToEmpty = Array(rows).fill().map(() => Array(cols).fill(false));
    
    // Initialize current entities from board and set appropriate content states
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (currentBoard && currentBoard[r] && currentBoard[r][c]) {
                tileCurrentEntity[r][c] = currentBoard[r][c].id;
                if (currentBoard[r][c].symbol === '.') {
                    tileContent[r][c] = CONTENT_STATE.EMPTY;
                    // Natural empty tiles are NOT marked as transitioned
                    tileTransitionedToEmpty[r][c] = false;
                }
            }
        }
    }
    
    console.log(`Initialized dual state system: ${rows}x${cols} grid`);
}

function getVisibility(row, col) {
    return tileVisibility[row]?.[col] || VISIBILITY_STATE.HIDDEN;
}

function getContent(row, col) {
    return tileContent[row]?.[col] || CONTENT_STATE.ALIVE;
}

function setVisibility(row, col, state) {
    if (tileVisibility[row]) {
        tileVisibility[row][col] = state;
    }
}

function setContent(row, col, state) {
    if (tileContent[row]) {
        tileContent[row][col] = state;
    }
}

function getCurrentEntity(row, col) {
    if (!tileCurrentEntity[row] || !entityManager) return null;
    const entityId = tileCurrentEntity[row][col];
    return entityManager.getEntity(entityId);
}

function transformEntity(row, col, newEntityId) {
    if (tileCurrentEntity[row]) {
        tileCurrentEntity[row][col] = newEntityId;
        console.log(`Transformed tile [${row}, ${col}] to entity ${newEntityId}`);
    }
}

function revealTile(row, col) {
    setVisibility(row, col, VISIBILITY_STATE.REVEALED);
}

// Helper function to check if content state means the tile is "cleared"
function isContentCleared(state, row = null, col = null) {
    // Check basic cleared states
    if ([CONTENT_STATE.DEAD, CONTENT_STATE.CLAIMED, CONTENT_STATE.TRIGGERED].includes(state)) {
        return true;
    }
    
    // For EMPTY state, only consider it cleared if it was transformed from another entity
    if (state === CONTENT_STATE.EMPTY && row !== null && col !== null) {
        return tileTransitionedToEmpty[row]?.[col] === true;
    }
    
    return false;
}