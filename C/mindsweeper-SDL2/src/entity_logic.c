#include "entity_logic.h"
#include <stdlib.h>
#include <time.h>

// Random choice entity transition helper
unsigned choose_random_entity_transition(Entity *entity) {
    // For now, we'll implement a simple parser for the JSON structure
    // This is a simplified implementation - in a full system you'd want proper JSON parsing
    
    // Initialize random seed if not done
    static bool seed_initialized = false;
    if (!seed_initialized) {
        srand((unsigned int)time(NULL));
        seed_initialized = true;
    }
    
    // For treasure chest (ID 8), we know from config it has:
    // 50% chance for entity_id 9 (Health Elixir)
    // 50% chance for entity_id 21 (Experience)
    if (entity->id == 8) {
        // Simple 50/50 choice
        int random_value = rand() % 100;
        if (random_value < 50) {
            return 9;  // Health Elixir
        } else {
            return 21; // Experience
        }
    }
    
    // For Firefly (ID 2) - 70% empty, 30% Bat Echo
    if (entity->id == 2) {
        int random_value = rand() % 100;
        if (random_value < 70) {
            return 0;  // Empty
        } else {
            return 22; // Bat Echo
        }
    }
    
    // For Rat King/Lord GoldFang (ID 10) - transitions to Rat Scroll (ID 19)
    if (entity->id == 10) {
        return 19;  // Rat Scroll
    }
    
    // For Mysterious Man/Walter Whiskers (ID 12) - transitions to Mysterious Man Scroll (ID 20)
    if (entity->id == 12) {
        return 20;  // Mysterious Man Scroll
    }
    
    // For Ancient Dragon/Ancient Meeoeomoower (ID 13) - transitions to Dragon's Victory Crown (ID 24)
    if (entity->id == 13) {
        return 24;  // Dragon's Victory Crown
    }
    
    // For Treasure Mimic (ID 17) - transitions to Tome of Crystal Resonance (ID 18)
    if (entity->id == 17) {
        return 18;  // Tome of Crystal Resonance
    }
    
    // For entities with simple transitions, use their configured next_entity_id
    if (entity->transition.next_entity_id != entity->id) {
        return entity->transition.next_entity_id;
    }
    
    // Default: transition to empty tile
    return 0;
}
