#include "board_click.h"
#include "game.h"
#include "config.h"
#include "entity_logic.h"

// Forward declarations
void board_finish_animation(struct Board *b, unsigned row, unsigned col);

void board_start_animation(struct Board *b, unsigned row, unsigned col, 
                          AnimationType type, Uint32 duration_ms, bool blocks_input) {
    if (row >= b->rows || col >= b->columns) {
        return;
    }
    
    size_t index = (size_t)(row * b->columns + col);
    TileAnimation *anim = &b->animations[index];
    
    anim->type = type;
    anim->start_time = SDL_GetTicks();
    anim->duration_ms = duration_ms;
    anim->blocks_input = blocks_input;
    
    // Set animation sprites based on type
    unsigned entity_id = b->entity_ids[index];
    TileState tile_state = b->tile_states[index];
    
    switch (type) {
        case ANIM_REVEALING:
            anim->start_sprite = SPRITE_HIDDEN;
            anim->end_sprite = get_entity_sprite_index(entity_id, TILE_REVEALED);
            printf("  Animation: SPRITE_HIDDEN (%u) -> Entity sprite (%u)\n", 
                   anim->start_sprite, anim->end_sprite);
            break;
        case ANIM_COMBAT:
            // Stage 1: Show entity sprite for 0.5s
            anim->start_sprite = get_entity_sprite_index(entity_id, tile_state);
            anim->end_sprite = get_entity_sprite_index(entity_id, tile_state);
            break;
        case ANIM_COMBAT_STAGE2:
            // Stage 2: Show sprite x:2, y:0 (combat effect sprite)
            // Assuming 4 sprites per row: x:2, y:0 = index 2
            anim->start_sprite = 2; // x:2, y:0 = index 2
            anim->end_sprite = 2;
            break;
        case ANIM_DYING:
        case ANIM_TREASURE_CLAIM:
            anim->start_sprite = get_entity_sprite_index(entity_id, tile_state);
            anim->end_sprite = get_entity_sprite_index(entity_id, tile_state);
            break;
        case ANIM_ENTITY_TRANSITION: {
            // Show the new entity that we're transitioning to
            unsigned new_entity_id = b->entity_ids[index];
            anim->start_sprite = get_entity_sprite_index(new_entity_id, tile_state);
            anim->end_sprite = get_entity_sprite_index(new_entity_id, tile_state);
            break;
        }
        default:
            anim->start_sprite = b->display_sprites[index];
            anim->end_sprite = b->display_sprites[index];
            break;
    }
    
    b->display_sprites[index] = anim->start_sprite;
}

void board_finish_animation(struct Board *b, unsigned row, unsigned col) {
    size_t index = (size_t)(row * b->columns + col);
    TileAnimation *anim = &b->animations[index];
    
    // Handle multi-stage animations
    if (anim->type == ANIM_COMBAT) {
        // Combat stage 1 finished, start stage 2
        printf("Combat stage 1 finished, starting stage 2 at [%u,%u]\n", row, col);
        board_start_animation(b, row, col, ANIM_COMBAT_STAGE2, 500, false);
        return;
    } else if (anim->type == ANIM_COMBAT_STAGE2) {
        // Combat stage 2 finished, transition to next entity
        printf("Combat stage 2 finished, transitioning entity at [%u,%u]\n", row, col);
        
        // Get current entity to determine transition
        unsigned current_entity_id = b->entity_ids[index];
        const GameConfig *config = board_get_config();
        Entity *entity = config_get_entity(config, current_entity_id);
        
        if (entity && entity->transition.next_entity_id != current_entity_id) {
            // Transition to next entity
            board_set_entity_id(b, row, col, entity->transition.next_entity_id);
            board_start_animation(b, row, col, ANIM_ENTITY_TRANSITION, 500, false);
        } else {
            // No transition, just clear animation
            anim->type = ANIM_NONE;
        }
        return;
    } else if (anim->type == ANIM_TREASURE_CLAIM) {
        // Treasure claim finished, handle entity transition with random choice
        printf("Treasure claim finished, handling entity transition at [%u,%u]\n", row, col);
        
        // Get current entity to determine transition
        unsigned current_entity_id = b->entity_ids[index];
        const GameConfig *config = board_get_config();
        Entity *entity = config_get_entity(config, current_entity_id);
        
        if (entity) {
            // Use random choice for entity transition
            unsigned new_entity_id = choose_random_entity_transition(entity);
            printf("Treasure transition: %u -> %u\n", current_entity_id, new_entity_id);
            
            // Transition to the selected entity
            board_set_entity_id(b, row, col, new_entity_id);
            board_start_animation(b, row, col, ANIM_ENTITY_TRANSITION, 500, false);
        } else {
            // Fallback: transition to empty tile
            board_set_entity_id(b, row, col, 0);
            board_start_animation(b, row, col, ANIM_ENTITY_TRANSITION, 500, false);
        }
        return;
    }
    
    // Set final sprite
    b->display_sprites[index] = anim->end_sprite;
    
    // Clear animation
    anim->type = ANIM_NONE;
    
    printf("Animation finished for tile [%u,%u] - Final sprite: %u\n", row, col, anim->end_sprite);
}

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
    printf("  Is Item: %s\n", entity->is_item ? "true" : "false");
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
            if (entity->is_item) {
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
                    if (strncmp(entity->tags[i], "reward-experience=", 18) == 0) {
                        int experience_amount = atoi(&entity->tags[i][18]);
                        if (experience_amount > 0) {
                            printf("Experience added - %d. New XP: %u\n", experience_amount, g->player.experience + experience_amount);
                            g->player.experience += experience_amount;
                        }
                    }
                }
                // Start treasure claim animation - this will handle the entity transition
                board_start_animation(g->board, row, col, ANIM_TREASURE_CLAIM, ANIM_TREASURE_DURATION_MS, false);
            }
        }
        
        return true;
    }
}
