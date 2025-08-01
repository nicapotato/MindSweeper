#ifndef MAIN_H
#define MAIN_H

#include <SDL2/SDL.h>
#include <SDL2/SDL_image.h>
#include <SDL2/SDL_ttf.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

#ifdef WASM_BUILD
#include <emscripten.h>
#include <emscripten/html5.h>
#endif

#define SDL_FLAGS (SDL_INIT_VIDEO | SDL_INIT_AUDIO)
#define IMG_FLAGS IMG_INIT_PNG

#define WINDOW_TITLE "MindSweeper"
#define WINDOW_WIDTH 1200  // Reduced from 1440 to 1200 for better fit
#define WINDOW_HEIGHT 920  // Keep height the same for player panel visibility

#define PIECE_SIZE 16    // Back to original sprite size
#define BORDER_HEIGHT 55
#define BORDER_LEFT 4
#define BORDER_RIGHT 8
#define BORDER_BOTTOM 8

// Player panel dimensions - moved below game board
#define PLAYER_PANEL_HEIGHT 60
#define PLAYER_PANEL_Y 15
#define PLAYER_STATS_FONT_SIZE 10

// Game board positioning - no top panel, start at top
#define GAME_BOARD_Y 15  // Start near the top

#define DIGIT_BACK_WIDTH 41
#define DIGIT_BACK_HEIGHT 25
#define DIGIT_BACK_TOP 15
#define DIGIT_BACK_LEFT 15
#define DIGIT_BACK_RIGHT 3

#define DIGIT_WIDTH 13
#define DIGIT_HEIGHT 23

#define FACE_SIZE 26
#define FACE_TOP 15

// Sprite definitions for mindsweeper
#define SPRITE_HIDDEN 18
#define SPRITE_REVEALED 1
#define SPRITE_CLEARED 2
#define SPRITE_MAX_INDEX 255

// Game configuration constants
#define DEFAULT_BOARD_ROWS 10    // Back to original
#define DEFAULT_BOARD_COLS 14    // Back to original  
// DEFAULT_SCALE removed - will be calculated dynamically

// Function to calculate optimal scale based on window dimensions
int calculate_optimal_scale(int window_width, int window_height, int board_rows, int board_cols);

// Animation constants
#define ANIM_REVEALING_DURATION_MS 800
#define ANIM_COMBAT_DURATION_MS 500
#define ANIM_TREASURE_DURATION_MS 300

// Player progression constants
#define BASE_HEALTH 8
#define HEALTH_PER_LEVEL 2
#define EXP_PER_LEVEL_MULTIPLIER 5
#define GOD_MODE_LEVEL 1000
#define GOD_MODE_HEALTH 9999

// Tile variation constants
#define MIN_TILE_VARIATION 5
#define MAX_TILE_VARIATION 7
#define NUM_TILE_ROTATIONS 4

// String buffer sizes
#define MAX_ENTITY_NAME 64
#define MAX_ENTITY_DESCRIPTION 256
#define MAX_UUID_LENGTH 64
#define MAX_SOUND_NAME 32
#define MAX_TITLE_LENGTH 256
#define MAX_ENTITY_TAGS 10
#define MAX_TAG_LENGTH 32

#endif
