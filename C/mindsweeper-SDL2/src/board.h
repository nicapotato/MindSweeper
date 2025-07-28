#ifndef BOARD_H
#define BOARD_H

#include "config.h"

// Forward declaration to avoid circular dependency
struct Game;

// Animation types for tile transitions
typedef enum {
    ANIM_NONE = 0,
    ANIM_REVEALING,          // Hidden -> showing entity (0.8s)
    ANIM_COMBAT,             // Fight animation (0.5s)
    ANIM_COMBAT_STAGE2,      // Combat stage 2: show sprite x:2, y:0 (0.5s)
    ANIM_DYING,              // Death animation (0.3s)
    ANIM_TREASURE_CLAIM,     // Treasure collection (0.3s)
    ANIM_ENTITY_TRANSITION   // Entity -> new entity/empty (0.5s)
} AnimationType;

// Animation state for each tile
typedef struct {
    AnimationType type;
    Uint32 start_time;       // SDL_GetTicks() when started
    Uint32 duration_ms;      // How long animation lasts
    unsigned start_sprite;   // Starting sprite index
    unsigned end_sprite;     // Target sprite index
    bool blocks_input;       // Can user click during this animation?
} TileAnimation;

// Tile states
typedef enum {
    TILE_HIDDEN = 0,
    TILE_REVEALED = 1
} TileState;

struct Board {
        SDL_Renderer *renderer;
        SDL_Texture *entity_sprites;     // Single sprite sheet for all entities
        SDL_Rect *entity_src_rects;      // Source rectangles for entity sprites
        
        SDL_Texture *tile_sprites;       // Tile sprite sheet (tile-16x16.png)
        SDL_Rect *tile_src_rects;        // Source rectangles for tile sprites
        
        // Core game data (immediate updates)
        unsigned *entity_ids;            // 1D array: entity ID occupying each cell
        TileState *tile_states;          // 1D array: hidden/revealed mask
        
        // Tile variation data for TILE_HIDDEN
        unsigned *tile_variations;       // 1D array: random tile variation (0-3)
        unsigned *tile_rotations;        // 1D array: random rotation (0-3)
        
        // Animation system (visual updates)
        TileAnimation *animations;       // 1D array: animation state per tile
        unsigned *display_sprites;       // 1D array: current visual sprite index
        
        // Threat level system (minesweeper logic)
        unsigned *threat_levels;         // 1D array: calculated threat levels for empty tiles
        
        // TTF font rendering for threat levels
        TTF_Font *threat_font;           // TTF font for threat level display
        
        unsigned rows;
        unsigned columns;
        int scale;
        int piece_size;
        SDL_Rect rect;
        unsigned theme;
};

struct Node {
        struct Node *next;
        int row;
        int column;
};

struct Pos {
        int row;
        int column;
};

/**
 * @brief Create a new game board
 * @param board Double pointer to store the allocated board
 * @param renderer SDL renderer for graphics
 * @param rows Number of rows in the board
 * @param columns Number of columns in the board
 * @param scale Scaling factor for display
 * @return true on success, false on failure
 */
bool board_new(struct Board **board, SDL_Renderer *renderer, unsigned rows,
               unsigned columns, int scale);

/**
 * @brief Free a board and all associated resources
 * @param board Double pointer to the board (set to NULL after freeing)
 */
void board_free(struct Board **board);

/**
 * @brief Reset the board to initial state
 * @param b Pointer to the board
 * @return true on success, false on failure
 */
bool board_reset(struct Board *b);
void board_set_scale(struct Board *b, int scale);
void board_set_theme(struct Board *b, unsigned theme);
void board_set_size(struct Board *b, unsigned rows, unsigned columns);
void board_draw(const struct Board *b);

// Core game state access
unsigned board_get_entity_id(const struct Board *b, unsigned row, unsigned col);
void board_set_entity_id(struct Board *b, unsigned row, unsigned col, unsigned entity_id);
TileState board_get_tile_state(const struct Board *b, unsigned row, unsigned col);
void board_set_tile_state(struct Board *b, unsigned row, unsigned col, TileState state);

// Animation system
void board_update_animations(struct Board *b);
void board_start_animation(struct Board *b, unsigned row, unsigned col, 
                          AnimationType type, Uint32 duration_ms, bool blocks_input);
bool board_is_tile_animating(const struct Board *b, unsigned row, unsigned col);

// Game logic
bool board_load_solution(struct Board *b, const char *solution_file, unsigned solution_index);

// Admin functions
void board_reveal_all_tiles(struct Board *b);

// Config access
const GameConfig* board_get_config(void);

// Threat level system (minesweeper logic)
void board_calculate_threat_levels(struct Board *b);
unsigned board_get_threat_level(const struct Board *b, unsigned row, unsigned col);

#endif
