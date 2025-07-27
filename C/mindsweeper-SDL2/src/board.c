#include "board.h"
#include "config.h"
#include "load_media.h"

// Static game configuration - loaded once at startup
static GameConfig g_config = {0};
static bool g_config_loaded = false;

bool board_calloc_arrays(struct Board *b);
void board_free_arrays(struct Board *b);
void board_finish_animation(struct Board *b, unsigned row, unsigned col);
unsigned get_entity_sprite_index(unsigned entity_id, TileState tile_state);

bool board_new(struct Board **board, SDL_Renderer *renderer, unsigned rows,
               unsigned columns, int scale) {
    *board = calloc(1, sizeof(struct Board));
    if (!*board) {
        fprintf(stderr, "Error in calloc of new board.\n");
        return false;
    }
    struct Board *b = *board;

    b->renderer = renderer;
    b->rows = rows;
    b->columns = columns;
    b->scale = scale;
    b->theme = 0;

    // Load game configuration if not already loaded
    if (!g_config_loaded) {
#ifdef WASM_BUILD
        if (!config_load(&g_config, "config_v2.json")) {
#else
        if (!config_load(&g_config, "config_v2.json")) {
#endif
            fprintf(stderr, "Failed to load game config\n");
            return false;
        }
        g_config_loaded = true;
        printf("Loaded %u entities from config\n", g_config.entity_count);
    }

    // Load entity sprites (dragons theme)
    if (!load_media_sheet(b->renderer, &b->entity_sprites, 
                          "images/sprite-sheet-cats.png",
                          PIECE_SIZE, PIECE_SIZE, &b->entity_src_rects)) {
        fprintf(stderr, "Failed to load entity sprites\n");
        return false;
    }

    // Load tile sprites for TILE_HIDDEN variations
    if (!load_media_sheet(b->renderer, &b->tile_sprites, 
                          "images/tile-16x16.png",
                          PIECE_SIZE, PIECE_SIZE, &b->tile_src_rects)) {
        fprintf(stderr, "Failed to load tile sprites\n");
        return false;
    }

    board_set_scale(b, b->scale);

    if (!board_reset(b)) {
        return false;
    }

    return true;
}

void board_free(struct Board **board) {
    if (*board) {
        struct Board *b = *board;

        board_free_arrays(b);

        if (b->entity_src_rects) {
            free(b->entity_src_rects);
            b->entity_src_rects = NULL;
        }

        if (b->entity_sprites) {
            SDL_DestroyTexture(b->entity_sprites);
            b->entity_sprites = NULL;
        }

        if (b->tile_src_rects) {
            free(b->tile_src_rects);
            b->tile_src_rects = NULL;
        }

        if (b->tile_sprites) {
            SDL_DestroyTexture(b->tile_sprites);
            b->tile_sprites = NULL;
        }

        b->renderer = NULL;

        free(*board);
        *board = NULL;

        printf("board clean.\n");
    }
}

bool board_calloc_arrays(struct Board *b) {
    size_t total_tiles = (size_t)(b->rows * b->columns);

    b->entity_ids = calloc(total_tiles, sizeof(unsigned));
    if (!b->entity_ids) {
        return false;
    }

    b->tile_states = calloc(total_tiles, sizeof(TileState));
    if (!b->tile_states) {
        return false;
    }

    b->animations = calloc(total_tiles, sizeof(TileAnimation));
    if (!b->animations) {
        return false;
    }

    b->display_sprites = calloc(total_tiles, sizeof(unsigned));
    if (!b->display_sprites) {
        return false;
    }

    // Allocate tile variation arrays
    b->tile_variations = calloc(total_tiles, sizeof(unsigned));
    if (!b->tile_variations) {
        return false;
    }

    b->tile_rotations = calloc(total_tiles, sizeof(unsigned));
    if (!b->tile_rotations) {
        return false;
    }

    return true;
}

void board_free_arrays(struct Board *b) {
    if (b->entity_ids) {
        free(b->entity_ids);
        b->entity_ids = NULL;
    }
    if (b->tile_states) {
        free(b->tile_states);
        b->tile_states = NULL;
    }
    if (b->animations) {
        free(b->animations);
        b->animations = NULL;
    }
    if (b->display_sprites) {
        free(b->display_sprites);
        b->display_sprites = NULL;
    }
    if (b->tile_variations) {
        free(b->tile_variations);
        b->tile_variations = NULL;
    }
    if (b->tile_rotations) {
        free(b->tile_rotations);
        b->tile_rotations = NULL;
    }
}

bool board_reset(struct Board *b) {
    board_free_arrays(b);

    if (!board_calloc_arrays(b)) {
        return false;
    }

    // Initialize all tiles as hidden with empty entities (entity ID 0)
    size_t total_tiles = (size_t)(b->rows * b->columns);
    for (size_t i = 0; i < total_tiles; i++) {
        b->entity_ids[i] = 0;        // Empty entity
        b->tile_states[i] = TILE_HIDDEN;
        b->animations[i].type = ANIM_NONE;
        b->display_sprites[i] = SPRITE_HIDDEN;  // Hidden sprite from main.h
        
        // Generate random variations for TILE_HIDDEN tiles (indices 5-7 as requested)
        b->tile_variations[i] = 5 + (rand() % 3);  // Random from 5, 6, 7
        b->tile_rotations[i] = rand() % 4;          // Random rotation 0-3 (0°, 90°, 180°, 270°)
    }

    return true;
}

bool board_load_solution(struct Board *b, const char *solution_file, unsigned solution_index) {
    SolutionData solution = {0};
    
    if (!config_load_solution(&solution, solution_file, solution_index)) {
        fprintf(stderr, "Failed to load solution\n");
        return false;
    }
    
    printf("Loaded solution %u: %s (%ux%u)\n", solution_index, solution.uuid, solution.rows, solution.cols);
    
    // Ensure board size matches solution
    if (solution.rows != b->rows || solution.cols != b->columns) {
        fprintf(stderr, "Solution size (%ux%u) doesn't match board size (%ux%u)\n",
                solution.rows, solution.cols, b->rows, b->columns);
        config_free_solution(&solution);
        return false;
    }
    
    // Load entity IDs from solution
    for (unsigned r = 0; r < b->rows; r++) {
        for (unsigned c = 0; c < b->columns; c++) {
            unsigned entity_id = solution.board[r][c];
            board_set_entity_id(b, r, c, entity_id);
            
            // All tiles start hidden
            board_set_tile_state(b, r, c, TILE_HIDDEN);
        }
    }
    
    config_free_solution(&solution);
    return true;
}

void board_set_scale(struct Board *b, int scale) {
    b->scale = scale;
    b->piece_size = PIECE_SIZE * b->scale;
    b->rect.x = (PIECE_SIZE - BORDER_LEFT) * b->scale;
    b->rect.y = BORDER_HEIGHT * b->scale;
    b->rect.w = (int)b->columns * b->piece_size;
    b->rect.h = (int)b->rows * b->piece_size;
}

void board_set_theme(struct Board *b, unsigned theme) { 
    b->theme = theme;
}

void board_set_size(struct Board *b, unsigned rows, unsigned columns) {
    board_free_arrays(b);
    b->rows = rows;
    b->columns = columns;
    b->rect.w = (int)b->columns * b->piece_size;
    b->rect.h = (int)b->rows * b->piece_size;
}

// Core game state access
unsigned board_get_entity_id(const struct Board *b, unsigned row, unsigned col) {
    if (row >= b->rows || col >= b->columns) {
        return 0; // Return empty entity for out of bounds
    }
    size_t index = (size_t)(row * b->columns + col);
    return b->entity_ids[index];
}

void board_set_entity_id(struct Board *b, unsigned row, unsigned col, unsigned entity_id) {
    if (row >= b->rows || col >= b->columns) {
        return; // Ignore out of bounds
    }
    size_t index = (size_t)(row * b->columns + col);
    b->entity_ids[index] = entity_id;
}

TileState board_get_tile_state(const struct Board *b, unsigned row, unsigned col) {
    if (row >= b->rows || col >= b->columns) {
        return TILE_HIDDEN; // Return hidden for out of bounds
    }
    size_t index = (size_t)(row * b->columns + col);
    return b->tile_states[index];
}

void board_set_tile_state(struct Board *b, unsigned row, unsigned col, TileState state) {
    if (row >= b->rows || col >= b->columns) {
        return; // Ignore out of bounds
    }
    size_t index = (size_t)(row * b->columns + col);
    b->tile_states[index] = state;
    
    // Update display sprite immediately if not animating
    if (b->animations[index].type == ANIM_NONE) {
        unsigned entity_id = b->entity_ids[index];
        b->display_sprites[index] = get_entity_sprite_index(entity_id, state);
    }
}

// Animation system
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
        case ANIM_DYING:
        case ANIM_TREASURE_CLAIM:
        case ANIM_ENTITY_TRANSITION:
            anim->start_sprite = get_entity_sprite_index(entity_id, tile_state);
            anim->end_sprite = get_entity_sprite_index(entity_id, tile_state);
            break;
        default:
            anim->start_sprite = b->display_sprites[index];
            anim->end_sprite = b->display_sprites[index];
            break;
    }
    
    b->display_sprites[index] = anim->start_sprite;
}

bool board_is_tile_animating(const struct Board *b, unsigned row, unsigned col) {
    if (row >= b->rows || col >= b->columns) {
        return false;
    }
    size_t index = (size_t)(row * b->columns + col);
    return b->animations[index].type != ANIM_NONE;
}

void board_update_animations(struct Board *b) {
    Uint32 current_time = SDL_GetTicks();
    
    for (unsigned r = 0; r < b->rows; r++) {
        for (unsigned c = 0; c < b->columns; c++) {
            size_t index = (size_t)(r * b->columns + c);
            TileAnimation *anim = &b->animations[index];
            
            if (anim->type != ANIM_NONE) {
                if (current_time >= anim->start_time + anim->duration_ms) {
                    // Animation finished
                    board_finish_animation(b, r, c);
                } else {
                    // Update animation progress
                    float progress = (float)(current_time - anim->start_time) / anim->duration_ms;
                    
                    // For now, simple sprite transition (could add interpolation later)
                    unsigned new_sprite = (progress > 0.5f) ? anim->end_sprite : anim->start_sprite;
                    if (new_sprite != b->display_sprites[index]) {
                        printf("  Animation progress %.1f%%: sprite %u -> %u at [%u,%u]\n", 
                               progress * 100.0f, b->display_sprites[index], new_sprite, r, c);
                        b->display_sprites[index] = new_sprite;
                    }
                }
            }
        }
    }
}

void board_finish_animation(struct Board *b, unsigned row, unsigned col) {
    size_t index = (size_t)(row * b->columns + col);
    TileAnimation *anim = &b->animations[index];
    
    // Set final sprite
    b->display_sprites[index] = anim->end_sprite;
    
    // Clear animation
    anim->type = ANIM_NONE;
    
    printf("Animation finished for tile [%u,%u] - Final sprite: %u\n", row, col, anim->end_sprite);
}

// Game logic
bool board_handle_click(struct Board *b, unsigned row, unsigned col) {
    if (row >= b->rows || col >= b->columns) {
        return false;
    }
    
    // Check if tile is blocked by animation
    if (board_is_tile_animating(b, row, col)) {
        size_t index = (size_t)(row * b->columns + col);
        if (b->animations[index].blocks_input) {
            return false; // Input blocked during animation
        }
    }
    
    TileState current_state = board_get_tile_state(b, row, col);
    unsigned entity_id = board_get_entity_id(b, row, col);
    
    if (current_state == TILE_HIDDEN) {
        // Reveal tile
        printf("Revealing tile [%u,%u] with entity %u\n", row, col, entity_id);
        
        // Get entity info for debug
        Entity *entity = config_get_entity(&g_config, entity_id);
        if (entity) {
            printf("  Entity: %s (ID: %u, Level: %u)\n", entity->name, entity->id, entity->level);
            printf("  Sprite position: x=%u, y=%u\n", entity->sprite_pos.x, entity->sprite_pos.y);
        }
        
        // 1. IMMEDIATE logical state update (like JS)
        board_set_tile_state(b, row, col, TILE_REVEALED);
        
        // 2. Start visual animation
        board_start_animation(b, row, col, ANIM_REVEALING, 800, false); // 0.8s reveal
        
        return true;
    } else {
        // Tile already revealed - handle combat/treasure/etc
        Entity *entity = config_get_entity(&g_config, entity_id);
        if (entity) {
            printf("Clicking revealed tile [%u,%u]: %s (level %u)\n", 
                   row, col, entity->name, entity->level);
            
            if (entity->is_enemy) {
                // Start combat animation
                board_start_animation(b, row, col, ANIM_COMBAT, 500, false);
            } else if (entity->is_treasure) {
                // Start treasure claim animation  
                board_start_animation(b, row, col, ANIM_TREASURE_CLAIM, 300, false);
            }
        }
        
        return true;
    }
}

unsigned get_entity_sprite_index(unsigned entity_id, TileState tile_state) {
    if (tile_state == TILE_HIDDEN) {
        return SPRITE_HIDDEN;
    }
    
    // For revealed tiles, use entity's sprite position
    Entity *entity = config_get_entity(&g_config, entity_id);
    if (entity) {
        // Convert 2D sprite position to 1D index
        // Assuming 16 sprites per row in the sprite sheet
        unsigned sprite_index = entity->sprite_pos.y * 4 + entity->sprite_pos.x;
        printf("    Calculating sprite index: y=%u * 4 + x=%u = %u\n", 
               entity->sprite_pos.y, entity->sprite_pos.x, sprite_index);
        return sprite_index;
    }
    
    // Default to cleared sprite if entity not found
    printf("    Entity %u not found, using SPRITE_CLEARED (%u)\n", entity_id, SPRITE_CLEARED);
    return SPRITE_CLEARED;
}

void board_draw(const struct Board *b) {
    SDL_Rect dest_rect = {0, 0, b->piece_size, b->piece_size};
    
    for (unsigned r = 0; r < b->rows; r++) {
        dest_rect.y = (int)r * b->piece_size + b->rect.y;
        for (unsigned c = 0; c < b->columns; c++) {
            dest_rect.x = (int)c * b->piece_size + b->rect.x;
            
            size_t index = (size_t)(r * b->columns + c);
            TileState tile_state = b->tile_states[index];
            
            if (tile_state == TILE_HIDDEN) {
                // First render the base hidden tile (index 0) - grey tile with light grey border
                SDL_RenderCopy(b->renderer, b->tile_sprites,
                               &b->tile_src_rects[0], &dest_rect);
                
                // Then render the variation tile (indices 5-7) on top with rotation
                unsigned tile_variation = b->tile_variations[index];
                unsigned rotation = b->tile_rotations[index];
                
                // Ensure tile variation is valid
                if (tile_variation < 256) { // Assuming max 256 sprites in tile sheet
                    // Apply rotation by setting the rotation angle
                    double angle = rotation * 90.0; // 0°, 90°, 180°, 270°
                    SDL_Point center = {b->piece_size / 2, b->piece_size / 2};
                    
                    SDL_RenderCopyEx(b->renderer, b->tile_sprites,
                                   &b->tile_src_rects[tile_variation], &dest_rect,
                                   angle, &center, SDL_FLIP_NONE);
                }
            } else {
                // TILE_REVEALED: use entity sprites
                unsigned sprite_index = b->display_sprites[index];
                
                // Ensure sprite index is valid
                if (sprite_index < 256) { // Assuming max 256 sprites in sheet
                    SDL_RenderCopy(b->renderer, b->entity_sprites,
                                   &b->entity_src_rects[sprite_index], &dest_rect);
                }
            }
        }
    }
}

// ========== ADMIN FUNCTIONS ==========

void board_reveal_all_tiles(struct Board *b) {
    printf("Revealing all %ux%u tiles...\n", b->rows, b->columns);
    
    for (unsigned r = 0; r < b->rows; r++) {
        for (unsigned c = 0; c < b->columns; c++) {
            TileState current_state = board_get_tile_state(b, r, c);
            
            if (current_state == TILE_HIDDEN) {
                // Reveal the tile immediately (no animation for admin reveal)
                board_set_tile_state(b, r, c, TILE_REVEALED);
                
                // Update display sprite immediately
                size_t index = (size_t)(r * b->columns + c);
                unsigned entity_id = b->entity_ids[index];
                b->display_sprites[index] = get_entity_sprite_index(entity_id, TILE_REVEALED);
                
                // Clear any ongoing animation
                b->animations[index].type = ANIM_NONE;
            }
        }
    }
    
    printf("All tiles revealed!\n");
}
