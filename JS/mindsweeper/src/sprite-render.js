// Function to load all sprite sheets
function loadSpriteSheets() {
    return new Promise(async (resolve, reject) => {
        try {
            // If sprite_sheets is defined in config, use it
            if (gameConfig.sprite_sheets) {
                const loadPromises = [];
                
                // Loop through each defined sprite sheet and load it
                for (const [key, path] of Object.entries(gameConfig.sprite_sheets)) {
                    loadPromises.push(loadSingleSpriteSheet(key, path));
                }
                
                // Add the tile sprite sheet explicitly
                loadPromises.push(loadSingleSpriteSheet('tiles', 'assets-nb/tile-16x16.png'));
                
                // Add the skulls sprite sheet for death animation
                loadPromises.push(loadSingleSpriteSheet('skulls', 'assets-nb/skulls-64b64.png'));
                
                // Wait for all sprite sheets to load
                await Promise.all(loadPromises);
                resolve();
            } else {
                // Legacy support: Load only the default sprite sheet
                spriteSheets.default = new Image();
                
                // Also load the tile sprite sheet
                spriteSheets.tiles = new Image();
                
                // Also load the skulls sprite sheet
                spriteSheets.skulls = new Image();
                
                const promises = [
                    new Promise((resolveDefault, rejectDefault) => {
                        spriteSheets.default.onload = () => {
                            // Create sprite strip once image is loaded
                            const settings = gameConfig.sprite_settings;
                            spriteStrips.default = {
                                img: spriteSheets.default,
                                cellw: settings.cell_width || 16,
                                cellh: settings.cell_height || 16, 
                                pivotx: settings.pivot_x || 8,
                                pivoty: settings.pivot_y || 8
                            };
                            resolveDefault();
                        };
                        
                        spriteSheets.default.onerror = (error) => {
                            console.error("Failed to load default sprite sheet", error);
                            rejectDefault(error);
                        };
                        
                        spriteSheets.default.src = 'assets-nb/tiny_dungeon_monsters.png';
                    }),
                    new Promise((resolveTiles, rejectTiles) => {
                        spriteSheets.tiles.onload = () => {
                            // Create sprite strip for tiles
                            const settings = gameConfig.sprite_settings;
                            spriteStrips.tiles = {
                                img: spriteSheets.tiles,
                                cellw: settings.cell_width || 16,
                                cellh: settings.cell_height || 16, 
                                pivotx: settings.pivot_x || 8,
                                pivoty: settings.pivot_y || 8
                            };
                            resolveTiles();
                        };
                        
                        spriteSheets.tiles.onerror = (error) => {
                            console.error("Failed to load tiles sprite sheet", error);
                            rejectTiles(error);
                        };
                        
                        spriteSheets.tiles.src = 'assets-nb/tile-16x16.png';
                    }),
                    new Promise((resolveSkulls, rejectSkulls) => {
                        spriteSheets.skulls.onload = () => {
                            // Create sprite strip for skulls
                            spriteStrips.skulls = {
                                img: spriteSheets.skulls,
                                cellw: 64, // 64x64 pixel sprites
                                cellh: 64,
                                pivotx: 32,
                                pivoty: 32
                            };
                            resolveSkulls();
                        };
                        
                        spriteSheets.skulls.onerror = (error) => {
                            console.error("Failed to load skulls sprite sheet", error);
                            rejectSkulls(error);
                        };
                        
                        spriteSheets.skulls.src = 'assets-nb/skulls-64b64.png';
                    })
                ];
                
                await Promise.all(promises);
                resolve();
            }
        } catch (error) {
            console.error("Error loading sprite sheets:", error);
            reject(error);
        }
    });
}

// Helper function to load a single sprite sheet
function loadSingleSpriteSheet(key, path) {
    return new Promise((resolve, reject) => {
        spriteSheets[key] = new Image();
        
        spriteSheets[key].onload = () => {
            // Create sprite strip object for this sheet
            const settings = gameConfig.sprite_settings;
            
            // Special handling for skulls sprite sheet
            if (key === 'skulls') {
                spriteStrips[key] = {
                    img: spriteSheets[key],
                    cellw: 64, // 64x64 pixel sprites
                    cellh: 64,
                    pivotx: 32,
                    pivoty: 32
                };
            } else {
                // Use default settings for other sprite sheets
                spriteStrips[key] = {
                    img: spriteSheets[key],
                    cellw: settings.cell_width || 16,
                    cellh: settings.cell_height || 16, 
                    pivotx: settings.pivot_x || 8,
                    pivoty: settings.pivot_y || 8
                };
            }
            
            console.log(`Loaded sprite sheet: ${key} from ${path}`);
            resolve();
        };
        
        spriteSheets[key].onerror = (error) => {
            console.error(`Failed to load sprite sheet ${key} from ${path}`, error);
            reject(error);
        };
        
        spriteSheets[key].src = path;
    });
}

// Draw sprite with layering support
function drawLayeredSprite(canvas, layers) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas to native sprite resolution (16x16) and let CSS scale with pixelated rendering
    canvas.width = gameConfig.sprite_settings.cell_width || 16;
    canvas.height = gameConfig.sprite_settings.cell_height || 16;
    
    // Set crisp pixel art rendering settings - MUST be set after canvas sizing
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.oImageSmoothingEnabled = false;
    
    // Remove any text-canvas class as this is a sprite
    canvas.classList.remove('text-canvas');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw each layer in order
    layers.forEach(layer => {
        if (!layer) return; // Skip undefined/null layers
        
        // Get the sprite strip to use
        const spriteSheetKey = layer.spriteSheet || 'monsters';
        const spriteStrip = spriteStrips[spriteSheetKey];
        if (!spriteStrip) return;
        
        // Source coordinates on sprite sheet
        const sx = layer.x * spriteStrip.cellw;
        const sy = layer.y * spriteStrip.cellh;
        
        // Check if we need to apply rotation or flip
        if (layer.rotation || layer.flipX) {
            ctx.save();
            
            // Set the rotation center to the middle of the canvas
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // Apply rotation if specified (convert degrees to radians)
            if (layer.rotation) {
                ctx.translate(centerX, centerY);
                const rotationRadians = (layer.rotation * Math.PI) / 180;
                ctx.rotate(rotationRadians);
                ctx.translate(-centerX, -centerY);
            }
            
            // Apply flip if needed (must do this after rotation is applied)
            if (layer.flipX) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            
            // Draw the sprite
            ctx.drawImage(
                spriteStrip.img,
                sx, sy, 
                spriteStrip.cellw, spriteStrip.cellh,
                0, 0, 
                canvas.width, canvas.height
            );
            
            ctx.restore();
        } else {
            // Draw the sprite normally
            ctx.drawImage(
                spriteStrip.img,
                sx, sy, 
                spriteStrip.cellw, spriteStrip.cellh,
                0, 0, 
                canvas.width, canvas.height
            );
        }
    });
}

// Function to draw the player sprite
function drawPlayerSprite() {
    const playerSprite = document.getElementById('player-sprite');
    if (playerSprite && spriteStrips.new_sprites) {
        const ctx = playerSprite.getContext('2d');
        if (ctx) {
            // Set crisp pixel art rendering
            ctx.imageSmoothingEnabled = false;
            ctx.webkitImageSmoothingEnabled = false;
            ctx.mozImageSmoothingEnabled = false;
            ctx.msImageSmoothingEnabled = false;
            ctx.oImageSmoothingEnabled = false;
            
            ctx.clearRect(0, 0, playerSprite.width, playerSprite.height);
            
            // Get sprite coordinates based on player level
            const coords = getPlayerSpriteCoords(playerStats.level);
            
            // Draw the sprite from the sprite sheet (3x size for 48x48 canvas from 16x16 sprite)
            const sx = coords.x * spriteStrips.new_sprites.cellw;
            const sy = coords.y * spriteStrips.new_sprites.cellh;
            ctx.drawImage(
                spriteStrips.new_sprites.img,
                sx, sy, 
                spriteStrips.new_sprites.cellw, spriteStrips.new_sprites.cellh,
                0, 0, 
                playerSprite.width, playerSprite.height
            );
        }
    }
}

// Function to create an animated skull canvas
function createAnimatedSkullCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // 4x the sprite size for better visibility
    canvas.height = 128;
    canvas.style.width = '128px';
    canvas.style.height = '128px';
    canvas.style.imageRendering = 'pixelated'; // Preserve pixel art style
    canvas.style.border = '2px solid #ff0000';
    canvas.style.borderRadius = '8px';
    canvas.style.backgroundColor = '#1a1a1a';
    canvas.className = 'death-skull-canvas';
    
    return canvas;
}

// Function to draw the skull animation frame
function drawSkullFrame(canvas, frameNumber) {
    if (!canvas || !spriteStrips.skulls) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const spriteStrip = spriteStrips.skulls;
    
    // Frame definitions based on user specification
    switch (frameNumber) {
        case 0: // Frame 1: (x:0, y:0)
            drawSkullSprite(ctx, canvas, 0, 0);
            break;
            
        case 1: // Frame 2: (x:0, y:0) with (x:1, y:1) underneath
            drawSkullSprite(ctx, canvas, 1, 1); // Draw background layer first
            drawSkullSprite(ctx, canvas, 0, 0); // Draw foreground layer
            break;
            
        case 2: // Frame 3: (x:0, y:0) with (x:0, y:1) underneath
            drawSkullSprite(ctx, canvas, 0, 1); // Draw background layer first
            drawSkullSprite(ctx, canvas, 0, 0); // Draw foreground layer
            break;
            
        case 3: // Frame 4: (x:1, y:0) - hold for 5 seconds
            drawSkullSprite(ctx, canvas, 1, 0);
            break;
    }
}

// Helper function to draw a single skull sprite
function drawSkullSprite(ctx, canvas, spriteX, spriteY) {
    if (!spriteStrips.skulls) return;
    
    const spriteStrip = spriteStrips.skulls;
    
    // Source coordinates on sprite sheet
    const sx = spriteX * spriteStrip.cellw;
    const sy = spriteY * spriteStrip.cellh;
    
    // Draw the sprite scaled to fill the canvas
    ctx.drawImage(
        spriteStrip.img,
        sx, sy,
        spriteStrip.cellw, spriteStrip.cellh,
        0, 0,
        canvas.width, canvas.height
    );
}

// Function to start the skull animation
function startSkullAnimation(canvas) {
    if (!canvas) return;
    
    deathSkullAnimation.frame = 0;
    deathSkullAnimation.startTime = Date.now();
    deathSkullAnimation.isAnimating = true;
    
    animateSkull(canvas);
}

// Function to animate the skull through its frames
function animateSkull(canvas) {
    if (!deathSkullAnimation.isAnimating || !canvas) return;
    
    const elapsed = Date.now() - deathSkullAnimation.startTime;
    
    // Frame timing: each of the first 3 frames lasts 500ms, frame 4 lasts 5000ms
    let targetFrame = 0;
    if (elapsed < 500) {
        targetFrame = 0;
    } else if (elapsed < 1000) {
        targetFrame = 1;
    } else if (elapsed < 1500) {
        targetFrame = 2;
    } else if (elapsed < 6500) { // 1500ms + 5000ms hold
        targetFrame = 3;
    } else {
        // Loop back to beginning
        deathSkullAnimation.startTime = Date.now();
        targetFrame = 0;
    }
    
    // Only redraw if frame changed
    if (targetFrame !== deathSkullAnimation.frame) {
        deathSkullAnimation.frame = targetFrame;
        drawSkullFrame(canvas, targetFrame);
    }
    
    // Continue animation
    if (deathSkullAnimation.isAnimating) {
        requestAnimationFrame(() => animateSkull(canvas));
    }
}

// Function to stop the skull animation
function stopSkullAnimation() {
    deathSkullAnimation.isAnimating = false;
}

function drawSkullFrame(canvas, frameNumber) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!spriteStrips.skulls) return;
    
    const spriteStrip = spriteStrips.skulls;
    
    // Frame definitions based on user specification
    switch (frameNumber) {
        case 0: // Frame 1: (x:0, y:0)
            drawSkullSprite(ctx, canvas, 0, 0);
            break;
            
        case 1: // Frame 2: (x:0, y:0) with (x:1, y:1) underneath
            drawSkullSprite(ctx, canvas, 1, 1); // Draw background layer first
            drawSkullSprite(ctx, canvas, 0, 0); // Draw foreground layer
            break;
            
        case 2: // Frame 3: (x:0, y:0) with (x:0, y:1) underneath
            drawSkullSprite(ctx, canvas, 0, 1); // Draw background layer first
            drawSkullSprite(ctx, canvas, 0, 0); // Draw foreground layer
            break;
            
        case 3: // Frame 4: (x:1, y:0) - hold for 5 seconds
            drawSkullSprite(ctx, canvas, 1, 0);
            break;
    }
}

// Helper function to draw a single skull sprite
function drawSkullSprite(ctx, canvas, spriteX, spriteY) {
    if (!spriteStrips.skulls) return;
    
    const spriteStrip = spriteStrips.skulls;
    
    // Source coordinates on sprite sheet
    const sx = spriteX * spriteStrip.cellw;
    const sy = spriteY * spriteStrip.cellh;
    
    // Draw the sprite scaled to fill the canvas
    ctx.drawImage(
        spriteStrip.img,
        sx, sy,
        spriteStrip.cellw, spriteStrip.cellh,
        0, 0,
        canvas.width, canvas.height
    );
}

function startDyingAnimation(row, col) {
    const key = `${row},${col}`;
    
    // Initialize the dying animation state with time-based tracking
    dyingAnimations[key] = {
        frame: 0,
        maxFrames: 4, // Total number of dying animation frames
        startTime: Date.now(),
        frameDuration: 300 // 0.3 seconds = 300ms per frame (total 1.2s animation)
    };
    
    // Start the animation
    animateDyingTile(row, col);
}

function animateDyingTile(row, col) {
    const key = `${row},${col}`;
    const dyingState = dyingAnimations[key];
    
    if (!dyingState) return;
    
    const elapsed = Date.now() - dyingState.startTime;
    
    // Calculate which frame we should be on based on elapsed time
    let targetFrame = Math.floor(elapsed / dyingState.frameDuration);
    
    // Check if animation is complete (all frames shown)
    if (targetFrame >= dyingState.maxFrames) {
        // Animation complete - just clean up and update display
        console.log(`Dying animation complete for tile [${row}, ${col}], showing final state`);
        delete dyingAnimations[key];
        
        // Update the specific tile using the dual state system
        updateSingleTileFromDualState(row, col);
        return;
    }
    
    // Only update display if frame changed
    if (targetFrame !== dyingState.frame) {
        dyingState.frame = targetFrame;
        // Force update to show dying animation frames, even though game state has moved on
        updateSingleTileWithDyingAnimation(row, col, targetFrame);
        console.log(`Dying animation frame ${targetFrame} for tile [${row}, ${col}]`);
    }
    
    // Continue animation
    requestAnimationFrame(() => animateDyingTile(row, col));
}

// Draw sprite from the sprite sheet onto a canvas element
function drawSprite(canvas, x, y, flipX = false, spriteSheetKey) {
    // Create a single layer and use the drawLayeredSprite function
    const layer = { x, y, spriteSheet: spriteSheetKey, flipX };
    drawLayeredSprite(canvas, [layer]);
}

// Function to clear a canvas
function clearCanvas(canvas) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get current transform to restore it later if needed
    const currentTransform = ctx.getTransform();
    
    // Reset any transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a subtle background for empty tiles - ensure it fills the entire canvas
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Restore the previous transform if it wasn't the identity
    if (currentTransform.a !== 1 || currentTransform.d !== 1) {
        ctx.setTransform(currentTransform);
    }
}