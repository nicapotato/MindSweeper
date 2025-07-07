// Mindsweeper Game Audio Module
// This module handles all audio functionality for the game

class MindsweeperAudio {
    constructor() {
        // Audio elements
        this.backgroundMusic = null;
        this.clickSound = null;
        this.creatureKillSound = null;
        this.playerDeathSound = null;
        this.mcLovinSound = null;
        this.victorySound = null;
        this.crystalSound = null;
        this.monolithWarnSound = null;
        this.crystalRevealSound = null;
        this.levelUpSound = null;
        
        // Audio settings
        this.musicEnabled = false;
        this.soundEnabled = false;
        
        // Initialization flag
        this.initialized = false;
    }

    // Initialize all sound objects
    initializeSounds() {
        try {
            // Check if audio already initialized
            if (!this.backgroundMusic) {
                // Initialize background music
                this.backgroundMusic = new Audio('../../audio/modern-creativity-instrumental.mp3');
                this.backgroundMusic.loop = true;
                this.backgroundMusic.volume = 0.5;
                
                // Initialize click sound
                this.clickSound = new Audio('../../audio/click.wav');
                this.clickSound.volume = 0.1; // Lowered from 0.3
                
                // Initialize new game sounds
                this.creatureKillSound = new Audio('../../audio/fight-1.wav');
                this.creatureKillSound.volume = 0.1;
                
                this.playerDeathSound = new Audio('../../audio/mleb-3.wav');
                this.playerDeathSound.volume = 0.4;
                
                this.mcLovinSound = new Audio('../../audio/mc-lovin-reverb-2.wav');
                this.mcLovinSound.volume = 0.5;
                
                this.victorySound = new Audio('../../audio/mleb-1.wav');
                this.victorySound.volume = 0.6;
                
                this.crystalSound = new Audio('../../audio/crystal.mp3');
                this.crystalSound.volume = 0.4;
                
                // Initialize monolith sounds
                this.monolithWarnSound = new Audio('../../audio/monolith-warn.mp3');
                this.monolithWarnSound.volume = 0.5;
                
                this.crystalRevealSound = new Audio('../../audio/crystals-reveal.mp3');
                this.crystalRevealSound.volume = 1.0;
                
                // Initialize level up sound
                this.levelUpSound = new Audio('../../audio/level-up.mp3');
                this.levelUpSound.volume = 0.6;
                
                // Load audio files to make them ready to play
                this.backgroundMusic.load();
                this.clickSound.load();
                this.creatureKillSound.load();
                this.playerDeathSound.load();
                this.mcLovinSound.load();
                this.victorySound.load();
                this.crystalSound.load();
                this.monolithWarnSound.load();
                this.crystalRevealSound.load();
                this.levelUpSound.load();
            }
            
            // Start background music if enabled and not already playing
            if (this.musicEnabled && this.backgroundMusic && this.backgroundMusic.paused) {
                // Play only after a short delay to ensure DOM is fully loaded
                setTimeout(() => {
                    this.playBackgroundMusic();
                    
                    // Check after 1 second if music is playing, if not add a UI notification
                    setTimeout(() => {
                        if (this.backgroundMusic.paused) {
                            console.log("Music still not playing - waiting for user interaction");
                            
                            // Add a temporary notification about audio
                            const notification = document.createElement('div');
                            notification.className = 'audio-notification';
                            notification.textContent = '🔊 Click anywhere to enable game audio';
                            notification.style.position = 'fixed';
                            notification.style.top = '10px';
                            notification.style.left = '50%';
                            notification.style.transform = 'translateX(-50%)';
                            notification.style.padding = '8px 12px';
                            notification.style.backgroundColor = 'rgba(0,0,0,0.7)';
                            notification.style.color = 'white';
                            notification.style.borderRadius = '4px';
                            notification.style.zIndex = '9999';
                            notification.style.fontSize = '14px';
                            document.body.appendChild(notification);
                            
                            // Remove notification after first click anywhere
                            const removeNotification = () => {
                                if (notification.parentNode) {
                                    notification.parentNode.removeChild(notification);
                                }
                                document.removeEventListener('click', removeNotification);
                            };
                            document.addEventListener('click', removeNotification);
                            
                            // Auto-remove after 5 seconds anyway
                            setTimeout(() => removeNotification(), 5000);
                        }
                    }, 1000);
                }, 100);
            }
            
            this.initialized = true;
        } catch (error) {
            console.error("Error initializing audio:", error);
            // Set to null to prevent further errors
            this.musicEnabled = false;
            this.soundEnabled = false;
        }
    }

    // Function to play/pause background music
    playBackgroundMusic() {
        if (this.musicEnabled && this.backgroundMusic) {
            // Stop and reset the audio first to prevent overlapping
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            
            // Promise-based approach to handle autoplay
            const playPromise = this.backgroundMusic.play();
            
            // Handle promise to catch autoplay restrictions
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("Audio autoplay prevented:", e);
                    
                    // Add an event listener to attempt playback after first user interaction
                    const startAudio = () => {
                        this.backgroundMusic.play().catch(err => console.log("Still couldn't play audio:", err));
                        document.removeEventListener('click', startAudio);
                        document.removeEventListener('keydown', startAudio);
                    };
                    
                    // Listen for any user interaction
                    document.addEventListener('click', startAudio);
                    document.addEventListener('keydown', startAudio);
                });
            }
        }
    }

    pauseBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
        }
    }

    // Function to play click sound
    playClickSound() {
        if (this.soundEnabled && this.clickSound) {
            // Clone the audio to allow multiple sounds at once
            const clonedSound = this.clickSound.cloneNode();
            clonedSound.volume = this.clickSound.volume; // Inherit volume from original
            clonedSound.play().catch(e => {
                console.log("Couldn't play click sound:", e);
            });
        }
    }

    // Function to toggle music
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        
        if (this.musicEnabled) {
            this.playBackgroundMusic();
        } else {
            this.pauseBackgroundMusic();
        }
        
        // Update UI toggle
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) {
            musicToggle.checked = this.musicEnabled;
        }
    }

    // Function to toggle sound effects
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        
        // Update UI toggle
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.checked = this.soundEnabled;
        }
    }

    // Helper method to play a sound with proper volume inheritance
    playSound(audioElement) {
        if (this.soundEnabled && audioElement) {
            const clonedSound = audioElement.cloneNode();
            clonedSound.volume = audioElement.volume; // Inherit volume from original
            clonedSound.play().catch(e => {
                console.log("Couldn't play sound:", e);
            });
        }
    }

    // Sound effect functions
    playCreatureKillSound() {
        if (this.soundEnabled && this.creatureKillSound) {
            const clonedSound = this.creatureKillSound.cloneNode();
            clonedSound.volume = this.creatureKillSound.volume;
            clonedSound.play().catch(e => {
                console.log("Couldn't play creature kill sound:", e);
            });
        }
    }

    playPlayerDeathSound() {
        if (this.soundEnabled && this.playerDeathSound) {
            const clonedSound = this.playerDeathSound.cloneNode();
            clonedSound.volume = this.playerDeathSound.volume;
            clonedSound.play().catch(e => {
                console.log("Couldn't play player death sound:", e);
            });
        }
    }

    playMcLovinSound() {
        if (this.soundEnabled && this.mcLovinSound) {
            const clonedSound = this.mcLovinSound.cloneNode();
            clonedSound.volume = this.mcLovinSound.volume;
            clonedSound.play().catch(e => {
                console.log("Couldn't play mc-lovin sound:", e);
            });
        }
    }

    playVictorySound() {
        if (this.soundEnabled && this.victorySound) {
            const clonedSound = this.victorySound.cloneNode();
            clonedSound.volume = this.victorySound.volume;
            clonedSound.play().catch(e => {
                console.log("Couldn't play victory sound:", e);
            });
        }
    }

    playCrystalSound() {
        if (this.soundEnabled && this.crystalSound) {
            const clonedSound = this.crystalSound.cloneNode();
            clonedSound.volume = this.crystalSound.volume;
            clonedSound.play().catch(e => {
                console.log("Couldn't play crystal sound:", e);
            });
        }
    }

    playMonolithWarnSound() {
        if (this.soundEnabled && this.monolithWarnSound) {
            const clonedSound = this.monolithWarnSound.cloneNode();
            clonedSound.volume = this.monolithWarnSound.volume;
            clonedSound.play().catch(e => {
                console.log("Couldn't play monolith warn sound:", e);
            });
        }
    }

    playCrystalRevealSound() {
        if (this.soundEnabled && this.crystalRevealSound) {
            const clonedSound = this.crystalRevealSound.cloneNode();
            clonedSound.volume = this.crystalRevealSound.volume;
            clonedSound.play().catch(e => {
                console.log("Couldn't play crystal reveal sound:", e);
            });
        }
    }

    playLevelUpSound() {
        if (this.soundEnabled && this.levelUpSound) {
            const clonedSound = this.levelUpSound.cloneNode();
            clonedSound.volume = this.levelUpSound.volume;
            clonedSound.play().catch(e => {
                console.log("Couldn't play level up sound:", e);
            });
        }
    }

    // Getter and setter methods for external access
    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        if (this.musicEnabled && this.backgroundMusic && this.backgroundMusic.paused) {
            this.playBackgroundMusic();
        }
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }

    getMusicEnabled() {
        return this.musicEnabled;
    }

    getSoundEnabled() {
        return this.soundEnabled;
    }

    // Check if music is currently playing
    isMusicPlaying() {
        return this.backgroundMusic && !this.backgroundMusic.paused;
    }

    // Update UI elements to reflect current audio state
    updateUI() {
        const musicToggle = document.getElementById('music-toggle');
        const soundToggle = document.getElementById('sound-toggle');
        
        if (musicToggle) musicToggle.checked = this.musicEnabled;
        if (soundToggle) soundToggle.checked = this.soundEnabled;
    }
}

// Create a global instance
const gameAudio = new MindsweeperAudio();

// Export the instance for use in other modules
window.gameAudio = gameAudio;
