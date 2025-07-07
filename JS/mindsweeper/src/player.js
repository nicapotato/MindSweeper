// Update the player stats display
function updatePlayerStatsDisplay() {
    // Update level
    document.getElementById('player-level').textContent = playerStats.level;
    
    // Draw the level icon sprite (x=5, y=5)
    const levelIcon = document.getElementById('level-icon');
    if (levelIcon && spriteStrips.default) {
        const ctx = levelIcon.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, levelIcon.width, levelIcon.height);
            // Draw the sprite from the sprite sheet
            const sx = 13 * spriteStrips.default.cellw; // x=5
            const sy = 0 * spriteStrips.default.cellh; // y=5
            ctx.drawImage(
                spriteStrips.default.img,
                sx, sy, 
                spriteStrips.default.cellw, spriteStrips.default.cellh,
                0, 0, 
                levelIcon.width, levelIcon.height
            );
        }
    }
    
    // Draw the player sprite based on level
    drawPlayerSprite();
    
    // Update health
    document.getElementById('player-health').textContent = 
        `${playerStats.health}/${playerStats.maxHealth}`;
    
    // Update health bar
    const healthPercentage = Math.max(0, (playerStats.health / playerStats.maxHealth) * 100);
    const healthFill = document.getElementById('health-fill');
    healthFill.style.width = `${healthPercentage}%`;
    
    // Ensure health text is visible even when bar is narrow
    if (healthPercentage < 20) {
        healthFill.style.minWidth = '80px';
    } else {
        healthFill.style.minWidth = '60px';
    }
    
    // Update experience
    document.getElementById('player-exp').textContent = 
        `${playerStats.experience}/${playerStats.expToNextLevel}`;
    
    // Update experience bar (capped at 100%)
    const expPercentage = Math.min(100, (playerStats.experience / playerStats.expToNextLevel) * 100);
    const expFill = document.getElementById('exp-fill');
    expFill.style.width = `${expPercentage}%`;
    
    // Ensure exp text is visible even when bar is narrow
    if (expPercentage < 20) {
        expFill.style.minWidth = '80px';
    } else {
        expFill.style.minWidth = '60px';
    }
    
    // Show level up button if eligible and add glow effect to entire level section
    const levelUpBtn = document.getElementById('level-up-btn');
    const levelContainer = document.querySelector('.level-container');
    
    if (levelUpBtn && levelContainer) {
        const canLevelUp = playerStats.experience >= playerStats.expToNextLevel;
        
        // Always maintain the button's space whether visible or not
        levelUpBtn.style.visibility = canLevelUp ? 'visible' : 'hidden';
        // Keep display as block but use visibility instead to maintain spacing
        levelUpBtn.style.display = 'block';
        
        // Add or remove the level-up-ready class for enhanced glow effect
        if (canLevelUp) {
            levelContainer.classList.add('level-up-ready');
        } else {
            levelContainer.classList.remove('level-up-ready');
        }
    }
}

// Handle player gaining experience
function addExperience(amount) {
    playerStats.experience += amount;
    updatePlayerStatsDisplay();
}

// Handle player manual level up
function levelUp() {
    // Check if there are any animations in progress
    if (Object.keys(tilesInAnimation).length > 0) {
        console.log("Cannot level up while animations are in progress");
        return false;
    }
    
    if (playerStats.experience < playerStats.expToNextLevel) {
        console.log("Not enough experience to level up");
        return false;
    }
    
    // Calculate excess experience to carry over
    const excessExp = playerStats.experience - playerStats.expToNextLevel;
    
    // Increase level
    playerStats.level++;
    
    // Reset experience and calculate new requirement
    playerStats.experience = 0;
    playerStats.expToNextLevel = calculateExpRequirement(playerStats.level);
    
    // Add carry-over experience
    if (excessExp > 0) {
        playerStats.experience = excessExp;
    }
    
    // Update max health based on new level and restore to full
    playerStats.maxHealth = calculateMaxHealth(playerStats.level);
    playerStats.health = playerStats.maxHealth;
    
    console.log(`Level up! You are now level ${playerStats.level}`);
    
    // Play level up sound effect
            gameAudio.playLevelUpSound();
    
    updatePlayerStatsDisplay();
    
          // Try to play background music if it's not already playing
      // This is a good opportunity since user interaction just happened
      if (gameAudio.getMusicEnabled() && !gameAudio.isMusicPlaying()) {
          gameAudio.playBackgroundMusic();
      }
    
    return true;
}

// Handle player taking damage
function takeDamage(amount, killerEntity = null) {
    playerStats.health = Math.max(0, playerStats.health - amount);
    updatePlayerStatsDisplay();
    
    // Check if player died
    if (playerStats.health <= 0) {
        // Play player death sound
        gameAudio.playPlayerDeathSound();
        
        // Create and show a custom death dialog with New Map button
        showDeathDialog(killerEntity); // Pass the killer entity
    }
}