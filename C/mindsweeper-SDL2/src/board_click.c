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
    
    if (current_state == TILE_HIDDEN) {
        // Reveal tile
        printf("Revealing tile [%u,%u] with entity %u\n", row, col, entity_id);
        
        // Get entity info for debug
        const GameConfig *config = board_get_config();
        Entity *entity = config_get_entity(config, entity_id);
        if (entity) {
            printf("  Entity: %s (ID: %u, Level: %u)\n", entity->name, entity->id, entity->level);
            printf("  Sprite position: x=%u, y=%u\n", entity->sprite_pos.x, entity->sprite_pos.y);
        }
        
        // 1. IMMEDIATE logical state update (like JS)
        board_set_tile_state(g->board, row, col, TILE_REVEALED);
        
        // 2. Start visual animation
        board_start_animation(g->board, row, col, ANIM_REVEALING, 800, false); // 0.8s reveal
        
        return true;
    } else {
        // Tile already revealed - handle combat/treasure/etc
        const GameConfig *config = board_get_config();
        Entity *entity = config_get_entity(config, entity_id);
        if (entity) {
            printf("Clicking revealed tile [%u,%u]:\n", row, col);
            printf("  Entity ID: %u\n", entity->id);
            printf("  Name: %s\n", entity->name);
            printf("  Description: %s\n", entity->description);
            printf("  Level: %u\n", entity->level);
            printf("  Count: %u\n", entity->count);
            printf("  Is Enemy: %s\n", entity->is_enemy ? "true" : "false");
            printf("  Is Treasure: %s\n", entity->is_treasure ? "true" : "false");
            printf("  Blocks Input on Reveal: %s\n", entity->blocks_input_on_reveal ? "true" : "false");
            printf("  Sprite Position: x=%u, y=%u\n", entity->sprite_pos.x, entity->sprite_pos.y);
            
            if (entity->is_enemy) {
                // Start combat animation
                g->player.health -= entity->level;
                g->player.experience += entity->level;
                printf("player hp: %d\n", g->player.health);
                board_set_entity_id(g->board, row, col, 0);
                board_start_animation(g->board, row, col, ANIM_COMBAT, 500, false);
            } else if (entity->is_treasure) {
                // Start treasure claim animation  
                board_start_animation(g->board, row, col, ANIM_TREASURE_CLAIM, 300, false);
            }
        }
        
        return true;
    }
}