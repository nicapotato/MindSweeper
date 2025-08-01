#include "game.h"
#include "config.h"
#include "init_sdl.h"
#include "board_click.h"
#include "load_media.h"
#include "audio.h"

#ifdef WASM_BUILD
// Global game pointer for Emscripten main loop
static struct Game *g_game = NULL;
#endif

bool game_create_string(char **game_str, const char *new_str);
void game_set_title(struct Game *g);
bool game_load_map(struct Game *g);
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
    g->is_fullscreen = false;         // Initialize fullscreen state
    g->game_over_info.is_game_over = false;  // Initialize game over info
    g->game_over_info.death_cause[0] = '\0'; // Empty death cause string
    
    // Initialize victory info
    g->victory_info.is_victory = false;
    g->victory_info.victory_message[0] = '\0'; // Clear victory message
    
    // Initialize annotation popover
    g->annotation_popover.is_active = false;
    g->annotation_popover.target_row = 0;
    g->annotation_popover.target_col = 0;
    g->annotation_popover.x = 0;
    g->annotation_popover.y = 0;
    g->annotation_popover.selected_option = -1;
    
    g->rows = DEFAULT_BOARD_ROWS;      // Use constant instead of magic number
    g->columns = DEFAULT_BOARD_COLS;   // Use constant instead of magic number
    
    // Calculate optimal scale based on window dimensions
    g->scale = calculate_optimal_scale(WINDOW_WIDTH, WINDOW_HEIGHT, (int)g->rows, (int)g->columns);

    if (!game_init_sdl(g)) {
        goto cleanup_failure;
    }

    // Initialize audio system
    if (!audio_init(&g->audio)) {
        fprintf(stderr, "Failed to initialize audio system\n");
        goto cleanup_failure;
    }

    if (!border_new(&g->border, g->renderer, g->rows, g->columns, g->scale)) {
        goto cleanup_failure;
    }

    if (!board_new(&g->board, g->renderer, g->rows, g->columns, g->scale)) {
        goto cleanup_failure;
    }

    // Initialize admin panel with solution count first
    g->admin.total_solutions = config_count_solutions("assets/solutions_1_n_20.json");
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

    // Load initial map using the standard map loading function (after all components are initialized)
    if (!game_load_map(g)) {
        fprintf(stderr, "Failed to load initial map\n");
        goto cleanup_failure;
    }
    
    // Initialize player stats and admin panel
    game_init_player_stats(g);
    
    // Initialize screen system
    game_init_screen_system(g);

    // Start background music
    audio_play_background_music(&g->audio);

    return true;

cleanup_failure:
    // Clean up any partially initialized components
    game_free(game);
    return false;
}

void game_free(struct Game **game) {
    if (*game) {
        struct Game *g = *game;

        // Clean up audio system
        audio_cleanup(&g->audio);

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

    snprintf(title, MAX_TITLE_LENGTH, "%s - Map %u", WINDOW_TITLE, g->admin.current_solution_index);
    SDL_SetWindowTitle(g->window, title);

    free(title);
}

bool game_load_map(struct Game *g) {
    printf("Loading new map. Current solution: %u, Total solutions: %u\n", 
           g->admin.current_solution_index, g->admin.total_solutions);
    
    // Always pick a random solution index for variety
    unsigned new_solution_index = (unsigned)(rand() % (int)g->admin.total_solutions);
    printf("Generated random solution index: %u\n", new_solution_index);
    
    // Load the new solution
    if (!board_load_solution(g->board, "assets/solutions_1_n_20.json", new_solution_index)) {
        fprintf(stderr, "Failed to load random solution %u\n", new_solution_index);
    } else {
        g->admin.current_solution_index = new_solution_index;
        printf("Loaded random solution %u\n", new_solution_index);
    }

    // Update window title to reflect new solution index
    game_set_title(g);

    // Reset game state for new map
    clock_reset(g->clock);
    face_default(g->face);
    g->game_over_info.is_game_over = false;  // Reset game over state
    g->game_over_info.death_cause[0] = '\0'; // Clear death cause
    
    // Clear annotation popover if active
    g->annotation_popover.is_active = false;

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
        g->info_font = TTF_OpenFont("assets/images/m6x11.ttf", 12); // Increased from 12 to 18 (50% bigger)
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

    if (!game_load_map(g)) {
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
    // Only handle game interactions on the main game screen
    if (g->current_screen != SCREEN_GAME) {
        return true;
    }
    
    // Ignore board interactions during game over
    if (g->game_over_info.is_game_over) {
        return true;
    }
    
    // Check if annotation popover is active
    if (g->annotation_popover.is_active) {
        // Handle popover interaction (left or right click closes it)
        if (button == 1 || button == 3) { // SDL_BUTTON_LEFT or SDL_BUTTON_RIGHT
            // Check if click is inside popover for option selection
            if (button == 1 && x >= g->annotation_popover.x && 
                x < g->annotation_popover.x + ANNOTATION_POPOVER_WIDTH &&
                y >= g->annotation_popover.y && 
                y < g->annotation_popover.y + ANNOTATION_POPOVER_HEIGHT) {
                
                // Calculate which option was clicked in grid
                int clicked_row = (y - g->annotation_popover.y) / ANNOTATION_OPTION_SIZE;
                int clicked_col = (x - g->annotation_popover.x) / ANNOTATION_OPTION_SIZE;
                int option_index = clicked_row * ANNOTATION_GRID_COLUMNS + clicked_col;
                
                if (clicked_row >= 0 && clicked_row < ANNOTATION_GRID_ROWS &&
                    clicked_col >= 0 && clicked_col < ANNOTATION_GRID_COLUMNS &&
                    option_index >= 0 && option_index < ANNOTATION_OPTIONS_COUNT) {
                    // Apply the selected annotation
                    unsigned annotation_value = ANNOTATION_VALUES[option_index];
                    board_set_annotation(g->board, g->annotation_popover.target_row, 
                                       g->annotation_popover.target_col, annotation_value);
                }
            }
            
            // Close popover
            g->annotation_popover.is_active = false;
        }
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
            
            if (button == 3) { // SDL_BUTTON_RIGHT - show annotation popover
                // Only show popover for hidden tiles
                if (board_get_tile_state(g->board, row, col) == TILE_HIDDEN) {
                    g->annotation_popover.is_active = true;
                    g->annotation_popover.target_row = row;
                    g->annotation_popover.target_col = col;
                    g->annotation_popover.x = x;
                    g->annotation_popover.y = y;
                    g->annotation_popover.selected_option = -1;
                }
                return true;
            } else if (button == 1) { // SDL_BUTTON_LEFT - normal click
                if (!board_handle_click(g, row, col)) {
                    return false;
                }
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
                } else if (g->victory_info.is_victory) {
                    game_reset_victory(g);
                } else {
                    if (!game_load_map(g))
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
            // Audio controls
            case SDL_SCANCODE_M:
                audio_toggle_music(&g->audio);
                break;
            case SDL_SCANCODE_S:
                audio_toggle_sound(&g->audio);
                break;
            case SDL_SCANCODE_MINUS:
                // Decrease music volume
                audio_set_music_volume(&g->audio, g->audio.music_volume - 10);
                break;
            case SDL_SCANCODE_EQUALS:
                // Increase music volume
                audio_set_music_volume(&g->audio, g->audio.music_volume + 10);
                break;
            case SDL_SCANCODE_F:
                // Toggle fullscreen mode
                game_toggle_fullscreen(g);
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
    board_update_animations(g->board, g);
    
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
            player_panel_draw(g->player_panel, &g->player, g);
            
            // Draw game over popup if needed
            game_draw_game_over_popup(g);
            
            // Draw victory popup if needed
            game_draw_victory_popup(g);
            
            // Draw annotation popover if active
            game_draw_annotation_popover(g);
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
    // Calculate the space needed for UI elements with minimal margins
    int player_panel_height_base = (PLAYER_PANEL_HEIGHT / 2); // Base player panel height (unscaled)
    int border_space = BORDER_LEFT + BORDER_RIGHT + BORDER_BOTTOM; // Actual border space needed
    int ui_margin_total = 20;  // Total margins (top + bottom, left + right)
    
    // Calculate what scale would fit the width
    int available_width = window_width - border_space - ui_margin_total;
    int max_scale_width = available_width / (board_cols * PIECE_SIZE);
    
    // Calculate what scale would fit the height (board + player panel + margins)
    int available_height = window_height - GAME_BOARD_Y - ui_margin_total;
    
    // We need to solve: (board_rows * PIECE_SIZE * scale) + (player_panel_height_base * scale) + 10 <= available_height
    // Simplifying: scale * (board_rows * PIECE_SIZE + player_panel_height_base) + 10 <= available_height
    // Therefore: scale <= (available_height - 10) / (board_rows * PIECE_SIZE + player_panel_height_base)
    int total_content_height_per_scale = (board_rows * PIECE_SIZE) + player_panel_height_base;
    int max_scale_height = (available_height - 10) / total_content_height_per_scale;
    
    // Use the smaller scale to ensure everything fits
    int optimal_scale = (max_scale_width < max_scale_height) ? max_scale_width : max_scale_height;
    
    // Ensure minimum scale of 1 and reasonable maximum
    if (optimal_scale < 1) optimal_scale = 1;
    if (optimal_scale > 8) optimal_scale = 8;  // Cap for performance
    
    // Debug output to verify calculations
    int final_board_height = board_rows * PIECE_SIZE * optimal_scale;
    int final_panel_height = player_panel_height_base * optimal_scale;
    int final_total_height = final_board_height + final_panel_height + GAME_BOARD_Y + ui_margin_total + 10;
    int final_board_width = board_cols * PIECE_SIZE * optimal_scale;
    int final_total_width = final_board_width + border_space + ui_margin_total;
    
    printf("Window: %dx%d, Board: %dx%d, Calculated scale: %d\n", 
           window_width, window_height, board_cols, board_rows, optimal_scale);
    printf("Final dimensions: %dx%d (fits in %dx%d: %s)\n", 
           final_total_width, final_total_height, window_width, window_height,
           (final_total_width <= window_width && final_total_height <= window_height) ? "YES" : "NO");
    
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
    
    // Initialize admin panel (but preserve total_solutions if already set)
    g->admin.god_mode_enabled = false;
    g->admin.admin_panel_visible = false;
    g->admin.current_solution_index = 0;
    // Don't reset total_solutions - preserve the value set during game initialization
    
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
        
        // Play level-up sound effect
        audio_play_level_up_sound(&g->audio);
        
        printf("LEVEL UP! Player is now level %u with %u health (excess exp: %u)\n", 
               g->player.level, g->player.max_health, excess_exp);
    }
}

unsigned game_calculate_max_health(unsigned level) {
    if (level >= GOD_MODE_LEVEL) {
        return GOD_MODE_HEALTH; // GOD mode health
    }
    return BASE_HEALTH + ((level+1)/2);
}

unsigned game_calculate_exp_requirement(unsigned level) {
    return  STARTING_EXPERIENCE + level;
}

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
        g->game_over_info.is_game_over = false;
        g->game_over_info.death_cause[0] = '\0';
        g->player.level = GOD_MODE_LEVEL;
        g->player.max_health = game_calculate_max_health(g->player.level);
        g->player.health = g->player.max_health;
        g->player.experience = 0;
        g->player.exp_to_next_level = game_calculate_exp_requirement(g->player.level);
        
        printf("🔱 GOD MODE ACTIVATED! Player level set to %u with %u health!\n", 
               GOD_MODE_LEVEL, GOD_MODE_HEALTH);
        face_won(g->face);
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
    
    // Play death sound effect
    audio_play_death_sound(&g->audio);
    
    printf("=== GAME OVER ===\n");

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
    if (!game_load_map(g)) {
        printf("Warning: Failed to load new map\n");
    }
    
    printf("Game restarted!\n");
}

// ========== VICTORY FUNCTIONS ==========

void game_check_victory(struct Game *g) {
    // Victory is checked specifically when entity 13 (final boss) is defeated
    // This function can be called after combat resolution
    if (g->victory_info.is_victory) {
        return; // Already won
    }
    
    // Victory will be set explicitly when final boss is defeated
}

void game_set_victory(struct Game *g, const char *victory_message) {
    g->victory_info.is_victory = true;
    
    // Copy the victory message safely
    if (victory_message) {
        strncpy(g->victory_info.victory_message, victory_message, MAX_ENTITY_NAME - 1);
        g->victory_info.victory_message[MAX_ENTITY_NAME - 1] = '\0'; // Ensure null termination
    } else {
        strcpy(g->victory_info.victory_message, "Ancient Meeoeomoower");
    }
    
    // Play victory sound effect
    audio_play_victory_sound(&g->audio);
    
    printf("=== VICTORY! ===\n");
    printf("Defeated %s! You are victorious!\n", g->victory_info.victory_message);

    face_won(g->face);  // Set happy face
}

void game_draw_victory_popup(const struct Game *g) {
    if (!g->victory_info.is_victory) {
        return;
    }
    
    // Calculate popup dimensions - similar to game over popup
    int popup_width = 250 * g->scale;
    int popup_height = 100 * g->scale;
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
    
    // Draw popup background (light golden)
    SDL_SetRenderDrawBlendMode(g->renderer, SDL_BLENDMODE_NONE);
    SDL_SetRenderDrawColor(g->renderer, 255, 250, 205, 255); // Light golden background
    SDL_Rect popup_bg = {popup_x, popup_y, popup_width, popup_height};
    SDL_RenderFillRect(g->renderer, &popup_bg);
    
    // Draw popup border (gold)
    SDL_SetRenderDrawColor(g->renderer, 218, 165, 32, 255); // Gold border
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
    
    // Draw victory message
    if (g->player_panel && g->player_panel->font) {
        SDL_Color gold = {218, 165, 32, 255};
        SDL_Color dark_green = {0, 120, 0, 255};
        
        int text_x = popup_x + 10 * g->scale;
        int text_y = popup_y + 8 * g->scale;
        
        // Draw "VICTORY!" text
        player_panel_draw_text(g->player_panel, "VICTORY!", 
                              text_x, text_y, gold);
        
        // Draw victory message
        char victory_message[128];
        snprintf(victory_message, sizeof(victory_message), "Defeated %s!", g->victory_info.victory_message);
        player_panel_draw_text(g->player_panel, victory_message, 
                              text_x, text_y + 18 * g->scale, dark_green);
        
        // Draw restart instruction
        player_panel_draw_text(g->player_panel, "Press SPACE to restart", 
                              text_x, text_y + 36 * g->scale, dark_green);
        
        // Draw congratulations message
        player_panel_draw_text(g->player_panel, "You are victorious!", 
                              text_x, text_y + 54 * g->scale, dark_green);
    }
    
    // Reset render color
    SDL_SetRenderDrawColor(g->renderer, 0, 0, 0, 255);
}

void game_reset_victory(struct Game *g) {
    g->victory_info.is_victory = false;
    g->victory_info.victory_message[0] = '\0'; // Clear victory message
    
    // Reset player stats
    game_init_player_stats(g);
    
    // Reset game board
    if (!game_load_map(g)) {
        printf("Warning: Failed to load new map\n");
    }
    
    printf("Game restarted after victory!\n");
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
                          "assets/images/sprite-sheet-cats.png",
                          PIECE_SIZE, PIECE_SIZE, &p->sprite_src_rects)) {
        fprintf(stderr, "Failed to load sprite sheet for player panel\n");
        return false;
    }
    


    // Load TTF font
            p->font = TTF_OpenFont("assets/images/m6x11.ttf", 8 * p->scale);
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
    p->rect.y = (GAME_BOARD_Y + (PIECE_SIZE * DEFAULT_BOARD_ROWS) + 5) * p->scale; // Below game board, reduced spacing
    
    // Calculate panel width based on board columns, but cap it for reasonable UI
    int max_panel_columns = 20; // Reduced maximum width to reduce white space
    int effective_columns = (p->columns > (unsigned)max_panel_columns) ? max_panel_columns : (int)p->columns;
    p->rect.w = (PIECE_SIZE * effective_columns) * p->scale;
    p->rect.h = (PLAYER_PANEL_HEIGHT / 2) * p->scale; // Make it more compact - half the original height
    
    // Set up level-up button position (left side) - smaller button for compact layout
    p->level_up_button.x = p->rect.x + 4 * p->scale;
    p->level_up_button.y = p->rect.y + 4 * p->scale;
    p->level_up_button.w = (int)((PIECE_SIZE * 1.2) * p->scale); // Slightly smaller button
    p->level_up_button.h = (int)((PIECE_SIZE * 1.2) * p->scale); // Slightly smaller button
}

void player_panel_set_size(PlayerPanel *p, unsigned columns) {
    p->columns = columns;
    // Adjust position based on board width
    p->rect.x = (PIECE_SIZE * 4) * p->scale;
}

void player_panel_draw(const PlayerPanel *p, const PlayerStats *stats, const struct Game *g) {
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
    
    // Draw player character sprite (sprite 0) as the base
    if (p->sprite_sheet && p->sprite_src_rects) {
        // Use sprite 0 as the default player character (we know it exists and is visible)
        int sprite_index = 0;
        
        // Add bounds checking and fallback
        if (sprite_index >= 0 && sprite_index < 132) { // 4 * 33 = 132 total sprites
            SDL_RenderCopy(p->renderer, p->sprite_sheet, &p->sprite_src_rects[sprite_index], &p->level_up_button);
        } else {
            // Fallback to sprite 0 if out of bounds
            SDL_RenderCopy(p->renderer, p->sprite_sheet, &p->sprite_src_rects[0], &p->level_up_button);
        }
    } else {
        // Fallback: draw a simple colored rectangle if sprite sheet failed to load
        SDL_SetRenderDrawColor(p->renderer, 100, 150, 200, 255); // Blue-ish color
        SDL_RenderFillRect(p->renderer, &p->level_up_button);
        SDL_SetRenderDrawColor(p->renderer, 0, 0, 0, 255);
        SDL_RenderDrawRect(p->renderer, &p->level_up_button);
    }
    
    // Draw level-up overlay when player can level up
    if (p->can_level_up) {
        // Yellow highlight border around the button
        SDL_SetRenderDrawColor(p->renderer, 255, 255, 0, 255); // Yellow highlight
        SDL_RenderDrawRect(p->renderer, &p->level_up_button);
        
        // Draw level-up sprite (sprite 1) as overlay
        if (p->sprite_sheet && p->sprite_src_rects) {
            SDL_RenderCopy(p->renderer, p->sprite_sheet, &p->sprite_src_rects[1], &p->level_up_button);
        }
    }
    
    // Draw level number below the sprite but within the panel
    char level_text[16];
    snprintf(level_text, sizeof(level_text), "L%u", stats->level);
    SDL_Color black = {0, 0, 0, 255};
    player_panel_draw_text(p, level_text, 
                          p->level_up_button.x + 4 * p->scale, 
                          p->level_up_button.y + p->level_up_button.h - 2 * p->scale, // Position it higher within panel
                          black);
    
    // Compact single-row layout starting after the sprite button
    int row_start_x = p->level_up_button.x + p->level_up_button.w + 8 * p->scale;
    int row_y = p->level_up_button.y + 6 * p->scale; // Center vertically with sprite
    
    // Map info (compact)
    SDL_Rect map_display = {
        row_start_x,
        row_y,
        50 * p->scale,
        16 * p->scale
    };
    
    // Map background (light blue with border)
    SDL_SetRenderDrawColor(p->renderer, 200, 220, 255, 255); // Light blue
    SDL_RenderFillRect(p->renderer, &map_display);
    SDL_SetRenderDrawColor(p->renderer, 0, 0, 0, 255);
    SDL_RenderDrawRect(p->renderer, &map_display);
    
    // Draw map text "Map: X"
    char map_text[16];
    snprintf(map_text, sizeof(map_text), "M%u", g->admin.current_solution_index);
    SDL_Color dark_blue = {0, 0, 128, 255};
    player_panel_draw_text(p, map_text, 
                          map_display.x + 4 * p->scale, 
                          map_display.y + 4 * p->scale, 
                          dark_blue);
    
    // Health bar (compact, same row)
    int health_start_x = row_start_x + map_display.w + 6 * p->scale;
    SDL_Rect health_bg = {
        health_start_x,
        row_y,
        60 * p->scale,  // Compact width
        16 * p->scale   // Same height as map
    };
    
    // Health background (dark red)
    SDL_SetRenderDrawColor(p->renderer, 128, 0, 0, 255);
    SDL_RenderFillRect(p->renderer, &health_bg);
    
    // Health progress (bright red)
    int health_width = (int)((float)stats->health / stats->max_health * 60.0f * p->scale);
    SDL_Rect health_progress = {
        health_start_x,
        row_y,
        health_width,
        16 * p->scale
    };
    SDL_SetRenderDrawColor(p->renderer, 255, 0, 0, 255);
    SDL_RenderFillRect(p->renderer, &health_progress);
    
    // Health border
    SDL_SetRenderDrawColor(p->renderer, 0, 0, 0, 255);
    SDL_RenderDrawRect(p->renderer, &health_bg);
    
    // Draw health text (current/max)
    char health_text[16];
    snprintf(health_text, sizeof(health_text), "%u/%u", stats->health, stats->max_health);
    SDL_Color white = {255, 255, 255, 255};
    player_panel_draw_text(p, health_text, 
                          health_bg.x + 2 * p->scale, 
                          health_bg.y + 4 * p->scale, 
                          white);
    
    // Experience bar (compact, same row)
    int exp_start_x = health_start_x + health_bg.w + 6 * p->scale;
    SDL_Rect exp_bg = {
        exp_start_x,
        row_y,
        60 * p->scale,  // Compact width
        16 * p->scale   // Same height as others
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
    int exp_width = (int)(exp_percentage * 60.0f * p->scale);
    SDL_Rect exp_progress = {
        exp_start_x,
        row_y,
        exp_width,
        16 * p->scale
    };
    SDL_SetRenderDrawColor(p->renderer, 0, 100, 255, 255);
    SDL_RenderFillRect(p->renderer, &exp_progress);
    
    // Experience border
    SDL_SetRenderDrawColor(p->renderer, 0, 0, 0, 255);
    SDL_RenderDrawRect(p->renderer, &exp_bg);
    
    // Draw experience text (current/max)
    char exp_text[16];
    snprintf(exp_text, sizeof(exp_text), "%u/%u", stats->experience, stats->exp_to_next_level);
    player_panel_draw_text(p, exp_text, 
                          exp_bg.x + 2 * p->scale, 
                          exp_bg.y + 4 * p->scale, 
                          white);
    
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
    
    // Check if click is on character sprite but player can't level up
    if (!p->can_level_up &&
        x >= p->level_up_button.x && x < p->level_up_button.x + p->level_up_button.w &&
        y >= p->level_up_button.y && y < p->level_up_button.y + p->level_up_button.h) {
        
        printf("Character sprite clicked but can't level up - playing McLovin sound\n");
        audio_play_mclovin_sound(&g->audio);
        return true;
    }
    
    return false;
}

// ========== FULLSCREEN FUNCTIONS ==========

void game_toggle_fullscreen(struct Game *g) {
    g->is_fullscreen = !g->is_fullscreen;
    
    if (g->is_fullscreen) {
        // Enter fullscreen mode
        if (SDL_SetWindowFullscreen(g->window, SDL_WINDOW_FULLSCREEN_DESKTOP) != 0) {
            fprintf(stderr, "Failed to enter fullscreen: %s\n", SDL_GetError());
            g->is_fullscreen = false; // Revert state on failure
            return;
        }
        printf("Entered fullscreen mode\n");
        
        // Add a small delay to let the browser stabilize
        #ifdef WASM_BUILD
        SDL_Delay(100); // Let browser finish fullscreen transition
        #endif
        
        // Get the actual fullscreen dimensions
        int display_w, display_h;
        SDL_GetWindowSize(g->window, &display_w, &display_h);
        
        // Recalculate optimal scale for fullscreen
        g->scale = calculate_optimal_scale(display_w, display_h, (int)g->rows, (int)g->columns);
        printf("Fullscreen dimensions: %dx%d, New scale: %d\n", display_w, display_h, g->scale);
        
    } else {
        // Exit fullscreen mode
        if (SDL_SetWindowFullscreen(g->window, 0) != 0) {
            fprintf(stderr, "Failed to exit fullscreen: %s\n", SDL_GetError());
            g->is_fullscreen = true; // Revert state on failure
            return;
        }
        printf("Exited fullscreen mode\n");
        
        // Add delay for WASM builds to let DOM stabilize
        #ifdef WASM_BUILD
        SDL_Delay(100);
        #endif
        
        // Get actual window size instead of assuming WINDOW_WIDTH/HEIGHT
        int actual_w, actual_h;
        SDL_GetWindowSize(g->window, &actual_w, &actual_h);
        
        // Only resize if it's not already the right size
        if (actual_w != WINDOW_WIDTH || actual_h != WINDOW_HEIGHT) {
            SDL_SetWindowSize(g->window, WINDOW_WIDTH, WINDOW_HEIGHT);
            #ifdef WASM_BUILD
            SDL_Delay(50); // Let resize complete
            #endif
        }
        
        // Recalculate optimal scale for windowed mode
        g->scale = calculate_optimal_scale(WINDOW_WIDTH, WINDOW_HEIGHT, (int)g->rows, (int)g->columns);
        printf("Windowed dimensions: %dx%d, New scale: %d\n", WINDOW_WIDTH, WINDOW_HEIGHT, g->scale);
    }
    
    // Update all game components with new scale
    game_set_scale(g);
}

// ========== SCREEN SYSTEM FUNCTIONS ==========

void game_init_screen_system(struct Game *g) {
    g->current_screen = SCREEN_GAME;
    
    // Load font for information screens - use larger fixed size for better readability
    g->info_font = TTF_OpenFont("assets/images/m6x11.ttf", 18); // Increased from 12 to 18 (50% bigger)
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
    
    int start_x = 20;
    int start_y = 50;
    int line_height = 14; // Fixed line height, not scaled for compactness
    int current_y = start_y;
    
    // Title
    SDL_Surface *title_surface = TTF_RenderText_Solid(g->info_font, "ENTITIES", yellow);
    if (title_surface) {
        SDL_Texture *title_texture = SDL_CreateTextureFromSurface(g->renderer, title_surface);
        if (title_texture) {
            SDL_Rect title_rect = {start_x, 20, title_surface->w, title_surface->h}; // Fixed position
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
                if (current_y > WINDOW_HEIGHT - 100) {
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
    
    int start_x = 10;
    int start_y = 50;
    int line_height = 14; // Fixed line height, not scaled for compactness
    int current_y = start_y;
    
    // Title
    SDL_Surface *title_surface = TTF_RenderText_Solid(g->info_font, "How to Play MindSweeper", yellow);
    if (title_surface) {
        SDL_Texture *title_texture = SDL_CreateTextureFromSurface(g->renderer, title_surface);
        if (title_texture) {
            SDL_Rect title_rect = {start_x, 20, title_surface->w, title_surface->h}; // Fixed position
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
        "• F - Toggle Fullscreen mode",
        "• ESC - Return to main game",
        "• M - Toggle background music",
        "• S - Toggle sound effects",
        "• - = - Adjust music volume",
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
    
    for (int i = 0; i < num_lines && current_y < WINDOW_HEIGHT - 50; i++) {
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

// ========== ANNOTATION POPOVER SYSTEM ==========

void game_draw_annotation_popover(const struct Game *g) {
    if (!g->annotation_popover.is_active) {
        return; // No popover to draw
    }
    
    // Get current screen dimensions instead of hardcoded values
    int current_width, current_height;
    SDL_GetWindowSize(g->window, &current_width, &current_height);
    
    // Draw popover background (dark gray with black border)
    SDL_Rect popover_rect = {
        g->annotation_popover.x,
        g->annotation_popover.y,
        ANNOTATION_POPOVER_WIDTH,
        ANNOTATION_POPOVER_HEIGHT
    };
    
    // Ensure popover stays within current screen bounds
    if (popover_rect.x + popover_rect.w > current_width) {
        popover_rect.x = current_width - popover_rect.w;
    }
    if (popover_rect.y + popover_rect.h > current_height) {
        popover_rect.y = current_height - popover_rect.h;
    }
    
    // Draw background
    SDL_SetRenderDrawColor(g->renderer, 80, 80, 80, 255); // Dark gray
    SDL_RenderFillRect(g->renderer, &popover_rect);
    
    // Draw border
    SDL_SetRenderDrawColor(g->renderer, 0, 0, 0, 255); // Black
    SDL_RenderDrawRect(g->renderer, &popover_rect);
    
    // Draw options in 4-column grid
    for (int i = 0; i < ANNOTATION_OPTIONS_COUNT; i++) {
        int row = i / ANNOTATION_GRID_COLUMNS;
        int col = i % ANNOTATION_GRID_COLUMNS;
        
        SDL_Rect option_rect = {
            popover_rect.x + col * ANNOTATION_OPTION_SIZE,
            popover_rect.y + row * ANNOTATION_OPTION_SIZE,
            ANNOTATION_OPTION_SIZE,
            ANNOTATION_OPTION_SIZE
        };
        
        // Highlight selected option
        if (i == g->annotation_popover.selected_option) {
            SDL_SetRenderDrawColor(g->renderer, 120, 120, 120, 255); // Light gray
            SDL_RenderFillRect(g->renderer, &option_rect);
        }
        
        // Draw option border
        SDL_SetRenderDrawColor(g->renderer, 0, 0, 0, 255); // Black
        SDL_RenderDrawRect(g->renderer, &option_rect);
        
        // Draw option text
        if (g->info_font) {
            SDL_Color text_color = {255, 255, 255, 255}; // White text
            
            SDL_Surface *text_surface = TTF_RenderText_Solid(g->info_font, ANNOTATION_LABELS[i], text_color);
            if (text_surface) {
                SDL_Texture *text_texture = SDL_CreateTextureFromSurface(g->renderer, text_surface);
                if (text_texture) {
                    SDL_Rect text_rect = {
                        option_rect.x + (option_rect.w - text_surface->w) / 2, // Center horizontally
                        option_rect.y + (option_rect.h - text_surface->h) / 2, // Center vertically
                        text_surface->w,
                        text_surface->h
                    };
                    
                    SDL_RenderCopy(g->renderer, text_texture, NULL, &text_rect);
                    SDL_DestroyTexture(text_texture);
                }
                SDL_FreeSurface(text_surface);
            }
        }
    }
    
    // Reset render color
    SDL_SetRenderDrawColor(g->renderer, 0, 0, 0, 255);
}
