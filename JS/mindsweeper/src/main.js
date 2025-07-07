// Main entry point for MindSweeper game
// Handles DOM initialization, event listeners setup, and game startup

// Main page load handler - called from HTML onload
function onLoadPage() {
    console.log("Page loaded, starting game initialization...");
    
    // Show loading skeleton immediately
    showLoadingSkeleton();
    
    // Initialize sounds right away, before anything else
    gameAudio.initializeSounds();
    
    // Setup initial event listeners
    setupEventListeners();
    
    // Initialize the game
    initializeGame();
}

// Setup all event listeners for the game
function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    // Add click event listener for player sprite
    const playerSprite = document.getElementById('player-sprite');
    if (playerSprite) {
        playerSprite.addEventListener('click', () => gameAudio.playMcLovinSound());
    }
    
    // Add cleanup event listeners for page unload
    window.addEventListener('beforeunload', () => {
        stopSkullAnimation();
    });
    
    window.addEventListener('unload', () => {
        stopSkullAnimation();
    });
    
    // Setup panel tab switching
    const panelTabs = document.querySelectorAll('.panel-tab');
    panelTabs.forEach(tab => {
        tab.addEventListener('click', handlePanelTabClick);
    });
    
    console.log("Base event listeners setup complete");
}

// Setup game-specific button event listeners after config is loaded
function setupGameEventListeners() {
    console.log("Setting up game-specific event listeners...");
    
    // Use aggressive assertions - DOM elements MUST exist for proper game function
    // No graceful fallbacks - fail loud and early if critical elements missing
    
    // Admin/control buttons - assert they exist
    const revealBtn = assertDOMElement('reveal-all-btn', 'admin controls');
    const hideBtn = assertDOMElement('hide-all-btn', 'admin controls');
    const levelUpBtn = assertDOMElement('level-up-btn', 'player progression');
    const newMapBtn = assertDOMElement('new-map-btn', 'game navigation');
    const loadMapBtn = assertDOMElement('load-map-btn', 'admin map loading');
    const mapIndexInput = assertDOMElement('map-index-input', 'admin map loading');
    
    // Settings and UI buttons - assert they exist
    const settingsBtn = assertDOMElement('settings-btn', 'user interface');
    const spriteModeToggle = assertDOMElement('sprite-mode-toggle', 'display settings');
    const musicToggle = assertDOMElement('music-toggle', 'audio settings');
    const soundToggle = assertDOMElement('sound-toggle', 'audio settings');
    const adminModeToggle = assertDOMElement('admin-mode-toggle', 'admin interface');
    const resetAchievementsBtn = assertDOMElement('reset-achievements-btn', 'achievement system');
    const themeSelect = assertDOMElement('theme-select', 'theme system');
    
    // Setup event listeners - no defensive checking needed, elements are guaranteed to exist
    revealBtn.addEventListener('click', revealAllTiles);
    hideBtn.addEventListener('click', hideAllTiles);
    levelUpBtn.addEventListener('click', levelUp);
    newMapBtn.addEventListener('click', loadNewMap);
    settingsBtn.addEventListener('click', toggleSettingsPopover);
    
    loadMapBtn.addEventListener('click', () => {
        const index = parseInt(mapIndexInput.value);
        loadSpecificMap(index);
    });
    
    spriteModeToggle.addEventListener('change', toggleSpriteMode);
    
    musicToggle.checked = gameAudio.getMusicEnabled();
    musicToggle.addEventListener('change', gameAudio.toggleMusic.bind(gameAudio));
    
    soundToggle.checked = gameAudio.getSoundEnabled();
    soundToggle.addEventListener('change', gameAudio.toggleSound.bind(gameAudio));
    
    adminModeToggle.addEventListener('change', toggleAdminMode);
    resetAchievementsBtn.addEventListener('click', resetAchievements);
    
    // Setup GOD MODE toggle
    const godModeToggle = document.getElementById('god-mode-toggle');
    if (godModeToggle) {
        godModeToggle.addEventListener('change', toggleGodMode);
    }
    
    // Setup theme selector
    if (themeSelect && gameConfig.themes) {
        // Clear existing options
        themeSelect.innerHTML = '';
        
        // Add theme options
        for (const [themeKey, themeData] of Object.entries(gameConfig.themes)) {
            const option = document.createElement('option');
            option.value = themeKey;
            option.textContent = themeData.name;
            option.selected = themeKey === currentTheme;
            themeSelect.appendChild(option);
        }
        
        // Add change event listener
        themeSelect.addEventListener('change', (e) => {
            switchTheme(e.target.value);
        });
    }
    
    console.log("Game-specific event listeners setup complete");
}

// Initialize the game by loading config and setting up the board
async function initializeGame() {
    try {
        console.log("Initializing game...");
        
        // Initialize modular systems
        console.log("Initializing modular systems...");
        
        // Initialize game globals
        if (window.gameGlobals) {
            window.gameGlobals.initialize();
            console.log("Game globals initialized");
        }
        
        // Initialize achievement system
        if (window.achievementSystem) {
            window.achievementSystem.initialize();
            console.log("Achievement system initialized");
        }
        
        // Initialize player system
        if (window.playerSystem) {
            window.playerSystem.initialize();
            console.log("Player system initialized");
        }
        
        // Initialize theme manager
        if (window.themeManager) {
            window.themeManager.initialize();
            console.log("Theme manager initialized");
        }
        
        // Initialize entity system
        if (window.entitySystem) {
            window.entitySystem.initialize();
            console.log("Entity system initialized");
        }
        
        // Initialize game state manager
        if (window.gameStateManager) {
            window.gameStateManager.initialize();
            console.log("Game state manager initialized");
        }
        
        // Initialize UI manager
        if (window.uiManager) {
            window.uiManager.initialize();
            console.log("UI manager initialized");
        }
        
        // Load game configuration and initialize
        await fetchConfigAndInit();
        
        // Setup game-specific event listeners after config is loaded
        setupGameEventListeners();
        
        // Finalize initialization
        finalizeInitialization();
        
        console.log("Game initialization complete!");
        
    } catch (error) {
        console.error("Failed to initialize game:", error);
        handleInitializationError(error);
    }
}

// Finalize initialization after everything is loaded
function finalizeInitialization() {
    console.log("Finalizing initialization...");
    
    // Initialize sounds
    gameAudio.initializeSounds();
    
    // Check admin status on load
    checkAdminStatus();
    
    // Initialize game tracking for the first map
    resetGameTracking();
    
    // Update achievements display
    updateAchievementsDisplay();
    
    // Hide loading skeleton and show the real game
    hideLoadingSkeleton();
    
    console.log("Initialization finalized");
}

// Handle initialization errors
function handleInitializationError(error) {
    console.error("Game initialization failed:", error);
    
    // Display error message to user
    const container = document.getElementById('game-container');
    if (container) {
        container.innerHTML = '<p style="color: red;">Error loading game. Please refresh the page or check console for details.</p>';
    }
    
    // Hide loading skeleton even on error
    hideLoadingSkeleton();
}

async function fetchConfigAndInit(specificSolutionIndex = null) {
    try {
        // Show loading skeleton at the start
        showLoadingSkeleton();
        
        // 1. Fetch v2.0 config first
        const configResponse = await fetch('config_v2.json'); // Use v2.0 config
        if (!configResponse.ok) {
            throw new Error(`HTTP error fetching config! status: ${configResponse.status}`);
        }
        gameConfig = await configResponse.json();
        console.log("Config loaded:", gameConfig);
        
        // Initialize GOD MODE from localStorage before anything else
        if (typeof initializeGodMode === 'function') {
            initializeGodMode();
        }
        
        initializeEntitySystem(gameConfig);
        console.log("v2.0 Entity system initialized");
        // Expose to window for testing
        window.gameConfig = gameConfig;
        
        // Create the skeleton grid based on config dimensions
        createLoadingSkeleton();

        // Initialize theme system immediately after config loads
        currentTheme = gameConfig.default_theme || 'cats'; // Fallback to cats if no default_theme
        console.log(`Setting initial theme to: ${currentTheme}`);
        
        // Apply the theme early to ensure it's set before any entity processing
        if (gameConfig.themes && gameConfig.themes[currentTheme]) {
            applyTheme(currentTheme);
        } else {
            console.warn(`Theme '${currentTheme}' not found in config, using first available theme`);
            const firstTheme = Object.keys(gameConfig.themes || {})[0];
            if (firstTheme) {
                currentTheme = firstTheme;
                applyTheme(currentTheme);
            }
        }

        // 3. Fetch the solutions file to get all solutions at once
        const solutionsFilePath = gameConfig.solutions_file || null;
        const solutionResponse = await fetch(solutionsFilePath);
        if (!solutionResponse.ok) {
            throw new Error(`HTTP error fetching solution file ${solutionsFilePath}! status: ${solutionResponse.status}`);
        }
        allSolutions = await solutionResponse.json();
        console.log(`All solutions loaded from ${solutionsFilePath} (count: ${allSolutions.length})`);
        
        // Store total solutions count
        totalSolutions = Array.isArray(allSolutions) ? allSolutions.length : 0;
        
        // If no specific index provided and it's the initial load, use a random index
        if (specificSolutionIndex === null && !gameConfig.solution_index_initialized) {
            specificSolutionIndex = getRandomSolutionIndex(totalSolutions);
            console.log(`Starting with random solution index ${specificSolutionIndex}`);
            gameConfig.solution_index_initialized = true;
        }
        
        // Override solution index if provided
        if (specificSolutionIndex !== null) {
            gameConfig.solution_index = specificSolutionIndex;
        }

        // Update map index input max value
        const mapIndexInput = document.getElementById('map-index-input');
        if (mapIndexInput) {
            mapIndexInput.max = totalSolutions - 1;
            mapIndexInput.placeholder = `Map # (0-${totalSolutions - 1})`;
            mapIndexInput.value = gameConfig.solution_index;
        }

        // Load the sprite sheets
        await loadSpriteSheets();
        console.log("Sprite sheets loaded");

        // Initialize player stats from config
        playerStats.level = gameConfig.game_state.starting_level;

        playerStats.maxHealth = calculateMaxHealth(playerStats.level);
        playerStats.health = playerStats.maxHealth;

        playerStats.experience = 0;
        playerStats.expToNextLevel = calculateExpRequirement(playerStats.level);
        
        // Expose to window for testing
        window.playerStats = playerStats;
        
        // Initialize audio settings from config
        // Assert configuration is complete - no defensive fallbacks
        assertGameConfig(gameConfig);
        
        // Set initial audio preferences from config
        assertProperty(gameConfig.game_state, 'default_music_enabled', 'boolean', 'v2.0 game_state');
        assertProperty(gameConfig.game_state, 'default_sound_enabled', 'boolean', 'v2.0 game_state');
        const musicEnabled = gameConfig.game_state.default_music_enabled;
        const soundEnabled = gameConfig.game_state.default_sound_enabled;
        
        assertProperty(gameConfig, 'solution_index', 'number', 'game config');
        
        gameAudio.setMusicEnabled(musicEnabled);
        gameAudio.setSoundEnabled(soundEnabled);
        
        // Update the UI with initial player stats
        updatePlayerStatsDisplay();

        // 2. Get solution file path and index from config
        const solutionIndex = gameConfig.solution_index;

        // --- Data Processing ---
        // v2.0 format - direct entity ID mapping  
        let encodingToTileMap = {};
        gameConfig.entities.forEach(entity => {
            encodingToTileMap[entity.id] = JSON.parse(JSON.stringify(entity));
        });
        console.log("v2.0 Entity map:", encodingToTileMap);

        // 2. Get the SPECIFIED solution's encoded board
        if (!allSolutions || !Array.isArray(allSolutions) || allSolutions.length === 0) {
            throw new Error(`No solutions found in ${solutionsFilePath}`);
        }
        if (solutionIndex < 0 || solutionIndex >= allSolutions.length) {
             throw new Error(`solution_index ${solutionIndex} is out of bounds for ${solutionsFilePath} (length: ${allSolutions.length})`);
        }
        const selectedSolution = allSolutions[solutionIndex];
        
        // v2.0 format - direct entity IDs
        const encodedBoard = selectedSolution.board;
        console.log("Using v2.0 solution format with direct entity IDs");

        // 3. Decode the board using the map
        currentBoard = encodedBoard.map(row =>
            row.map(encoding => {
                const tile = encodingToTileMap[encoding];
                if (!tile) {
                    console.warn(`Unknown entity/encoding ${encoding} found in board data. Defaulting to Empty.`);
                    
                    // Find empty tile for fallback - find entity with id 0 (Empty)
                    const emptyTile = gameConfig.entities.find(e => e.id === 0) || { id: 0, name: 'Unknown', symbol: '?', level: 0, tags: [] };
                    return JSON.parse(JSON.stringify(emptyTile));
                }
                return tile;
            })
        );
        console.log("Processed Board:", currentBoard);
        
        // Expose to window for testing
        window.currentBoard = currentBoard;
        // --- End Data Processing ---


        // Update title
        const titleElement = document.querySelector('h1');
        if (titleElement) {
            titleElement.textContent = `${gameConfig.name} v${gameConfig.version} - Cave ${gameConfig.solution_index}`;
        }

        // Create the board using the processed data
        createBoard(currentBoard);
        
        // Initialize entity counts
        initializeEntityCounts();
        
        // Reveal a random Skyglass at start instead of the middle squares
        revealRandomSkyglass();
        
        // Initialize inventory system after board is created
        if (typeof initializeInventory === 'function') {
            initializeInventory();
        }

        // Configuration and initialization complete
        console.log("Game config and board creation complete");

    } catch (error) {
        console.error("Failed to load game configuration or board:", error);
        // Re-throw error so main.js can handle it
        throw error;
    }
}

// Function to reset the game
function resetGame(newSolutionIndex = null) {
    // Show loading skeleton during reset
    showLoadingSkeleton();
    
    // Stop any skull animations
    stopSkullAnimation();
    
    // Reset game tracking (achievements, time, etc.)
    resetGameTracking();
    
    // Reset player stats to initial values from config
    playerStats.level = gameConfig.game_state.starting_level || 1;
    playerStats.maxHealth = calculateMaxHealth(playerStats.level);
    playerStats.health = playerStats.maxHealth;
    playerStats.experience = 0;
    playerStats.expToNextLevel = calculateExpRequirement(playerStats.level);
    
    // Reset entity counts
    entityCounts = {};
    
    // Reset annotations
    tileAnnotations = {};
    
    // Reset animation states
    tilesInAnimation = {};
    dyingAnimations = {};
    
    // Reset spyglass revealed areas
    spyglassRevealedAreas = [];
    
    // Reset crystal pattern tracking
    resetCrystalPattern();
    
    // Reset inventory system
    if (typeof initializeInventory === 'function') {
        initializeInventory();
    }
    
    // Update UI
    updatePlayerStatsDisplay();
    
    // Process new board with the specified solution index (no HTTP call needed)
    if (newSolutionIndex !== null) {
        gameConfig.solution_index = newSolutionIndex;
        
        // Use the same logic as fetchConfigAndInit to handle v2.0 format
        // Get the encoding map with deep copies to prevent modification of original config
        const encodingToTileMap = {};
        
        // v2.0 format - direct entity ID mapping  
        gameConfig.entities.forEach(entity => {
            encodingToTileMap[entity.id] = JSON.parse(JSON.stringify(entity));
        });
        
        // Get the selected solution from our preloaded solutions
        const selectedSolution = allSolutions[newSolutionIndex];
        if (selectedSolution) {
            // v2.0 format - direct entity IDs
            const encodedBoard = selectedSolution.board;
            
            // Decode the board
            currentBoard = encodedBoard.map(row =>
                row.map(encoding => {
                    const tile = encodingToTileMap[encoding];
                    if (!tile) {
                        console.warn(`Unknown entity/encoding ${encoding} found in board data. Defaulting to Empty.`);
                        
                        // Find empty tile for fallback - find entity with id 0 (Empty)
                        const emptyTile = gameConfig.entities.find(e => e.id === 0) || { id: 0, name: 'Unknown', symbol: '?', level: 0, tags: [] };
                        return JSON.parse(JSON.stringify(emptyTile));
                    }
                    return tile;
                })
            );
            
            // Update title
            const titleElement = document.querySelector('h1');
            if (titleElement) {
                titleElement.textContent = `${gameConfig.name} v${gameConfig.version} - Cave ${gameConfig.solution_index}`;
            }
            
            // Create the board
            createBoard(currentBoard);
            
            // Initialize entity counts
            initializeEntityCounts();
            
            // Reveal a random Skyglass at start
            revealRandomSkyglass();
        } else {
            console.error(`Invalid solution at index ${newSolutionIndex}`);
        }
    } else {
        // Just reset the current board if no new index provided - regenerate from config to ensure clean state
        const currentSolutionIndex = gameConfig.solution_index;
        
        // Use the same logic as fetchConfigAndInit to handle v2.0 format
        const encodingToTileMap = {};
        
        // v2.0 format - direct entity ID mapping  
        gameConfig.entities.forEach(entity => {
            encodingToTileMap[entity.id] = JSON.parse(JSON.stringify(entity));
        });
        
        // Get the current solution from our preloaded solutions
        const selectedSolution = allSolutions[currentSolutionIndex];
        if (selectedSolution) {
            // v2.0 format - direct entity IDs
            const encodedBoard = selectedSolution.board;
            
            // Decode the board with fresh copies
            currentBoard = encodedBoard.map(row =>
                row.map(encoding => {
                    const tile = encodingToTileMap[encoding];
                    if (!tile) {
                        console.warn(`Unknown entity/encoding ${encoding} found in board data. Defaulting to Empty.`);
                        
                        // Find empty tile for fallback - find entity with id 0 (Empty)
                        const emptyTile = gameConfig.entities.find(e => e.id === 0) || { id: 0, name: 'Unknown', symbol: '?', level: 0, tags: [] };
                        return JSON.parse(JSON.stringify(emptyTile));
                    }
                    return tile;
                })
            );
        }
        
        createBoard(currentBoard);
        initializeEntityCounts();
        revealRandomSkyglass();
    }
    
    // Hide loading skeleton and show the game
    hideLoadingSkeleton();
}