// Load achievements from localStorage
function loadAchievements() {
    try {
        const saved = localStorage.getItem('mindsweeper_achievements');
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.error('Error loading achievements:', error);
        return {};
    }
}

// Save achievements to localStorage
function saveAchievements(achievements) {
    try {
        localStorage.setItem('mindsweeper_achievements', JSON.stringify(achievements));
    } catch (error) {
        console.error('Error saving achievements:', error);
    }
}

// Load completed caves from localStorage
function loadCompletedCaves() {
    try {
        const saved = localStorage.getItem('mindsweeper_completed_caves');
        const data = saved ? JSON.parse(saved) : [];
        
        // Handle legacy format (simple array of numbers) by converting to new format
        if (data.length > 0 && typeof data[0] === 'number') {
            const converted = data.map(caveNumber => ({
                caveNumber: caveNumber,
                completedAt: Date.now(), // Use current time as fallback
                elapsedTime: 0, // Unknown for legacy data
                achievements: [] // No achievements recorded for legacy data
            }));
            saveCompletedCaves(converted); // Save in new format
            return converted;
        }
        
        return data;
    } catch (error) {
        console.error('Error loading completed caves:', error);
        return [];
    }
}

// Save completed caves to localStorage
function saveCompletedCaves(completedCaves) {
    try {
        localStorage.setItem('mindsweeper_completed_caves', JSON.stringify(completedCaves));
    } catch (error) {
        console.error('Error saving completed caves:', error);
    }
}

// Add a cave to the completed list with metadata
function addCompletedCave(caveNumber, elapsedTime = 0, achievements = []) {
    const completedCaves = loadCompletedCaves();
    
    // Check if cave is already completed
    const existingIndex = completedCaves.findIndex(cave => cave.caveNumber === caveNumber);
    if (existingIndex !== -1) {
        console.log(`Cave ${caveNumber} already completed`);
        return false; // Cave already completed
    }
    
    // Add new completion record
    const newCompletion = {
        caveNumber: caveNumber,
        completedAt: Date.now(),
        elapsedTime: elapsedTime,
        achievements: [...achievements] // Copy the achievements array
    };
    
    completedCaves.push(newCompletion);
    
    // Sort by cave number
    completedCaves.sort((a, b) => a.caveNumber - b.caveNumber);
    
    saveCompletedCaves(completedCaves);
    console.log(`Cave ${caveNumber} added to completed caves list with metadata`);
    return true;
}

// Reset achievements - clear all saved achievements
function resetAchievements() {
    try {
        // Show confirmation dialog
        if (confirm('Are you sure you want to reset all achievements and completed caves? This action cannot be undone.')) {
            // Clear achievements from localStorage
            localStorage.removeItem('mindsweeper_achievements');
            
            // Clear completed caves from localStorage
            localStorage.removeItem('mindsweeper_completed_caves');
            
            // Clear session achievements
            achievementsEarned = [];
            
            // Update the display to show no achievements earned
            updateAchievementsDisplay();
            
            console.log('All achievements and completed caves have been reset');
        }
    } catch (error) {
        console.error('Error resetting achievements:', error);
    }
}

// Achievement definitions
const ACHIEVEMENTS = {
    'firefly_pacifist': {
        name: 'Firefly Pacifist',
        description: 'Complete a level without killing any Fireflies',
        sprite: { x: 1, y: 0, spriteSheet: 'new_sprites' }
    },
    'full_clear': {
        name: 'Full Clear',
        description: 'Defeat all entities on a map',
        sprite: { x: 2, y: 0, spriteSheet: 'new_sprites' }
    },
    'need_for_speed': {
        name: 'Need For Speed',
        description: 'Defeat the Dragon Boss in under 10 minutes',
        sprite: { x: 3, y: 0, spriteSheet: 'new_sprites' }
    }
};

// Check and award achievement
function checkAndAwardAchievement(achievementId) {
    const savedAchievements = loadAchievements();
    
    // Don't award if already earned
    if (savedAchievements[achievementId]) {
        return false;
    }
    
    let earned = false;
    
    switch (achievementId) {
        case 'firefly_pacifist':
            // Check if fireflies were killed (E2 entities)
            earned = firefliesKilled === 0;
            break;
            
        case 'full_clear':
            // Check if all entities are defeated (all alive counts are 0)
            earned = Object.values(entityCounts).length > 0 && 
                     Object.values(entityCounts).every(entity => entity.alive === 0);
            break;
            
        case 'need_for_speed':
            // Check if boss was defeated in under 10 minutes
            const elapsed = getElapsedTime();
            earned = elapsed < 600000; // 10 minutes in milliseconds
            break;
    }
    
    if (earned) {
        // Save achievement
        savedAchievements[achievementId] = {
            earned: true,
            timestamp: Date.now()
        };
        saveAchievements(savedAchievements);
        
        // Add to session achievements
        achievementsEarned.push(achievementId);
        
        // Update the achievements display
        updateAchievementsDisplay();
        
        console.log(`Achievement earned: ${ACHIEVEMENTS[achievementId].name}`);
        return true;
    }
    
    return false;
}

// Function to update the achievements display
function updateAchievementsDisplay() {
    const achievementsListElement = document.getElementById('achievements-list');
    if (!achievementsListElement) return;
    
    // Clear the current list
    achievementsListElement.innerHTML = '';
    
    const savedAchievements = loadAchievements();
    const completedCaves = loadCompletedCaves();
    
    // Create achievements section header
    const achievementsHeader = document.createElement('div');
    achievementsHeader.className = 'section-header achievements-header';
    achievementsHeader.textContent = 'Achievements';
    achievementsListElement.appendChild(achievementsHeader);
    
    // Create achievement items for each defined achievement
    Object.entries(ACHIEVEMENTS).forEach(([achievementId, achievementData]) => {
        const achievementItem = document.createElement('div');
        achievementItem.className = 'achievement-item';
        
        const isEarned = savedAchievements[achievementId];
        
        // Add earned/not-earned class
        if (isEarned) {
            achievementItem.classList.add('earned');
        } else {
            achievementItem.classList.add('not-earned');
        }
        
        // Create canvas for achievement sprite
        const iconCanvas = document.createElement('canvas');
        iconCanvas.className = 'achievement-icon';
        iconCanvas.width = 24;
        iconCanvas.height = 24;
        
        // Draw sprite (grayed out if not earned)
        if (spriteStrips[achievementData.sprite.spriteSheet]) {
            drawSprite(iconCanvas, achievementData.sprite.x, achievementData.sprite.y, false, achievementData.sprite.spriteSheet);
            
            // Apply grayscale filter if not earned
            if (!isEarned) {
                iconCanvas.style.filter = 'grayscale(100%) brightness(0.5)';
            } else {
                iconCanvas.style.filter = 'none';
            }
        }
        
        // Create text content
        const textContent = document.createElement('div');
        textContent.className = 'achievement-text';
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'achievement-name';
        nameSpan.textContent = achievementData.name;
        
        const descSpan = document.createElement('div');
        descSpan.className = 'achievement-description';
        descSpan.textContent = achievementData.description;
        
        textContent.appendChild(nameSpan);
        textContent.appendChild(descSpan);
        
        // Append elements to achievement item
        achievementItem.appendChild(iconCanvas);
        achievementItem.appendChild(textContent);
        
        // Add title with timestamp if earned
        if (isEarned) {
            const earnedDate = new Date(savedAchievements[achievementId].timestamp);
            achievementItem.title = `Earned on ${earnedDate.toLocaleDateString()}`;
        }
        
        // Append achievement item to list
        achievementsListElement.appendChild(achievementItem);
    });
    
    // Create completed caves section (now at the bottom)
    if (completedCaves.length > 0) {
        // Add separator before completed caves
        const separator = document.createElement('div');
        separator.className = 'section-separator';
        separator.style.height = '10px';
        separator.style.borderBottom = '1px solid #444';
        separator.style.marginTop = '15px';
        separator.style.marginBottom = '10px';
        achievementsListElement.appendChild(separator);
        
        const cavesSection = document.createElement('div');
        cavesSection.className = 'completed-caves-section';
        
        const cavesSectionHeader = document.createElement('div');
        cavesSectionHeader.className = 'section-header completed-caves-header';
        cavesSectionHeader.textContent = `Completed Caves (${completedCaves.length}/${totalSolutions || '?'})`;
        cavesSection.appendChild(cavesSectionHeader);
        
        const cavesContainer = document.createElement('div');
        cavesContainer.className = 'completed-caves-container';
        
        // Display completed caves as compact clickable numbers
        completedCaves.forEach(cave => {
            const caveButton = document.createElement('button');
            caveButton.className = 'cave-number-button';
            caveButton.textContent = cave.caveNumber;
            caveButton.title = 'Click for details';
            
            // Add click event for popover
            caveButton.addEventListener('click', (event) => {
                showCaveDetailsPopover(cave, event);
            });
            
            cavesContainer.appendChild(caveButton);
        });
        
        cavesSection.appendChild(cavesContainer);
        achievementsListElement.appendChild(cavesSection);
    }
}