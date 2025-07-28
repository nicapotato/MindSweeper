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
#define WINDOW_WIDTH 480   // Slightly reduced width for better formatting
#define WINDOW_HEIGHT 460  // Increased height for better panel spacing

#define PIECE_SIZE 16
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

#endif
