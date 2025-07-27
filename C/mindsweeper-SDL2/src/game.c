#include "game.h"
#include "init_sdl.h"
#include "board_click.h"

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
    g->rows = 10;      // Match config_v2.json
    g->columns = 14;   // Match config_v2.json
    g->scale = 2;

    if (!game_init_sdl(g)) {
        return false;
    }

    if (!border_new(&g->border, g->renderer, g->rows, g->columns, g->scale)) {
        return false;
    }

    if (!board_new(&g->board, g->renderer, g->rows, g->columns, g->scale)) {
        return false;
    }

    // Load solution data
#ifdef WASM_BUILD
    if (!board_load_solution(g->board, "latest-s-v0_0_9.json", 0)) {
#else
    if (!board_load_solution(g->board, "latest-s-v0_0_9.json", 0)) {
#endif
        fprintf(stderr, "Failed to load solution data\n");
        return false;
    }

    if (!clock_new(&g->clock, g->renderer, g->columns, g->scale)) {
        return false;
    }

    if (!face_new(&g->face, g->renderer, g->columns, g->scale)) {
        return false;
    }

    if (!player_panel_new(&g->player_panel, g->renderer, g->columns, g->scale)) {
        return false;
    }

    if (!game_create_string(&g->size_str, "MindSweeper")) {
        return false;
    }

    game_set_title(g);
    
    // Initialize player stats and admin panel
    game_init_player_stats(g);

    return true;
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

        if (g->renderer) {
            SDL_DestroyRenderer(g->renderer);
            g->renderer = NULL;
        }

        if (g->window) {
            SDL_DestroyWindow(g->window);
            g->window = NULL;
        }

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
    char *title = calloc(256, sizeof(char));
    if (!title) {
        return;
    }

    snprintf(title, 256, "%s - %s", WINDOW_TITLE, g->size_str);
    SDL_SetWindowTitle(g->window, title);

    free(title);
}

bool game_reset(struct Game *g) {
    if (!board_reset(g->board)) {
        return false;
    }

    clock_reset(g->clock);
    face_default(g->face);

    return true;
}

void game_set_scale(struct Game *g) {
    border_set_scale(g->border, g->scale);
    board_set_scale(g->board, g->scale);
    clock_set_scale(g->clock, g->scale);
    face_set_scale(g->face, g->scale);
    player_panel_set_scale(g->player_panel, g->scale);
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
                if (!game_reset(g))
                    return false;
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
            case SDL_SCANCODE_E:
                if (!game_set_size(g, 16, 30, 2, "Medium"))
                    return false;
                break;
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
}

void game_draw(const struct Game *g) {
    SDL_RenderClear(g->renderer);

    border_draw(g->border);
    board_draw(g->board);
    clock_draw(g->clock);
    face_draw(g->face);
    player_panel_draw(g->player_panel, &g->player);

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

// ========== PLAYER STATS FUNCTIONS ==========

void game_init_player_stats(struct Game *g) {
    g->player.level = 1;
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
}

void game_level_up_player(struct Game *g) {
    if (g->player.experience >= g->player.exp_to_next_level) {
        g->player.level++;
        g->player.experience = 0;
        g->player.max_health = game_calculate_max_health(g->player.level);
        g->player.health = g->player.max_health; // Full heal on level up
        g->player.exp_to_next_level = game_calculate_exp_requirement(g->player.level);
        
        printf("LEVEL UP! Player is now level %u with %u health\n", 
               g->player.level, g->player.max_health);
    }
}

unsigned game_calculate_max_health(unsigned level) {
    if (level >= 1000) {
        return 9999; // GOD mode health
    }
    return 8 + (level * 2); // Base health + 2 per level
}

unsigned game_calculate_exp_requirement(unsigned level) {
    return level * 5; // Simple exp curve: 5, 10, 15, 20, etc.
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
        g->player.level = 1000;
        g->player.max_health = game_calculate_max_health(g->player.level);
        g->player.health = g->player.max_health;
        g->player.experience = 0;
        g->player.exp_to_next_level = game_calculate_exp_requirement(g->player.level);
        
        printf("🔱 GOD MODE ACTIVATED! Player level set to 1000 with 9999 health!\n");
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

    player_panel_set_scale(p, p->scale);

    return true;
}

void player_panel_free(PlayerPanel **panel) {
    if (*panel) {
        PlayerPanel *p = *panel;
        
        p->renderer = NULL;
        
        free(*panel);
        *panel = NULL;
        
        printf("player panel clean.\n");
    }
}

void player_panel_set_scale(PlayerPanel *p, int scale) {
    p->scale = scale;
    p->rect.x = (PIECE_SIZE * 4) * p->scale; // Position after face and clock
    p->rect.y = PLAYER_PANEL_Y * p->scale;
    p->rect.w = (PIECE_SIZE * 6) * p->scale; // Width for stats display
    p->rect.h = PLAYER_PANEL_HEIGHT * p->scale;
}

void player_panel_set_size(PlayerPanel *p, unsigned columns) {
    p->columns = columns;
    // Adjust position based on board width
    p->rect.x = (PIECE_SIZE * 4) * p->scale;
}

void player_panel_draw(const PlayerPanel *p, const PlayerStats *stats) {
    // Set drawing color to a semi-transparent dark background
    SDL_SetRenderDrawColor(p->renderer, 40, 40, 40, 180);
    SDL_RenderFillRect(p->renderer, &p->rect);
    
    // Set border color
    SDL_SetRenderDrawColor(p->renderer, 100, 100, 100, 255);
    SDL_RenderDrawRect(p->renderer, &p->rect);
    
    // For now, we'll use simple colored rectangles to represent the stats
    // This is a placeholder - in a full implementation you'd want text rendering
    
    // Level indicator (green bars)
    SDL_SetRenderDrawColor(p->renderer, 0, 255, 0, 255);
    SDL_Rect level_rect = {
        p->rect.x + 5 * p->scale,
        p->rect.y + 5 * p->scale,
        (int)(stats->level % 20) * p->scale, // Visual level indicator
        8 * p->scale
    };
    SDL_RenderFillRect(p->renderer, &level_rect);
    
    // Health indicator (red bars)
    SDL_SetRenderDrawColor(p->renderer, 255, 0, 0, 255);
    int health_width = (int)((float)stats->health / stats->max_health * 60.0f * p->scale);
    SDL_Rect health_rect = {
        p->rect.x + 5 * p->scale,
        p->rect.y + 15 * p->scale,
        health_width,
        8 * p->scale
    };
    SDL_RenderFillRect(p->renderer, &health_rect);
    
    // Experience indicator (blue bars)
    SDL_SetRenderDrawColor(p->renderer, 0, 0, 255, 255);
    int exp_width = (int)((float)stats->experience / stats->exp_to_next_level * 60.0f * p->scale);
    SDL_Rect exp_rect = {
        p->rect.x + 5 * p->scale,
        p->rect.y + 25 * p->scale,
        exp_width,
        8 * p->scale
    };
    SDL_RenderFillRect(p->renderer, &exp_rect);
    
    // Reset render color to default
    SDL_SetRenderDrawColor(p->renderer, 0, 0, 0, 255);
}
