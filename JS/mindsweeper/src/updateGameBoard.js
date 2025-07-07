// ========== NEW DUAL STATE RENDERING SYSTEM ==========
// Function to update the game board based on current dual state system
function updateGameBoard() {
    // Assert game state is valid before processing
    assertGameState(gameState);
    
    // First, update all tiles according to their dual state
    const cells = document.querySelectorAll('#game-board td');
    cells.forEach(td => {
        // Assert cell data integrity - critical for game logic
        assert(td.dataset.row !== undefined, 'Cell MUST have row data');
        assert(td.dataset.col !== undefined, 'Cell MUST have col data');
        
        const row = parseInt(td.dataset.row);
        const col = parseInt(td.dataset.col);
        const tileData = getCurrentEntity(row, col);
        const visibility = getVisibility(row, col);
        const content = getContent(row, col);
        const annotation = getTileAnnotation(row, col);
        
        // Reset all classes first
        td.className = '';
        
        // Add visibility and content state classes
        td.classList.add(`visibility-${visibility}`, `content-${content}`);
        
        // Add entity type classes
        if (tileData) {
            if (isEnemy(tileData)) {
                td.classList.add('enemy');
            } else if (isTreasure(tileData) || isSkyglass(tileData)) {
                td.classList.add('treasure');
            }
        }
        
        // Add class if tile has annotation
        if (annotation && visibility === VISIBILITY_STATE.HIDDEN) {
            td.classList.add('has-annotation');
        }
        
        // Add interactive class to skyglasses that are revealed but not claimed
        if (isSkyglass(tileData) && visibility === VISIBILITY_STATE.REVEALED && content === CONTENT_STATE.ALIVE) {
            td.classList.add('skyglass-interactive');
        }
        
        // Get the canvas element
        const canvas = td.querySelector('canvas');
        
        // Apply new dual state rendering
        renderTile(td, row, col, tileData, visibility, content, annotation);
    });
    
    // Update the entity counts display
    updateEntityCountsDisplay();
}

function renderTile(td, row, col, tileData, visibility, content, annotation) {
    const canvas = td.querySelector('canvas');
    if (!canvas) return;
    
    if (visibility === VISIBILITY_STATE.HIDDEN) {
        renderHiddenTile(canvas, row, col, annotation);
    } else if (visibility === VISIBILITY_STATE.REVEALED) {
        renderRevealedTile(canvas, row, col, tileData, content);
    }
}

function renderHiddenTile(canvas, row, col, annotation) {
    if (annotation) {
        // Draw the annotation on the canvas
        if (useSpriteMode) {
            // Draw layered sprite with annotation
            const layers = [
                getTileCoordinates('hidden'), // Base tile
                getTileVariation(row, col)    // Variation (if any)
            ];
            drawLayeredSprite(canvas, layers);
            
            // Then overlay the annotation
            drawAnnotationOnCanvas(canvas, annotation);
        } else {
            drawAnnotationOnCanvas(canvas, annotation);
        }
    } else {
        // No annotation, just draw hidden sprite
        if (useSpriteMode) {
            const layers = [
                getTileCoordinates('hidden'), // Base tile
                getTileVariation(row, col)    // Variation (if any)
            ];
            drawLayeredSprite(canvas, layers);
        } else {
            // In number mode, just display a blank hidden tile
            clearCanvas(canvas);
        }
    }
}

function renderRevealedTile(canvas, row, col, tileData, content) {
    if (!tileData) return;
    
    // Check if there's a dying animation playing for this tile
    const dyingKey = `${row},${col}`;
    const dyingState = dyingAnimations[dyingKey];
    
    if (dyingState) {
        // Show dying animation regardless of actual content state
        renderDyingTile(canvas, row, col);
        return;
    }
    
    switch (content) {
        case CONTENT_STATE.EMPTY:
            renderEmptyTile(canvas, row, col);
            break;
            
        case CONTENT_STATE.ALIVE:
            renderAliveTile(canvas, row, col, tileData);
            break;
            
        case CONTENT_STATE.DYING:
            renderDyingTile(canvas, row, col);
            break;
            
        case CONTENT_STATE.DEAD:
        case CONTENT_STATE.CLAIMED:
        case CONTENT_STATE.TRIGGERED:
            renderClearedTile(canvas, row, col, tileData);
            break;
            
        default:
            console.warn(`Unknown content state: ${content}`);
            renderClearedTile(canvas, row, col, tileData);
            break;
    }
}

function renderEmptyTile(canvas, row, col) {
    const baseTile = getTileCoordinates('revealed');
    drawLayeredSprite(canvas, [baseTile]);
    
    // Draw threat level if needed
    const threatLevel = sumNeighboringEnemyLevels(row, col);
    if (threatLevel > 0) {
        drawTextOnCanvas(canvas, threatLevel.toString(), THREAT_LEVEL_COLOR);
    }
}

function renderAliveTile(canvas, row, col, tileData) {
    if (useSpriteMode) {
        const baseTile = getTileCoordinates('revealed');
        
        // Determine sprite based on entity type and any transformations
        let entitySprite = getSpriteCoordinates(tileData, 'revealed');
        
        // Check for mimic transformation to hostile form
        if (hasTag(tileData, 'revealed-click-fight') && tileData.sprites && tileData.sprites['revealed-hostile']) {
            // For now, keep showing normal sprite until clicked
            // The updateTileSprite function will handle the transformation
        }
        
        // Special sprite logic for oozes, crystals and monoliths
        if (isOoze(tileData)) {
            // Use the ooze color logic for Crimson Ooze
            entitySprite = getOozeSpriteCoordinates(tileData, row, col, 'revealed');
            if (!entitySprite.spriteSheet) {
                entitySprite.spriteSheet = 'new_sprites';
            }
            canvas.classList.add('ooze-canvas');
        } else if (isCrystal(tileData)) {
            entitySprite = getCrystalSpriteCoordinates(tileData, row, col, 'revealed');
            if (!entitySprite.spriteSheet) {
                entitySprite.spriteSheet = 'new_sprites';
            }
            canvas.classList.add('crystal-canvas');
        } else if (isMonolith(tileData)) {
            const spriteState = isIndestructible(tileData) ? 'revealed' : 'spectral';
            entitySprite = getSpriteCoordinates(tileData, spriteState);
            if (!entitySprite.spriteSheet) {
                entitySprite.spriteSheet = 'new_sprites';
            }
            
            if (isIndestructible(tileData)) {
                canvas.classList.add('monolith-canvas');
                canvas.classList.remove('spectral-monolith-canvas');
            } else {
                canvas.classList.add('spectral-monolith-canvas');
                canvas.classList.remove('monolith-canvas');
            }
        } else if (isSkyglass(tileData)) {
            canvas.classList.add('skyglass-canvas');
        }
        
        drawLayeredSprite(canvas, [baseTile, null, entitySprite]);
    } else {
        // In number mode or for other types, display symbol
        const tileLayer = getTileCoordinates('revealed');
        drawLayeredSprite(canvas, [tileLayer]);
        drawTextOnCanvas(canvas, tileData.symbol, '#FFFFFF');
    }
}

function renderDyingTile(canvas, row, col) {
    if (useSpriteMode) {
        // Use the skull animation frame for this tile
        const frameNumber = getDyingFrame(row, col);
        drawSkullFrame(canvas, frameNumber);
    } else {
        // In number mode, use a special character to indicate dying
        const baseTile = getTileCoordinates('revealed');
        drawLayeredSprite(canvas, [baseTile]);
        drawTextOnCanvas(canvas, '†', '#FF0000');
    }
}

function renderClearedTile(canvas, row, col, tileData) {
    const currentEntity = getCurrentEntity(row, col);
    
    // Check if the current entity is Empty (id 0) and show threat level
    if (currentEntity && currentEntity.id === 0) {
        // This tile was cleared and became empty - show the empty tile sprite
        const baseTile = getTileCoordinates('revealed');
        const emptySprite = getSpriteCoordinates(currentEntity, 'revealed');
        drawLayeredSprite(canvas, [baseTile, null, emptySprite]);
        
        // Show threat level for empty tiles
        const threatLevel = sumNeighboringEnemyLevels(row, col);
        if (threatLevel > 0) {
            drawTextOnCanvas(canvas, threatLevel.toString(), THREAT_LEVEL_COLOR);
        }
    } else if (currentEntity && (isTreasure(currentEntity) || hasTag(currentEntity, 'item'))) {
        // Check if this is an Experience entity or other instant-disappearing items
        if (currentEntity.id === 21 || hasTag(currentEntity, 'reward-experience')) {
            // Experience entities should immediately show as empty with threat level
            const baseTile = getTileCoordinates('revealed');
            const emptyEntity = getCurrentEntity(row, col); // Should still be the experience entity during transition
            
            // Use the empty sprite coordinates directly
            const emptySprite = { x: 5, y: 4, spriteSheet: 'new_sprites' };
            drawLayeredSprite(canvas, [baseTile, null, emptySprite]);
            
            // Show threat level immediately
            const threatLevel = sumNeighboringEnemyLevels(row, col);
            if (threatLevel > 0) {
                drawTextOnCanvas(canvas, threatLevel.toString(), THREAT_LEVEL_COLOR);
            }
        } else {
            // For other treasures and items that are claimed but not yet transformed, 
            // show a dimmed version of their original sprite to maintain visual continuity
            const baseTile = getTileCoordinates('revealed');
            let entitySprite = getSpriteCoordinates(currentEntity, 'revealed');
            
            // Special handling for oozes and crystals
            if (isOoze(currentEntity)) {
                entitySprite = getOozeSpriteCoordinates(currentEntity, row, col, 'revealed');
                if (!entitySprite.spriteSheet) {
                    entitySprite.spriteSheet = 'new_sprites';
                }
            } else if (isCrystal(currentEntity)) {
                entitySprite = getCrystalSpriteCoordinates(currentEntity, row, col, 'revealed');
                if (!entitySprite.spriteSheet) {
                    entitySprite.spriteSheet = 'new_sprites';
                }
            }
            
            drawLayeredSprite(canvas, [baseTile, null, entitySprite]);
            
            // Add a visual indicator that this item has been claimed
            // Draw a semi-transparent overlay to show it's been collected
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    } else {
        // Fallback for other types of cleared tiles
        const clearedTile = getTileCoordinates('cleared');
        drawLayeredSprite(canvas, [clearedTile]);
    }
}

// ========== UTILITY FUNCTIONS ==========

function toggleSpriteMode() {
    useSpriteMode = !useSpriteMode;
    console.log(`Sprite mode: ${useSpriteMode ? 'ON' : 'OFF'}`);
    
    // Update the button text
    const toggleButton = document.getElementById('toggle-sprites');
    if (toggleButton) {
        toggleButton.textContent = useSpriteMode ? 'Switch to Numbers' : 'Switch to Sprites';
    }
    
    // Re-render the board with the new mode
    updateGameBoard();
}

function revealRandomSkyglass() {
    // Find all skyglasses on the board
    const skyglasses = [];
    
    for (let r = 0; r < currentBoard.length; r++) {
        for (let c = 0; c < currentBoard[r].length; c++) {
            const entity = getCurrentEntity(r, c);
            if (entity && isSkyglass(entity)) {
                skyglasses.push({ row: r, col: c });
            }
        }
    }
    
    if (skyglasses.length === 0) {
        console.log("No skyglasses found on the board to reveal");
        return false;
    }
    
    // Select a random skyglass
    const randomIndex = Math.floor(Math.random() * skyglasses.length);
    const selectedSkyglass = skyglasses[randomIndex];
    
    console.log(`Revealing random skyglass at [${selectedSkyglass.row}, ${selectedSkyglass.col}]`);
    
    // Reveal the selected skyglass
    setVisibility(selectedSkyglass.row, selectedSkyglass.col, VISIBILITY_STATE.REVEALED);
    
    // Update the board
    updateGameBoard();
    
    return true;
}

function changeMinesToWeakBombs() {
    console.log("Changing all mines to weak bombs (level 1)...");
    
    let changedCount = 0;
    for (let r = 0; r < currentBoard.length; r++) {
        for (let c = 0; c < currentBoard[0].length; c++) {
            const entity = getCurrentEntity(r, c);
            if (entity && getEntityKeyFromTileData(entity) === "E7") { // Explosive Mine
                // Change level to 1 to make it a weak bomb
                entity.level = 1;
                changedCount++;
                
                // Add visual highlight
                const cell = document.querySelector(`#game-board td[data-row="${r}"][data-col="${c}"]`);
                if (cell) {
                    cell.style.boxShadow = '0 0 8px 2px #ff6600';
                    setTimeout(() => {
                        cell.style.boxShadow = '';
                    }, 2000);
                }
            }
        }
    }
    
    console.log(`Changed ${changedCount} mines to weak bombs (level 1)`);
    updateGameBoard();
}

function weakenAllMines() {
    console.log("Weakening all mines on the board...");
    
    let weakenedCount = 0;
    for (let r = 0; r < currentBoard.length; r++) {
        for (let c = 0; c < currentBoard[0].length; c++) {
            const entity = getCurrentEntity(r, c);
            
            if (entity && entity.id === 7) { // E7 = Explosive Mine
                // Transform mine to weakened mine (entity id 23)
                transformEntity(r, c, 23);
                weakenedCount++;
                
                // Add visual highlight
                const cell = document.querySelector(`#game-board td[data-row="${r}"][data-col="${c}"]`);
                if (cell) {
                    cell.style.boxShadow = '0 0 8px 2px #ffaa00';
                    setTimeout(() => {
                        cell.style.boxShadow = '';
                    }, 3000);
                }
            }
        }
    }
    
    console.log(`Weakened ${weakenedCount} mines on the board`);
    updateGameBoard();
}

function revealAllRats() {
    console.log("Revealing all rats on the board...");
    
    let revealedCount = 0;
    for (let r = 0; r < currentBoard.length; r++) {
        for (let c = 0; c < currentBoard[0].length; c++) {
            const entity = getCurrentEntity(r, c);
            const visibility = getVisibility(r, c);
            
            if (entity && entity.id === 1 && visibility === VISIBILITY_STATE.HIDDEN) { // E1 = Rat
                // Reveal the rat
                setVisibility(r, c, VISIBILITY_STATE.REVEALED);
                revealedCount++;
                
                // Add visual highlight
                const cell = document.querySelector(`#game-board td[data-row="${r}"][data-col="${c}"]`);
                if (cell) {
                    cell.style.boxShadow = '0 0 8px 2px #00ff00';
                    setTimeout(() => {
                        cell.style.boxShadow = '';
                    }, 3000);
                }
            }
        }
    }
    
    console.log(`Revealed ${revealedCount} rats on the board`);
    updateGameBoard();
}