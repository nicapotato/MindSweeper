#include "board_click.h"
#include "game.h"
#include "config.h"

// Game logic
bool board_handle_click(struct Game *g, unsigned row, unsigned col) {
    if (row >= g->board->rows || col >= g->board->columns) {
        return false;
    }
    
    // Check if tile is blocked by animation
    if (board_is_tile_animating(g->board, row, col)) {
        size_t index = (size_t)(row * g->board->columns + col);
        if (g->board->animations[index].blocks_input) {
            return false; // Input blocked during animation
        }
    }
    
    TileState current_state = board_get_tile_state(g->board, row, col);
    unsigned entity_id = board_get_entity_id(g->board, row, col);

    const GameConfig *config = board_get_config();
    Entity *entity = config_get_entity(config, entity_id);

    printf("  Entity ID: %u\n", entity->id);
    printf("  Name: %s\n", entity->name);
    printf("  Description: %s\n", entity->description);
    printf("  Level: %u\n", entity->level);
    printf("  Count: %u\n", entity->count);
    printf("  Is Enemy: %s\n", entity->is_enemy ? "true" : "false");
    printf("  Is Treasure: %s\n", entity->is_treasure ? "true" : "false");
    printf("  Blocks Input on Reveal: %s\n", entity->blocks_input_on_reveal ? "true" : "false");
    printf("  Sprite Position: x=%u, y=%u\n", entity->sprite_pos.x, entity->sprite_pos.y);
    printf("  Tags (%u): ", entity->tag_count);
    if (entity->tag_count > 0) {
        for (unsigned i = 0; i < entity->tag_count; i++) {
            printf("'%s'", entity->tags[i]);
            if (i < entity->tag_count - 1) {
                printf(", ");
            }
        }
    } else {
        printf("none");
    }
    printf("\n");
    

    // Handle enemy combat regardless of tile state (hidden or revealed)
    if (entity && entity->level > 0) {
        // Enemy combat sequence
        game_update_player_health(g, -(int)entity->level);  // Use safer health update function
        g->player.experience += entity->level;
        
        printf("Combat with enemy %s (ID: %u) - Player HP: %u, XP: %u\n", 
               entity->name, entity->id, g->player.health, g->player.experience);
        
        // Check if player died from this combat - do this AFTER health update but BEFORE animations
        if (g->player.health <= 0 && !g->game_over_info.is_game_over) {
            game_set_game_over(g, entity->name);  // Pass the enemy name that killed the player
            return true;  // Exit early to prevent further processing
        }
        
        if (current_state == TILE_HIDDEN) {
            // 1. IMMEDIATE logical state update (like JS)
            board_set_tile_state(g->board, row, col, TILE_REVEALED);
        }

        // Start combat animation sequence (will handle entity transition automatically)
        board_start_animation(g->board, row, col, ANIM_COMBAT, ANIM_COMBAT_DURATION_MS, false);

        return true; // Combat handled, no further processing needed
    } else if (current_state == TILE_HIDDEN) {
        // Reveal tile
        printf("Revealing tile [%u,%u] with entity %u\n", row, col, entity_id);
        
        // Get entity info for debug
        if (entity) {
            printf("  Entity: %s (ID: %u, Level: %u)\n", entity->name, entity->id, entity->level);
            printf("  Sprite position: x=%u, y=%u\n", entity->sprite_pos.x, entity->sprite_pos.y);
        }
        
        // 1. IMMEDIATE logical state update (like JS)
        board_set_tile_state(g->board, row, col, TILE_REVEALED);
        
        // 2. Start visual animation
        board_start_animation(g->board, row, col, ANIM_REVEALING, ANIM_REVEALING_DURATION_MS, false); // 0.8s reveal
        
        return true;
    } else {
        // Tile already revealed - handle combat/treasure/etc

        if (entity) {
            printf("Clicking revealed tile [%u,%u]:\n", row, col);
            if (entity->is_treasure) {
                // Start treasure claim animation  
                // Check for heal tag in entity tags - can handle multi-digit numbers like "heal-10"
                for (unsigned i = 0; i < entity->tag_count; i++) {
                    if (strncmp(entity->tags[i], "heal-", 5) == 0) {
                        // Parse the number after "heal-" (e.g., "8" from "heal-8" or "10" from "heal-10")
                        int heal_amount = atoi(&entity->tags[i][5]);
                        if (heal_amount > 0) {
                            game_update_player_health(g, heal_amount);
                            printf("Player healed for %d HP. New HP: %u\n", heal_amount, g->player.health);
                        }
                        break; // Found heal tag, no need to check others
                    }
                }
                board_start_animation(g->board, row, col, ANIM_TREASURE_CLAIM, ANIM_TREASURE_DURATION_MS, false);
            }
        }
        
        return true;
    }
}
