#ifndef BOARD_CLICK_H
#define BOARD_CLICK_H

#include "game.h"

bool board_handle_click(struct Game *g, unsigned row, unsigned col);

// Animation functions moved from board.c
void board_start_animation(struct Board *b, unsigned row, unsigned col, 
                          AnimationType type, Uint32 duration_ms, bool blocks_input);
void board_finish_animation(struct Board *b, unsigned row, unsigned col);

#endif
