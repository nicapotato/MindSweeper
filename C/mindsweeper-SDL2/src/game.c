#include "game.h"
#include "config.h"
#include "init_sdl.h"
#include "board_click.h"
#include "load_media.h"

#ifdef WASM_BUILD
// Global game pointer for Emscripten main loop
static struct Game *g_game = NULL;
#endif

bool game_create_string(char **game_str, const char *new_str);
void game_set_title(struct Game *g);
bool game_reset(struct Game *g);
void game_set_scale(struct Game *g);
void game_toggle_scale(struct Game *g);
void game_set_theme(struct Game *g, unsigned theme);
bool game_set_size(struct Game *g, unsigned rows, unsigned columns, int scale,
                   const char *size_str);
void game_mouse_down(struct Game *g, int x, int y, Uint8 button);
bool game_mouse_up(struct Game *g, int x, int y, Uint8 button);
bool game_events(struct Game *g);
void game_update(struct Game *g);
void game_draw(const struct Game *g);

#ifdef WASM_BUILD
// Main loop function for Emscripten
void game_main_loop(void) {
    if (!g_game || !g_game->is_running) {
        emscripten_cancel_main_loop();
        return;
    }

    if (!game_events(g_game)) {
        g_game->is_running = false;
        emscripten_cancel_main_loop();
        return;
    }

    game_draw(g_game);
    game_update(g_game);
}
#endif

bool game_new(struct Game **game) {
    *game = calloc(1, sizeof(struct Game));
    if (*game == NULL) {
        fprintf(stderr, "Error in calloc of new game.\n");
        return false;
    }
    struct Game *g = *game;

    g->is_running = true;
    g->game_over_info.is_game_over = false;  // Initialize game over info
    g->game_over_info.death_cause[0] = '\0'; // Empty death cause string
    g->rows = DEFAULT_BOARD_ROWS;      // Use constant instead of magic number
    g->columns = DEFAULT_BOARD_COLS;   // Use constant instead of magic number
    
    // Calculate optimal scale based on window dimensions
    g->scale = calculate_optimal_scale(WINDOW_WIDTH, WINDOW_HEIGHT, g->rows, g->columns);

    if (!game_init_sdl(g)) {
        goto cleanup_failure;
    }

    if (!border_new(&g->border, g->renderer, g->rows, g->columns, g->scale)) {
        goto cleanup_failure;
    }

    if (!board_new(&g->board, g->renderer, g->rows, g->columns, g->scale)) {
        goto cleanup_failure;
    }

    // Load solution data
#ifdef WASM_BUILD
    if (!board_load_solution(g->board, "latest-s-v0_0_9.json", 0)) {
#else
    if (!board_load_solution(g->board, "latest-s-v0_0_9.json", 0)) {
#endif
        fprintf(stderr, "Failed to load solution data\n");
        goto cleanup_failure;
    }

    // Initialize admin panel with solution count
    g->admin.total_solutions = config_count_solutions("latest-s-v0_0_9.json");
    g->admin.current_solution_index = 0;
    printf("Total solutions available: %u\n", g->admin.total_solutions);

    if (!clock_new(&g->clock, g->renderer, g->columns, g->scale)) {
        goto cleanup_failure;
    }

    if (!face_new(&g->face, g->renderer, g->columns, g->scale)) {
        goto cleanup_failure;
    }

    if (!player_panel_new(&g->player_panel, g->renderer, g->columns, g->scale)) {
        goto cleanup_failure;
    }

    if (!game_create_string(&g->size_str, "MindSweeper")) {
        goto cleanup_failure;
    }

    game_set_title(g);
    
    // Initialize player stats and admin panel
    game_init_player_stats(g);
    
    // Initialize screen system
    game_init_screen_system(g);

    return true;

cleanup_failure:
    // Clean up any partially initialized components
    game_free(game);
    return false;
}

void game_free(struct Game **game) {
    if (*game) {
        struct Game *g = *game;

        border_free(&g->border);
        board_free(&g->board);
        clock_free(&g->clock);
        face_free(&g->face);
        player_panel_free(&g->player_panel);

        if (g->size_str) {
            free(g->size_str);
            g->size_str = NULL;
        }
        
        // Clean up screen system resources
        if (g->info_font) {
            TTF_CloseFont(g->info_font);
            g->info_font = NULL;
        }

        if (g->renderer) {
            SDL_DestroyRenderer(g->renderer);
            g->renderer = NULL;
        }

        if (g->window) {
            SDL_DestroyWindow(g->window);
            g->window = NULL;
        }

        TTF_Quit();
        IMG_Quit();
        SDL_Quit();

        free(*game);
        *game = NULL;

        printf("all clean!\n");
    }
}

bool game_create_string(char **game_str, const char *new_str) {
    if (*game_str) {
        free(*game_str);
        *game_str = NULL;
    }

    size_t len = strlen(new_str);
    *game_str = calloc(len + 1, sizeof(char));
    if (!*game_str) {
        fprintf(stderr, "Error in calloc of game string.\n");
        return false;
    }

    strcpy(*game_str, new_str);

    return true;
}

void game_set_title(struct Game *g) {
    char *title = calloc(MAX_TITLE_LENGTH, sizeof(char));
    if (!title) {
        return;
    }

    snprintf(title, MAX_TITLE_LENGTH, "%s - %s", WINDOW_TITLE, g->size_str);
    SDL_SetWindowTitle(g->window, title);

    free(title);
}

bool game_reset(struct Game *g) {
    // Pick a random solution index (excluding the current one for variety)
    unsigned new_solution_index;
    if (g->admin.total_solutions > 1) {
        // If we have multiple solutions, pick a different one
        do {
            new_solution_index = (unsigned)(rand() % g->admin.total_solutions);
        } while (new_solution_index == g->admin.current_solution_index && g->admin.total_solutions > 1);
    } else {
        // If only one solution or no solutions, use index 0
        new_solution_index = 0;
    }
    
    // Load the new solution
    if (!board_load_solution(g->board, "latest-s-v0_0_9.json", new_solution_index)) {
        fprintf(stderr, "Failed to load random solution %u during reset\n", new_solution_index);
        // Fallback to regular reset if loading fails
        if (!board_reset(g->board)) {
            return false;
        }
    } else {
        g->admin.current_solution_index = new_solution_index;
        printf("Reset: Loaded random solution %u\n", new_solution_index);
    }

    clock_reset(g->clock);
    face_default(g->face);
    g->game_over_info.is_game_over = false;  // Reset game over state
    g->game_over_info.death_cause[0] = '\0'; // Clear death cause

    return true;
}

void game_set_scale(struct Game *g) {
    border_set_scale(g->border, g->scale);
    board_set_scale(g->board, g->scale);
    clock_set_scale(g->clock, g->scale);
    face_set_scale(g->face, g->scale);
    player_panel_set_scale(g->player_panel, g->scale);
    
    // Update screen button positions for new scale
    game_setup_screen_buttons(g);
    
    // Update info font size
    if (g->info_font) {
        TTF_CloseFont(g->info_font);
        g->info_font = TTF_OpenFont("images/m6x11.ttf", 14 * g->scale);
    }
}

void game_toggle_scale(struct Game *g) {
    g->scale = (g->scale == 1) ? 2 : 1;
    game_set_scale(g);
}

void game_set_theme(struct Game *g, unsigned theme) {
    border_set_theme(g->border, theme);
    board_set_theme(g->board, theme);
    clock_set_theme(g->clock, theme);
    face_set_theme(g->face, theme);
}

bool game_set_size(struct Game *g, unsigned rows, unsigned columns, int scale,
                   const char *size_str) {
    g->rows = rows;
    g->columns = columns;
    g->scale = scale;

    border_set_size(g->border, g->rows, g->columns);
    board_set_size(g->board, g->rows, g->columns);
    face_set_size(g->face, g->columns);
    player_panel_set_size(g->player_panel, g->columns);

    game_set_scale(g);

    if (!game_create_string(&g->size_str, size_str)) {
        return false;
    }

    game_set_title(g);

    if (!game_reset(g)) {
        return false;
    }

    return true;
}

void game_mouse_down(struct Game *g, int x, int y, Uint8 button) {
    (void)g;
    (void)x;
    (void)y;
    (void)button;
    
    // Simplified - no mouse interaction for now
}

bool game_mouse_up(struct Game *g, int x, int y, Uint8 button) {
    (void)button;
    
    // Only handle game interactions on the main game screen
    if (g->current_screen != SCREEN_GAME) {
        return true;
    }
    
    // Ignore board interactions during game over
    if (g->game_over_info.is_game_over) {
        return true;
    }
    
    // Check if click is in player panel first
    if (player_panel_handle_click(g->player_panel, x, y, g)) {
        return true;
    }
    
    // Convert screen coordinates to board coordinates
    int board_x = x - g->board->rect.x;
    int board_y = y - g->board->rect.y;
    
    if (board_x >= 0 && board_y >= 0 && 
        board_x < g->board->rect.w && board_y < g->board->rect.h) {
        
        unsigned col = (unsigned)(board_x / g->board->piece_size);
        unsigned row = (unsigned)(board_y / g->board->piece_size);
        
        if (row < g->board->rows && col < g->board->columns) {
            if (!board_handle_click(g, row, col)) {
                return false;
            }
        }
    }
    
    return true;
}

bool game_events(struct Game *g) {
    while (SDL_PollEvent(&g->event)) {
        switch (g->event.type) {
        case SDL_QUIT:
            g->is_running = false;
            break;
        case SDL_MOUSEBUTTONDOWN:
            game_mouse_down(g, g->event.button.x, g->event.button.y,
                            g->event.button.button);
            break;
        case SDL_MOUSEBUTTONUP:
            if (!game_mouse_up(g, g->event.button.x, g->event.button.y,
                               g->event.button.button)) {
                return false;
            }
            break;
        case SDL_KEYDOWN:
            switch (g->event.key.keysym.scancode) {
            case SDL_SCANCODE_SPACE:
                if (g->game_over_info.is_game_over) {
                    game_reset_game_over(g);
                } else {
                    if (!game_reset(g))
                        return false;
                }
                break;
            // case SDL_SCANCODE_Z:
            //     game_toggle_scale(g);
            //     break;
            // case SDL_SCANCODE_1:
            //     game_set_theme(g, 0);
            //     break;
            // case SDL_SCANCODE_2:
            //     game_set_theme(g, 1);
            //     break;
            // case SDL_SCANCODE_Q:
            //     if (!game_set_size(g, 9, 9, 2, "Tiny"))
            //         return false;
            //     break;
            // case SDL_SCANCODE_W:
            //     if (!game_set_size(g, 16, 16, 2, "Small"))
            //         return false;
            //     break;
            // case SDL_SCANCODE_E:
            //     if (!game_set_size(g, 16, 30, 2, "Medium"))
            //         return false;
            //     break;
            // case SDL_SCANCODE_R:
            //     if (!game_set_size(g, 20, 40, 2, "Large"))
            //         return false;
            //     break;
            // case SDL_SCANCODE_T:
            //     if (!game_set_size(g, 40, 80, 1, "Huge"))
            //         return false;
            //     break;
            // Admin Panel Controls
            case SDL_SCANCODE_P:
                game_toggle_admin_panel(g);
                break;
            case SDL_SCANCODE_G:
                game_admin_god_mode(g);
                break;
            case SDL_SCANCODE_R:
                game_admin_reveal_all(g);
                break;
            case SDL_SCANCODE_F4:
                if (!game_admin_load_map(g, g->admin.current_solution_index + 1)) {
                    printf("Failed to load next map\n");
                }
                break;
            case SDL_SCANCODE_F5:
                if (g->admin.current_solution_index > 0) {
                    if (!game_admin_load_map(g, g->admin.current_solution_index - 1)) {
                        printf("Failed to load previous map\n");
                    }
                } else {
                    printf("Already at first map (0)\n");
                }
                break;
            case SDL_SCANCODE_F12:
                game_print_admin_help();
                break;
            // Screen navigation keys
            case SDL_SCANCODE_H:
                // Toggle How to Play screen
                if (g->current_screen == SCREEN_HOW_TO_PLAY) {
                    game_set_screen(g, SCREEN_GAME);
                } else {
                    game_set_screen(g, SCREEN_HOW_TO_PLAY);
                }
                break;
            case SDL_SCANCODE_E:
                // Toggle Entities screen  
                if (g->current_screen == SCREEN_ENTITIES) {
                    game_set_screen(g, SCREEN_GAME);
                } else {
                    game_set_screen(g, SCREEN_ENTITIES);
                }
                break;
            case SDL_SCANCODE_ESCAPE:
                // Always return to main game screen
                game_set_screen(g, SCREEN_GAME);
                break;
            default:
                break;
            }
            break;
        default:
            break;
        }
    }

    return true;
}

void game_update(struct Game *g) {
    // Update board animations
    board_update_animations(g->board);
    
    // Update other game systems
    clock_update(g->clock);
    
    // Check if player can level up
    g->player_panel->can_level_up = (g->player.experience >= g->player.exp_to_next_level);
}

void game_draw(const struct Game *g) {
    SDL_RenderClear(g->renderer);

    // Draw based on current screen state
    switch (g->current_screen) {
        case SCREEN_GAME:
            board_draw(g->board);
            player_panel_draw(g->player_panel, &g->player);
            
            // Draw keyboard shortcuts hint
            if (g->info_font) {
                SDL_Color grey = {150, 150, 150, 255};
                const char *hint = "Press H for Help, E for Entities";
                
                SDL_Surface *hint_surface = TTF_RenderText_Solid(g->info_font, hint, grey);
                if (hint_surface) {
                    SDL_Texture *hint_texture = SDL_CreateTextureFromSurface(g->renderer, hint_surface);
                    if (hint_texture) {
                        SDL_Rect hint_rect = {
                            (WINDOW_WIDTH * g->scale) - hint_surface->w - (5 * g->scale),
                            (WINDOW_HEIGHT * g->scale) - hint_surface->h - (5 * g->scale),
                            hint_surface->w,
                            hint_surface->h
                        };
                        SDL_RenderCopy(g->renderer, hint_texture, NULL, &hint_rect);
                        SDL_DestroyTexture(hint_texture);
                    }
                    SDL_FreeSurface(hint_surface);
                }
            }
            
            // Draw game over popup if needed
            game_draw_game_over_popup(g);
            break;
            
        case SCREEN_ENTITIES:
            game_draw_entities_screen(g);
            break;
            
        case SCREEN_HOW_TO_PLAY:
            game_draw_howto_screen(g);
            break;
    }

    SDL_RenderPresent(g->renderer);
}

bool game_run(struct Game *g) {
#ifdef WASM_BUILD
    // Set global game pointer for Emscripten main loop
    g_game = g;
    
    // Use Emscripten's main loop instead of traditional while loop
    // This runs at 60 FPS (0 = use browser's requestAnimationFrame)
    emscripten_set_main_loop(game_main_loop, 0, 1);
    
    return true;
#else
    // Traditional game loop for native builds
    while (g->is_running) {
        if (!game_events(g)) {
            return false;
        }

        game_draw(g);
        game_update(g);

        SDL_Delay(16);
    }

    return true;
#endif
}

// ========== DYNAMIC SCALING FUNCTIONS ==========

int calculate_optimal_scale(int window_width, int window_height, int board_rows, int board_cols) {
    // Reserve space for UI elements
    int ui_margin = 50;  // General margins
    int player_panel_height = PLAYER_PANEL_HEIGHT + 20; // Player panel + spacing
    int border_space = 20; // Additional border space
    
    // Calculate available space for the game board
    int available_width = window_width - (ui_margin * 2) - border_space;
    int available_height = window_height - player_panel_height - (ui_margin * 2) - border_space;
    
    // Calculate scale that fits both width and height
    int max_scale_width = available_width / (board_cols * PIECE_SIZE);
    int max_scale_height = available_height / (board_rows * PIECE_SIZE);
    
    // Use the smaller scale to ensure everything fits
    int optimal_scale = (max_scale_width < max_scale_height) ? max_scale_width : max_scale_height;
    
    // Ensure minimum scale of 1 and reasonable maximum
    if (optimal_scale < 1) optimal_scale = 1;
    if (optimal_scale > 8) optimal_scale = 8;  // Cap at 8x for performance
    
    printf("Window: %dx%d, Available: %dx%d, Calculated scale: %d\n", 
           window_width, window_height, available_width, available_height, optimal_scale);
    
    return optimal_scale;
}

// ========== PLAYER STATS FUNCTIONS ==========

void game_init_player_stats(struct Game *g) {
    // Get starting level from config
    const GameConfig *config = board_get_config();
    unsigned starting_level = (config && config->starting_level > 0) ? config->starting_level : 1;
    
    g->player.level = starting_level;
    g->player.max_health = game_calculate_max_health(g->player.level);
    g->player.health = g->player.max_health;
    g->player.experience = 0;
    g->player.exp_to_next_level = game_calculate_exp_requirement(g->player.level);
    
    // Initialize admin panel
    g->admin.god_mode_enabled = false;
    g->admin.admin_panel_visible = false;
    g->admin.current_solution_index = 0;
    g->admin.total_solutions = 1; // Will be updated when available
    
    printf("Player initialized: Level %u, Health %u/%u, Exp %u/%u\n", 
           g->player.level, g->player.health, g->player.max_health,
           g->player.experience, g->player.exp_to_next_level);
}

void game_update_player_health(struct Game *g, int health_change) {
    if (health_change < 0) {
        unsigned damage = (unsigned)(-health_change);
        if (damage >= g->player.health) {
            g->player.health = 0;
        } else {
            g->player.health -= damage;
        }
    } else {
        g->player.health += (unsigned)health_change;
        if (g->player.health > g->player.max_health) {
            g->player.health = g->player.max_health;
        }
    }
    
    printf("Player health: %u/%u\n", g->player.health, g->player.max_health);
    
    // Removed automatic game over check - will be handled explicitly in combat
}

void game_level_up_player(struct Game *g) {
    // Handle multiple level-ups if player has gained enough experience
    while (g->player.experience >= g->player.exp_to_next_level) {
        // Calculate excess experience that carries over to next level
        unsigned excess_exp = g->player.experience - g->player.exp_to_next_level;
        
        g->player.level++;
        g->player.experience = excess_exp;  // Carry over excess experience
        g->player.max_health = game_calculate_max_health(g->player.level);
        g->player.health = g->player.max_health; // Full heal on level up
        g->player.exp_to_next_level = game_calculate_exp_requirement(g->player.level);
        
        printf("LEVEL UP! Player is now level %u with %u health (excess exp: %u)\n", 
               g->player.level, g->player.max_health, excess_exp);
    }
}

unsigned game_calculate_max_health(unsigned level) {
    if (level >= GOD_MODE_LEVEL) {
        return GOD_MODE_HEALTH; // GOD mode health
    }
    return BASE_HEALTH + (level * HEALTH_PER_LEVEL); // Base health + 2 per level
}

unsigned game_calculate_exp_requirement(unsigned level) {
    return level * EXP_PER_LEVEL_MULTIPLIER; // Simple exp curve: 5, 10, 15, 20, etc.
}

// ========== ADMIN PANEL FUNCTIONS ==========

void game_toggle_admin_panel(struct Game *g) {
    g->admin.admin_panel_visible = !g->admin.admin_panel_visible;
    
    if (g->admin.admin_panel_visible) {
        printf("\n=== ADMIN PANEL ACTIVATED ===\n");
        game_print_admin_help();
        printf("Current Player Stats: Level %u, Health %u/%u\n", 
               g->player.level, g->player.health, g->player.max_health);
        printf("GOD Mode: %s\n", g->admin.god_mode_enabled ? "ENABLED" : "DISABLED");
        printf("Current Map: %u\n", g->admin.current_solution_index);
    } else {
        printf("=== ADMIN PANEL DEACTIVATED ===\n");
    }
}

void game_admin_god_mode(struct Game *g) {
    g->admin.god_mode_enabled = !g->admin.god_mode_enabled;
    
    if (g->admin.god_mode_enabled) {
        g->game_over_info.is_game_over = false;  // Reset game over state when entering god mode
        g->game_over_info.death_cause[0] = '\0'; // Clear death cause
        g->player.level = GOD_MODE_LEVEL;
        g->player.max_health = game_calculate_max_health(g->player.level);
        g->player.health = g->player.max_health;
        g->player.experience = 0;
        g->player.exp_to_next_level = game_calculate_exp_requirement(g->player.level);
        
        printf("🔱 GOD MODE ACTIVATED! Player level set to %u with %u health!\n", 
               GOD_MODE_LEVEL, GOD_MODE_HEALTH);
        face_won(g->face); // Show winning face for GOD mode
    } else {
        g->player.level = 1;
        g->player.max_health = game_calculate_max_health(g->player.level);
        g->player.health = g->player.max_health;
        g->player.experience = 0;
        g->player.exp_to_next_level = game_calculate_exp_requirement(g->player.level);
        
        printf("GOD MODE DEACTIVATED. Player reset to level 1.\n");
        face_default(g->face);
    }
}

void game_admin_reveal_all(struct Game *g) {
    printf("🔍 REVEALING ALL TILES...\n");
    board_reveal_all_tiles(g->board);
    printf("All tiles revealed!\n");
}

bool game_admin_load_map(struct Game *g, unsigned solution_index) {
    printf("📍 Loading map %u...\n", solution_index);
    
    if (board_load_solution(g->board, "latest-s-v0_0_9.json", solution_index)) {
        g->admin.current_solution_index = solution_index;
        
        // Reset game state for new map
        if (!game_reset(g)) {
            return false;
        }
        
        printf("✅ Successfully loaded map %u\n", solution_index);
        return true;
    } else {
        printf("❌ Failed to load map %u\n", solution_index);
        return false;
    }
}

void game_print_admin_help(void) {
    printf("Admin Panel Controls:\n");
    printf("  F1  - Toggle Admin Panel\n");
    printf("  F2  - Toggle GOD Mode (Level 1000)\n");
    printf("  F3  - Reveal All Tiles\n");
    printf("  F4  - Load Next Map\n");
    printf("  F5  - Load Previous Map\n");
    printf("  F12 - Print this help\n");
}

// ========== GAME OVER FUNCTIONS ==========

void game_check_game_over(struct Game *g) {
    // Skip game over check if god mode is enabled
    if (g->admin.god_mode_enabled) {
        return;
    }
    
    if (g->player.health <= 0 && !g->game_over_info.is_game_over) {
        game_set_game_over(g, "Unknown"); // Default death cause if not specified
    }
}

void game_set_game_over(struct Game *g, const char *entity_name) {
    g->game_over_info.is_game_over = true;
    
    // Copy the entity name safely
    if (entity_name) {
        strncpy(g->game_over_info.death_cause, entity_name, MAX_ENTITY_NAME - 1);
        g->game_over_info.death_cause[MAX_ENTITY_NAME - 1] = '\0'; // Ensure null termination
    } else {
        strcpy(g->game_over_info.death_cause, "Unknown");
    }
    
    printf("=== GAME OVER ===\n");
    printf("Death by %s! Press SPACE to restart.\n", g->game_over_info.death_cause);
    face_lost(g->face);  // Set sad face
}

void game_draw_game_over_popup(const struct Game *g) {
    if (!g->game_over_info.is_game_over) {
        return;
    }
    
    // Calculate popup dimensions - much smaller and centered
    int popup_width = 200 * g->scale;
    int popup_height = 80 * g->scale;
    int popup_x = (g->board->rect.x + g->board->rect.w / 2) - (popup_width / 2);
    int popup_y = (g->board->rect.y + g->board->rect.h / 2) - (popup_height / 2);
    
    // Draw semi-transparent overlay only around the popup area
    SDL_SetRenderDrawBlendMode(g->renderer, SDL_BLENDMODE_BLEND);
    SDL_SetRenderDrawColor(g->renderer, 0, 0, 0, 120);  // Semi-transparent black
    SDL_Rect overlay = {
        popup_x - 10 * g->scale, 
        popup_y - 10 * g->scale, 
        popup_width + 20 * g->scale, 
        popup_height + 20 * g->scale
    };
    SDL_RenderFillRect(g->renderer, &overlay);
    
    // Draw popup background (light grey)
    SDL_SetRenderDrawBlendMode(g->renderer, SDL_BLENDMODE_NONE);
    SDL_SetRenderDrawColor(g->renderer, 220, 220, 220, 255);
    SDL_Rect popup_bg = {popup_x, popup_y, popup_width, popup_height};
    SDL_RenderFillRect(g->renderer, &popup_bg);
    
    // Draw popup border (black)
    SDL_SetRenderDrawColor(g->renderer, 0, 0, 0, 255);
    SDL_RenderDrawRect(g->renderer, &popup_bg);
    
    // Draw inner border (white highlight)
    SDL_SetRenderDrawColor(g->renderer, 255, 255, 255, 255);
    SDL_Rect inner_border = {
        popup_x + 1,
        popup_y + 1,
        popup_width - 2,
        popup_height - 2
    };
    SDL_RenderDrawRect(g->renderer, &inner_border);
    
    // Draw death message
    if (g->player_panel && g->player_panel->font) {
        SDL_Color red = {180, 0, 0, 255};
        SDL_Color black = {0, 0, 0, 255};
        
        int text_x = popup_x + 10 * g->scale;
        int text_y = popup_y + 8 * g->scale;
        
        // Draw "GAME OVER" text
        player_panel_draw_text(g->player_panel, "GAME OVER", 
                              text_x, text_y, red);
        
        // Draw death cause message
        char death_message[128];
        snprintf(death_message, sizeof(death_message), "Death by %s", g->game_over_info.death_cause);
        player_panel_draw_text(g->player_panel, death_message, 
                              text_x, text_y + 18 * g->scale, black);
        
        // Draw restart instruction
        player_panel_draw_text(g->player_panel, "Press SPACE to restart", 
                              text_x, text_y + 36 * g->scale, black);
    }
    
    // Reset render color
    SDL_SetRenderDrawColor(g->renderer, 0, 0, 0, 255);
}

void game_reset_game_over(struct Game *g) {
    g->game_over_info.is_game_over = false;
    g->game_over_info.death_cause[0] = '\0'; // Clear death cause
    
    // Reset player stats
    game_init_player_stats(g);
    
    // Reset game board
    if (!game_reset(g)) {
        printf("Warning: Failed to reset game board\n");
    }
    
    printf("Game restarted!\n");
}

// ========== PLAYER PANEL FUNCTIONS ==========

bool player_panel_new(PlayerPanel **panel, SDL_Renderer *renderer, unsigned columns, int scale) {
    *panel = calloc(1, sizeof(PlayerPanel));
    if (!*panel) {
        fprintf(stderr, "Error in calloc of new player panel.\n");
        return false;
    }
    PlayerPanel *p = *panel;

    p->renderer = renderer;
    p->columns = columns;
    p->scale = scale;
    p->can_level_up = false;

    // Load sprite sheet for level-up button
    if (!load_media_sheet(p->renderer, &p->sprite_sheet, 
                          "images/sprite-sheet-cats.png",
                          PIECE_SIZE, PIECE_SIZE, &p->sprite_src_rects)) {
        fprintf(stderr, "Failed to load sprite sheet for player panel\n");
        return false;
    }

    // Load TTF font
    p->font = TTF_OpenFont("images/m6x11.ttf", 12 * p->scale);
    if (!p->font) {
        fprintf(stderr, "Failed to load TTF font: %s\n", TTF_GetError());
        return false;
    }

    player_panel_set_scale(p, p->scale);

    return true;
}

void player_panel_free(PlayerPanel **panel) {
    if (*panel) {
        PlayerPanel *p = *panel;
        
        if (p->sprite_src_rects) {
            free(p->sprite_src_rects);
            p->sprite_src_rects = NULL;
        }

        if (p->sprite_sheet) {
            SDL_DestroyTexture(p->sprite_sheet);
            p->sprite_sheet = NULL;
        }

        if (p->font) {
            TTF_CloseFont(p->font);
            p->font = NULL;
        }
        
        p->renderer = NULL;
        
        free(*panel);
        *panel = NULL;
        
        printf("player panel clean.\n");
    }
}

void player_panel_set_scale(PlayerPanel *p, int scale) {
    p->scale = scale;
    p->rect.x = (PIECE_SIZE - BORDER_LEFT) * p->scale; // Align with game board
    
    // Position panel below the actual board height (using DEFAULT_BOARD_ROWS instead of hardcoded 10)
    p->rect.y = (GAME_BOARD_Y + (PIECE_SIZE * DEFAULT_BOARD_ROWS) + 10) * p->scale; // Below game board
    
    // Calculate panel width based on board columns, but cap it for reasonable UI
    int max_panel_columns = 30; // Reasonable maximum width
    int effective_columns = (p->columns > max_panel_columns) ? max_panel_columns : p->columns;
    p->rect.w = (PIECE_SIZE * effective_columns) * p->scale;
    p->rect.h = PLAYER_PANEL_HEIGHT * p->scale;
    
    // Set up level-up button position (left side)
    p->level_up_button.x = p->rect.x + 5 * p->scale;
    p->level_up_button.y = p->rect.y + 5 * p->scale;
    p->level_up_button.w = (PIECE_SIZE * 2) * p->scale;
    p->level_up_button.h = (PIECE_SIZE * 2) * p->scale;
}

void player_panel_set_size(PlayerPanel *p, unsigned columns) {
    p->columns = columns;
    // Adjust position based on board width
    p->rect.x = (PIECE_SIZE * 4) * p->scale;
}

void player_panel_draw(const PlayerPanel *p, const PlayerStats *stats) {
    // Draw grey panel background similar to border style
    SDL_SetRenderDrawColor(p->renderer, 192, 192, 192, 255); // Light grey
    SDL_RenderFillRect(p->renderer, &p->rect);
    
    // Draw darker border around panel
    SDL_SetRenderDrawColor(p->renderer, 128, 128, 128, 255); // Dark grey
    SDL_RenderDrawRect(p->renderer, &p->rect);
    
    // Draw inner raised border effect
    SDL_Rect inner_border = {
        p->rect.x + 1,
        p->rect.y + 1,
        p->rect.w - 2,
        p->rect.h - 2
    };
    SDL_SetRenderDrawColor(p->renderer, 255, 255, 255, 255); // White highlight
    SDL_RenderDrawRect(p->renderer, &inner_border);
    
    // Draw level-up button (left side with sprite 0,0)
    if (p->can_level_up) {
        // Button background
        SDL_SetRenderDrawColor(p->renderer, 255, 255, 0, 255); // Yellow highlight
        SDL_RenderFillRect(p->renderer, &p->level_up_button);
        
        // Button border
        SDL_SetRenderDrawColor(p->renderer, 0, 0, 0, 255);
        SDL_RenderDrawRect(p->renderer, &p->level_up_button);
        
        // Draw sprite (0,0) from sprite sheet
        if (p->sprite_sheet && p->sprite_src_rects) {
            SDL_RenderCopy(p->renderer, p->sprite_sheet, &p->sprite_src_rects[0], &p->level_up_button);
        }
    } else {
        // Disabled button
        SDL_SetRenderDrawColor(p->renderer, 160, 160, 160, 255); // Grey
        SDL_RenderFillRect(p->renderer, &p->level_up_button);
        SDL_SetRenderDrawColor(p->renderer, 100, 100, 100, 255);
        SDL_RenderDrawRect(p->renderer, &p->level_up_button);
    }
    
    // Level display area (to the left of health/experience bars)
    int bars_start_x = p->level_up_button.x + p->level_up_button.w + 10 * p->scale;
    SDL_Rect level_display = {
        bars_start_x,
        p->level_up_button.y + 8 * p->scale, // Center vertically
        50 * p->scale,
        20 * p->scale
    };
    
    // Level background (light grey with border)
    SDL_SetRenderDrawColor(p->renderer, 240, 240, 240, 255); // Very light grey
    SDL_RenderFillRect(p->renderer, &level_display);
    SDL_SetRenderDrawColor(p->renderer, 0, 0, 0, 255);
    SDL_RenderDrawRect(p->renderer, &level_display);
    
    // Draw level number using TTF font
    char level_text[16];
    snprintf(level_text, sizeof(level_text), "%u", stats->level);
    SDL_Color black = {0, 0, 0, 255};
    player_panel_draw_text(p, level_text, 
                          level_display.x + 4 * p->scale, 
                          level_display.y + 4 * p->scale, 
                          black);
    
    // Health bar with background and progress
    int health_start_x = bars_start_x + level_display.w + 10 * p->scale;
    SDL_Rect health_bg = {
        health_start_x,
        p->level_up_button.y,
        100 * p->scale,  // Reduced width to fit better
        16 * p->scale
    };
    
    // Health background (dark red)
    SDL_SetRenderDrawColor(p->renderer, 128, 0, 0, 255);
    SDL_RenderFillRect(p->renderer, &health_bg);
    
    // Health progress (bright red)
    int health_width = (int)((float)stats->health / stats->max_health * 100.0f * p->scale);
    SDL_Rect health_progress = {
        health_start_x,
        p->level_up_button.y,
        health_width,
        16 * p->scale
    };
    SDL_SetRenderDrawColor(p->renderer, 255, 0, 0, 255);
    SDL_RenderFillRect(p->renderer, &health_progress);
    
    // Health border
    SDL_SetRenderDrawColor(p->renderer, 0, 0, 0, 255);
    SDL_RenderDrawRect(p->renderer, &health_bg);
    
    // Draw health text (current/max)
    char health_text[32];
    snprintf(health_text, sizeof(health_text), "%u/%u", stats->health, stats->max_health);
    SDL_Color white = {255, 255, 255, 255};
    player_panel_draw_text(p, health_text, 
                          health_bg.x + 2 * p->scale, 
                          health_bg.y + 2 * p->scale, 
                          white);
    
    // Experience bar with background and progress  
    SDL_Rect exp_bg = {
        health_start_x,
        p->level_up_button.y + 20 * p->scale,
        100 * p->scale,  // Reduced width to match health bar
        16 * p->scale
    };
    
    // Experience background (dark blue)
    SDL_SetRenderDrawColor(p->renderer, 0, 0, 128, 255);
    SDL_RenderFillRect(p->renderer, &exp_bg);
    
    // Experience progress (bright blue)
    // Calculate experience percentage, but clamp to 100% for visual bar
    float exp_percentage = (float)stats->experience / stats->exp_to_next_level;
    if (exp_percentage > 1.0f) {
        exp_percentage = 1.0f;  // Cap visual bar at 100%
    }
    int exp_width = (int)(exp_percentage * 100.0f * p->scale);
    SDL_Rect exp_progress = {
        health_start_x,
        p->level_up_button.y + 20 * p->scale,
        exp_width,
        16 * p->scale
    };
    SDL_SetRenderDrawColor(p->renderer, 0, 100, 255, 255);
    SDL_RenderFillRect(p->renderer, &exp_progress);
    
    // Experience border
    SDL_SetRenderDrawColor(p->renderer, 0, 0, 0, 255);
    SDL_RenderDrawRect(p->renderer, &exp_bg);
    
    // Draw experience text (current/max)
    char exp_text[32];
    snprintf(exp_text, sizeof(exp_text), "%u/%u", stats->experience, stats->exp_to_next_level);
    player_panel_draw_text(p, exp_text, 
                          exp_bg.x + 2 * p->scale, 
                          exp_bg.y + 2 * p->scale, 
                          white);
    
    // TODO: Add text rendering for numeric values inside bars
    // For now, we'll use simple visual indicators
    
    // Reset render color to default
    SDL_SetRenderDrawColor(p->renderer, 0, 0, 0, 255);
}

void player_panel_draw_text(const PlayerPanel *p, const char *text, int x, int y, SDL_Color color) {
    if (!p->font || !text) {
        return;
    }
    
    SDL_Surface *text_surface = TTF_RenderText_Solid(p->font, text, color);
    if (!text_surface) {
        return;
    }
    
    SDL_Texture *text_texture = SDL_CreateTextureFromSurface(p->renderer, text_surface);
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
    
    SDL_RenderCopy(p->renderer, text_texture, NULL, &dest_rect);
    
    SDL_DestroyTexture(text_texture);
    SDL_FreeSurface(text_surface);
}

bool player_panel_handle_click(PlayerPanel *p, int x, int y, struct Game *g) {
    // Check if click is within the level-up button
    if (p->can_level_up && 
        x >= p->level_up_button.x && x < p->level_up_button.x + p->level_up_button.w &&
        y >= p->level_up_button.y && y < p->level_up_button.y + p->level_up_button.h) {
        
        printf("Level-up button clicked!\n");
        game_level_up_player(g);
        return true;
    }
    
    return false;
}

// ========== SCREEN SYSTEM FUNCTIONS ==========

void game_init_screen_system(struct Game *g) {
    g->current_screen = SCREEN_GAME;
    
    // Load font for information screens
    g->info_font = TTF_OpenFont("images/m6x11.ttf", 14 * g->scale);
    if (!g->info_font) {
        fprintf(stderr, "Failed to load info font: %s\n", TTF_GetError());
        // Continue without font - fallback will be handled in drawing
    }
    
    game_setup_screen_buttons(g);
}

void game_set_screen(struct Game *g, UIScreenState screen) {
    g->current_screen = screen;
    printf("Switched to screen: %d\n", screen);
}

void game_setup_screen_buttons(struct Game *g) {
    int window_width = WINDOW_WIDTH * g->scale;
    int window_height = WINDOW_HEIGHT * g->scale;
    
    int button_width = 80 * g->scale;
    int button_height = 25 * g->scale;
    int button_margin = 5 * g->scale;
    
    // Position buttons in bottom right corner
    g->screen_buttons.entities_button = (SDL_Rect){
        window_width - button_width - button_margin,
        window_height - (button_height * 2) - (button_margin * 3),
        button_width,
        button_height
    };
    
    g->screen_buttons.howto_button = (SDL_Rect){
        window_width - button_width - button_margin,
        window_height - button_height - button_margin,
        button_width,
        button_height
    };
    
    // Back button (shown on info screens)
    g->screen_buttons.back_button = (SDL_Rect){
        button_margin,
        button_margin,
        button_width,
        button_height
    };
}

bool game_handle_screen_button_click(struct Game *g, int x, int y) {
    // Check back button (only visible on info screens)
    if (g->current_screen != SCREEN_GAME) {
        if (x >= g->screen_buttons.back_button.x && 
            x < g->screen_buttons.back_button.x + g->screen_buttons.back_button.w &&
            y >= g->screen_buttons.back_button.y && 
            y < g->screen_buttons.back_button.y + g->screen_buttons.back_button.h) {
            game_set_screen(g, SCREEN_GAME);
            return true;
        }
    }
    
    // Check screen toggle buttons (only visible on main game screen)
    if (g->current_screen == SCREEN_GAME) {
        // Entities button
        if (x >= g->screen_buttons.entities_button.x && 
            x < g->screen_buttons.entities_button.x + g->screen_buttons.entities_button.w &&
            y >= g->screen_buttons.entities_button.y && 
            y < g->screen_buttons.entities_button.y + g->screen_buttons.entities_button.h) {
            game_set_screen(g, SCREEN_ENTITIES);
            return true;
        }
        
        // How to Play button
        if (x >= g->screen_buttons.howto_button.x && 
            x < g->screen_buttons.howto_button.x + g->screen_buttons.howto_button.w &&
            y >= g->screen_buttons.howto_button.y && 
            y < g->screen_buttons.howto_button.y + g->screen_buttons.howto_button.h) {
            game_set_screen(g, SCREEN_HOW_TO_PLAY);
            return true;
        }
    }
    
    return false;
}

void game_draw_screen_buttons(const struct Game *g) {
    if (g->current_screen == SCREEN_GAME) {
        // Draw Entities button
        SDL_SetRenderDrawColor(g->renderer, 100, 150, 200, 255); // Light blue
        SDL_RenderFillRect(g->renderer, &g->screen_buttons.entities_button);
        SDL_SetRenderDrawColor(g->renderer, 0, 0, 0, 255);
        SDL_RenderDrawRect(g->renderer, &g->screen_buttons.entities_button);
        
        // Draw How to Play button
        SDL_SetRenderDrawColor(g->renderer, 100, 200, 150, 255); // Light green
        SDL_RenderFillRect(g->renderer, &g->screen_buttons.howto_button);
        SDL_SetRenderDrawColor(g->renderer, 0, 0, 0, 255);
        SDL_RenderDrawRect(g->renderer, &g->screen_buttons.howto_button);
        
        // Add button text if font is available
        if (g->info_font) {
            SDL_Color black = {0, 0, 0, 255};
            
            // Entities button text
            SDL_Surface *entities_surface = TTF_RenderText_Solid(g->info_font, "Entities", black);
            if (entities_surface) {
                SDL_Texture *entities_texture = SDL_CreateTextureFromSurface(g->renderer, entities_surface);
                if (entities_texture) {
                    SDL_Rect text_rect = {
                        g->screen_buttons.entities_button.x + 10 * g->scale,
                        g->screen_buttons.entities_button.y + 5 * g->scale,
                        entities_surface->w,
                        entities_surface->h
                    };
                    SDL_RenderCopy(g->renderer, entities_texture, NULL, &text_rect);
                    SDL_DestroyTexture(entities_texture);
                }
                SDL_FreeSurface(entities_surface);
            }
            
            // How to Play button text
            SDL_Surface *howto_surface = TTF_RenderText_Solid(g->info_font, "How to Play", black);
            if (howto_surface) {
                SDL_Texture *howto_texture = SDL_CreateTextureFromSurface(g->renderer, howto_surface);
                if (howto_texture) {
                    SDL_Rect text_rect = {
                        g->screen_buttons.howto_button.x + 5 * g->scale,
                        g->screen_buttons.howto_button.y + 5 * g->scale,
                        howto_surface->w,
                        howto_surface->h
                    };
                    SDL_RenderCopy(g->renderer, howto_texture, NULL, &text_rect);
                    SDL_DestroyTexture(howto_texture);
                }
                SDL_FreeSurface(howto_surface);
            }
        }
    } else {
        // Draw Back button on info screens
        SDL_SetRenderDrawColor(g->renderer, 200, 100, 100, 255); // Light red
        SDL_RenderFillRect(g->renderer, &g->screen_buttons.back_button);
        SDL_SetRenderDrawColor(g->renderer, 0, 0, 0, 255);
        SDL_RenderDrawRect(g->renderer, &g->screen_buttons.back_button);
        
        // Back button text
        if (g->info_font) {
            SDL_Color black = {0, 0, 0, 255};
            SDL_Surface *back_surface = TTF_RenderText_Solid(g->info_font, "Back", black);
            if (back_surface) {
                SDL_Texture *back_texture = SDL_CreateTextureFromSurface(g->renderer, back_surface);
                if (back_texture) {
                    SDL_Rect text_rect = {
                        g->screen_buttons.back_button.x + 20 * g->scale,
                        g->screen_buttons.back_button.y + 5 * g->scale,
                        back_surface->w,
                        back_surface->h
                    };
                    SDL_RenderCopy(g->renderer, back_texture, NULL, &text_rect);
                    SDL_DestroyTexture(back_texture);
                }
                SDL_FreeSurface(back_surface);
            }
        }
    }
}

void game_draw_entities_screen(const struct Game *g) {
    // Draw dark background
    SDL_SetRenderDrawColor(g->renderer, 30, 30, 30, 255);
    SDL_Rect screen = {0, 0, WINDOW_WIDTH * g->scale, WINDOW_HEIGHT * g->scale};
    SDL_RenderFillRect(g->renderer, &screen);
    
    if (!g->info_font) {
        return; // Can't draw text without font
    }
    
    const GameConfig *config = board_get_config();
    if (!config || config->entity_count == 0) {
        return;
    }
    
    SDL_Color white = {255, 255, 255, 255};
    SDL_Color yellow = {255, 255, 0, 255};
    SDL_Color red = {255, 100, 100, 255};
    SDL_Color green = {100, 255, 100, 255};
    SDL_Color cyan = {100, 255, 255, 255};
    
    int start_x = 20 * g->scale;
    int start_y = 50 * g->scale;
    int line_height = 18 * g->scale;
    int current_y = start_y;
    
    // Title
    SDL_Surface *title_surface = TTF_RenderText_Solid(g->info_font, "ENTITIES", yellow);
    if (title_surface) {
        SDL_Texture *title_texture = SDL_CreateTextureFromSurface(g->renderer, title_surface);
        if (title_texture) {
            SDL_Rect title_rect = {start_x, 20 * g->scale, title_surface->w, title_surface->h};
            SDL_RenderCopy(g->renderer, title_texture, NULL, &title_rect);
            SDL_DestroyTexture(title_texture);
        }
        SDL_FreeSurface(title_surface);
    }
    
    // Category headers
    current_y += line_height;
    
    // Group entities by type - we'll check conditions directly in the loop
    struct { const char *title; SDL_Color color; int type; } categories[] = {
        {"HOSTILE", red, 0},    // 0 = hostile (is_enemy)
        {"NEUTRAL", cyan, 1},   // 1 = neutral (!is_enemy && !is_treasure)
        {"FRIENDLY", green, 2}  // 2 = friendly (is_treasure)
    };
    
    for (int cat = 0; cat < 3; cat++) {
        // Draw category title
        SDL_Surface *cat_surface = TTF_RenderText_Solid(g->info_font, categories[cat].title, categories[cat].color);
        if (cat_surface) {
            SDL_Texture *cat_texture = SDL_CreateTextureFromSurface(g->renderer, cat_surface);
            if (cat_texture) {
                SDL_Rect cat_rect = {start_x, current_y, cat_surface->w, cat_surface->h};
                SDL_RenderCopy(g->renderer, cat_texture, NULL, &cat_rect);
                SDL_DestroyTexture(cat_texture);
            }
            SDL_FreeSurface(cat_surface);
        }
        current_y += line_height;
        
        // Draw entities in this category
        for (unsigned i = 0; i < config->entity_count; i++) {
            const Entity *entity = &config->entities[i];
            
            // Check if entity belongs to this category
            bool matches_category = false;
            switch (categories[cat].type) {
                case 0: matches_category = entity->is_enemy; break;
                case 1: matches_category = !entity->is_enemy && !entity->is_item; break;
                case 2: matches_category = entity->is_item; break;
            }
            
            if (matches_category) {
                // Count remaining entities of this type on the board
                unsigned remaining_count = 0;
                unsigned revealed_count = 0;
                
                for (unsigned r = 0; r < g->board->rows; r++) {
                    for (unsigned c = 0; c < g->board->columns; c++) {
                        unsigned board_entity_id = board_get_entity_id(g->board, r, c);
                        if (board_entity_id == entity->id) {
                            remaining_count++;
                            TileState state = board_get_tile_state(g->board, r, c);
                            if (state == TILE_REVEALED) {
                                revealed_count++;
                            }
                        }
                    }
                }
                
                // Format entity info: "  L1 Fireflies                14/14"
                char entity_line[256];
                snprintf(entity_line, sizeof(entity_line), "  L%u %s%*s%u/%u", 
                        entity->level, 
                        entity->name,
                        (int)(25 - strlen(entity->name)), "", // Right-align counts
                        revealed_count, remaining_count);
                
                SDL_Surface *entity_surface = TTF_RenderText_Solid(g->info_font, entity_line, white);
                if (entity_surface) {
                    SDL_Texture *entity_texture = SDL_CreateTextureFromSurface(g->renderer, entity_surface);
                    if (entity_texture) {
                        SDL_Rect entity_rect = {start_x, current_y, entity_surface->w, entity_surface->h};
                        SDL_RenderCopy(g->renderer, entity_texture, NULL, &entity_rect);
                        SDL_DestroyTexture(entity_texture);
                    }
                    SDL_FreeSurface(entity_surface);
                }
                current_y += line_height;
                
                // Check if we're running out of space
                if (current_y > (WINDOW_HEIGHT - 100) * g->scale) {
                    break;
                }
            }
        }
        
        current_y += line_height / 2; // Extra space between categories
    }
}

void game_draw_howto_screen(const struct Game *g) {
    // Draw dark background
    SDL_SetRenderDrawColor(g->renderer, 30, 30, 30, 255);
    SDL_Rect screen = {0, 0, WINDOW_WIDTH * g->scale, WINDOW_HEIGHT * g->scale};
    SDL_RenderFillRect(g->renderer, &screen);
    
    if (!g->info_font) {
        return; // Can't draw text without font
    }
    
    SDL_Color white = {255, 255, 255, 255};
    SDL_Color yellow = {255, 255, 0, 255};
    SDL_Color cyan = {100, 255, 255, 255};
    
    int start_x = 10 * g->scale;
    int start_y = 50 * g->scale;
    int line_height = 16 * g->scale;
    int current_y = start_y;
    int max_width = (WINDOW_WIDTH - 20) * g->scale;
    
    // Title
    SDL_Surface *title_surface = TTF_RenderText_Solid(g->info_font, "How to Play MindSweeper", yellow);
    if (title_surface) {
        SDL_Texture *title_texture = SDL_CreateTextureFromSurface(g->renderer, title_surface);
        if (title_texture) {
            SDL_Rect title_rect = {start_x, 20 * g->scale, title_surface->w, title_surface->h};
            SDL_RenderCopy(g->renderer, title_texture, NULL, &title_rect);
            SDL_DestroyTexture(title_texture);
        }
        SDL_FreeSurface(title_surface);
    }
    
    // How-to-play content (simplified for space)
    const char* lines[] = {
        "",
        "OBJECTIVE: Defeat the Ancient Meeoeomoower!",
        "Level up before taking on dangerous felines.",
        "",
        "START: Click the Cats Eye to reveal an area.",
        "",
        "KEYBOARD SHORTCUTS:",
        "• H - Toggle this How to Play screen",
        "• E - Toggle Entities information screen", 
        "• ESC - Return to main game",
        "",
        "CLICKING TILES:",
        "• Click hidden tiles to reveal them",
        "• Numbers show sum of adjacent hostile levels",
        "• Click neutrals again to interact",
        "• Hostiles do damage equal to their level",
        "",
        "PLAYER STATS:",
        "• Health: Damage from enemies. 0 = game over",
        "• Experience: Fill bar to level up",
        "• Level Up: Click ↑ when bar is full",
        "",
        "SPECIAL TILES:",
        "• Cats Eye: Reveals 3x3 area",
        "• Chests: Health potions or bonus EXP",
        "• Boss enemies: Drop special items",
        "",
        "WIN: Defeat Ancient Meeoeomoower",
        "LOSE: Health drops to 0",
        "",
        "Good luck, MindSweeper!"
    };
    
    const int num_lines = sizeof(lines) / sizeof(lines[0]);
    
    for (int i = 0; i < num_lines && current_y < (WINDOW_HEIGHT - 50) * g->scale; i++) {
        if (strlen(lines[i]) == 0) {
            current_y += line_height / 2; // Half-height for empty lines
            continue;
        }
        
        SDL_Color color = white;
        if (strstr(lines[i], "OBJECTIVE") || strstr(lines[i], "START") || 
            strstr(lines[i], "CLICKING") || strstr(lines[i], "PLAYER") ||
            strstr(lines[i], "SPECIAL") || strstr(lines[i], "WIN") || strstr(lines[i], "LOSE")) {
            color = cyan; // Headers in cyan
        }
        
        SDL_Surface *line_surface = TTF_RenderText_Solid(g->info_font, lines[i], color);
        if (line_surface) {
            SDL_Texture *line_texture = SDL_CreateTextureFromSurface(g->renderer, line_surface);
            if (line_texture) {
                SDL_Rect line_rect = {start_x, current_y, line_surface->w, line_surface->h};
                SDL_RenderCopy(g->renderer, line_texture, NULL, &line_rect);
                SDL_DestroyTexture(line_texture);
            }
            SDL_FreeSurface(line_surface);
        }
        current_y += line_height;
    }
}
