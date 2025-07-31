#include "board_click.h"
#include "game.h"
#include "config.h"
#include "entity_logic.h"
#include "board.h"
#include "audio.h"

// Forward declarations
void board_finish_animation(struct Board *b, unsigned row, unsigned col);

void board_start_animation(struct Board *b, unsigned row, unsigned col, 
                          AnimationType type, Uint32 duration_ms, bool blocks_input, TileState original_state) {
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
    TileState current_tile_state = b->tile_states[index];
    
    switch (type) {
        case ANIM_REVEALING:
            anim->start_sprite = SPRITE_HIDDEN;
            anim->end_sprite = get_entity_sprite_index(entity_id, TILE_REVEALED, row, col, SPRITE_TYPE_NORMAL);
            printf("  Animation: SPRITE_HIDDEN (%u) -> Entity sprite (%u)\n", 
                   anim->start_sprite, anim->end_sprite);
            break;
        case ANIM_COMBAT: {
            // Handle different combat scenarios based on ORIGINAL tile state and entity type
            const GameConfig *config = board_get_config();
            Entity *entity = config_get_entity(config, entity_id);
            
            if (original_state == TILE_HIDDEN) {
                // Hidden enemy click: Keep current behavior but check for mimic
                if (entity && entity->id == 17 && entity_has_tag(entity, "hidden-click-reveal")) {
                    // Special case for mimic: show revealed-hostile sprite
                    anim->start_sprite = get_entity_sprite_index(entity_id, TILE_REVEALED, row, col, SPRITE_TYPE_HOSTILE);
                    anim->end_sprite = get_entity_sprite_index(entity_id, TILE_REVEALED, row, col, SPRITE_TYPE_HOSTILE);
                    printf("  Mimic combat animation: showing hostile sprite (%u)\n", anim->start_sprite);
                } else {
                    // Normal hidden enemy: show entity sprite first
                    anim->start_sprite = get_entity_sprite_index(entity_id, TILE_REVEALED, row, col, SPRITE_TYPE_NORMAL);
                    anim->end_sprite = get_entity_sprite_index(entity_id, TILE_REVEALED, row, col, SPRITE_TYPE_NORMAL);
                    printf("  Hidden enemy combat: showing entity sprite (%u)\n", anim->start_sprite);
                }
            } else {
                // Revealed enemy click: Skip showing entity sprite, go straight to combat effect
                anim->start_sprite = 2; // Combat effect sprite (x:2, y:0)
                anim->end_sprite = 2;
                printf("  Revealed enemy combat: skipping entity sprite, going straight to combat effect (%u)\n", anim->start_sprite);
            }
            break;
        }
        case ANIM_COMBAT_STAGE2:
            // Stage 2: Show sprite x:2, y:0 (combat effect sprite)
            // Assuming 4 sprites per row: x:2, y:0 = index 2
            anim->start_sprite = 2; // x:2, y:0 = index 2
            anim->end_sprite = 2;
            break;
        case ANIM_DYING:
        case ANIM_TREASURE_CLAIM:
            anim->start_sprite = get_entity_sprite_index(entity_id, current_tile_state, row, col, SPRITE_TYPE_NORMAL);
            anim->end_sprite = get_entity_sprite_index(entity_id, current_tile_state, row, col, SPRITE_TYPE_NORMAL);
            break;
        case ANIM_ENTITY_TRANSITION: {
            // Show the new entity that we're transitioning to
            unsigned new_entity_id = b->entity_ids[index];
            anim->start_sprite = get_entity_sprite_index(new_entity_id, current_tile_state, row, col, SPRITE_TYPE_NORMAL);
            anim->end_sprite = get_entity_sprite_index(new_entity_id, current_tile_state, row, col, SPRITE_TYPE_NORMAL);
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
        // Check if we started with the combat effect (revealed enemy case)
        if (anim->start_sprite == 2) {
            // Revealed enemy: we already showed combat effect, go directly to entity transition
            printf("Revealed enemy combat finished, transitioning entity at [%u,%u]\n", row, col);
            
            // Get current entity to determine transition
            unsigned current_entity_id = b->entity_ids[index];
            const GameConfig *config = board_get_config();
            Entity *entity = config_get_entity(config, current_entity_id);
            
            if (entity) {
                // Use random choice for entity transition (handles both simple and random transitions)
                unsigned new_entity_id = choose_random_entity_transition(entity);
                printf("Combat transition: %u -> %u\n", current_entity_id, new_entity_id);
                
                // Transition to the selected entity
                board_set_entity_id(b, row, col, new_entity_id);
                board_start_animation(b, row, col, ANIM_ENTITY_TRANSITION, 500, false, TILE_REVEALED);
            } else {
                // Fallback: transition to empty tile
                board_set_entity_id(b, row, col, 0);
                board_start_animation(b, row, col, ANIM_ENTITY_TRANSITION, 500, false, TILE_REVEALED);
            }
            return;
        } else {
            // Hidden enemy: Combat stage 1 finished, start stage 2
            printf("Combat stage 1 finished, starting stage 2 at [%u,%u]\n", row, col);
            board_start_animation(b, row, col, ANIM_COMBAT_STAGE2, 500, false, TILE_REVEALED);
            return;
        }
    } else if (anim->type == ANIM_COMBAT_STAGE2) {
        // Combat stage 2 finished, transition to next entity
        printf("Combat stage 2 finished, transitioning entity at [%u,%u]\n", row, col);
        
        // Get current entity to determine transition
        unsigned current_entity_id = b->entity_ids[index];
        const GameConfig *config = board_get_config();
        Entity *entity = config_get_entity(config, current_entity_id);
        
        if (entity) {
            // Use random choice for entity transition (handles both simple and random transitions)
            unsigned new_entity_id = choose_random_entity_transition(entity);
            printf("Combat transition: %u -> %u\n", current_entity_id, new_entity_id);
            
            // Transition to the selected entity
            board_set_entity_id(b, row, col, new_entity_id);
            board_start_animation(b, row, col, ANIM_ENTITY_TRANSITION, 500, false, TILE_REVEALED);
        } else {
            // Fallback: transition to empty tile
            board_set_entity_id(b, row, col, 0);
            board_start_animation(b, row, col, ANIM_ENTITY_TRANSITION, 500, false, TILE_REVEALED);
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
            board_start_animation(b, row, col, ANIM_ENTITY_TRANSITION, 500, false, TILE_REVEALED);
        } else {
            // Fallback: transition to empty tile
            board_set_entity_id(b, row, col, 0);
            board_start_animation(b, row, col, ANIM_ENTITY_TRANSITION, 500, false, TILE_REVEALED);
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
    
    // Check if tile is blocked by animation - block ALL clicks during animations
    if (board_is_tile_animating(g->board, row, col)) {
        return true; // Input blocked during animation, but this is not an error
    }
    
    // Play crystal sound effect on tile click
    audio_play_crystal_sound(&g->audio);
    
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
    if (entity && entity->level > 0) {
        game_update_player_health(g, -(int)entity->level);  // Use safer health update function
        g->player.experience += entity->level;
        board_mark_entity_dead(g->board, row, col);
        // Check if player died from this combat - do this AFTER health update but BEFORE animations
        if (g->player.health <= 0 && !g->game_over_info.is_game_over) {
            game_set_game_over(g, entity->name);  // Pass the enemy name that killed the player
            return true;  // Exit early to prevent further processing
        }
        if (current_state == TILE_HIDDEN) {
            board_set_tile_state(g->board, row, col, TILE_REVEALED);
        }
        board_start_animation(g->board, row, col, ANIM_COMBAT, ANIM_COMBAT_DURATION_MS, false, current_state);
        return true;
    } else if (current_state == TILE_HIDDEN) {
        if (entity) {
            printf("  Entity: %s (ID: %u, Level: %u)\n", entity->name, entity->id, entity->level);
            printf("  Sprite position: x=%u, y=%u\n", entity->sprite_pos.x, entity->sprite_pos.y);
        }
        board_set_tile_state(g->board, row, col, TILE_REVEALED);
        board_start_animation(g->board, row, col, ANIM_REVEALING, ANIM_REVEALING_DURATION_MS, false, current_state); // 0.8s reveal
        
        return true;
    } else {
        if (entity) {
            if (entity->is_item) {
                for (unsigned i = 0; i < entity->tag_count; i++) {
                    if (strncmp(entity->tags[i], "heal-", 5) == 0) {                        
                        int heal_amount = atoi(&entity->tags[i][5]);
                        game_update_player_health(g, heal_amount);
                        break;
                    }
                    if (strncmp(entity->tags[i], "reward-experience=", 18) == 0) {
                        int experience_amount = atoi(&entity->tags[i][18]);
                        g->player.experience += (unsigned)experience_amount;
                        break;
                    }
                    if (strncmp(entity->tags[i], "trigger-reveal-E1", 17) == 0) {
                        unsigned revealed_count = 0;
                        for (unsigned r = 0; r < g->board->rows; r++) {
                            for (unsigned c = 0; c < g->board->columns; c++) {
                                TileState tile_state = board_get_tile_state(g->board, r, c);
                                unsigned tile_entity_id = board_get_entity_id(g->board, r, c);
                                if (tile_state == TILE_HIDDEN && tile_entity_id == 1) {
                                    board_set_tile_state(g->board, r, c, TILE_REVEALED);
                                    size_t index = (size_t)(r * g->board->columns + c);
                                    g->board->display_sprites[index] = get_entity_sprite_index(tile_entity_id, TILE_REVEALED, r, c, SPRITE_TYPE_NORMAL);
                                    g->board->animations[index].type = ANIM_NONE;
                                    revealed_count++;
                                }
                            }
                        }
                        printf("Revealed %u Entity 1 tiles\n", revealed_count);
                        break;
                    }
                    if (strncmp(entity->tags[i], "trigger-weakening-E7", 20) == 0) {
                        printf("🔸 WEAKENING TRIGGER ACTIVATED! 🔸\n");
                        // Transform all Entity 7 tiles to Entity 25 (weakened mines)
                        unsigned weakened_count = 0;
                        for (unsigned r = 0; r < g->board->rows; r++) {
                            for (unsigned c = 0; c < g->board->columns; c++) {
                                unsigned tile_entity_id = board_get_entity_id(g->board, r, c);
                                
                                if (tile_entity_id == 7) {
                                    // Transform Entity 7 to Entity 25 (weakened mine)
                                    board_set_entity_id(g->board, r, c, 25);
                                    
                                    // Update display sprite immediately
                                    size_t index = (size_t)(r * g->board->columns + c);
                                    TileState tile_state = board_get_tile_state(g->board, r, c);
                                    g->board->display_sprites[index] = get_entity_sprite_index(25, tile_state, r, c, SPRITE_TYPE_NORMAL);
                                    
                                    weakened_count++;
                                    printf("Transformed mine at [%u,%u] from Entity 7 to Entity 25\n", r, c);
                                }
                            }
                        }
                        printf("🔸 Weakening complete! Transformed %u mines to Entity 25 🔸\n", weakened_count);
                        break;
                    }
                    if (strncmp(entity->tags[i], "reveal-1", 8) == 0) {
                        printf("🔮 RANDOM SINGLE TILE REVEAL TRIGGER ACTIVATED! 🔮\n");
                        
                        // Find all hidden tiles
                        unsigned hidden_tiles_count = 0;
                        unsigned *hidden_rows = malloc(g->board->rows * g->board->columns * sizeof(unsigned));
                        unsigned *hidden_cols = malloc(g->board->rows * g->board->columns * sizeof(unsigned));
                        
                        if (!hidden_rows || !hidden_cols) {
                            printf("ERROR: Failed to allocate memory for hidden tiles\n");
                            if (hidden_rows) free(hidden_rows);
                            if (hidden_cols) free(hidden_cols);
                            break;
                        }
                        
                        // Collect all hidden tiles
                        for (unsigned r = 0; r < g->board->rows; r++) {
                            for (unsigned c = 0; c < g->board->columns; c++) {
                                TileState tile_state = board_get_tile_state(g->board, r, c);
                                if (tile_state == TILE_HIDDEN) {
                                    hidden_rows[hidden_tiles_count] = r;
                                    hidden_cols[hidden_tiles_count] = c;
                                    hidden_tiles_count++;
                                }
                            }
                        }
                        
                        if (hidden_tiles_count > 0) {
                            // Pick a random hidden tile
                            unsigned random_index = (unsigned)(rand() % (int)hidden_tiles_count);
                            unsigned target_row = hidden_rows[random_index];
                            unsigned target_col = hidden_cols[random_index];
                            
                            printf("Random single tile reveal at [%u,%u]\n", target_row, target_col);
                            
                            // Reveal the selected tile
                            board_set_tile_state(g->board, target_row, target_col, TILE_REVEALED);
                            
                            // Update display sprite immediately
                            size_t index = (size_t)(target_row * g->board->columns + target_col);
                            unsigned tile_entity_id = board_get_entity_id(g->board, target_row, target_col);
                            g->board->display_sprites[index] = get_entity_sprite_index(tile_entity_id, TILE_REVEALED, target_row, target_col, SPRITE_TYPE_NORMAL);
                            g->board->animations[index].type = ANIM_NONE;
                            
                            printf("🔮 Random single tile reveal complete! Revealed tile at [%u,%u] 🔮\n", target_row, target_col);
                        } else {
                            printf("No hidden tiles available to reveal\n");
                        }
                        
                        // Cleanup
                        free(hidden_rows);
                        free(hidden_cols);
                        break;
                    }
                    if (strncmp(entity->tags[i], "reveal-3x3", 10) == 0) {
                        printf("🔮 RANDOM 3x3 REVEAL TRIGGER ACTIVATED! 🔮\n");
                        
                        // Pick a random center position for the 3x3 area
                        // Ensure the 3x3 area fits within board bounds
                        unsigned max_center_row = (g->board->rows >= 3) ? g->board->rows - 2 : 0;
                        unsigned max_center_col = (g->board->columns >= 3) ? g->board->columns - 2 : 0;
                        
                        if (max_center_row > 0 && max_center_col > 0) {
                            unsigned center_row = 1 + (unsigned)(rand() % (int)max_center_row);
                            unsigned center_col = 1 + (unsigned)(rand() % (int)max_center_col);
                            
                            printf("Random 3x3 reveal centered at [%u,%u]\n", center_row, center_col);
                            
                            unsigned revealed_count = 0;
                            // Reveal 3x3 area around the center position
                            for (int dr = -1; dr <= 1; dr++) {
                                for (int dc = -1; dc <= 1; dc++) {
                                    unsigned target_row = center_row + (unsigned)dr;
                                    unsigned target_col = center_col + (unsigned)dc;
                                    
                                    // Double-check bounds
                                    if (target_row < g->board->rows && target_col < g->board->columns) {
                                        TileState tile_state = board_get_tile_state(g->board, target_row, target_col);
                                        
                                        if (tile_state == TILE_HIDDEN) {
                                            board_set_tile_state(g->board, target_row, target_col, TILE_REVEALED);
                                            
                                            // Update display sprite immediately
                                            size_t index = (size_t)(target_row * g->board->columns + target_col);
                                            unsigned tile_entity_id = board_get_entity_id(g->board, target_row, target_col);
                                            g->board->display_sprites[index] = get_entity_sprite_index(tile_entity_id, TILE_REVEALED, target_row, target_col, SPRITE_TYPE_NORMAL);
                                            g->board->animations[index].type = ANIM_NONE;
                                            
                                            revealed_count++;
                                            printf("Revealed tile at [%u,%u]\n", target_row, target_col);
                                        }
                                    }
                                }
                            }
                            printf("🔮 Random 3x3 reveal complete! Revealed %u tiles 🔮\n", revealed_count);
                        } else {
                            printf("Board too small for 3x3 reveal (need at least 3x3 board)\n");
                        }
                        break;
                    }
                }
                board_start_animation(g->board, row, col, ANIM_TREASURE_CLAIM, ANIM_TREASURE_DURATION_MS, false, current_state);
            }
        }
        
        return true;
    }
}
