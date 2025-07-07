// ========== NEW DUAL STATE CLICK HANDLER ==========
// Handle right click to flag/unflag tiles or show annotation popover
function handleRightClick(event) {
    event.preventDefault(); // Prevent context menu
    
    // Assert DOM structure is valid - no graceful fallbacks
    const td = event.target.closest('td');
    assert(td, 'Right-click MUST occur on a valid table cell');
    
    const row = parseInt(td.dataset.row);
    const col = parseInt(td.dataset.col);
    
    // Only allow annotations or flagging on hidden tiles
    const visibility = getVisibility(row, col);
    if (visibility === VISIBILITY_STATE.HIDDEN) {
        // Show annotation popover
        showAnnotationPopover(td, row, col, event);
    } else if (visibility === VISIBILITY_STATE.REVEALED) {
        // Could add right-click functionality for revealed tiles here
        console.log(`Right-clicked revealed tile at [${row}, ${col}]`);
    }
}

// Main tile click handler using dual state system
function handleTileClick(event) {
    // Assert DOM structure is valid - fail loud if broken
    const td = event.target.closest('td');
    assert(td, 'Tile click MUST occur on a valid table cell');
    
    const row = parseInt(td.dataset.row);
    const col = parseInt(td.dataset.col);
    const tileData = getCurrentEntity(row, col);
    
    if (!tileData) {
        console.error(`No entity data found for tile [${row}, ${col}]`);
        return;
    }
    
    // Check if tile is currently in animation - if so, ignore the click
    if (tilesInAnimation[`${row},${col}`]) {
        console.log(`Tile at [${row}, ${col}] is locked during animation`);
        return;
    }
    
    // Check for Shift key press on a hidden tile for annotation
    const visibility = getVisibility(row, col);
    if (event.shiftKey && visibility === VISIBILITY_STATE.HIDDEN) {
        console.log("Shift-click detected on hidden tile, opening annotation menu.");
        showAnnotationPopover(td, row, col, event);
        return;
    }

    // Play click sound
    gameAudio.playClickSound();
    
    const content = getContent(row, col);
    
    // Skip if content is already processed (unless it can be interacted with again)
    if (isContentCleared(content, row, col)) {
        console.log(`Tile [${row}, ${col}] already processed (${content})`);
        return;
    }
    
    // Handle based on visibility state
    if (visibility === VISIBILITY_STATE.HIDDEN) {
        handleHiddenClick(row, col, tileData);
    } else if (visibility === VISIBILITY_STATE.REVEALED) {
        handleRevealedClick(row, col, tileData);
    }
}

function handleHiddenClick(row, col, tileData) {
    const behavior = getHiddenClickBehavior(tileData);
    
    console.log(`Hidden click on [${row}, ${col}]: ${tileData.name}, behavior: ${behavior}`);
    
    switch (behavior) {
        case 'fight':
            // Traditional hostile behavior: HIDDEN -> REVEALED -> fight sequence
            setVisibility(row, col, VISIBILITY_STATE.REVEALED);
            updateGameBoard();
            setTimeout(() => {
                startContentTransition(row, col, tileData, 'ALIVE_TO_DYING');
            }, 500);
            break;
            
        case 'reveal':
            // Just reveal, wait for second click
            setVisibility(row, col, VISIBILITY_STATE.REVEALED);
            
            // Handle empty tiles
            if (tileData.symbol === '.') {
                setContent(row, col, CONTENT_STATE.EMPTY);
            }
            
            updateGameBoard();
            console.log(`Revealed ${tileData.name} at [${row}, ${col}], click again to interact`);
            break;
            
        default:
            // Default behavior: reveal
            setVisibility(row, col, VISIBILITY_STATE.REVEALED);
            if (tileData.symbol === '.') {
                setContent(row, col, CONTENT_STATE.EMPTY);
            }
            updateGameBoard();
            break;
    }
}

function handleRevealedClick(row, col, tileData) {
    const behavior = getRevealedClickBehavior(tileData);
    
    console.log(`Revealed click on [${row}, ${col}]: ${tileData.name}, behavior: ${behavior}`);
    
    switch (behavior) {
        case 'fight':
            // Mimic behavior: transform sprite then fight
            if (tileData.sprites && tileData.sprites['revealed-hostile']) {
                updateTileSprite(row, col, 'revealed-hostile');
                gameAudio.playCrystalSound(); // Mimic transformation sound
                setTimeout(() => {
                    startContentTransition(row, col, tileData, 'ALIVE_TO_DYING');
                }, 1000); // 1 second for mimic reveal
            } else {
                startContentTransition(row, col, tileData, 'ALIVE_TO_DYING');
            }
            break;
            
        case 'claim':
            startContentTransition(row, col, tileData, 'ALIVE_TO_CLAIMED');
            break;
            
        case 'trigger':
            // Handle special trigger effects first
            if (hasTag(tileData, 'trigger-reveal-square-3x3-random')) {
                console.log(`Spyglass triggered 3x3 reveal at [${row}, ${col}]`);
                reveal3x3Square();
                gameAudio.playClickSound();
            } else if (hasTag(tileData, 'trigger-reveal-random-single')) {
                console.log(`Bat Echo triggered single random reveal at [${row}, ${col}]`);
                revealOneRandomHiddenTile();
                gameAudio.playClickSound();
            }
            // Then transition the content state
            startContentTransition(row, col, tileData, 'ALIVE_TO_TRIGGERED');
            break;
            
        case 'none':
            // No action - tile is not interactive
            console.log(`Tile [${row}, ${col}] (${tileData.name}) is not interactive`);
            break;
            
        default:
            console.log(`No specific behavior defined for ${tileData.name}, defaulting to claim`);
            startContentTransition(row, col, tileData, 'ALIVE_TO_CLAIMED');
            break;
    }
}

function startContentTransition(row, col, tileData, transitionKey) {
    const transition = gameConfig.tile_data?.content_transitions?.[transitionKey];
    if (!transition) {
        console.warn(`No transition found for ${transitionKey}`);
        return;
    }
    
    console.log(`Starting transition ${transitionKey} for ${tileData.name} at [${row}, ${col}]`);
    
    // Mark tile as in animation
    tilesInAnimation[`${row},${col}`] = true;
    
    // Execute the transition
    if (transitionKey === 'ALIVE_TO_DYING') {
        // IMMEDIATE game state update for responsiveness
        setContent(row, col, CONTENT_STATE.DEAD);
        processCombatResult(row, col, tileData);
        
        // Trigger entity transition when content becomes cleared
        handleEntityTransition(row, col, tileData, 'on_cleared');
        
        // Remove animation lock immediately so user can continue clicking
        delete tilesInAnimation[`${row},${col}`];
        
        // SEPARATE visual animation - doesn't block game logic
        startDyingAnimation(row, col);
        updateGameBoard();
        
        // The animation will handle visual transitions independently
        // Animation completion will just update the visual display to match the already-updated game state
        
    } else if (transitionKey === 'ALIVE_TO_CLAIMED') {
        setContent(row, col, CONTENT_STATE.CLAIMED);
        processTreasureClaim(row, col, tileData);
        
        // Handle trigger effects for claimed items (scrolls)
        if (hasTag(tileData, 'trigger-E1-reveal')) {
            console.log(`Rat Scroll claimed! Revealing all rats...`);
            revealAllRats();
        } else if (hasTag(tileData, 'trigger-E7-weakening')) {
            console.log(`Myster Man Scroll claimed! Weakening all mines...`);
            weakenAllMines();
        }
        
        // Process reward tags
        processRewardTags(row, col, tileData);
        
        // Trigger entity transition when content becomes cleared
        setTimeout(() => {
            handleEntityTransition(row, col, tileData, 'on_cleared');
            delete tilesInAnimation[`${row},${col}`];
        }, 300);
        
    } else if (transitionKey === 'ALIVE_TO_TRIGGERED') {
        setContent(row, col, CONTENT_STATE.TRIGGERED);
        processTrapTrigger(row, col, tileData);
        
        // Trigger entity transition when content becomes cleared
        handleEntityTransition(row, col, tileData, 'on_cleared');
        delete tilesInAnimation[`${row},${col}`];
    }
    
    updateGameBoard();
}

function handleEntityTransition(row, col, currentEntity, trigger) {
    const transitionConfig = currentEntity.entity_transition?.[trigger];
    if (!transitionConfig) {
        console.log(`No ${trigger} transition for ${currentEntity.name}`);
        return;
    }
    
    // Handle random choice transitions
    let finalConfig = transitionConfig;
    if (transitionConfig.type === 'random_choice') {
        finalConfig = selectRandomChoice(transitionConfig.choices);
        console.log(`Entity transition: ${currentEntity.name} → randomly selected entity ${finalConfig.entity_id} (${trigger})`);
    } else {
        console.log(`Entity transition: ${currentEntity.name} → entity ${finalConfig.entity_id} (${trigger})`);
    }
    
    // Play sound if specified
    if (finalConfig.sound) {
        if (finalConfig.sound === 'crystal') {
            gameAudio.playCrystalSound();
        } else if (finalConfig.sound === 'crystals-reveal') {
            gameAudio.playCrystalRevealSound();
        } else {
            gameAudio.playSound(finalConfig.sound);
        }
    }
    
    // Play animation if specified
    if (finalConfig.animation) {
        playTransitionAnimation(row, col, finalConfig.animation);
    }
    
    // Transform to new entity
    transformEntity(row, col, finalConfig.entity_id);
    
    const newEntity = getCurrentEntity(row, col);
    
    // Set appropriate content state for new entity
    if (newEntity.id === 0) { // Empty
        setContent(row, col, CONTENT_STATE.EMPTY);
        // Mark this tile as having been transitioned to empty (not naturally empty)
        tileTransitionedToEmpty[row][col] = true;
        console.log(`Tile [${row}, ${col}] cleared to empty state`);
    } else {
        setContent(row, col, CONTENT_STATE.ALIVE);
        console.log(`Tile [${row}, ${col}] now contains: ${newEntity.name}`);
    }
    
    updateGameBoard();
}

function selectRandomChoice(choices) {
    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const choice of choices) {
        currentWeight += choice.weight;
        if (random <= currentWeight) {
            return choice;
        }
    }
    
    // Fallback to first choice
    return choices[0];
}

function processCombatResult(row, col, tileData) {
    // Deduct health based on enemy level
    const enemyLevel = getThemedEntityLevel(tileData);
    takeDamage(enemyLevel, tileData);
    
    // Gain experience equal to enemy level (if not marked as no-experience)
    if (!hasNoExperience(tileData)) {
        addExperience(enemyLevel);
    }
    
    // Update entity count
    updateEntityCount(tileData, false);
    
    // Check for win trigger (Ancient Dragon defeated)
    if (hasTag(tileData, 'trigger-win-game')) {
        console.log(`🎉 VICTORY! ${tileData.name} defeated! Showing win dialog...`);
        // Small delay to allow UI to update before showing dialog
        setTimeout(() => {
            showWinDialog();
        }, 1000);
    }
    
    console.log(`Combat result: ${tileData.name} defeated, took ${enemyLevel} damage`);
}

function processTreasureClaim(row, col, tileData) {
    // Handle different treasure types
    if (isCrystal(tileData)) {
        // Crystal logic with new sequence system
        const crystalColor = getCrystalColorByQuadrant(row, col);
        
        // Check crystal sequence if new system is available
        if (typeof processCrystalCollection === 'function') {
            const result = processCrystalCollection(crystalColor);
            
            switch (result) {
                case 'sequence_correct':
                    gameAudio.playCrystalSound();
                    addExperience(2); // Bonus experience for correct sequence
                    console.log(`Claimed ${crystalColor} crystal (sequence correct) - gained 2 experience`);
                    break;
                case 'sequence_complete':
                    gameAudio.playCrystalRevealSound(); // Special sound for completion
                    addExperience(3); // Extra bonus for completing sequence
                    console.log(`Claimed ${crystalColor} crystal (sequence complete!) - gained 3 experience`);
                    break;
                case 'sequence_reset':
                    gameAudio.playClickSound(); // Different sound for wrong crystal
                    addExperience(1); // Still get normal experience
                    console.log(`Claimed ${crystalColor} crystal (wrong sequence, reset) - gained 1 experience`);
                    break;
                default: // 'normal'
                    gameAudio.playCrystalSound();
                    addExperience(1);
                    console.log(`Claimed ${crystalColor} crystal (no sequence) - gained 1 experience`);
                    break;
            }
        } else {
            // Fallback to original logic
            gameAudio.playCrystalSound();
            addExperience(1);
            console.log(`Claimed crystal at [${row}, ${col}] (${crystalColor}), gained 1 experience`);
        }
    } else if (tileData.id === 8) { // Treasure Chest - don't heal, just drop items
        // Treasure chests should not heal the player - they drop items via entity_transition
        gameAudio.playCrystalSound();
        console.log(`Claimed treasure chest at [${row}, ${col}]: ${tileData.name}, will drop item`);
    } else if (tileData.id === 9) { // Health Elixir - this should heal
        // Health Elixir should heal the player
        const healAmount = getHealAmount();
        playerStats.health = Math.min(playerStats.maxHealth, playerStats.health + healAmount);
        gameAudio.playCrystalSound();
        console.log(`Claimed treasure at [${row}, ${col}]: ${tileData.name}, restored ${healAmount} health`);
    } else if (hasTag(tileData, 'item')) {
        // Items (scrolls, tomes, etc.) should not heal - they have their own effects
        gameAudio.playCrystalSound();
        console.log(`Claimed item at [${row}, ${col}]: ${tileData.name}, no healing effect`);
        
        // Add item to inventory if it's the tome
        if (tileData.id === 18) { // Tome of Crystal Resonance
            if (typeof addItemToInventory === 'function') {
                const added = addItemToInventory(tileData);
                if (added) {
                    // Show crystal secret dialog immediately when tome is collected
                    setTimeout(() => {
                        if (typeof showCrystalSecretDialog === 'function') {
                            showCrystalSecretDialog();
                        }
                    }, 500); // Small delay to let the claim animation finish
                }
            }
        }
    } else {
        // Other regular treasures (not chests or items)
        const healAmount = getHealAmount();
        playerStats.health = Math.min(playerStats.maxHealth, playerStats.health + healAmount);
        gameAudio.playCrystalSound();
        console.log(`Claimed treasure at [${row}, ${col}]: ${tileData.name}, restored ${healAmount} health`);
    }
    
    // Check for win trigger (Victory Crown claimed)
    if (hasTag(tileData, 'trigger-win-game')) {
        console.log(`🎉 VICTORY! ${tileData.name} claimed! Showing win dialog...`);
        // Small delay to allow UI to update before showing dialog
        setTimeout(() => {
            showWinDialog();
        }, 1000);
    }
    
    // Update entity count
    updateEntityCount(tileData, false);
    updatePlayerStatsDisplay();
}

function processTrapTrigger(row, col, tileData) {
    // Special case: Spyglass should not deal damage - it's beneficial
    if (isSkyglass(tileData)) {
        // Spyglass is beneficial, no damage
        console.log(`Triggered spyglass at [${row}, ${col}]: ${tileData.name}, no damage`);
    } else {
        // Check entity level - items with level 0 should not deal damage
        const entityLevel = getThemedEntityLevel(tileData);
        if (entityLevel === 0) {
            // Level 0 items should not deal damage (e.g., Firefly Essence)
            console.log(`Triggered level 0 item at [${row}, ${col}]: ${tileData.name}, no damage`);
        } else {
            // Other traps deal damage
            takeDamage(2, tileData);
            console.log(`Triggered trap at [${row}, ${col}]: ${tileData.name}, took 2 damage`);
        }
    }
    
    // Update entity count
    updateEntityCount(tileData, false);
}

function updateTileSprite(row, col, spriteState) {
    const cell = document.querySelector(`#game-board td[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    
    const canvas = cell.querySelector('canvas');
    if (!canvas) return;
    
    const tileData = getCurrentEntity(row, col);
    if (!tileData) return;
    
    const baseTile = getTileCoordinates('revealed');
    const entitySprite = getSpriteCoordinates(tileData, spriteState);
    
    drawLayeredSprite(canvas, [baseTile, null, entitySprite]);
}

function playTransitionAnimation(row, col, animationType) {
    console.log(`Playing ${animationType} animation for tile at [${row}, ${col}]`);
    // Placeholder for animation system integration
}

// ========== WIN CONDITION CHECKING ==========
// Note: Win condition is now handled via the trigger-win-game tag system
// in processCombatResult() when the Ancient Dragon is defeated

function processRewardTags(row, col, tileData) {
    if (!tileData?.tags) return;
    
    for (const tag of tileData.tags) {
        if (tag.startsWith('reward-experience=')) {
            const expAmount = parseInt(tag.split('=')[1]) || 0;
            if (expAmount > 0) {
                addExperience(expAmount);
                console.log(`Experience reward: gained ${expAmount} experience from ${tileData.name}`);
            }
        }
        // Add support for other reward types here in the future
        // e.g., reward-health=5, reward-gold=10, etc.
    }
}