// ========== TILE LOGIC MODULE ==========
// This module contains all tile-related logic extracted from mind-game.js

// ========== TILE STATE AND DATA UTILITIES ==========

function isEnemy(tileData) {
    return tileData.tags && tileData.tags.includes('enemy');
}

function isTreasure(tileData) {
    return tileData.tags && tileData.tags.includes('treasure');
}

function isNeutral(tileData) {
    return tileData && tileData.tags && tileData.tags.includes('onReveal-neutral');
}

function isHostile(tileData) {
    return tileData && tileData.tags && tileData.tags.includes('onReveal-hostile');
}

// ========== NEW BEHAVIOR TAG SYSTEM ==========

function hasTag(tileData, tag) {
    return tileData && tileData.tags && tileData.tags.includes(tag);
}

function hasWinTrigger(tileData) {
    return hasTag(tileData, 'trigger-win-game');
}

function getHiddenClickBehavior(tileData) {
    if (!tileData?.tags) return 'reveal';
    
    if (tileData.tags.includes('hidden-click-fight')) return 'fight';
    if (tileData.tags.includes('hidden-click-reveal')) return 'reveal';
    
    // Backward compatibility
    if (tileData.tags.includes('onReveal-hostile')) return 'fight';
    if (tileData.tags.includes('onReveal-neutral')) return 'reveal';
    
    return 'reveal'; // Default
}

function getRevealedClickBehavior(tileData) {
    if (!tileData?.tags) return 'claim';
    
    // Special cases: Entities that should not be clickable
    if (tileData.tags.includes('empty')) return 'none';
    if (tileData.tags.includes('indestructible')) return 'none';
    
    if (tileData.tags.includes('revealed-click-fight')) return 'fight';
    if (tileData.tags.includes('revealed-click-claim')) return 'claim';
    if (tileData.tags.includes('revealed-click-trigger')) return 'trigger';
    
    // Backward compatibility for current entities
    if (isEnemy(tileData)) return 'fight';
    if (isTreasure(tileData)) return 'claim';
    if (isVineTrap(tileData)) return 'trigger';
    
    return 'claim'; // Default
}

function canTransitionContent(tileData, fromState, toState) {
    const transitionKey = `${fromState}_TO_${toState}`;
    return tileData?.content_transitions?.includes(transitionKey) || false;
}

function hasNoExperience(tileData) {
    return tileData.tags && tileData.tags.includes('no-experience');
}

function hasRevealAllTag(tileData, tagName) {
    return tileData.tags && tileData.tags.includes(tagName);
}

function canWeakenAllMines(tileData) {
    // Check for the tag (v2.0 format)
    return hasRevealAllTag(tileData, 'trigger-E7-weakening');
}

function canRevealAllRats(tileData) {
    // Check for the tag (v2.0 format)
    return hasRevealAllTag(tileData, 'trigger-E1-reveal');
}

function isRat(tileData) {
    return tileData.tags && tileData.tags.includes('E1') || tileData.name === "Rat";
}

function isVineTrap(tileData) {
    return tileData && (getEntityKeyFromTileData(tileData) === "TR1" || (tileData.tags && tileData.tags.includes('trap')));
}

function isSkyglass(tileData) {
    if (!tileData) return false;
    
    // Check for various skyglass naming patterns (case-insensitive)
    const nameCheck = tileData.name && 
                     (tileData.name.toLowerCase().includes('skyglass') || 
                      tileData.name.toLowerCase().includes('spy glass') ||
                      tileData.name.toLowerCase().includes('telescope'));
    
    // Check for tags related to skyglass functionality
    const tagCheck = tileData.tags && 
                    (tileData.tags.includes('trigger-reveal-square-3x3-random') ||
                     tileData.tags.includes('skyglass') ||
                     tileData.tags.includes('eyeglass') ||
                     tileData.tags.includes('telescope') ||
                     tileData.tags.includes('reveal-area'));
    
    return nameCheck || tagCheck;
}

function isCrystal(tileData) {
    return tileData && (getEntityKeyFromTileData(tileData) === "Q1" || tileData.name === "Crystals");
}

// Function to check if a tile is a monolith (onyx or spectral)
function isMonolith(tileData) {
    return tileData && (getEntityKeyFromTileData(tileData) === "TR2" || tileData.name === "Onyx Monolith");
}

// Function to check if a tile has the indestructible tag
function isIndestructible(tileData) {
    return tileData && tileData.tags && tileData.tags.includes('indestructible');
}

// Function to check if a tile is a spectral monolith (transformed)
function isSpectralMonolith(tileData) {
    return isMonolith(tileData) && !isIndestructible(tileData);
}

// ========== TILE COORDINATES AND SPRITES ==========

function getTileCoordinates(state) {
    switch(state) {
        case TILE_STATE.HIDDEN:
            return { x: 0, y: 0, spriteSheet: 'tiles' };
        case TILE_STATE.REVEALED:
            return { x: 1, y: 0, spriteSheet: 'tiles' };
        case TILE_STATE.CLEARED:
        case TILE_STATE.DEAD:
        case TILE_STATE.CLAIMED:
            return { x: 3, y: 0, spriteSheet: 'tiles' };
        default:
            return { x: 3, y: 0, spriteSheet: 'tiles' };
    }
}

// Get sprite coordinates for a specific tile and state
function getSpriteCoordinates(tileData, state) {
    // Default sprites for states
    const defaultSprites = {
        hidden: gameConfig.sprite_settings.default_hidden_sprite,
        flagged: gameConfig.sprite_settings.default_flag_sprite
    };
    
    // Check if tile has sprites for this state
    if (tileData && tileData.sprites && tileData.sprites[state]) {
        // Ensure we use spriteSheet instead of sprite_sheet for consistency
        const spriteData = tileData.sprites[state];
        if (spriteData.sprite_sheet && !spriteData.spriteSheet) {
            spriteData.spriteSheet = spriteData.sprite_sheet;
        }
        return spriteData;
    }
    
    // Fall back to default sprites
    if (defaultSprites[state]) {
        return defaultSprites[state];
    }
    
    // If no sprite is found, return a default
    return { x: 0, y: 0 };
}

// Function to determine which quadrant a crystal is in and return the appropriate color
function getCrystalColorByQuadrant(row, col) {
    if (currentBoard.length === 0) return 'red'; // Default fallback
    
    const rows = currentBoard.length;
    const cols = currentBoard[0].length;
    
    // Calculate dynamic quadrant boundaries (same logic as Python)
    const midRow = Math.floor(rows / 2);
    const midCol = Math.floor(cols / 2);
    
    let color = 'red'; // Default
    let quadrant = 'Q1';
    
    // Determine which quadrant the crystal is in
    if (row < midRow && col < midCol) {
        color = 'red';    // Top-left (Q1)
        quadrant = 'Q1 (Top-left)';
    } else if (row < midRow && col >= midCol) {
        color = 'blue';   // Top-right (Q2)
        quadrant = 'Q2 (Top-right)';
    } else if (row >= midRow && col < midCol) {
        color = 'yellow'; // Bottom-left (Q3)
        quadrant = 'Q3 (Bottom-left)';
    } else {
        color = 'green';  // Bottom-right (Q4)
        quadrant = 'Q4 (Bottom-right)';
    }
    
    return color;
}

// Function to get crystal sprite coordinates based on quadrant
function getCrystalSpriteCoordinates(tileData, row, col, state = 'revealed') {
    if (!isCrystal(tileData)) {
        return getSpriteCoordinates(tileData, state);
    }
    
    if (state === 'claimed') {
        // Use the standard claimed sprite for all crystals
        const claimedSprite = getSpriteCoordinates(tileData, 'claimed');
        // Ensure we're using the correct sprite sheet for claimed crystals
        if (!claimedSprite.spriteSheet) {
            claimedSprite.spriteSheet = 'new_sprites';
        }
        return claimedSprite;
    }
    
    // For revealed state, use quadrant-specific color
    const color = getCrystalColorByQuadrant(row, col);
    
    // Check if the tile has the colored sprite defined
    if (tileData.sprites && tileData.sprites[color]) {
        const spriteCoords = { ...tileData.sprites[color] };
        
        // Create a unique key for this crystal position
        const crystalKey = `${row}-${col}-${color}`;
        
        // Randomly select from the 4 variations if x is an array, but store it persistently
        if (Array.isArray(spriteCoords.x) && spriteCoords.x.length > 0) {
            // Check if we already have a stored variation for this crystal
            if (crystalSpriteVariations[crystalKey] === undefined) {
                // First time selecting, choose randomly and store it
                crystalSpriteVariations[crystalKey] = Math.floor(Math.random() * spriteCoords.x.length);
            }
            // Use the stored variation
            spriteCoords.x = spriteCoords.x[crystalSpriteVariations[crystalKey]];
        }
        
        // Ensure we're using the correct sprite sheet - handle both naming conventions
        spriteCoords.spriteSheet = spriteCoords.sprite_sheet || 'new_sprites';
        console.log(`Crystal at (${row}, ${col}) using ${color} sprite variation ${spriteCoords.x}:`, spriteCoords);
        return spriteCoords;
    }
    
    // Fallback to standard revealed sprite
    return getSpriteCoordinates(tileData, 'revealed');
}

// Assign random variations to tiles
function initializeTileVariations() {
    tileVariations = {};
    
    // Create a variation for each tile position with a 50% chance (increased from 40%)
    for (let r = 0; r < currentBoard.length; r++) {
        for (let c = 0; c < currentBoard[r].length; c++) {
            if (Math.random() < 0.5) {
                const variationIndex = Math.floor(Math.random() * TILE_VARIATIONS.length);
                tileVariations[`${r},${c}`] = TILE_VARIATIONS[variationIndex];
            }
        }
    }
}

// Get variation for a specific tile position
function getTileVariation(row, col) {
    return tileVariations[`${row},${col}`];
}

// ========== TILE ANIMATION FUNCTIONS ==========

function getDyingFrame(row, col) {
    // Get the animation state for this tile
    const dyingState = dyingAnimations[`${row},${col}`];
    if (!dyingState) {
        return 0; // Default to first frame
    }
    
    // Return the appropriate frame based on animation progress
    return Math.floor(dyingState.frame);
}

// Function to draw text on a canvas
function drawTextOnCanvas(canvas, text, color) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Store original canvas styles to maintain consistent display size
    const originalStyle = {
        width: canvas.style.width,
        height: canvas.style.height
    };
    
    // Reset canvas size to default (avoid compounding size issues)
    canvas.width = gameConfig.sprite_settings.cell_width || 16;
    canvas.height = gameConfig.sprite_settings.cell_height || 16;
    
    // Create high resolution canvas with higher scale for smoother text
    const scale = 4; // Increased from 2 to 4 for better quality
    const displayWidth = canvas.width;
    const displayHeight = canvas.height;
    canvas.width = displayWidth * scale;
    canvas.height = displayHeight * scale;
    
    // Ensure display size remains constant regardless of resolution
    canvas.style.width = originalStyle.width || '100%';
    canvas.style.height = originalStyle.height || '100%';
    
    // Scale the context to match the increased resolution
    ctx.scale(scale, scale);
    
    // Ensure the entire canvas is filled with background color
    clearCanvas(canvas);
    
    // Remove pixelation for text rendering
    canvas.classList.add('text-canvas');
    
    // Use a consistent font size that works for up to 3 digits
    const fontSize = 8;
    
    // Improved text rendering settings
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Enable text anti-aliasing with best quality settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Add margin by drawing text in a slightly smaller area
    const marginPercentage = 0.15; // 15% margin
    const effectiveWidth = displayWidth * (1 - 2 * marginPercentage);
    const effectiveHeight = displayHeight * (1 - 2 * marginPercentage);
    
    // Draw black stroke outline first with proportional line width
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8; // Reduced and made proportional to higher scale
    ctx.lineJoin = 'round'; // Smoother joins
    ctx.lineCap = 'round'; // Smoother caps
    ctx.strokeText(text, displayWidth / 2, displayHeight / 2, effectiveWidth);
    
    // Draw the filled text on top
    ctx.fillStyle = color;
    ctx.fillText(text, displayWidth / 2, displayHeight / 2, effectiveWidth);
    
    // Reset the scale to prevent affecting other drawing operations
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawEmptyTileWithThreat(canvas, threatLevel) {
    clearCanvas(canvas);
    
    // Only draw threat level if it's greater than 0
    if (threatLevel > 0) {
        // Use a cleaner style for threat numbers with improved visibility
        drawTextOnCanvas(canvas, threatLevel.toString(), THREAT_LEVEL_COLOR);
    }
}

// ========== TILE UTILITY FUNCTIONS ==========

// Sum the levels of alive (not dead) enemies in neighboring tiles
function sumNeighboringEnemyLevels(row, col) {
    let totalLevel = 0;
    
    // Define directions (including diagonals)
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dr, dc] of directions) {
        const r = row + dr;
        const c = col + dc;
        
        // Check if within grid bounds
        if (r >= 0 && r < currentBoard.length && c >= 0 && c < currentBoard[0].length) {
            // Get the current entity (which reflects any transformations)
            const neighborEntity = getCurrentEntity(r, c);
            const neighborContent = getContent(r, c);
            
            if (neighborEntity && isEnemy(neighborEntity) && neighborContent === CONTENT_STATE.ALIVE) {
                totalLevel += getThemedEntityLevel(neighborEntity); // Use themed level from current entity
            }
        }
    }
    
    return totalLevel;
}

// ========== TILE ANNOTATION FUNCTIONS ==========

function setTileAnnotation(row, col, annotation) {
    const key = `${row},${col}`;
    tileAnnotations[key] = annotation;
}

// Remove annotation from a tile
function removeTileAnnotation(row, col) {
    const key = `${row},${col}`;
    if (tileAnnotations[key]) {
        delete tileAnnotations[key];
    }
}

// Get annotation for a tile (if any)
function getTileAnnotation(row, col) {
    const key = `${row},${col}`;
    return tileAnnotations[key] || null;
}

// Function to draw annotation on canvas
function drawAnnotationOnCanvas(canvas, annotation) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Store original canvas styles to maintain consistent display size
    const originalStyle = {
        width: canvas.style.width,
        height: canvas.style.height
    };
    
    // Reset canvas size to default (avoid compounding size issues)
    canvas.width = gameConfig.sprite_settings.cell_width || 16;
    canvas.height = gameConfig.sprite_settings.cell_height || 16;
    
    // Create high resolution canvas
    const scale = 2; // Double the resolution
    const displayWidth = canvas.width;
    const displayHeight = canvas.height;
    canvas.width = displayWidth * scale;
    canvas.height = displayHeight * scale;
    
    // Ensure display size remains constant regardless of resolution
    canvas.style.width = originalStyle.width;
    canvas.style.height = originalStyle.height;
    
    // Scale the context to match the increased resolution
    ctx.scale(scale, scale);
    
    // Remove pixelation for text rendering
    canvas.classList.add('text-canvas');
    
    // If we're not replacing the background, just overlay text
    if (useSpriteMode) {
        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, displayWidth, displayHeight);
    } else {
        // Clear canvas for text-only mode
        clearCanvas(canvas);
    }
    
    // Draw annotation text
    let color = '#FFFFFF'; // Default white
    
    // Use different colors for different types of annotations
    if (annotation === '*') {
        color = '#FF5555'; // Red for asterisk/bombs
    } else if (annotation === 'F') {
        color = '#4CAF50'; // Green for friendly
    } else if (!isNaN(parseInt(annotation))) {
        color = '#55AAFF'; // Blue for numbers
    }
    
    // Use a consistent font size that works for up to 3 digits
    const fontSize = 8;
    
    // Draw with improved text rendering
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Add margin by drawing text in a slightly smaller area
    const marginPercentage = 0.15; // 15% margin
    const effectiveWidth = displayWidth * (1 - 2 * marginPercentage);
    const effectiveHeight = displayHeight * (1 - 2 * marginPercentage);
    
    ctx.fillText(annotation, displayWidth / 2, displayHeight / 2, effectiveWidth);
    
    // Reset the scale to prevent affecting other drawing operations
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ========== TILE REVEAL FUNCTIONS ==========

// Function to reveal a specific tile by row and column
function revealTile(row, col) {
    // Assert valid boundaries - fail loud if coordinates are invalid
    assertGameState(gameState);
    assertArrayBounds(gameState, row, 'gameState rows');
    assertArrayBounds(gameState[row], col, 'gameState columns');
    
    // Skip if already revealed
    if (gameState[row][col] !== TILE_STATE.HIDDEN) {
        return;
    }
    
    // Get the tile data
    const tileData = currentBoard[row][col];
    
    // If this is an empty tile, mark it as cleared instead of just revealed
    if (tileData.symbol === '.') {
        gameState[row][col] = TILE_STATE.CLEARED;
    } else {
        // For other tiles, set state to revealed
        gameState[row][col] = TILE_STATE.REVEALED;
    }
    
    // Update the UI
    updateGameBoard();
    
    // Mark skyglass tiles as interactive by adding a CSS class
    if (isSkyglass(tileData)) {
        setTimeout(() => {
            const cell = document.querySelector(`#game-board td[data-row="${row}"][data-col="${col}"]`);
            if (cell && gameState[row][col] === TILE_STATE.REVEALED) {
                console.log(`Adding interactive class to Skyglass revealed at [${row}, ${col}]`);
                cell.classList.add('skyglass-interactive');
            }
        }, 200);
    }
}

// Function to reveal the middle 4 squares
function revealMiddleSquares() {
    if (currentBoard.length === 0) return;
    
    const rows = currentBoard.length;
    const cols = currentBoard[0].length;
    
    // Calculate the middle positions
    const midRow = Math.floor(rows / 2);
    const midCol = Math.floor(cols / 2);
    
    // Reveal the middle 4 squares
    revealTile(midRow - 1, midCol - 1);    // Top-left of middle 4
    revealTile(midRow - 1, midCol);        // Top-right of middle 4
    revealTile(midRow, midCol - 1);        // Bottom-left of middle 4
    revealTile(midRow, midCol);            // Bottom-right of middle 4
    
    console.log("Revealed middle 4 squares");
}

// Function to reveal all tiles - UPDATED FOR DUAL STATE SYSTEM
function revealAllTiles() {
    console.log("Revealing all tiles using dual state system...");
    
    // Set all tiles to revealed visibility state
    for (let r = 0; r < tileVisibility.length; r++) {
        for (let c = 0; c < tileVisibility[r].length; c++) {
            setVisibility(r, c, VISIBILITY_STATE.REVEALED);
        }
    }
    
    // Also update legacy gameState for backward compatibility
    for (let r = 0; r < gameState.length; r++) {
        for (let c = 0; c < gameState[r].length; c++) {
            gameState[r][c] = TILE_STATE.REVEALED;
        }
    }
    
    // Update the UI
    updateGameBoard();
    console.log("Revealed all tiles.");
}

function hideAllTiles() {
    console.log("Hiding all tiles using dual state system...");
    
    // Set all tiles to hidden visibility state
    for (let r = 0; r < tileVisibility.length; r++) {
        for (let c = 0; c < tileVisibility[r].length; c++) {
            setVisibility(r, c, VISIBILITY_STATE.HIDDEN);
        }
    }
    
    // Also update legacy gameState for backward compatibility
    for (let r = 0; r < gameState.length; r++) {
        for (let c = 0; c < gameState[r].length; c++) {
            gameState[r][c] = TILE_STATE.HIDDEN;
        }
    }
    
    // Update the UI
    updateGameBoard();
    console.log("Hid all tiles.");
}

// Function to reveal a 3x3 grid around a center position
function reveal3x3Around(centerRow, centerCol) {
    if (currentBoard.length === 0) return [];
    
    const rows = currentBoard.length;
    const cols = currentBoard[0].length;
    
    console.log(`Revealing 3x3 square centered at [${centerRow}, ${centerCol}]`);
    
    // Store the tiles to be revealed
    const revealedTiles = [];
    
    // Reveal the 3x3 square (center tile plus 8 surrounding tiles)
    for (let r = Math.max(0, centerRow - 1); r <= Math.min(rows - 1, centerRow + 1); r++) {
        for (let c = Math.max(0, centerCol - 1); c <= Math.min(cols - 1, centerCol + 1); c++) {
            // Store the tile coordinates
            revealedTiles.push({row: r, col: c});
            
            // Reveal the tile regardless of its current state using dual state system
            const currentVisibility = getVisibility(r, c);
            if (currentVisibility === VISIBILITY_STATE.HIDDEN) {
                // For hidden tiles, trigger normal reveal logic
                setVisibility(r, c, VISIBILITY_STATE.REVEALED);
                console.log(`Revealed tile at [${r}, ${c}]`);
            } else {
                console.log(`Tile at [${r}, ${c}] was already revealed.`);
            }
            
            // Mark the tile as sighted with a distinct styling
            const cell = document.querySelector(`#game-board td[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.add('skyglass-sighted');
                
                // Force redraw the tile without variations
                const canvas = cell.querySelector('canvas');
                if (canvas) {
                    const tileData = currentBoard[r][c];
                    
                    if (tileData.symbol === '.') {
                        // Empty tiles - show base tile with threat level
                        const tileLayer = getTileCoordinates(TILE_STATE.REVEALED);
                        drawLayeredSprite(canvas, [tileLayer]);
                        
                        // Draw threat level if needed
                        const threatLevel = sumNeighboringEnemyLevels(r, c);
                        if (threatLevel > 0) {
                            drawTextOnCanvas(canvas, threatLevel.toString(), THREAT_LEVEL_COLOR);
                        }
                    } else if (useSpriteMode && (isEnemy(tileData) || isTreasure(tileData) || isVineTrap(tileData) || isSkyglass(tileData))) {
                        // Draw revealed entity with base tile (no variations)
                        const baseTile = getTileCoordinates(TILE_STATE.REVEALED);
                        const revealedSprite = getSpriteCoordinates(tileData, 'revealed');
                        drawLayeredSprite(canvas, [baseTile, undefined, revealedSprite]);
                    }
                }
                
                // Add a temporary highlight effect
                cell.style.boxShadow = '0 0 8px 2px #00ccff';
                setTimeout(() => {
                    cell.style.boxShadow = '';
                }, 2000); // Remove highlight after 2 seconds
            }
        }
    }
    
    console.log(`Revealed 3x3 square centered at [${centerRow}, ${centerCol}]`);
    return revealedTiles;
}

// Function to check if a 3x3 area overlaps with any previously revealed spyglass areas
function checkSpyglassAreaOverlap(centerRow, centerCol) {
    // Get the bounds of the proposed 3x3 area
    const minRow = Math.max(0, centerRow - 1);
    const maxRow = Math.min(currentBoard.length - 1, centerRow + 1);
    const minCol = Math.max(0, centerCol - 1);
    const maxCol = Math.min(currentBoard[0].length - 1, centerCol + 1);
    
    // Check each previously revealed spyglass area for overlap
    for (const area of spyglassRevealedAreas) {
        // Check if any part of the proposed area overlaps with the existing area
        if (!(maxRow < area.minRow || minRow > area.maxRow || 
              maxCol < area.minCol || minCol > area.maxCol)) {
            return true; // Overlap found
        }
    }
    
    return false; // No overlap
}

// Function to add a spyglass area to the tracking list
function addSpyglassRevealedArea(centerRow, centerCol) {
    const minRow = Math.max(0, centerRow - 1);
    const maxRow = Math.min(currentBoard.length - 1, centerRow + 1);
    const minCol = Math.max(0, centerCol - 1);
    const maxCol = Math.min(currentBoard[0].length - 1, centerCol + 1);
    
    spyglassRevealedAreas.push({
        centerRow,
        centerCol,
        minRow,
        maxRow,
        minCol,
        maxCol
    });
    
    console.log(`Added spyglass area centered at [${centerRow}, ${centerCol}] to tracking`);
}

// Function to handle revealing a 3x3 square on the board
function reveal3x3Square() {
    if (currentBoard.length === 0) return [];
    
    const rows = currentBoard.length;
    const cols = currentBoard[0].length;
    
    // Try to find a non-overlapping position for the 3x3 reveal
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop
    let centerRow, centerCol;
    
    do {
        // Select a random position that's not on the edge of the board (to ensure full 3x3 grid)
        centerRow = Math.floor(Math.random() * (rows - 2)) + 1; // Range: 1 to rows-2
        centerCol = Math.floor(Math.random() * (cols - 2)) + 1; // Range: 1 to cols-2
        attempts++;
    } while (checkSpyglassAreaOverlap(centerRow, centerCol) && attempts < maxAttempts);
    
    // If we couldn't find a non-overlapping area after maxAttempts, just use the last position
    if (attempts >= maxAttempts) {
        console.log("Could not find non-overlapping spyglass area after maximum attempts, using overlapping position");
    } else {
        console.log(`Found non-overlapping spyglass position at [${centerRow}, ${centerCol}] after ${attempts} attempts`);
    }
    
    // Add this area to the tracking list
    addSpyglassRevealedArea(centerRow, centerCol);
    
    return reveal3x3Around(centerRow, centerCol);
}

// ========== TILE UPDATE FUNCTIONS ==========

function updateSingleTileWithDyingAnimation(row, col, frameNumber) {
    const cell = document.querySelector(`#game-board td[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    
    // Get the canvas element
    const canvas = cell.querySelector('canvas');
    if (!canvas) return;
    
    // Force display dying animation frame regardless of underlying game state
    if (useSpriteMode) {
        // Use the skull animation frame for this tile
        drawSkullFrame(canvas, frameNumber);
    } else {
        // In number mode, use a special character to indicate dying
        const baseTile = getTileCoordinates('revealed');
        drawLayeredSprite(canvas, [baseTile]);
        drawTextOnCanvas(canvas, '†', '#FF0000');
    }
    
    // Add dying class for visual styling
    cell.classList.remove('revealed', 'dead', 'dying', 'claimed', 'cleared', 'enemy', 'treasure', 'flagged', 'hidden', 'dropped-item', 'has-annotation', 'chest-dropped-item', 'skyglass-interactive');
    cell.classList.add('dying');
}

function updateSingleTileFromDualState(row, col) {
    const cell = document.querySelector(`#game-board td[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    
    // Get current dual state values
    const visibility = getVisibility(row, col);
    const content = getContent(row, col);
    const tileData = getCurrentEntity(row, col);
    const annotation = getTileAnnotation(row, col);
    
    // Reset all classes first
    cell.className = '';
    
    // Add visibility and content state classes
    cell.classList.add(`visibility-${visibility}`, `content-${content}`);
    
    // Add entity type classes
    if (tileData) {
        if (isEnemy(tileData)) {
            cell.classList.add('enemy');
        } else if (isTreasure(tileData) || isSkyglass(tileData)) {
            cell.classList.add('treasure');
        }
    }
    
    // Add class if tile has annotation
    if (annotation && visibility === VISIBILITY_STATE.HIDDEN) {
        cell.classList.add('has-annotation');
    }
    
    // Add interactive class to skyglasses that are revealed but not claimed
    if (isSkyglass(tileData) && visibility === VISIBILITY_STATE.REVEALED && content === CONTENT_STATE.ALIVE) {
        cell.classList.add('skyglass-interactive');
    }
    
    // Get the canvas element
    const canvas = cell.querySelector('canvas');
    
    // Apply dual state rendering using the same logic as updateGameBoard
    if (visibility === VISIBILITY_STATE.HIDDEN) {
        renderHiddenTile(canvas, row, col, annotation);
    } else if (visibility === VISIBILITY_STATE.REVEALED) {
        renderRevealedTile(canvas, row, col, tileData, content);
    }
}

function updateSingleTile(row, col) {
    const cell = document.querySelector(`#game-board td[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    
    const tileData = JSON.parse(cell.dataset.tileData);
    const state = gameState[row][col];
    const tileType = cell.dataset.tileType;
    const annotation = getTileAnnotation(row, col);
    
    // Reset all classes first
    cell.classList.remove('revealed', 'dead', 'dying', 'claimed', 'cleared', 'enemy', 'treasure', 'flagged', 'hidden', 'dropped-item', 'has-annotation', 'chest-dropped-item', 'skyglass-interactive');
    
    // Add the current state as a class (convert underscores to hyphens for CSS classes)
    const cssClass = state.replace(/_/g, '-').toLowerCase();
    cell.classList.add(cssClass);
    
    // Add specific classes based on tile type
    if (tileType === 'enemy') {
        cell.classList.add('enemy');
    } else if (tileType === 'treasure') {
        cell.classList.add('treasure');
    }
    
    // Add class if tile has annotation
    if (annotation && (state === TILE_STATE.HIDDEN)) {
        cell.classList.add('has-annotation');
    }
    
    // Add interactive class to skyglasses that are revealed but not claimed
    if (isSkyglass(tileData) && state === TILE_STATE.REVEALED) {
        cell.classList.add('skyglass-interactive');
    }
    
    // Get the canvas element
    const canvas = cell.querySelector('canvas');
    
    // Get the threat level for this cell
    const threatLevel = sumNeighboringEnemyLevels(row, col);
    
    // Apply state-specific rendering (same logic as updateGameBoard but for single tile)
    switch (state) {
        case TILE_STATE.DYING:
            // Draw the dying animation using skull sprites
            if (useSpriteMode) {
                // Use the skull animation frame for this tile
                const frameNumber = getDyingFrame(row, col);
                drawSkullFrame(canvas, frameNumber);
            } else {
                // In number mode, use a special character to indicate dying
                const baseTile = getTileCoordinates(TILE_STATE.REVEALED);
                drawLayeredSprite(canvas, [baseTile]);
                drawTextOnCanvas(canvas, '†', '#FF0000');
            }
            break;
            
        case TILE_STATE.REVEALED:
            if (tileData.symbol === '.') {
                // Empty tiles - show base tile with threat level using cleared tile coordinates
                const tileLayer = getTileCoordinates(TILE_STATE.CLEARED);
                drawLayeredSprite(canvas, [tileLayer]);
                
                // Draw threat level if needed
                if (threatLevel > 0) {
                    drawTextOnCanvas(canvas, threatLevel.toString(), THREAT_LEVEL_COLOR);
                }
            } else if (useSpriteMode && (isEnemy(tileData) || isTreasure(tileData) || isVineTrap(tileData) || isSkyglass(tileData) || isMonolith(tileData))) {
                // Draw revealed entity with base tile (no variations for revealed tiles)
                const baseTile = getTileCoordinates(TILE_STATE.REVEALED);
                
                // Use special sprite logic for oozes, crystals and monoliths, otherwise use standard sprite logic
                let revealedSprite;
                if (isOoze(tileData)) {
                    // Use the ooze color logic for Crimson Ooze
                    revealedSprite = getOozeSpriteCoordinates(tileData, row, col, 'revealed');
                    // Ensure the sprite sheet is explicitly set for oozes
                    if (!revealedSprite.spriteSheet) {
                        revealedSprite.spriteSheet = 'new_sprites';
                    }
                } else if (isCrystal(tileData)) {
                    revealedSprite = getCrystalSpriteCoordinates(tileData, row, col, 'revealed');
                    // Ensure the sprite sheet is explicitly set for crystals
                    if (!revealedSprite.spriteSheet) {
                        revealedSprite.spriteSheet = 'new_sprites';
                    }
                } else if (isMonolith(tileData)) {
                    // Use spectral sprite if monolith is no longer indestructible, otherwise use revealed sprite
                    const spriteState = isIndestructible(tileData) ? 'revealed' : 'spectral';
                    revealedSprite = getSpriteCoordinates(tileData, spriteState);
                    // Ensure the sprite sheet is explicitly set for monoliths
                    if (!revealedSprite.spriteSheet) {
                        revealedSprite.spriteSheet = 'new_sprites';
                    }
                } else {
                    revealedSprite = getSpriteCoordinates(tileData, 'revealed');
                }
                
                // Add special class to monolith canvases for styling
                if (isMonolith(tileData)) {
                    if (isIndestructible(tileData)) {
                        canvas.classList.add('monolith-canvas');
                        canvas.classList.remove('spectral-monolith-canvas');
                    } else {
                        canvas.classList.add('spectral-monolith-canvas');
                        canvas.classList.remove('monolith-canvas');
                    }
                } else {
                    canvas.classList.remove('monolith-canvas', 'spectral-monolith-canvas');
                }
                
                drawLayeredSprite(canvas, [baseTile, null, revealedSprite]);
            } else {
                // In number mode or for other types, display symbol or threat level
                const tileLayer = getTileCoordinates(TILE_STATE.CLEARED);
                drawLayeredSprite(canvas, [tileLayer]);
                drawTextOnCanvas(canvas, tileData.symbol, '#FFFFFF');
            }
            break;
            
        case TILE_STATE.INDESTRUCTIBLE:
            // Indestructible monoliths - same rendering as REVEALED but fixed state
            if (useSpriteMode && isMonolith(tileData)) {
                const baseTile = getTileCoordinates(TILE_STATE.REVEALED);
                const revealedSprite = getSpriteCoordinates(tileData, 'revealed');
                // Ensure the sprite sheet is explicitly set for monoliths
                if (!revealedSprite.spriteSheet) {
                    revealedSprite.spriteSheet = 'new_sprites';
                }
                
                // Add special class for indestructible monoliths
                canvas.classList.add('monolith-canvas');
                canvas.classList.remove('spectral-monolith-canvas');
                
                drawLayeredSprite(canvas, [baseTile, null, revealedSprite]);
            } else {
                // In number mode, display symbol
                const tileLayer = getTileCoordinates(TILE_STATE.CLEARED);
                drawLayeredSprite(canvas, [tileLayer]);
                drawTextOnCanvas(canvas, tileData.symbol, '#FFFFFF');
            }
            break;
            
        case TILE_STATE.DROPPED_ITEM:
            // Draw the item dropped by special entities (no variations)
            const clickedTile = getTileCoordinates(TILE_STATE.CLEARED);
            if (useSpriteMode) {
                // Get the reveal type from the cell dataset
                const revealType = cell.dataset.revealType || 'rats'; // Default to rats
                
                // Use different icons based on the reveal type
                let itemSprite;
                if (revealType === 'mines') {
                    itemSprite = { x: 1, y: 18, spriteSheet: 'new_sprites' };
                } else if (revealType === 'one-tile-reveal-random') {
                    itemSprite = { x: 0, y: 0, spriteSheet: 'new_sprites' }; // Use sprite at 0,0 for single tile reveal
                } else {
                    itemSprite = { x: 2, y: 18, spriteSheet: 'new_sprites' };
                }
                
                drawLayeredSprite(canvas, [clickedTile, null, itemSprite]);
            } else {
                // Text mode - use appropriate symbols
                const revealType = cell.dataset.revealType || 'rats';
                drawLayeredSprite(canvas, [clickedTile]);
                
                if (revealType === 'mines') {
                    // Symbol for mine weakening
                    drawTextOnCanvas(canvas, '✹', '#FFD700'); 
                } else if (revealType === 'one-tile-reveal-random') {
                    // Eye symbol for single tile reveal
                    drawTextOnCanvas(canvas, '👁', '#87CEEB');
                } else {
                    // Crown symbol for rat revealing
                    drawTextOnCanvas(canvas, '♔', '#FFD700'); 
                }
            }
            break;
            
        // Add other cases as needed for single tile updates
    }
}

// ========== OOZE COLOR MECHANICS ==========

// Function to check if an ooze is next to any crystals and return the color
function getOozeColorFromNearbyCrystals(row, col) {
    // Define directions (including diagonals) - same as sumNeighboringEnemyLevels
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dr, dc] of directions) {
        const r = row + dr;
        const c = col + dc;
        
        // Check if within grid bounds
        if (r >= 0 && r < currentBoard.length && c >= 0 && c < currentBoard[0].length) {
            const neighborEntity = getCurrentEntity(r, c);
            const neighborContent = getContent(r, c);
            const neighborVisibility = getVisibility(r, c);
            
            // Check if this neighbor is a crystal that is revealed and alive (not claimed)
            if (neighborEntity && isCrystal(neighborEntity) && 
                neighborVisibility === VISIBILITY_STATE.REVEALED && 
                neighborContent === CONTENT_STATE.ALIVE) {
                
                // Get the color of this crystal based on its quadrant
                const crystalColor = getCrystalColorByQuadrant(r, c);
                console.log(`Ooze at [${row}, ${col}] found ${crystalColor} crystal at [${r}, ${c}]`);
                return crystalColor;
            }
        }
    }
    
    return null; // No crystals nearby
}

// Function to get sprite coordinates for an ooze based on nearby crystals
function getOozeSpriteCoordinates(tileData, row, col, state = 'revealed') {
    // Only apply color changing to revealed oozes
    if (state !== 'revealed' || !tileData || tileData.id !== 5) {
        return getSpriteCoordinates(tileData, state);
    }
    
    // Check for nearby crystals
    const nearbyColor = getOozeColorFromNearbyCrystals(row, col);
    
    if (nearbyColor) {
        // Use the colored sprite if it exists
        const coloredSpriteKey = `revealed-${nearbyColor}`;
        if (tileData.sprites && tileData.sprites[coloredSpriteKey]) {
            console.log(`Ooze at [${row}, ${col}] changing to ${nearbyColor} color`);
            const spriteData = { ...tileData.sprites[coloredSpriteKey] };
            // Ensure sprite sheet is set
            if (!spriteData.spriteSheet) {
                spriteData.spriteSheet = 'new_sprites';
            }
            return spriteData;
        }
    }
    
    // Fall back to standard revealed sprite
    return getSpriteCoordinates(tileData, state);
}

// Function to check if a tile is a Crimson Ooze (ID 5)
function isOoze(tileData) {
    return tileData && tileData.id === 5;
}
