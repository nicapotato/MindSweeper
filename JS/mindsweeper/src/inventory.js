// ========== INVENTORY SYSTEM ==========
// Module to handle player inventory management

// Inventory state
let playerInventory = {
    slots: [null, null, null, null], // 4 inventory slots
    maxSlots: 4
};

// Secret crystal sequence (set when tome is collected)
let crystalSecretSequence = null;
let currentCrystalIndex = 0; // Track progress in collecting crystals in order

// Dialog state
let activeDialog = null;

// Initialize inventory system
function initializeInventory() {
    // Reset inventory on new cave
    playerInventory.slots = [null, null, null, null];
    crystalSecretSequence = null;
    currentCrystalIndex = 0;
    
    // Set up click handlers for inventory slots
    for (let i = 0; i < playerInventory.maxSlots; i++) {
        const slot = document.getElementById(`inventory-slot-${i}`);
        if (slot) {
            slot.addEventListener('click', () => handleInventorySlotClick(i));
        }
    }
    
    updateInventoryDisplay();
    console.log("Inventory system initialized");
}

// Add item to inventory
function addItemToInventory(entityData) {
    // Find first empty slot
    for (let i = 0; i < playerInventory.maxSlots; i++) {
        if (playerInventory.slots[i] === null) {
            playerInventory.slots[i] = {
                entityId: entityData.id,
                entityData: entityData,
                name: entityData.name,
                sprite: entityData.sprites?.revealed || null
            };
            
            console.log(`Added ${entityData.name} to inventory slot ${i}`);
            updateInventoryDisplay();
            return true;
        }
    }
    
    console.warn("Inventory is full! Cannot add item:", entityData.name);
    return false;
}

// Remove item from inventory
function removeItemFromInventory(slotIndex) {
    if (slotIndex >= 0 && slotIndex < playerInventory.maxSlots) {
        const removedItem = playerInventory.slots[slotIndex];
        playerInventory.slots[slotIndex] = null;
        updateInventoryDisplay();
        return removedItem;
    }
    return null;
}

// Handle clicking on inventory slots
function handleInventorySlotClick(slotIndex) {
    const item = playerInventory.slots[slotIndex];
    if (!item) return; // Empty slot
    
    console.log(`Clicked inventory slot ${slotIndex}: ${item.name}`);
    
    // Handle specific item types
    if (item.entityId === 18) { // Tome of Crystal Resonance
        showCrystalSecretDialog();
    }
    // Add more item types here as needed
}

// Update the visual display of inventory
function updateInventoryDisplay() {
    for (let i = 0; i < playerInventory.maxSlots; i++) {
        const slot = document.getElementById(`inventory-slot-${i}`);
        const canvas = slot?.querySelector('canvas');
        
        if (!slot || !canvas) continue;
        
        const item = playerInventory.slots[i];
        
        if (item) {
            // Item exists - show it
            slot.classList.add('has-item');
            slot.classList.remove('empty');
            canvas.style.display = 'block';
            
            // Draw the item sprite
            drawInventoryItemSprite(canvas, item);
        } else {
            // Empty slot
            slot.classList.remove('has-item');
            slot.classList.add('empty');
            canvas.style.display = 'none';
            
            // Clear the canvas
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }
}

// Draw item sprite in inventory slot
function drawInventoryItemSprite(canvas, item) {
    if (!canvas || !item.sprite) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get sprite coordinates
    const spriteData = item.sprite;
    const spriteSheetKey = spriteData.sprite_sheet || 'new_sprites';
    
    if (spriteStrips[spriteSheetKey]) {
        const spriteStrip = spriteStrips[spriteSheetKey];
        const sx = spriteData.x * spriteStrip.cellw;
        const sy = spriteData.y * spriteStrip.cellh;
        
        // Draw scaled up sprite (16x16 to 32x32)
        ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
        ctx.drawImage(
            spriteStrip.img,
            sx, sy,
            spriteStrip.cellw, spriteStrip.cellh,
            0, 0,
            canvas.width, canvas.height
        );
    }
}

// Generate random crystal sequence (each color appears exactly once)
function generateCrystalSequence() {
    const colors = ['red', 'blue', 'yellow', 'green'];
    
    // Shuffle the array to create a random sequence with no duplicates
    const sequence = [...colors]; // Create a copy
    
    // Fisher-Yates shuffle algorithm
    for (let i = sequence.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }
    
    console.log("Generated unique crystal sequence:", sequence);
    return sequence;
}

// Show the crystal secret dialog
function showCrystalSecretDialog() {
    // Generate sequence if not already set
    if (!crystalSecretSequence) {
        crystalSecretSequence = generateCrystalSequence();
        currentCrystalIndex = 0;
        console.log("Generated crystal sequence:", crystalSecretSequence);
    }
    
    // Create dialog HTML with crystal sprites in horizontal row
    const dialogHTML = `
        <div class="dialog-overlay" id="crystal-secret-dialog">
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>Tome of Crystal Resonance</h3>
                    <button class="dialog-close" onclick="closeCrystalSecretDialog()">&times;</button>
                </div>
                <div class="dialog-body">
                    <p>The ancient tome reveals a mystical sequence of crystal colors that must be collected in precise order:</p>
                    <div class="crystal-sequence-horizontal">
                        ${crystalSecretSequence.map((color, index) => `
                            <div class="crystal-sequence-item-horizontal ${index < currentCrystalIndex ? 'completed' : ''}">
                                <div class="crystal-sprite-container">
                                    <canvas class="crystal-sprite-canvas" width="32" height="32" data-color="${color}"></canvas>
                                </div>
                                <span class="crystal-name">${color.charAt(0).toUpperCase() + color.slice(1)}</span>
                                ${index < currentCrystalIndex ? '<span class="checkmark">✓</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                    <p class="progress-text">Progress: ${currentCrystalIndex}/${crystalSecretSequence.length} crystals collected</p>
                    <p class="hint-text">Collect crystals in this exact order to unlock their power!</p>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing dialog if any
    closeCrystalSecretDialog();
    
    // Add dialog to DOM
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    activeDialog = document.getElementById('crystal-secret-dialog');
    
    // Draw crystal sprites after DOM is ready
    setTimeout(() => {
        drawCrystalSpritesInDialog();
    }, 50);
    
    // Add click outside to close
    activeDialog.addEventListener('click', (e) => {
        if (e.target === activeDialog) {
            closeCrystalSecretDialog();
        }
    });
}

// Draw crystal sprites in the dialog
function drawCrystalSpritesInDialog() {
    const crystalCanvases = document.querySelectorAll('.crystal-sprite-canvas');
    
    crystalCanvases.forEach(canvas => {
        const color = canvas.dataset.color;
        drawCrystalSprite(canvas, color);
    });
}

// Draw a crystal sprite on canvas
function drawCrystalSprite(canvas, color) {
    if (!canvas || !color) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get crystal entity data from config
    const crystalEntity = gameConfig?.entities?.find(e => e.id === 15); // Crystal entity
    if (!crystalEntity || !crystalEntity.sprites || !crystalEntity.sprites[color]) {
        console.warn(`Crystal sprite not found for color: ${color}`);
        return;
    }
    
    const spriteData = crystalEntity.sprites[color];
    const spriteSheetKey = spriteData.sprite_sheet || 'new_sprites';
    
    if (spriteStrips[spriteSheetKey]) {
        const spriteStrip = spriteStrips[spriteSheetKey];
        
        // Use the first variation if x is an array
        const xCoord = Array.isArray(spriteData.x) ? spriteData.x[0] : spriteData.x;
        const sx = xCoord * spriteStrip.cellw;
        const sy = spriteData.y * spriteStrip.cellh;
        
        // Draw scaled up sprite (16x16 to 32x32)
        ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
        ctx.drawImage(
            spriteStrip.img,
            sx, sy,
            spriteStrip.cellw, spriteStrip.cellh,
            0, 0,
            canvas.width, canvas.height
        );
    }
}

// Close crystal secret dialog
function closeCrystalSecretDialog() {
    if (activeDialog) {
        activeDialog.remove();
        activeDialog = null;
    }
}

// Check if crystal can be collected (is it the next in sequence?)
function canCollectCrystal(crystalColor) {
    if (!crystalSecretSequence) {
        // No sequence set yet - can collect any crystal
        return true;
    }
    
    if (currentCrystalIndex >= crystalSecretSequence.length) {
        // All crystals collected
        return true;
    }
    
    // Check if this is the correct next crystal
    return crystalSecretSequence[currentCrystalIndex] === crystalColor;
}

// Process crystal collection
function processCrystalCollection(crystalColor) {
    if (!crystalSecretSequence) {
        // No tome collected yet - normal crystal collection
        console.log(`Collected ${crystalColor} crystal (no sequence active)`);
        return 'normal';
    }
    
    console.log(`Crystal sequence tracking: Expected sequence [${crystalSecretSequence.join(', ')}], progress: ${currentCrystalIndex}/${crystalSecretSequence.length}`);
    console.log(`Attempting to collect: ${crystalColor}, expected next: ${crystalSecretSequence[currentCrystalIndex]}`);
    
    if (canCollectCrystal(crystalColor)) {
        currentCrystalIndex++;
        console.log(`✅ Correct! Collected ${crystalColor} crystal - sequence progress: ${currentCrystalIndex}/${crystalSecretSequence.length}`);
        
        // Check if sequence is complete
        if (currentCrystalIndex >= crystalSecretSequence.length) {
            console.log("🎉 Crystal sequence completed! Special effect triggered!");
            // Trigger special effect (e.g., reveal monoliths, bonus experience, etc.)
            triggerCrystalSequenceReward();
            return 'sequence_complete';
        }
        
        return 'sequence_correct';
    } else {
        // Wrong crystal - reset sequence
        console.log(`❌ Wrong crystal collected! Expected ${crystalSecretSequence[currentCrystalIndex]}, got ${crystalColor}. Resetting sequence.`);
        currentCrystalIndex = 0;
        return 'sequence_reset';
    }
}

// Trigger reward for completing crystal sequence
function triggerCrystalSequenceReward() {
    // Special effects when sequence is completed
    gameAudio.playCrystalRevealSound();
    
    // Transform monoliths to spectral (if they exist)
    if (typeof transformMonolithsToSpectral === 'function') {
        transformMonolithsToSpectral();
    }
    
    // Bonus experience
    addExperience(10);
    
    // Show completion message
    console.log("Crystal sequence reward: Monoliths transformed to spectral, gained 10 bonus experience!");
}

// Expose functions to global scope
window.initializeInventory = initializeInventory;
window.addItemToInventory = addItemToInventory;
window.removeItemFromInventory = removeItemFromInventory;
window.updateInventoryDisplay = updateInventoryDisplay;
window.showCrystalSecretDialog = showCrystalSecretDialog;
window.closeCrystalSecretDialog = closeCrystalSecretDialog;
window.canCollectCrystal = canCollectCrystal;
window.processCrystalCollection = processCrystalCollection;
window.playerInventory = playerInventory; 