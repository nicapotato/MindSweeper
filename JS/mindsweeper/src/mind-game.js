// Function to apply a theme
function applyTheme(themeName) {
    if (!gameConfig.themes || !gameConfig.themes[themeName]) {
        console.warn(`Theme '${themeName}' not found, using default`);
        return;
    }
    
    currentTheme = themeName;
    const theme = gameConfig.themes[themeName];
    
    // Update sprite sheets
    if (theme.sprite_sheets) {
        gameConfig.sprite_sheets = { ...theme.sprite_sheets };
    }
    
    // Theme overrides are handled by getEntityDisplayData() function
    
    console.log(`Applied theme: ${theme.name}`);
}

// Function to get current entity display data (name, description, level) based on theme
function getEntityDisplayData(entityKey) {
    let baseEntity = null;
    
    // v2.0 format - extract entity ID from entity key (e.g., "E1" -> 1)
    const entityId = parseInt(entityKey.replace(/^E/, ''));
    baseEntity = gameConfig.entities.find(entity => entity.id === entityId);
    
    if (!baseEntity) return null;
    
    // Only log once per entity type to avoid spam
    if (!getEntityDisplayData._logged) getEntityDisplayData._logged = new Set();
    if (!getEntityDisplayData._logged.has(entityKey)) {
        console.log(`Getting entity display data for ${entityKey} with theme: ${currentTheme}`);
        getEntityDisplayData._logged.add(entityKey);
    }
    
    // Check theme overrides in the entity itself
    if (baseEntity.theme_overrides && baseEntity.theme_overrides[currentTheme]) {
        const overrides = baseEntity.theme_overrides[currentTheme];
        if (!getEntityDisplayData._logged.has(`${entityKey}_override`)) {
            console.log(`Found v2.0 theme overrides for ${entityKey}:`, overrides);
            getEntityDisplayData._logged.add(`${entityKey}_override`);
        }
        return {
            name: overrides.name || baseEntity.name,
            description: overrides.description || baseEntity.description,
            level: overrides.level !== undefined ? overrides.level : baseEntity.level
        };
    }
    
    return {
        name: baseEntity.name,
        description: baseEntity.description,
        level: baseEntity.level
    };
}

// Helper function to get entity key from tile data
function getEntityKeyFromTileData(tileData) {
    // v2.0 format - use entity ID directly
    return `E${tileData.id}`;  // Convert ID to key format for compatibility
}

// Helper function to get themed entity level for combat
function getThemedEntityLevel(tileData) {
    
    const entityKey = getEntityKeyFromTileData(tileData);
    if (entityKey) {
        const themedData = getEntityDisplayData(entityKey);
        return themedData ? themedData.level : (tileData.level || 0);
    }
    return tileData.level || 0;
}

// Function to switch themes
async function switchTheme(themeName) {
    if (themeName === currentTheme) return;
    
    applyTheme(themeName);
    
    // Close any open annotation popovers to ensure fresh level options
    removeActivePopover();
    
    // Reload sprite sheets with new theme
    await loadSpriteSheets();
    
    // Update the game board to show new sprites
    updateGameBoard();
    
    // Update entity counts display with new names
    updateEntityCountsDisplay();
    
    console.log(`Switched to theme: ${themeName}`);
}

// Tile animation functions moved to tile-logic.js

// Helper functions to check tile types based on tags
// Tile state utility functions moved to tile-logic.js

// Initialize GOD MODE from localStorage
function initializeGodMode() {
    const godModeEnabled = localStorage.getItem('mindsweeper_god_mode') === 'true';
    if (godModeEnabled) {
        gameConfig.game_state.starting_max_health = 1000;
        console.log("GOD MODE loaded from localStorage - starting health set to 1000");
    }
}

// GOD MODE toggle functionality
function toggleGodMode() {
    const godModeToggle = document.getElementById('god-mode-toggle');
    const isGodMode = godModeToggle ? godModeToggle.checked : false;
    
    if (isGodMode) {
        // Set starting health to 1000 for GOD MODE
        gameConfig.game_state.starting_max_health = 1000;
        console.log("GOD MODE activated - starting health set to 1000");
    } else {
        // Reset starting health to default (1)
        gameConfig.game_state.starting_max_health = 1;
        console.log("GOD MODE deactivated - starting health reset to 1");
    }
    
    // Update current player health if in game
    if (typeof player !== 'undefined' && player) {
        const newMaxHealth = calculateMaxHealth(player.level);
        player.maxHealth = newMaxHealth;
        
        // If GOD MODE is enabled, restore full health immediately
        if (isGodMode) {
            player.health = newMaxHealth;
        }
        
        // Update the UI to reflect health changes
        if (typeof updatePlayerStatsDisplay === 'function') {
            updatePlayerStatsDisplay();
        }
        
        console.log(`Player health updated: ${player.health}/${player.maxHealth}`);
    }
    
    // Store GOD MODE preference
    localStorage.setItem('mindsweeper_god_mode', isGodMode.toString());
}

// Calculate the health for a given level
function calculateMaxHealth(level) {
    const startingMaxHealth = gameConfig.game_state.starting_max_health;
    return startingMaxHealth + Math.floor(level / 2);
}

// Calculate the experience requirement to reach the next level.
function calculateExpRequirement(level) {
    const startingMaxExperience = gameConfig.game_state.starting_max_experience;
    return startingMaxExperience + level;
}

// Function to load a specific map by index
function loadSpecificMap(index) {
    if (index < 0 || (totalSolutions > 0 && index >= totalSolutions)) {
        alert(`Please enter a valid map index between 0 and ${totalSolutions - 1}`);
        return;
    }
    
    console.log(`Loading map with index ${index}`);
    resetGame(index);
}

// Function to load a new map with a random solution index
function loadNewMap() {
    // Show loading skeleton while loading new map
    showLoadingSkeleton();
    
    // Use the preloaded solutions instead of making a fetch call
    if (allSolutions.length > 0) {
        // Get a random uncompleted cave index different from the current one
        let newIndex;
        const maxAttempts = 10; // Prevent infinite loop
        let attempts = 0;
        
        do {
            newIndex = getRandomUncompletedSolutionIndex(allSolutions.length);
            attempts++;
        } while (newIndex === gameConfig.solution_index && allSolutions.length > 1 && attempts < maxAttempts);
        
        // If we couldn't find a different uncompleted cave, just use any different cave
        if (newIndex === gameConfig.solution_index && allSolutions.length > 1) {
            do {
                newIndex = getRandomSolutionIndex(allSolutions.length);
            } while (newIndex === gameConfig.solution_index);
        }
        
        console.log(`Switching from solution ${gameConfig.solution_index} to ${newIndex}`);
        
        // Reset the game with the new index
        resetGame(newIndex);
        
        // Update the map index input with the current index
        const mapIndexInput = document.getElementById('map-index-input');
        if (mapIndexInput) {
            mapIndexInput.value = newIndex;
            mapIndexInput.max = totalSolutions - 1;
        }
        
                  // Try to play background music after user interaction
          if (gameAudio.getMusicEnabled() && !gameAudio.isMusicPlaying()) {
              gameAudio.playBackgroundMusic();
          }
    } else {
        console.error("No solutions available to select from.");
    }
}

function createBoard(processedBoardData) {
    const gameBoardElement = document.getElementById('game-board');
    if (!gameBoardElement) {
        console.error("Game board element not found!");
        return;
    }

    // Clear previous board if any
    gameBoardElement.innerHTML = '';
    
    // Initialize NEW dual state system
    initializeGameStates(processedBoardData.length, processedBoardData[0].length);
    
    // Initialize legacy game state for backwards compatibility during migration
    gameState = processedBoardData.map(row => 
        row.map(() => TILE_STATE.HIDDEN)
    );
    
    // Expose to window for testing
    window.gameState = gameState;
    window.tileVisibility = tileVisibility;
    window.tileContent = tileContent;
    window.tileCurrentEntity = tileCurrentEntity;

    // Initialize tile variations
    initializeTileVariations();

    // Log all skyglasses found on the board
    console.log("Detecting Skyglasses on the board:");
    let skyglassCount = 0;
    processedBoardData.forEach((row, r) => {
        row.forEach((tileData, c) => {
            if (isSkyglass(tileData)) {
                skyglassCount++;
                console.log(`Skyglass #${skyglassCount} found at [${r},${c}]: Name=${tileData.name}, Tags=${tileData.tags}, TileType=${isTreasure(tileData) ? 'treasure' : 'other'}`);
            }
        });
    });
    console.log(`Total Skyglasses found: ${skyglassCount}`);

    // board data is now already processed
    processedBoardData.forEach((row, r) => {
        const tr = gameBoardElement.insertRow();
        row.forEach((tileData, c) => {
            const td = tr.insertCell();
            // Store the full tile data and symbol separately
            td.dataset.tileData = JSON.stringify(tileData);
            td.dataset.symbol = tileData.symbol;
            td.dataset.row = r;
            td.dataset.col = c;
            
            // Store tile type based on tags
            if (isEnemy(tileData)) {
                td.dataset.tileType = 'enemy';
            } else if (isTreasure(tileData) || isSkyglass(tileData)) {
                td.dataset.tileType = 'treasure';
            } else {
                td.dataset.tileType = 'empty';
            }
            
            // Create a canvas for the sprite
            const canvas = document.createElement('canvas');
            canvas.width = gameConfig.sprite_settings.cell_width || 16;
            canvas.height = gameConfig.sprite_settings.cell_height || 16;
            td.appendChild(canvas);
            
            // Set canvas styling
            canvas.style.display = 'block';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            
            // Draw the initial hidden sprite with layering
            const layers = [
                getTileCoordinates(TILE_STATE.HIDDEN), // Base tile
                getTileVariation(r, c)                // Variation (if any)
                // No entity sprite for hidden tiles
            ];
            drawLayeredSprite(canvas, layers);
            
            // Then overlay the annotation
            drawAnnotationOnCanvas(canvas, getTileAnnotation(r, c));
            
            // Initially hidden via CSS
            td.addEventListener('click', handleTileClick);
            td.addEventListener('contextmenu', handleRightClick);

            // Add touch event listeners for mobile support
            let touchStartTime = 0;
            let touchTimer = null;
            let touchStartX = 0;
            let touchStartY = 0;
            const LONG_PRESS_DURATION = 1000; // 1 second
            const MOVE_THRESHOLD = 10; // Pixels

            td.addEventListener('touchstart', (event) => {
                // Prevent default touch behavior like scrolling or zooming
                // event.preventDefault(); 
                // Commenting out preventDefault for now as it might interfere with scrolling

                if (event.touches.length === 1) { // Only handle single touch
                    touchStartTime = Date.now();
                    touchStartX = event.touches[0].clientX;
                    touchStartY = event.touches[0].clientY;

                    // Start timer for long press
                    touchTimer = setTimeout(() => {
                        // Check if the tile is hidden
                        const currentRow = parseInt(td.dataset.row);
                        const currentCol = parseInt(td.dataset.col);
                        if (gameState[currentRow][currentCol] === TILE_STATE.HIDDEN) {
                            console.log(`Long press detected on hidden tile [${currentRow}, ${currentCol}], opening annotation menu.`);
                            // Use the touch event's position for the popover
                            showAnnotationPopover(td, currentRow, currentCol, event.touches[0]); 
                        }
                        touchTimer = null; // Timer finished
                    }, LONG_PRESS_DURATION);
                }
            });

            td.addEventListener('touchmove', (event) => {
                if (touchTimer) {
                    // Check if the touch has moved significantly
                    const currentX = event.touches[0].clientX;
                    const currentY = event.touches[0].clientY;
                    const deltaX = Math.abs(currentX - touchStartX);
                    const deltaY = Math.abs(currentY - touchStartY);

                    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
                        // Movement detected, cancel the long press timer
                        clearTimeout(touchTimer);
                        touchTimer = null;
                        console.log("Touch move detected, cancelling long press.");
                    }
                }
            });

            td.addEventListener('touchend', (event) => {
                if (touchTimer) {
                    // If timer is still active, it means it wasn't a long press
                    clearTimeout(touchTimer);
                    touchTimer = null;
                    
                    // Treat as a regular click if it wasn't cancelled by movement
                    const deltaT = Date.now() - touchStartTime;
                    console.log(`Touch end detected after ${deltaT}ms. Treating as click.`);
                    // Trigger a synthetic click event if it wasn't a long press
                    // We need to be careful not to trigger this if the long press happened
                    if (deltaT < LONG_PRESS_DURATION) {
                        // Manually call handleTileClick, passing the touch event
                         handleTileClick(event); 
                    }
                }
                 // If touchTimer is null here, it means the long press happened or was cancelled by movement
                 // No action needed in that case for touchend itself.
            });

            td.addEventListener('touchcancel', (event) => {
                if (touchTimer) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                    console.log("Touch cancel detected.");
                }
            });
        });
    });
}


// Function to reveal all living rats on the board
function revealAllLivingRats() {
    let revealedCount = 0;
    
    // Loop through the board to find and reveal all rats
    for (let r = 0; r < currentBoard.length; r++) {
        for (let c = 0; c < currentBoard[0].length; c++) {
            const tileData = currentBoard[r][c];
            
            // Check if this is a rat that's still hidden
            if (isRat(tileData) && gameState[r][c] === TILE_STATE.HIDDEN) {
                // Reveal the tile
                gameState[r][c] = TILE_STATE.REVEALED;
                revealedCount++;
                
                // Add visual highlight
                const cell = document.querySelector(`#game-board td[data-row="${r}"][data-col="${c}"]`);
                if (cell) {
                    cell.classList.add('skyglass-sighted');
                    // Add a temporary highlight effect with yellow glow
                    cell.style.boxShadow = '0 0 8px 2px #ffcc00';
                    setTimeout(() => {
                        cell.style.boxShadow = '';
                    }, 2000); // Remove highlight after 2 seconds
                }
            }
        }
    }
    
    // Update the board to show the newly revealed tiles
    updateGameBoard();
    console.log(`Revealed ${revealedCount} rats on the board`);
}

// Function to reveal one random hidden tile
function revealOneRandomHiddenTile() {
    const hiddenTiles = [];
    
    // Collect all hidden tiles using the dual state system
    for (let r = 0; r < tileVisibility.length; r++) {
        for (let c = 0; c < tileVisibility[r].length; c++) {
            if (getVisibility(r, c) === VISIBILITY_STATE.HIDDEN) {
                hiddenTiles.push({row: r, col: c});
            }
        }
    }
    
    // If no hidden tiles left, do nothing
    if (hiddenTiles.length === 0) {
        console.log("No hidden tiles left to reveal");
        return null;
    }
    
    // Pick a random hidden tile (this is not restricted by spyglass area tracking)
    const randomIndex = Math.floor(Math.random() * hiddenTiles.length);
    const {row, col} = hiddenTiles[randomIndex];
    
    // Reveal the tile using dual state system
    setVisibility(row, col, VISIBILITY_STATE.REVEALED);
    
    // Also update legacy gameState for backward compatibility
    if (gameState[row] && gameState[row][col] !== undefined) {
        const tileData = currentBoard[row][col];
        if (tileData && tileData.symbol === '.') {
            gameState[row][col] = TILE_STATE.CLEARED;
        } else {
            gameState[row][col] = TILE_STATE.REVEALED;
        }
    }
    
    // Update the UI
    updateGameBoard();
    
    // Add visual highlight
    const cell = document.querySelector(`#game-board td[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.classList.add('skyglass-sighted');
        // Add a temporary highlight effect with blue glow
        cell.style.boxShadow = '0 0 8px 2px #00aaff';
        setTimeout(() => {
            cell.style.boxShadow = '';
        }, 2000); // Remove highlight after 2 seconds
    }
    
    console.log(`Revealed random hidden tile at [${row}, ${col}]`);
    return {row, col};
}

// Create the annotation popover element
function createAnnotationPopover(row, col, currentAnnotation) {
    const popover = document.createElement('div');
    popover.className = 'annotation-popover';
    popover.style.position = 'absolute'; // Ensure it's positioned relative to the viewport or offset parent

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'annotation-options';

    // Collect unique entity levels from config considering theme overrides (excluding 0 and 100)
    const uniqueLevels = new Set();
    
    // v2.0 format - use entities array
    gameConfig.entities.forEach(entity => {
        if (entity.level !== undefined && entity.level > 0 && entity.level < 100) {
            // Use themed entity level instead of base level
            const themedLevel = getThemedEntityLevel(entity);
            if (themedLevel > 0 && themedLevel < 100) {
                uniqueLevels.add(themedLevel);
            }
        }
    });

    // Convert set to sorted array of strings
    const levelOptions = Array.from(uniqueLevels).sort((a, b) => a - b).map(String);

    // Annotation options: Specific levels, *, F, Clear
    const options = [...levelOptions, '*', 'F', 'Clear'];

    options.forEach(opt => {
        const button = document.createElement('button');
        button.className = 'annotation-option';
        button.dataset.value = opt === 'F' ? 'flag' : opt; // Use 'flag' internally for 'F'
        button.textContent = opt;

        if (opt === 'Clear') {
            button.classList.add('annotation-clear');
            button.textContent = 'Clear'; // Explicitly set text for clear button
            button.addEventListener('click', () => {
                removeTileAnnotation(row, col);
                updateGameBoard();
                removeActivePopover();
            });
        } else {
            button.addEventListener('click', () => {
                const value = opt === 'F' ? 'F' : opt; // Display 'F', but store 'F'
                setTileAnnotation(row, col, value);
                updateGameBoard();
                removeActivePopover();
            });
        }
        optionsContainer.appendChild(button);
    });

    popover.appendChild(optionsContainer);
    return popover;
}

// Show the annotation popover near the target element
function showAnnotationPopover(targetElement, row, col, event) {
    // Remove any existing popover first
    removeActivePopover();

    const currentAnnotation = getTileAnnotation(row, col);
    activePopover = createAnnotationPopover(row, col, currentAnnotation);

    // Position the popover near the click event or touch point
    let xPos = event.pageX;
    let yPos = event.pageY;

    // If it's a touch event (which has clientX/Y), use that
    if (event.clientX !== undefined && event.clientY !== undefined) {
        xPos = event.clientX;
        yPos = event.clientY;
    }

    activePopover.style.left = `${xPos + 5}px`;
    activePopover.style.top = `${yPos + 5}px`;

    document.body.appendChild(activePopover);

    // Add listener to close when clicking outside
    // Use setTimeout to prevent immediate closing due to the right-click event itself
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 0);
}

// All sound effect functions are now called directly via gameAudio

// Crystal pattern management functions (legacy compatibility)
function resetCrystalPattern() {
    crystalPattern.colors = [];
    crystalPattern.completedPatterns = 0;
    
    // Also reset new inventory system if available
    if (typeof window.crystalSecretSequence !== 'undefined') {
        window.crystalSecretSequence = null;
        window.currentCrystalIndex = 0;
    }
}

function addColorToCrystalPattern(color) {
    // Legacy function - delegate to new system if available
    if (typeof processCrystalCollection === 'function') {
        return processCrystalCollection(color) === 'sequence_complete';
    }
    
    // Fallback to old logic
    if (crystalPattern.colors.length >= 4) {
        crystalPattern.colors = [];
    }
    
    crystalPattern.colors.push(color);
    console.log(`Crystal pattern: ${crystalPattern.colors.join(' -> ')}`);
    
    const uniqueColors = [...new Set(crystalPattern.colors)];
    if (crystalPattern.colors.length === 4 && uniqueColors.length === 4) {
        return true;
    }
    
    return false;
}

function resetPatternOnInvalidClick() {
    // Legacy function - delegate to new system if available
    if (typeof window.currentCrystalIndex !== 'undefined') {
        window.currentCrystalIndex = 0;
        console.log("Crystal sequence reset via legacy function");
        return;
    }
    
    // Fallback to old logic
    crystalPattern.colors = [];
    console.log("Crystal pattern reset - duplicate color clicked");
}

// Function to transform all onyx monoliths to spectral monoliths
function transformMonolithsToSpectral() {
    console.log("🔮 Transforming all onyx monoliths to spectral monoliths...");
    
    // Play the crystal reveal sound
    gameAudio.playCrystalRevealSound();
    
    let transformedCount = 0;
    
    // Iterate through all board positions using the dual state system
    for (let row = 0; row < currentBoard.length; row++) {
        for (let col = 0; col < currentBoard[row].length; col++) {
            const currentEntity = getCurrentEntity(row, col);
            const visibility = getVisibility(row, col);
            
            // Check if this is a revealed monolith that is indestructible (onyx monolith)
            if (currentEntity && isMonolith(currentEntity) && isIndestructible(currentEntity) && visibility === VISIBILITY_STATE.REVEALED) {
                console.log(`Found onyx monolith at [${row}, ${col}] - transforming to spectral...`);
                
                // Directly modify the entity's tags to make it spectral and claimable
                if (currentEntity.tags) {
                    // Remove indestructible and no-experience tags
                    currentEntity.tags = currentEntity.tags.filter(tag => tag !== 'indestructible' && tag !== 'no-experience');
                    
                    // Add tags to make it claimable treasure
                    if (!currentEntity.tags.includes('treasure')) {
                        currentEntity.tags.push('treasure');
                    }
                    if (!currentEntity.tags.includes('revealed-click-claim')) {
                        currentEntity.tags.push('revealed-click-claim');
                    }
                }
                
                // Set the experience reward to 2
                currentEntity.level = 2;
                
                // Update the entity in the entity manager if needed
                if (entityManager && entityManager.updateEntity) {
                    entityManager.updateEntity(currentEntity.id, currentEntity);
                }
                
                transformedCount++;
                console.log(`✨ Transformed monolith at [${row}, ${col}] to spectral (can now be claimed for 2 exp)`);
                console.log(`   Tags: [${currentEntity.tags.join(', ')}], Level: ${currentEntity.level}`);
            }
        }
    }
    
    console.log(`🎉 Transformation complete! ${transformedCount} monoliths transformed to spectral.`);
    
    // Update the game board to reflect the changes
    updateGameBoard();
}