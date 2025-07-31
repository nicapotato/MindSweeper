#ifndef GAME_H
#define GAME_H

#include "main.h"
#include "border.h"
#include "board.h"
#include "clock.h"
#include "face.h"
#include "audio.h"

// Player stats structure
typedef struct {
    unsigned level;
    unsigned health;
    unsigned max_health;
    unsigned experience;
    unsigned exp_to_next_level;
} PlayerStats;

// UI Screen states for different information screens
typedef enum {
    SCREEN_GAME,        // Main game screen (default)
    SCREEN_ENTITIES,    // Entity information screen
    SCREEN_HOW_TO_PLAY  // How to play screen
} UIScreenState;

// Screen toggle buttons
typedef struct {
    SDL_Rect entities_button;      // "Entities" button
    SDL_Rect howto_button;         // "How to Play" button
    SDL_Rect back_button;          // "Back" button (shown on info screens)
} ScreenButtons;

// Game over information
typedef struct {
    bool is_game_over;
    char death_cause[MAX_ENTITY_NAME];  // Name of entity that killed player
} GameOverInfo;

// Player panel for displaying stats
typedef struct {
    SDL_Renderer *renderer;
    SDL_Rect rect;
    int scale;
    unsigned columns;
    SDL_Rect level_up_button;  // Level up button area
    bool can_level_up;         // Whether level up is available
    SDL_Texture *sprite_sheet; // For level-up button sprite
    SDL_Rect *sprite_src_rects; // Source rectangles for sprites
    TTF_Font *font;             // TTF font for text rendering
} PlayerPanel;

// Admin panel state
typedef struct {
    bool god_mode_enabled;
    bool admin_panel_visible;
    unsigned current_solution_index;
    unsigned total_solutions;
} AdminPanel;

struct Game {
        SDL_Event event;
        SDL_Window *window;
        SDL_Renderer *renderer;
        struct Border *border;
        struct Board *board;
        struct Clock *clock;
        struct Face *face;
        PlayerPanel *player_panel;
        PlayerStats player;
        AdminPanel admin;
        UIScreenState current_screen;  // Current UI screen state
        ScreenButtons screen_buttons;  // Screen toggle buttons
        TTF_Font *info_font;          // Font for information screens
        AudioSystem audio;             // Audio system
        bool is_running;
        GameOverInfo game_over_info;  // Replaced simple boolean with detailed info
        unsigned rows;
        unsigned columns;
        int scale;
        char *size_str;
};

bool game_new(struct Game **game);
void game_free(struct Game **game);
bool game_run(struct Game *g);

// Map loading function
bool game_load_map(struct Game *g);

// Player stats functions
void game_init_player_stats(struct Game *g);
void game_update_player_health(struct Game *g, int health_change);
void game_level_up_player(struct Game *g);
unsigned game_calculate_max_health(unsigned level);
unsigned game_calculate_exp_requirement(unsigned level);

// Screen management functions
void game_init_screen_system(struct Game *g);
void game_set_screen(struct Game *g, UIScreenState screen);
void game_setup_screen_buttons(struct Game *g);
bool game_handle_screen_button_click(struct Game *g, int x, int y);

// Screen drawing functions
void game_draw_entities_screen(const struct Game *g);
void game_draw_howto_screen(const struct Game *g);
void game_draw_screen_buttons(const struct Game *g);
void game_draw_text_wrapped(const struct Game *g, const char *text, int x, int y, int max_width, SDL_Color color);

// Admin panel functions
void game_toggle_admin_panel(struct Game *g);
void game_admin_god_mode(struct Game *g);
void game_admin_reveal_all(struct Game *g);
bool game_admin_load_map(struct Game *g, unsigned solution_index);
void game_print_admin_help(void);

// Player panel functions
bool player_panel_new(PlayerPanel **panel, SDL_Renderer *renderer, unsigned columns, int scale);
void player_panel_free(PlayerPanel **panel);
void player_panel_set_scale(PlayerPanel *p, int scale);
void player_panel_set_size(PlayerPanel *p, unsigned columns);
void player_panel_draw(const PlayerPanel *p, const PlayerStats *stats, const struct Game *g);
bool player_panel_handle_click(PlayerPanel *p, int x, int y, struct Game *g);
void player_panel_draw_text(const PlayerPanel *p, const char *text, int x, int y, SDL_Color color);

// Game over functions
void game_check_game_over(struct Game *g);
void game_set_game_over(struct Game *g, const char *entity_name);
void game_draw_game_over_popup(const struct Game *g);
void game_reset_game_over(struct Game *g);

#endif
