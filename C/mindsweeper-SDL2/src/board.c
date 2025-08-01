#include "board.h"
#include "config.h"
#include "load_media.h"
#include "board_click.h"

// Static game configuration - loaded once at startup
static GameConfig g_config = {0};
static bool g_config_loaded = false;

bool board_calloc_arrays(struct Board *b);
void board_free_arrays(struct Board *b);
unsigned get_entity_sprite_index(unsigned entity_id, TileState tile_state, unsigned row, unsigned col, SpriteType sprite_type);
void board_draw_threat_level_text(const struct Board *b, const char *text, int x, int y, SDL_Color color);
static bool board_apply_solution_data(struct Board *b, const SolutionData *solution);

bool board_new(struct Board **board, SDL_Renderer *renderer, unsigned rows,
               unsigned columns, int scale) {
    // Parameter validation
    if (!board || !renderer || rows == 0 || columns == 0 || scale <= 0) {
        fprintf(stderr, "Invalid parameters to board_new\n");
        return false;
    }

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
        if (!config_load(&g_config, "assets/config_v2.json")) {
#else
        if (!config_load(&g_config, "assets/config_v2.json")) {
#endif
            fprintf(stderr, "Failed to load game config\n");
            return false;
        }
        g_config_loaded = true;
        printf("Loaded %u entities from config\n", g_config.entity_count);
    }

    // Load entity sprites (dragons theme)
    if (!load_media_sheet(b->renderer, &b->entity_sprites, 
                          "assets/images/sprite-sheet-cats.png",
                          PIECE_SIZE, PIECE_SIZE, &b->entity_src_rects)) {
        fprintf(stderr, "Failed to load entity sprites\n");
        return false;
    }

    // Load tile sprites for TILE_HIDDEN variations
    if (!load_media_sheet(b->renderer, &b->tile_sprites, 
                          "assets/images/tile-16x16.png",
                          PIECE_SIZE, PIECE_SIZE, &b->tile_src_rects)) {
        fprintf(stderr, "Failed to load tile sprites\n");
        return false;
    }

    // Load TTF font for threat level display
    b->threat_font = TTF_OpenFont("assets/images/m6x11.ttf", 12 * b->scale);
    if (!b->threat_font) {
        fprintf(stderr, "Failed to load TTF font for threat levels: %s\n", TTF_GetError());
        return false;
    }

    board_set_scale(b, b->scale);

    if (!board_reset(b)) {
        return false;
    }

    return true;
}

void board_free(struct Board **board) {
    if (!board || !*board) {
        return; // Safe to call with NULL
    }
    
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

    if (b->threat_font) {
        TTF_CloseFont(b->threat_font);
        b->threat_font = NULL;
    }

    b->renderer = NULL;

    free(*board);
    *board = NULL;

    printf("board clean.\n");
}

bool board_calloc_arrays(struct Board *b) {
    size_t total_tiles = (size_t)(b->rows * b->columns);
    
    b->entity_ids = calloc(total_tiles, sizeof(unsigned));
    b->tile_states = calloc(total_tiles, sizeof(TileState));
    b->dead_entities = calloc(total_tiles, sizeof(bool));
    b->animations = calloc(total_tiles, sizeof(TileAnimation));
    b->display_sprites = calloc(total_tiles, sizeof(unsigned));
    b->tile_variations = calloc(total_tiles, sizeof(unsigned));
    b->tile_rotations = calloc(total_tiles, sizeof(unsigned));
    b->threat_levels = calloc(total_tiles, sizeof(unsigned));
    b->annotations = calloc(total_tiles, sizeof(unsigned));

    if (!b->entity_ids || !b->tile_states || !b->dead_entities || !b->animations || 
        !b->display_sprites || !b->tile_variations || !b->tile_rotations || 
        !b->threat_levels || !b->annotations) {
        board_free_arrays(b);
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
    if (b->dead_entities) {
        free(b->dead_entities);
        b->dead_entities = NULL;
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
    if (b->threat_levels) {
        free(b->threat_levels);
        b->threat_levels = NULL;
    }
    if (b->annotations) {
        free(b->annotations);
        b->annotations = NULL;
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
        b->dead_entities[i] = false; // No entities are dead initially
        b->animations[i].type = ANIM_NONE;
        b->display_sprites[i] = SPRITE_HIDDEN;  // Hidden sprite from main.h
        
        // Generate random variations for TILE_HIDDEN tiles
        b->tile_variations[i] = (unsigned)(MIN_TILE_VARIATION + (rand() % (MAX_TILE_VARIATION - MIN_TILE_VARIATION + 1)));
        b->tile_rotations[i] = (unsigned)(rand() % NUM_TILE_ROTATIONS);          // Random rotation 0-3 (0°, 90°, 180°, 270°)
        
        // Initialize annotations as none
        b->annotations[i] = ANNOTATION_NONE;
    }

    // Calculate initial threat levels
    board_calculate_threat_levels(b);

    return true;
}

// Magic number for the starting entity that should be revealed
#define STARTING_ENTITY_ID 11

bool board_load_solution(struct Board *b, const char *solution_file, unsigned solution_index) {
    // Parameter validation
    if (!b || !solution_file) {
        fprintf(stderr, "Invalid parameters to board_load_solution\n");
        return false;
    }
    
    SolutionData solution = {0};
    bool success = false;
    
    // Load solution data
    if (!config_load_solution(&solution, solution_file, solution_index)) {
        fprintf(stderr, "Failed to load solution from %s (index %u)\n", solution_file, solution_index);
        goto cleanup;
    }
    
    // Validate solution size matches board
    if (solution.rows != b->rows || solution.cols != b->columns) {
        fprintf(stderr, "Solution size (%ux%u) doesn't match board size (%ux%u)\n",
                solution.rows, solution.cols, b->rows, b->columns);
        goto cleanup;
    }
    
    // Load solution data into board
    if (!board_apply_solution_data(b, &solution)) {
        fprintf(stderr, "Failed to apply solution data to board\n");
        goto cleanup;
    }
    
    success = true;
    
cleanup:
    config_free_solution(&solution);
    return success;
}

static bool board_apply_solution_data(struct Board *b, const SolutionData *solution) {
    if (!b || !solution || !solution->board) {
        return false;
    }
    
    bool first_starting_entity_found = false;
    
    // Apply solution data to board
    for (unsigned r = 0; r < b->rows; r++) {
        for (unsigned c = 0; c < b->columns; c++) {
            unsigned entity_id = solution->board[r][c];
            
            // Set entity ID
            board_set_entity_id(b, r, c, entity_id);
            
            // Set tile state - all hidden except first starting entity
            if (entity_id == STARTING_ENTITY_ID && !first_starting_entity_found) {
                board_set_tile_state(b, r, c, TILE_REVEALED);
                first_starting_entity_found = true;
            } else {
                board_set_tile_state(b, r, c, TILE_HIDDEN);
            }
            
            // Reset dead entity status and annotations for new game
            size_t index = (size_t)(r * b->columns + c);
            b->dead_entities[index] = false;
            b->annotations[index] = ANNOTATION_NONE;
        }
    }
    
    // Calculate threat levels for the loaded solution
    board_calculate_threat_levels(b);
    
    return true;
}

void board_set_scale(struct Board *b, int scale) {
    b->scale = scale;
    b->piece_size = PIECE_SIZE * b->scale;
    b->rect.x = (PIECE_SIZE - BORDER_LEFT) * b->scale;
    b->rect.y = GAME_BOARD_Y * b->scale;
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
    
    // Recalculate threat levels since entity change affects neighbors
    board_calculate_threat_levels(b);
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
        b->display_sprites[index] = get_entity_sprite_index(entity_id, state, row, col, SPRITE_TYPE_NORMAL);
    }
    
    // Recalculate threat levels when tile is revealed
    if (state == TILE_REVEALED) {
        board_calculate_threat_levels(b);
    }
}

// Animation system


bool board_is_tile_animating(const struct Board *b, unsigned row, unsigned col) {
    if (row >= b->rows || col >= b->columns) {
        return false;
    }
    size_t index = (size_t)(row * b->columns + col);
    return b->animations[index].type != ANIM_NONE;
}

void board_update_animations(struct Board *b, struct Game *g) {
    Uint32 current_time = SDL_GetTicks();
    
    for (unsigned r = 0; r < b->rows; r++) {
        for (unsigned c = 0; c < b->columns; c++) {
            size_t index = (size_t)(r * b->columns + c);
            TileAnimation *anim = &b->animations[index];
            
            if (anim->type != ANIM_NONE) {
                if (current_time >= anim->start_time + anim->duration_ms) {
                    // Animation finished
                    board_finish_animation(b, r, c, g);
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



unsigned get_entity_sprite_index(unsigned entity_id, TileState tile_state, unsigned row, unsigned col, SpriteType sprite_type) {
    if (tile_state == TILE_HIDDEN) {
        return SPRITE_HIDDEN;
    }
    
    // For revealed tiles, use entity's sprite position
    Entity *entity = config_get_entity(&g_config, entity_id);
    if (entity) {
        // Special handling for crystals (entity ID 15) - assign different colors based on position
        if (entity_id == 15) {
            // Crystal colors: red, blue, yellow, green
            const unsigned crystal_colors[4][2] = {
                {0, 27}, // Red crystal
                {0, 28}, // Blue crystal  
                {0, 29}, // Yellow crystal
                {0, 30}  // Green crystal
            };
            
            // Use a simple formula that gives good distribution for the specific board positions
            // Based on the actual crystal positions in the board: [0,2], [1,11], [9,5], [9,13]
            unsigned color_index;
            if (row == 0 && col == 2) color_index = 0;      // Red
            else if (row == 1 && col == 11) color_index = 1; // Blue
            else if (row == 9 && col == 5) color_index = 2;  // Yellow
            else if (row == 9 && col == 13) color_index = 3; // Green
            else color_index = (row + col) % 4; // Fallback for any other crystals
            
            unsigned sprite_x = crystal_colors[color_index][0];
            unsigned sprite_y = crystal_colors[color_index][1];
            unsigned sprite_index = sprite_y * 4 + sprite_x;
            
            printf("    Crystal at [%u,%u] assigned color %u (sprite index %u)\n", 
                   row, col, color_index, sprite_index);
            return sprite_index;
        }
        
        // Check if we should use the hostile sprite
        if (sprite_type == SPRITE_TYPE_HOSTILE && entity->hostile_sprite_pos.has_hostile_sprite) {
            unsigned sprite_index = entity->hostile_sprite_pos.y * 4 + entity->hostile_sprite_pos.x;
            printf("    Using hostile sprite for entity %u: y=%u * 4 + x=%u = %u\n", 
                   entity_id, entity->hostile_sprite_pos.y, entity->hostile_sprite_pos.x, sprite_index);
            return sprite_index;
        }
        
        // Standard sprite handling for other entities
        unsigned sprite_index = entity->sprite_pos.y * 4 + entity->sprite_pos.x;
        // printf("    Calculating sprite index: y=%u * 4 + x=%u = %u\n", 
        //        entity->sprite_pos.y, entity->sprite_pos.x, sprite_index);
        return sprite_index;
    }
    
    // Default to cleared sprite if entity not found
    printf("    Entity %u not found, using SPRITE_CLEARED (%u)\n", entity_id, SPRITE_CLEARED);
    return SPRITE_CLEARED;
}

/**
 * @brief Get the appropriate tile sprite index based on tile state and entity information
 * @param b Pointer to the board
 * @param row Row index
 * @param col Column index
 * @return Tile sprite index (0-3 based on requirements)
 */
unsigned get_tile_sprite_index(const struct Board *b, unsigned row, unsigned col) {
    size_t index = (size_t)(row * b->columns + col);
    TileState tile_state = b->tile_states[index];
    unsigned entity_id = b->entity_ids[index];
    
    unsigned tile_sprite = 0;
    
    if (tile_state == TILE_HIDDEN) {
        // Hidden tile - sprite 0
        tile_sprite = 0;
    } else {
        // Revealed tile
        if (entity_id == 0) {
            // Empty tile - always use sprite 3 (revealed and empty)
            tile_sprite = 3;
        } else {
            // Entity tile - check if entity is friendly (level = 0) or hostile
            Entity *entity = config_get_entity(&g_config, entity_id);
            if (entity && entity->level == 0) {
                // Revealed and friendly (level = 0) - sprite 2
                tile_sprite = 2;
            } else {
                // Revealed and hostile - sprite 4
                tile_sprite = 4;
            }
        }
    }
    

    
    return tile_sprite;
}

void board_draw(const struct Board *b) {
    SDL_Rect dest_rect = {0, 0, b->piece_size, b->piece_size};
    
    for (unsigned r = 0; r < b->rows; r++) {
        dest_rect.y = (int)r * b->piece_size + b->rect.y;
        for (unsigned c = 0; c < b->columns; c++) {
            dest_rect.x = (int)c * b->piece_size + b->rect.x;
            
            size_t index = (size_t)(r * b->columns + c);
            TileState tile_state = b->tile_states[index];
            
            // Get the appropriate tile sprite index based on tile state and entity
            unsigned tile_sprite_index = get_tile_sprite_index(b, r, c);
            
            // Render the base tile sprite first
            if (tile_sprite_index < 256) { // Assuming max 256 sprites in tile sheet
                SDL_RenderCopy(b->renderer, b->tile_sprites,
                               &b->tile_src_rects[tile_sprite_index], &dest_rect);
            }
            
            // Render black border around each tile
            SDL_SetRenderDrawColor(b->renderer, 0, 0, 0, 255); // Black
            SDL_RenderDrawRect(b->renderer, &dest_rect);
            
            // Reset render color to default
            SDL_SetRenderDrawColor(b->renderer, 0, 0, 0, 255);
            
            if (tile_state == TILE_HIDDEN) {
                // For hidden tiles, add variation and rotation on top
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
                
                // Draw annotation on top of hidden tile (highest z-axis)
                board_draw_annotation(b, r, c, dest_rect);
            } else {
                // TILE_REVEALED: render entity sprite or threat level on top of tile
                unsigned sprite_index = b->display_sprites[index];
                unsigned entity_id = b->entity_ids[index];
                
                // If this is an empty tile (entity_id == 0), render threat level
                if (entity_id == 0) {
                    unsigned threat_level = b->threat_levels[index];
                    
                    // Only render threat level if > 0
                    if (threat_level > 0) {
                        // Display the actual threat level (no longer clamped to 0-9)
                        unsigned display_level = threat_level;
                        
                        // Convert to string
                        char threat_text[16];  // Increased buffer size to handle larger numbers
                        snprintf(threat_text, sizeof(threat_text), "%u", display_level);
                        
                        // Render the threat level text (centered in tile) - red with black outline
                        board_draw_threat_level_text_centered(b, threat_text, dest_rect);
                    }
                } else {
                    // Render entity sprite for non-empty tiles (z-axis priority)
                    // Ensure sprite index is valid
                    if (sprite_index < 256) { // Assuming max 256 sprites in sheet
                        SDL_RenderCopy(b->renderer, b->entity_sprites,
                                       &b->entity_src_rects[sprite_index], &dest_rect);
                    }
                }
            }
        }
    }
}

// ========== THREAT LEVEL FUNCTIONS ==========

void board_draw_threat_level_text(const struct Board *b, const char *text, int x, int y, SDL_Color color) {
    if (!b->threat_font || !text) {
        return;
    }
    
    SDL_Surface *text_surface = TTF_RenderText_Solid(b->threat_font, text, color);
    if (!text_surface) {
        return;
    }
    
    SDL_Texture *text_texture = SDL_CreateTextureFromSurface(b->renderer, text_surface);
    if (!text_texture) {
        SDL_FreeSurface(text_surface);
        return;
    }
    
    SDL_Rect dest_rect = {
        x,
        y,
        text_surface->w,
        text_surface->h
    };
    
    SDL_RenderCopy(b->renderer, text_texture, NULL, &dest_rect);
    
    SDL_DestroyTexture(text_texture);
    SDL_FreeSurface(text_surface);
}

void board_draw_threat_level_text_centered(const struct Board *b, const char *text, SDL_Rect tile_rect) {
    if (!b->threat_font || !text) {
        return;
    }
    
    // Colors for outline effect
    SDL_Color black = {0, 0, 0, 255};    // Outline color
    SDL_Color red = {220, 20, 20, 255};  // Main text color
    
    // Create text surfaces
    SDL_Surface *outline_surface = TTF_RenderText_Solid(b->threat_font, text, black);
    SDL_Surface *main_surface = TTF_RenderText_Solid(b->threat_font, text, red);
    
    if (!outline_surface || !main_surface) {
        if (outline_surface) SDL_FreeSurface(outline_surface);
        if (main_surface) SDL_FreeSurface(main_surface);
        return;
    }
    
    // Create textures
    SDL_Texture *outline_texture = SDL_CreateTextureFromSurface(b->renderer, outline_surface);
    SDL_Texture *main_texture = SDL_CreateTextureFromSurface(b->renderer, main_surface);
    
    if (!outline_texture || !main_texture) {
        if (outline_texture) SDL_DestroyTexture(outline_texture);
        if (main_texture) SDL_DestroyTexture(main_texture);
        SDL_FreeSurface(outline_surface);
        SDL_FreeSurface(main_surface);
        return;
    }
    
    // Calculate centered position within the tile
    int text_x = tile_rect.x + (tile_rect.w - main_surface->w) / 2;
    int text_y = tile_rect.y + (tile_rect.h - main_surface->h) / 2;
    
    // Outline offset positions (8-directional outline)
    int outline_offsets[][2] = {
        {-1, -1}, {0, -1}, {1, -1},  // Top row
        {-1,  0},          {1,  0},  // Middle row (skip center)
        {-1,  1}, {0,  1}, {1,  1}   // Bottom row
    };
    
    // Draw black outline in all 8 directions
    for (int i = 0; i < 8; i++) {
        SDL_Rect outline_rect = {
            text_x + outline_offsets[i][0],
            text_y + outline_offsets[i][1],
            outline_surface->w,
            outline_surface->h
        };
        SDL_RenderCopy(b->renderer, outline_texture, NULL, &outline_rect);
    }
    
    // Draw main red text on top
    SDL_Rect main_rect = {
        text_x,
        text_y,
        main_surface->w,
        main_surface->h
    };
    SDL_RenderCopy(b->renderer, main_texture, NULL, &main_rect);
    
    // Cleanup
    SDL_DestroyTexture(outline_texture);
    SDL_DestroyTexture(main_texture);
    SDL_FreeSurface(outline_surface);
    SDL_FreeSurface(main_surface);
}

void board_calculate_threat_levels(struct Board *b) {
    if (!b || !b->threat_levels) {
        return;
    }
    
    // Clear all threat levels first
    size_t total_tiles = (size_t)(b->rows * b->columns);
    for (size_t i = 0; i < total_tiles; i++) {
        b->threat_levels[i] = 0;
    }
    

    for (unsigned row = 0; row < b->rows; row++) {
        for (unsigned col = 0; col < b->columns; col++) {
            size_t index = (size_t)(row * b->columns + col);
            
            // Only calculate threat level for empty tiles (entity_id == 0)
            if (b->entity_ids[index] == 0) {
                unsigned threat_level = 0;
                
                // Check all 8 neighboring positions
                for (int dr = -1; dr <= 1; dr++) {
                    for (int dc = -1; dc <= 1; dc++) {
                        // Skip the center tile (self)
                        if (dr == 0 && dc == 0) continue;
                        
                        int neighbor_row = (int)row + dr;
                        int neighbor_col = (int)col + dc;
                        
                        // Check if neighbor is within bounds
                        if (neighbor_row >= 0 && neighbor_row < (int)b->rows &&
                            neighbor_col >= 0 && neighbor_col < (int)b->columns) {
                            
                            unsigned neighbor_entity_id = board_get_entity_id(b, (unsigned)neighbor_row, (unsigned)neighbor_col);
                            
                            // Get entity level and add to threat - but use level 0 if entity is dead
                            Entity *entity = config_get_entity(&g_config, neighbor_entity_id);
                            if (entity) {
                                // Check if this neighbor entity is marked as dead
                                size_t neighbor_index = (size_t)((unsigned)neighbor_row * b->columns + (unsigned)neighbor_col);
                                if (b->dead_entities[neighbor_index]) {
                                    // Entity is dead, treat as level 0 (no threat)
                                    // threat_level += 0; (no need to add anything)
                                } else {
                                    // Check if entity should contribute to threat calculation
                                    // Exclude neutral obstacles like Stone Barriers
                                    bool is_neutral = entity_has_tag(entity, "no-experience") || 
                                                    entity_has_tag(entity, "onReveal-neutral");
                                    
                                    if (!is_neutral) {
                                        threat_level += entity->level;
                                    }
                                    // Neutral entities (like Stone Barriers) don't contribute to threat
                                }
                            }
                        }
                    }
                }
                
                b->threat_levels[index] = threat_level;
            }
        }
    }
}

unsigned board_get_threat_level(const struct Board *b, unsigned row, unsigned col) {
    if (!b || !b->threat_levels || row >= b->rows || col >= b->columns) {
        return 0;
    }
    
    size_t index = (size_t)(row * b->columns + col);
    return b->threat_levels[index];
}

// ========== DEAD ENTITY MANAGEMENT ==========

void board_mark_entity_dead(struct Board *b, unsigned row, unsigned col) {
    if (!b || !b->dead_entities || row >= b->rows || col >= b->columns) {
        return;
    }
    
    size_t index = (size_t)(row * b->columns + col);
    b->dead_entities[index] = true;
    
    // Recalculate threat levels since a dead entity affects neighbor threat calculations
    board_calculate_threat_levels(b);
    
    printf("Entity at [%u,%u] marked as dead - threat levels recalculated\n", row, col);
}

bool board_is_entity_dead(const struct Board *b, unsigned row, unsigned col) {
    if (!b || !b->dead_entities || row >= b->rows || col >= b->columns) {
        return false;
    }
    
    size_t index = (size_t)(row * b->columns + col);
    return b->dead_entities[index];
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
                b->display_sprites[index] = get_entity_sprite_index(entity_id, TILE_REVEALED, r, c, SPRITE_TYPE_NORMAL);
                
                // Clear any ongoing animation
                b->animations[index].type = ANIM_NONE;
            }
        }
    }
    
    printf("All tiles revealed!\n");
}

const GameConfig* board_get_config(void) {
    return &g_config;
}

// ========== ANNOTATION SYSTEM ==========

void board_set_annotation(struct Board *b, unsigned row, unsigned col, unsigned annotation) {
    if (!b || !b->annotations || row >= b->rows || col >= b->columns) {
        return;
    }
    
    size_t index = (size_t)(row * b->columns + col);
    b->annotations[index] = annotation;
    
    printf("Annotation set at [%u,%u]: %u\n", row, col, annotation);
}

unsigned board_get_annotation(const struct Board *b, unsigned row, unsigned col) {
    if (!b || !b->annotations || row >= b->rows || col >= b->columns) {
        return ANNOTATION_NONE;
    }
    
    size_t index = (size_t)(row * b->columns + col);
    return b->annotations[index];
}

void board_clear_annotation(struct Board *b, unsigned row, unsigned col) {
    board_set_annotation(b, row, col, ANNOTATION_NONE);
}

void board_draw_annotation(const struct Board *b, unsigned row, unsigned col, SDL_Rect tile_rect) {
    if (!b || !b->annotations || !b->threat_font) {
        return;
    }
    
    unsigned annotation = board_get_annotation(b, row, col);
    if (annotation == ANNOTATION_NONE) {
        return; // No annotation to draw
    }
    
    // Prepare annotation text
    char annotation_text[8];
    if (annotation == ANNOTATION_MINE) {
        snprintf(annotation_text, sizeof(annotation_text), "*");
    } else {
        snprintf(annotation_text, sizeof(annotation_text), "%u", annotation);
    }
    
    // Colors for annotation text (distinct from threat level colors)
    SDL_Color black = {0, 0, 0, 255};      // Outline color
    SDL_Color yellow = {255, 255, 0, 255}; // Main annotation color (bright yellow)
    
    // Create text surfaces
    SDL_Surface *outline_surface = TTF_RenderText_Solid(b->threat_font, annotation_text, black);
    SDL_Surface *main_surface = TTF_RenderText_Solid(b->threat_font, annotation_text, yellow);
    
    if (!outline_surface || !main_surface) {
        if (outline_surface) SDL_FreeSurface(outline_surface);
        if (main_surface) SDL_FreeSurface(main_surface);
        return;
    }
    
    // Create textures
    SDL_Texture *outline_texture = SDL_CreateTextureFromSurface(b->renderer, outline_surface);
    SDL_Texture *main_texture = SDL_CreateTextureFromSurface(b->renderer, main_surface);
    
    if (!outline_texture || !main_texture) {
        if (outline_texture) SDL_DestroyTexture(outline_texture);
        if (main_texture) SDL_DestroyTexture(main_texture);
        SDL_FreeSurface(outline_surface);
        SDL_FreeSurface(main_surface);
        return;
    }
    
    // Calculate position (centered in tile)
    int text_x = tile_rect.x + (tile_rect.w - main_surface->w) / 2;
    int text_y = tile_rect.y + (tile_rect.h - main_surface->h) / 2;
    
    // Outline offset positions (simple 4-directional outline)
    int outline_offsets[][2] = {
        {-1, 0}, {1, 0}, {0, -1}, {0, 1}
    };
    
    // Draw black outline
    for (int i = 0; i < 4; i++) {
        SDL_Rect outline_rect = {
            text_x + outline_offsets[i][0],
            text_y + outline_offsets[i][1],
            outline_surface->w,
            outline_surface->h
        };
        SDL_RenderCopy(b->renderer, outline_texture, NULL, &outline_rect);
    }
    
    // Draw main yellow text on top
    SDL_Rect main_rect = {
        text_x,
        text_y,
        main_surface->w,
        main_surface->h
    };
    SDL_RenderCopy(b->renderer, main_texture, NULL, &main_rect);
    
    // Cleanup
    SDL_DestroyTexture(outline_texture);
    SDL_DestroyTexture(main_texture);
    SDL_FreeSurface(outline_surface);
    SDL_FreeSurface(main_surface);
}
