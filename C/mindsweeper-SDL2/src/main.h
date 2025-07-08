#ifndef MAIN_H
#define MAIN_H

#include <SDL2/SDL.h>
#include <SDL2/SDL_image.h>
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
#define WINDOW_WIDTH 512   // Increased to fit 14 columns + borders
#define WINDOW_HEIGHT 480  // Increased for player panel + 10 rows + borders

#define PIECE_SIZE 16
#define BORDER_HEIGHT 55
#define BORDER_LEFT 4
#define BORDER_RIGHT 8
#define BORDER_BOTTOM 8

// Player panel dimensions
#define PLAYER_PANEL_HEIGHT 30
#define PLAYER_PANEL_Y 15
#define PLAYER_STATS_FONT_SIZE 10

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
#define SPRITE_HIDDEN 0
#define SPRITE_REVEALED 1
#define SPRITE_CLEARED 2
#define SPRITE_MAX_INDEX 255

#endif
