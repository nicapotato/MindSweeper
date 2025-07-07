// Function to show cave details popover
function showCaveDetailsPopover(cave, event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Remove any existing popover first
    removeActivePopover();

    const popover = document.createElement('div');
    popover.className = 'cave-details-popover';
    popover.style.position = 'absolute';
    popover.style.zIndex = '1000';

    const content = document.createElement('div');
    content.className = 'cave-details-content';

    // Cave header
    const header = document.createElement('div');
    header.className = 'cave-details-header';
    header.textContent = `Cave ${cave.caveNumber}`;

    // Completion date
    const completionDate = document.createElement('div');
    completionDate.className = 'cave-details-date';
    const date = new Date(cave.completedAt);
    completionDate.textContent = `Completed: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;

    // Elapsed time
    const elapsedTime = document.createElement('div');
    elapsedTime.className = 'cave-details-time';
    elapsedTime.textContent = `Completion Time: ${formatTime(cave.elapsedTime)}`;

    // Achievements
    const achievementsDiv = document.createElement('div');
    achievementsDiv.className = 'cave-details-achievements';
    if (cave.achievements && cave.achievements.length > 0) {
        const achievementNames = cave.achievements.map(id => ACHIEVEMENTS[id]?.name || id).join(', ');
        achievementsDiv.textContent = `Achievements Earned: ${achievementNames}`;
    } else {
        achievementsDiv.textContent = 'No achievements earned';
        achievementsDiv.style.fontStyle = 'italic';
        achievementsDiv.style.color = '#888';
    }

    content.appendChild(header);
    content.appendChild(completionDate);
    content.appendChild(elapsedTime);
    content.appendChild(achievementsDiv);

    popover.appendChild(content);

    // Position the popover
    const rect = event.target.getBoundingClientRect();
    popover.style.left = `${rect.right + 10}px`;
    popover.style.top = `${rect.top}px`;

    document.body.appendChild(popover);
    activePopover = popover;

    // Add listener to close when clicking outside
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 0);
}


// Function to switch sidebar panels
function switchSidebarPanel(panelId) {
    // Hide all panels
    const panels = document.querySelectorAll('.sidebar-panel');
    panels.forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Show selected panel
    const selectedPanel = document.getElementById(panelId + '-panel');
    if (selectedPanel) {
        selectedPanel.classList.add('active');
    }
    
    // Update tab button states
    const tabs = document.querySelectorAll('.panel-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Set active tab
    const activeTab = document.querySelector(`.panel-tab[data-panel="${panelId}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

// Function to handle panel tab click
function handlePanelTabClick(event) {
    const selectedPanel = event.target.dataset.panel;
    switchSidebarPanel(selectedPanel);
}

// Function to hide the loading skeleton and show the real game
function hideLoadingSkeleton() {
    const boardSkeleton = document.getElementById('board-loading-skeleton');
    const statsSkeleton = document.getElementById('stats-loading-skeleton');
    const gameBoard = document.getElementById('game-board');
    const playerStats = document.getElementById('player-stats');
    
    if (boardSkeleton) boardSkeleton.style.display = 'none';
    if (statsSkeleton) statsSkeleton.style.display = 'none';
    if (gameBoard) gameBoard.style.display = 'table';
    if (playerStats) playerStats.style.display = 'block';
}


// Function to show the loading skeleton
function showLoadingSkeleton() {
    const boardSkeleton = document.getElementById('board-loading-skeleton');
    const statsSkeleton = document.getElementById('stats-loading-skeleton');
    const gameBoard = document.getElementById('game-board');
    const playerStats = document.getElementById('player-stats');
    
    if (boardSkeleton) boardSkeleton.style.display = 'flex';
    if (statsSkeleton) statsSkeleton.style.display = 'block';
    if (gameBoard) gameBoard.style.display = 'none';
    if (playerStats) playerStats.style.display = 'none';
}

// Function to create the skeleton grid based on config
function createLoadingSkeleton() {
    const skeletonGrid = document.querySelector('.skeleton-grid');
    if (!skeletonGrid) return;
    
    // Clear any existing skeleton cells
    skeletonGrid.innerHTML = '';
    
    // Get dimensions from config or use defaults
    const rows = gameConfig?.rows || 10;
    const cols = gameConfig?.cols || 14;
    
    // Update CSS grid template
    skeletonGrid.style.gridTemplateColumns = `repeat(${cols}, 65px)`;
    skeletonGrid.style.gridTemplateRows = `repeat(${rows}, 65px)`;
    
    // Create skeleton cells
    for (let i = 0; i < rows * cols; i++) {
        const cell = document.createElement('div');
        cell.className = 'skeleton-cell';
        skeletonGrid.appendChild(cell);
    }
}

// Function to detect if user is admin (simple check for demo)
function checkAdminStatus() {
    // Simple admin detection - in a real app, this would check user roles
    // For now, we'll use a simple method like checking localStorage or URL params
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin');
    const adminLocal = localStorage.getItem('mindsweeper_admin_mode');
    
    isAdminUser = adminParam === 'true' || adminLocal === 'true';
    console.log("Admin status:", isAdminUser);
    
    // Show/hide admin section based on status
    const adminSection = document.getElementById('admin-settings-section');
    if (adminSection) {
        adminSection.style.display = isAdminUser ? 'flex' : 'none';
    }
}

// Function to toggle admin mode (for demo purposes)
function toggleAdminMode() {
    isAdminUser = !isAdminUser;
    localStorage.setItem('mindsweeper_admin_mode', isAdminUser.toString());
    console.log("Admin mode toggled:", isAdminUser);
    
    // Update the admin section visibility
    const adminSection = document.getElementById('admin-settings-section');
    if (adminSection) {
        adminSection.style.display = isAdminUser ? 'flex' : 'none';
    }
}

// Function to toggle the settings popover
function toggleSettingsPopover(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Assert popover exists - fail loud if DOM is broken
    const popover = assertDOMElement('settings-popover', 'settings interface');
    
    settingsPopoverVisible = !settingsPopoverVisible;
    console.log("Settings popover visibility:", settingsPopoverVisible);
    
    if (settingsPopoverVisible) {
        // Update with current sound settings before showing
        const musicToggle = popover.querySelector('#music-toggle');
        const soundToggle = popover.querySelector('#sound-toggle');
        const adminToggle = popover.querySelector('#admin-mode-toggle');
        const godModeToggle = popover.querySelector('#god-mode-toggle');
        
        if (musicToggle) musicToggle.checked = gameAudio.getMusicEnabled();
        if (soundToggle) soundToggle.checked = gameAudio.getSoundEnabled();
        if (adminToggle) adminToggle.checked = isAdminUser;
        if (godModeToggle) {
            const godModeEnabled = localStorage.getItem('mindsweeper_god_mode') === 'true';
            godModeToggle.checked = godModeEnabled;
        }
        
        // Check admin status and show/hide admin section
        checkAdminStatus();
        
        popover.style.display = 'flex';
        // Close entities popover if open
        document.getElementById('entities-popover').style.display = 'none';
        // Add document click listener to close popover when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeSettingsPopoverOnClickOutside);
        }, 100);
    } else {
        popover.style.display = 'none';
        document.removeEventListener('click', closeSettingsPopoverOnClickOutside);
    }
}

// Close settings popover when clicking outside of it
function closeSettingsPopoverOnClickOutside(event) {
    const popover = document.getElementById('settings-popover');
    const settingsBtn = document.getElementById('settings-btn');
    const howToPlayBtn = document.getElementById('how-to-play-btn');

    if (!popover || !settingsBtn) return;

    // If click is outside the popover and not on any of the control buttons
    if (!popover.contains(event.target) && 
        event.target !== settingsBtn && 
        event.target !== howToPlayBtn) {
        settingsPopoverVisible = false;
        popover.style.display = 'none';
        document.removeEventListener('click', closeSettingsPopoverOnClickOutside);
    }
}

// Function to toggle the entities popover
function toggleEntitiesPopover(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const popover = document.getElementById('entities-popover');
    if (!popover) {
        console.error("Entities popover element not found!");
        return;
    }
    
    entitiesPopoverVisible = !entitiesPopoverVisible;
    console.log("Entities popover visibility:", entitiesPopoverVisible);
    
    if (entitiesPopoverVisible) {
        popover.style.display = 'flex';
        // Close settings popover if open
        document.getElementById('settings-popover').style.display = 'none';
        settingsPopoverVisible = false;
        // Close How to Play popover if open
        document.getElementById('how-to-play-popover').style.display = 'none';
        howToPlayPopoverVisible = false;
        // Add document click listener to close popover when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeEntitiesPopoverOnClickOutside);
        }, 100);
    } else {
        popover.style.display = 'none';
        document.removeEventListener('click', closeEntitiesPopoverOnClickOutside);
    }
}

// Close entities popover when clicking outside of it
function closeEntitiesPopoverOnClickOutside(event) {
    const popover = document.getElementById('entities-popover');
    const entitiesBtn = document.getElementById('entities-btn');
    const settingsBtn = document.getElementById('settings-btn'); // Get settings button

    if (!popover || !entitiesBtn) return;

    // If click is outside both the popover and the relevant buttons
    if (!popover.contains(event.target) && 
        event.target !== entitiesBtn && 
        event.target !== settingsBtn) { 
        entitiesPopoverVisible = false;
        popover.style.display = 'none';
        document.removeEventListener('click', closeEntitiesPopoverOnClickOutside);
    }
}

// Function to toggle the How to Play popover
function toggleHowToPlayPopover(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const popover = document.getElementById('how-to-play-popover');
    if (!popover) {
        console.error("How to Play popover element not found!");
        return;
    }

    howToPlayPopoverVisible = !howToPlayPopoverVisible;
    console.log("How to Play popover visibility:", howToPlayPopoverVisible);

    if (howToPlayPopoverVisible) {
        popover.style.display = 'flex'; // Use flex or block based on your CSS for popovers
        // Close other popovers
        document.getElementById('settings-popover').style.display = 'none';
        settingsPopoverVisible = false;
        // Add document click listener to close popover when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeHowToPlayPopoverOnClickOutside);
        }, 100);
    } else {
        popover.style.display = 'none';
        document.removeEventListener('click', closeHowToPlayPopoverOnClickOutside);
    }
}

// Close How to Play popover when clicking outside of it
function closeHowToPlayPopoverOnClickOutside(event) {
    const popover = document.getElementById('how-to-play-popover');
    const howToPlayBtn = document.getElementById('how-to-play-btn');
    const settingsBtn = document.getElementById('settings-btn');

    if (!popover || !howToPlayBtn) return;

    // If click is outside the popover and not on any of the control buttons
    if (!popover.contains(event.target) && 
        event.target !== howToPlayBtn && 
        event.target !== settingsBtn) {
        howToPlayPopoverVisible = false;
        popover.style.display = 'none';
        document.removeEventListener('click', closeHowToPlayPopoverOnClickOutside);
    }
}

// Handle clicks outside the popover
function handleOutsideClick(e) {
    if (activePopover && !activePopover.contains(e.target) && 
        !e.target.closest('.annotation-popover')) {
        removeActivePopover();
    }
}

// Remove any active popover
function removeActivePopover() {
    if (activePopover) {
        document.removeEventListener('click', handleOutsideClick);
        activePopover.remove();
        activePopover = null;
    }
}

// Function to initialize entity counts
function initializeEntityCounts() {
    entityCounts = {};
    
    // Count all initial entities
    for (let r = 0; r < currentBoard.length; r++) {
        for (let c = 0; c < currentBoard[r].length; c++) {
            const tileData = currentBoard[r][c];
            // Count any entity with enemy, trap, treasure, crystal, skyglass, or monolith tags
            if (isEnemy(tileData) || isTreasure(tileData) || isVineTrap(tileData) || isCrystal(tileData) || isSkyglass(tileData) || isMonolith(tileData)) {
                // Find the entity key for this tile
                // v2.0 format - use entity ID directly
                const entityKey = `E${tileData.id}`;  // Convert ID to key format for compatibility
                
                if (entityKey && !entityCounts[entityKey]) {
                    // Determine entity type for display purposes
                    let entityType = 'unknown';
                    if (isEnemy(tileData)) {
                        // All entities with "enemy" tag should be classified as hostile
                        entityType = 'hostile';
                    } else if (isVineTrap(tileData) || isMonolith(tileData)) {
                        entityType = 'neutral'; // Traps and walls go to neutral
                    } else if (isTreasure(tileData) || isCrystal(tileData) || isSkyglass(tileData)) {
                        entityType = 'friendly'; // Treasures, crystals, and skyglasses are friendly
                    } else if (isNeutral(tileData)) {
                        entityType = 'friendly'; // Other neutral entities default to friendly
                    }
                    
                    entityCounts[entityKey] = {
                        total: 0,
                        alive: 0,
                        type: entityType,
                        data: tileData,
                        key: entityKey
                    };
                }
                if (entityKey) {
                    entityCounts[entityKey].total++;
                    entityCounts[entityKey].alive++;
                }
            }
        }
    }
    
    // Update the display
    updateEntityCountsDisplay();
}

// Function to update entity counts when a tile is revealed/killed/claimed
function updateEntityCount(tileData, isAlive) {
    if (!tileData || (!isEnemy(tileData) && !isTreasure(tileData) && !isCrystal(tileData) && !isSkyglass(tileData) && !isMonolith(tileData) && !isVineTrap(tileData))) return;
    
    // Find the entity key for this tile
    // v2.0 format - use entity ID directly
    const entityKey = `E${tileData.id}`;  // Convert ID to key format for compatibility
    
    if (entityKey && entityCounts[entityKey]) {
        if (isAlive) {
            entityCounts[entityKey].alive++;
        } else {
            entityCounts[entityKey].alive = Math.max(0, entityCounts[entityKey].alive - 1);
        }
        
        // Update the display
        updateEntityCountsDisplay();
    }
}

// Function to render the entity counts in the UI
function updateEntityCountsDisplay() {
    const entityListElement = document.getElementById('entity-list');
    if (!entityListElement) return;
    
    // Clear the current list
    entityListElement.innerHTML = '';
    
    // Convert the entityCounts object to an array for sorting
    const entityList = Object.values(entityCounts);
    
    // Group entities by type
    const groupedEntities = {
        hostile: [],
        neutral: [],
        friendly: []
    };
    
    entityList.forEach(entity => {
        if (groupedEntities[entity.type]) {
            groupedEntities[entity.type].push(entity);
        }
    });
    
    // Sort each group by themed level (lowest to highest)
    Object.keys(groupedEntities).forEach(type => {
        groupedEntities[type].sort((a, b) => {
            // Get themed levels for both entities
            const aThemedData = getEntityDisplayData(a.key);
            const bThemedData = getEntityDisplayData(b.key);
            const aLevel = aThemedData ? aThemedData.level : (a.data.level || 0);
            const bLevel = bThemedData ? bThemedData.level : (b.data.level || 0);
            return aLevel - bLevel;
        });
    });
    
    // Create sections for each entity type
    const sectionOrder = ['hostile', 'neutral', 'friendly'];
    sectionOrder.forEach(sectionType => {
        const entities = groupedEntities[sectionType];
        if (entities.length === 0) return;
        
        // Create section container
        const sectionContainer = document.createElement('div');
        sectionContainer.className = 'entity-section';
        
        // Create section header
        const sectionHeader = document.createElement('div');
        sectionHeader.className = `entity-section-header ${sectionType}`;
        sectionHeader.textContent = sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
        sectionContainer.appendChild(sectionHeader);
        
        // Add entities to section
        entities.forEach(entity => {
            const countItem = document.createElement('div');
            countItem.className = 'entity-count';
            
            // Add specific class based on entity type for backward compatibility
            const legacyType = sectionType === 'hostile' ? 'enemy' : 
                              sectionType === 'neutral' ? 'trap' : 'treasure';
            countItem.classList.add(legacyType);
            
            // Create canvas for sprite icon
            const iconCanvas = document.createElement('canvas');
            iconCanvas.className = 'entity-icon';
            if (isCrystal(entity.data)) {
                iconCanvas.classList.add('crystal-composite');
            }
            iconCanvas.width = gameConfig.sprite_settings.cell_width || 16;
            iconCanvas.height = gameConfig.sprite_settings.cell_height || 16;
            
            // For crystals, use the first red crystal sprite as the icon
            if (isCrystal(entity.data)) {
                if (entity.data.sprites && entity.data.sprites['red']) {
                    const spriteData = entity.data.sprites['red'];
                    const spriteSheetKey = spriteData.sprite_sheet || 'new_sprites';
                    
                    if (spriteStrips[spriteSheetKey]) {
                        const ctx = iconCanvas.getContext('2d');
                        const spriteStrip = spriteStrips[spriteSheetKey];
                        
                        // Use the first red crystal variation (x[0])
                        const xCoord = Array.isArray(spriteData.x) ? spriteData.x[0] : spriteData.x;
                        const sx = xCoord * spriteStrip.cellw;
                        const sy = spriteData.y * spriteStrip.cellh;
                        
                        ctx.drawImage(
                            spriteStrip.img,
                            sx, sy, 
                            spriteStrip.cellw, spriteStrip.cellh,
                            0, 0, 
                            iconCanvas.width, iconCanvas.height
                        );
                    }
                }
            } else {
                // Draw appropriate sprite for non-crystals
                let spriteCoords = getSpriteCoordinates(entity.data, 'revealed');
                
                // Special case: Use hostile form sprite for Mimic in entity panel
                if (entity.data.id === 17 && entity.data.sprites && entity.data.sprites['revealed-hostile']) {
                    spriteCoords = getSpriteCoordinates(entity.data, 'revealed-hostile');
                }
                
                // Use the sprite sheet specified in the sprite data, default to monsters
                const spriteSheetKey = spriteCoords.spriteSheet || 'monsters';
                drawSprite(iconCanvas, spriteCoords.x, spriteCoords.y, false, spriteSheetKey);
            }
            
            // Create name and count elements
            const nameSpan = document.createElement('span');
            nameSpan.className = 'entity-name';
            
            // Check if this entity has been transformed (like Blue Catnip)
            // If the tile data itself has been modified, use that instead of themed data
            let displayName, displayLevel, themedData;
            
            if (entity.data.name === "Blue Catnip" && entity.data.level === 5) {
                // This is a transformed entity, use the actual tile data
                displayName = entity.data.name;
                displayLevel = entity.data.level;
                themedData = null; // No themed data for transformed entities
            } else {
                // Get themed entity data using the entity key
                themedData = getEntityDisplayData(entity.key);
                // Use themed name and level, fallback to original data
                displayName = themedData ? themedData.name : entity.data.name;
                displayLevel = themedData ? themedData.level : (entity.data.level || 1);
            }
            
            nameSpan.textContent = `L${displayLevel} ${displayName}`;
            
            // Add title with description for tooltip
            if (themedData && themedData.description) {
                nameSpan.title = themedData.description;
            }
            
            const countSpan = document.createElement('span');
            countSpan.className = 'entity-number';
            countSpan.textContent = `${entity.alive}/${entity.total}`;
            
            // Add color based on count and type
            if (entity.alive === 0) {
                countSpan.style.color = '#4CAF50'; // Green for completed
            } else if (entity.alive < entity.total) {
                countSpan.style.color = sectionType === 'neutral' ? '#FF5722' : '#FFA500'; // Orange for in progress, red-orange for neutral
            } else if (sectionType === 'neutral') {
                countSpan.style.color = '#FF5722'; // Red-orange for neutral
            }
            
            // Append elements to count item
            countItem.appendChild(iconCanvas);
            countItem.appendChild(nameSpan);
            countItem.appendChild(countSpan);
            
            // Append count item to section
            sectionContainer.appendChild(countItem);
        });
        
        // Append section to entity list
        entityListElement.appendChild(sectionContainer);
    });
}


// Function to show a custom win dialog
function showWinDialog() {
    // Play victory sound
    gameAudio.playVictorySound();
    
    // Check achievements before showing dialog
    const newAchievements = [];
    const qualifyingAchievements = [];
    const savedAchievements = loadAchievements();
    
    // Check each achievement for qualification and whether it's newly earned
    Object.keys(ACHIEVEMENTS).forEach(achievementId => {
        if (checkAchievementQualifies(achievementId)) {
            qualifyingAchievements.push({
                id: achievementId,
                isNew: !savedAchievements[achievementId], // Is this newly earned?
                achievement: ACHIEVEMENTS[achievementId]
            });
            
            // Award new achievements
            if (checkAndAwardAchievement(achievementId)) {
                newAchievements.push(achievementId);
            }
        }
    });
    
    // Record the completed cave with metadata
    const currentCave = gameConfig.solution_index;
    const elapsedTime = getElapsedTime();
    const achievementsEarned = qualifyingAchievements.map(item => item.id);
    
    const wasNewCompletion = addCompletedCave(currentCave, elapsedTime, achievementsEarned);
    if (wasNewCompletion) {
        console.log(`Cave ${currentCave} completed for the first time!`);
        // Update the achievements display to show the new completed cave
        updateAchievementsDisplay();
    }

    // Create the dialog container
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'win-dialog-overlay'; // Use a different class for styling if needed
    dialogOverlay.style.position = 'fixed';
    dialogOverlay.style.top = '0';
    dialogOverlay.style.left = '0';
    dialogOverlay.style.width = '100%';
    dialogOverlay.style.height = '100%';
    dialogOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    dialogOverlay.style.display = 'flex';
    dialogOverlay.style.justifyContent = 'center';
    dialogOverlay.style.alignItems = 'center';
    dialogOverlay.style.zIndex = '1000';

    // Create dialog box
    const dialogBox = document.createElement('div');
    dialogBox.className = 'win-dialog'; // Use a different class for styling if needed
    dialogBox.style.backgroundColor = '#2a2a2a';
    dialogBox.style.border = '2px solid #0a0'; // Green border for win
    dialogBox.style.borderRadius = '10px';
    dialogBox.style.padding = '20px';
    dialogBox.style.boxShadow = '0 0 20px #00ff00'; // Green shadow for win
    dialogBox.style.textAlign = 'center';
    dialogBox.style.maxWidth = '400px';
    dialogBox.style.minWidth = '300px';

    // Add dragon image container
    const dragonContainer = document.createElement('div');
    dragonContainer.style.marginBottom = '15px';
    
    const dragonImage = document.createElement('img');
    dragonImage.src = 'assets-nb/big-red-dragon.png';
    dragonImage.alt = 'Victory Dragon';
    dragonImage.style.maxWidth = '150px';
    dragonImage.style.maxHeight = '150px';
    dragonImage.style.imageRendering = 'pixelated'; // Preserve pixel art style
    dragonImage.style.border = '2px solid #00ff00';
    dragonImage.style.borderRadius = '8px';
    dragonImage.style.backgroundColor = '#1a1a1a';
    dragonImage.style.padding = '10px';
    
    dragonContainer.appendChild(dragonImage);

    // Add title without emoji
    const title = document.createElement('h2');
    title.style.color = '#00ff00'; // Green color for win
    title.style.margin = '0 0 15px 0';
    title.innerHTML = 'You Have Won!';
    
    // Add elapsed time section
    const timeSection = document.createElement('div');
    timeSection.style.marginBottom = '15px';
    timeSection.style.color = '#ffffff';
    
    const timeText = document.createElement('p');
    timeText.style.margin = '5px 0';
    timeText.style.fontWeight = 'bold';
    timeText.textContent = `Time: ${formatTime(getElapsedTime())}`;
    timeSection.appendChild(timeText);

    // Add message
    const message = document.createElement('p');
    message.style.color = '#ffffff';
    message.style.marginBottom = '20px';
    message.textContent = 'You have defeated the Dragon Boss! Would you like to start a new adventure?';

    // Add achievements section if any qualify
    let achievementsSection = null;
    if (qualifyingAchievements.length > 0) {
        achievementsSection = document.createElement('div');
        achievementsSection.style.marginBottom = '20px';
        achievementsSection.style.padding = '10px';
        achievementsSection.style.backgroundColor = '#1a1a1a';
        achievementsSection.style.border = '1px solid #00ff00';
        achievementsSection.style.borderRadius = '5px';
        
        const achievementTitle = document.createElement('h3');
        achievementTitle.style.color = '#00ff00';
        achievementTitle.style.margin = '0 0 10px 0';
        achievementTitle.textContent = 'Qualifying Achievements';
        achievementsSection.appendChild(achievementTitle);
        
        qualifyingAchievements.forEach(item => {
            const achievementRow = document.createElement('div');
            achievementRow.style.display = 'flex';
            achievementRow.style.alignItems = 'center';
            achievementRow.style.marginBottom = '5px';
            achievementRow.style.gap = '10px';
            
            // Different styling for new vs. already earned
            if (item.isNew) {
                achievementRow.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
                achievementRow.style.border = '1px solid rgba(0, 255, 0, 0.3)';
                achievementRow.style.borderRadius = '4px';
                achievementRow.style.padding = '5px';
            } else {
                achievementRow.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                achievementRow.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                achievementRow.style.borderRadius = '4px';
                achievementRow.style.padding = '5px';
            }
            
            // Create achievement sprite
            const achievementCanvas = document.createElement('canvas');
            achievementCanvas.width = 24;
            achievementCanvas.height = 24;
            achievementCanvas.style.imageRendering = 'pixelated';
            achievementCanvas.style.border = item.isNew ? '1px solid #00ff00' : '1px solid #666';
            achievementCanvas.style.borderRadius = '4px';
            
            if (spriteStrips[item.achievement.sprite.spriteSheet]) {
                drawSprite(achievementCanvas, item.achievement.sprite.x, item.achievement.sprite.y, false, item.achievement.sprite.spriteSheet);
            }
            
            const achievementText = document.createElement('div');
            achievementText.style.textAlign = 'left';
            achievementText.style.color = '#ffffff';
            achievementText.style.flex = '1';
            
            const achievementName = document.createElement('div');
            achievementName.style.fontWeight = 'bold';
            achievementName.style.display = 'flex';
            achievementName.style.alignItems = 'center';
            achievementName.style.gap = '5px';
            achievementName.textContent = item.achievement.name;
            
            // Add "NEW!" badge for newly earned achievements
            if (item.isNew) {
                const newBadge = document.createElement('span');
                newBadge.style.backgroundColor = '#00ff00';
                newBadge.style.color = '#000';
                newBadge.style.fontSize = '10px';
                newBadge.style.fontWeight = 'bold';
                newBadge.style.padding = '2px 4px';
                newBadge.style.borderRadius = '3px';
                newBadge.style.textTransform = 'uppercase';
                newBadge.textContent = 'NEW!';
                achievementName.appendChild(newBadge);
            }
            
            const achievementDesc = document.createElement('div');
            achievementDesc.style.fontSize = '12px';
            achievementDesc.style.color = item.isNew ? '#cccccc' : '#888';
            achievementDesc.textContent = item.achievement.description;
            
            achievementText.appendChild(achievementName);
            achievementText.appendChild(achievementDesc);
            
            achievementRow.appendChild(achievementCanvas);
            achievementRow.appendChild(achievementText);
            achievementsSection.appendChild(achievementRow);
        });
    }

    // Create New Map button
    const newMapBtn = document.createElement('button');
    newMapBtn.className = 'win-new-map-btn'; // Use a different class for styling if needed
    newMapBtn.textContent = 'New Map';
    newMapBtn.style.padding = '10px 20px';
    newMapBtn.style.backgroundColor = '#4a0'; // Same button style as death screen
    newMapBtn.style.color = '#fff';
    newMapBtn.style.border = 'none';
    newMapBtn.style.borderRadius = '4px';
    newMapBtn.style.fontSize = '16px';
    newMapBtn.style.cursor = 'pointer';
    newMapBtn.style.margin = '0 10px';

    // Add click event to New Map button
    newMapBtn.addEventListener('click', () => {
        // Remove the dialog
        document.body.removeChild(dialogOverlay);
        // Load a new map
        loadNewMap();
    });

    // Add elements to the dialog
    dialogBox.appendChild(dragonContainer);
    dialogBox.appendChild(title);
    dialogBox.appendChild(timeSection);
    dialogBox.appendChild(message);
    if (achievementsSection) {
        dialogBox.appendChild(achievementsSection);
    }
    dialogBox.appendChild(newMapBtn);

    // Add the dialog to the overlay
    dialogOverlay.appendChild(dialogBox);

    // Add the overlay to the body
    document.body.appendChild(dialogOverlay);
}


// Function to show a custom death dialog
function showDeathDialog(killerEntity = null) { // Accept killer entity
    // Stop any existing skull animation
    stopSkullAnimation();
    
    // Create the dialog container
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'death-dialog-overlay';
    dialogOverlay.style.position = 'fixed';
    dialogOverlay.style.top = '0';
    dialogOverlay.style.left = '0';
    dialogOverlay.style.width = '100%';
    dialogOverlay.style.height = '100%';
    dialogOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    dialogOverlay.style.display = 'flex';
    dialogOverlay.style.justifyContent = 'center';
    dialogOverlay.style.alignItems = 'center';
    dialogOverlay.style.zIndex = '1000';
    
    // Create dialog box
    const dialogBox = document.createElement('div');
    dialogBox.className = 'death-dialog';
    dialogBox.style.backgroundColor = '#2a2a2a';
    dialogBox.style.border = '2px solid #a00';
    dialogBox.style.borderRadius = '10px';
    dialogBox.style.padding = '20px';
    dialogBox.style.boxShadow = '0 0 20px #ff0000';
    dialogBox.style.textAlign = 'center';
    dialogBox.style.maxWidth = '400px';
    dialogBox.style.minWidth = '300px';
    
    // Add animated skull container
    const skullContainer = document.createElement('div');
    skullContainer.style.marginBottom = '15px';
    skullContainer.style.display = 'flex';
    skullContainer.style.justifyContent = 'center';
    skullContainer.style.alignItems = 'center';
    
    const skullCanvas = createAnimatedSkullCanvas();
    skullContainer.appendChild(skullCanvas);
    
    // Add title without emoji (since we have animated skull now)
    const title = document.createElement('h2');
    title.style.color = '#ff0000';
    title.style.margin = '0 0 15px 0';
    title.innerHTML = 'You Have Died!';
    
    // Add elapsed time section
    const timeSection = document.createElement('div');
    timeSection.style.marginBottom = '15px';
    timeSection.style.color = '#ffffff';
    
    const timeText = document.createElement('p');
    timeText.style.margin = '5px 0';
    timeText.style.fontWeight = 'bold';
    timeText.textContent = `Time Survived: ${formatTime(getElapsedTime())}`;
    timeSection.appendChild(timeText);

    // Add message
    const message = document.createElement('p');
    message.style.color = '#ffffff';
    message.style.marginBottom = '20px';
    message.textContent = 'Your health has reached zero. Would you like to start a new adventure?';
    
    // Section for killer information
    const killerInfoSection = document.createElement('div');
    killerInfoSection.style.marginBottom = '20px';
    killerInfoSection.style.alignItems = 'center';
    killerInfoSection.style.justifyContent = 'center';
    killerInfoSection.style.display = 'flex'; // Use flex to align items
    killerInfoSection.style.gap = '10px'; // Space between sprite and text

    if (killerEntity) {
        const killedByText = document.createElement('p');
        killedByText.style.color = '#ffffff';
        killedByText.style.margin = '0'; // Reset margin
        killedByText.textContent = 'Killed by: ';

        const killerName = document.createElement('span');
        
        // Get the entity key and use themed display data
        const entityKey = getEntityKeyFromTileData(killerEntity);
        const themedData = getEntityDisplayData(entityKey);
        const displayName = themedData ? themedData.name : killerEntity.name;
        
        killerName.textContent = displayName;
        killerName.style.fontWeight = 'bold';
        killedByText.appendChild(killerName);
        
        const killerSpriteCanvas = document.createElement('canvas');
        killerSpriteCanvas.width = gameConfig.sprite_settings.cell_width * 2; // Make sprite larger
        killerSpriteCanvas.height = gameConfig.sprite_settings.cell_height * 2;
        killerSpriteCanvas.style.width = (gameConfig.sprite_settings.cell_width * 2) + 'px'; // CSS size
        killerSpriteCanvas.style.height = (gameConfig.sprite_settings.cell_height * 2) + 'px';
        killerSpriteCanvas.style.border = '1px solid #555';
        killerSpriteCanvas.style.borderRadius = '4px';
        killerSpriteCanvas.style.imageRendering = 'pixelated'; // Preserve pixel art style

        const spriteCoords = getSpriteCoordinates(killerEntity, 'revealed');
        const spriteSheetKey = spriteCoords.spriteSheet; 
        drawSprite(killerSpriteCanvas, spriteCoords.x, spriteCoords.y, false, spriteSheetKey);

        killerInfoSection.appendChild(killerSpriteCanvas);
        killerInfoSection.appendChild(killedByText);
    } else {
        const genericDeathText = document.createElement('p');
        genericDeathText.style.color = '#ffffff';
        genericDeathText.textContent = 'You have succumbed to your wounds.';
        killerInfoSection.appendChild(genericDeathText);
    }
    
    // Create New Map button
    const newMapBtn = document.createElement('button');
    newMapBtn.className = 'death-new-map-btn';
    newMapBtn.textContent = 'New Map';
    newMapBtn.style.padding = '10px 20px';
    newMapBtn.style.backgroundColor = '#4a0';
    newMapBtn.style.color = '#fff';
    newMapBtn.style.border = 'none';
    newMapBtn.style.borderRadius = '4px';
    newMapBtn.style.fontSize = '16px';
    newMapBtn.style.cursor = 'pointer';
    newMapBtn.style.margin = '0 10px';
    
    // Add click event to New Map button
    newMapBtn.addEventListener('click', () => {
        // Stop skull animation
        stopSkullAnimation();
        // Remove the dialog
        document.body.removeChild(dialogOverlay);
        // Load a new map
        loadNewMap();
    });
    
    // Add elements to the dialog
    dialogBox.appendChild(skullContainer);
    dialogBox.appendChild(title);
    dialogBox.appendChild(timeSection);
    dialogBox.appendChild(message);
    dialogBox.appendChild(killerInfoSection); // Add killer info section
    dialogBox.appendChild(newMapBtn);
    
    // Add the dialog to the overlay
    dialogOverlay.appendChild(dialogBox);
    
    // Add the overlay to the body
    document.body.appendChild(dialogOverlay);
    
    // Start the skull animation after a short delay to ensure everything is rendered
    setTimeout(() => {
        startSkullAnimation(skullCanvas);
    }, 100);
}

// Check if achievement qualifies (regardless of whether it's already been earned)
function checkAchievementQualifies(achievementId) {
    let qualifies = false;
    
    switch (achievementId) {
        case 'firefly_pacifist':
            // Check if fireflies were killed (E2 entities)
            qualifies = firefliesKilled === 0;
            break;
            
        case 'full_clear':
            // Check if all entities are defeated (all alive counts are 0)
            qualifies = Object.values(entityCounts).length > 0 && 
                       Object.values(entityCounts).every(entity => entity.alive === 0);
            break;
            
        case 'need_for_speed':
            // Check if boss was defeated in under 10 minutes
            const elapsed = getElapsedTime();
            qualifies = elapsed < 600000; // 10 minutes in milliseconds
            break;
    }
    
    return qualifies;
}