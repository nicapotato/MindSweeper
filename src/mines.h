#ifndef MINES_H
#define MINES_H

#include "main.h"

struct Mines {
        SDL_Renderer *renderer;
        SDL_Texture *back_image;
        SDL_Texture *digit_image;
        SDL_Rect *back_src_rects;
        SDL_Rect *digit_src_rects;
        SDL_Rect back_dest_rect;
        SDL_Rect digit_rect;
        int scale;
        int mine_count;
        unsigned digits[3];
        unsigned back_theme;
        unsigned digit_theme;
};

bool mines_new(struct Mines **mines, SDL_Renderer *renderer, int scale,
               int mine_count);
void mines_free(struct Mines **mines);
void mines_reset(struct Mines *m, int mine_count);
void mines_increment(struct Mines *m);
void mines_decrement(struct Mines *m);
void mines_set_scale(struct Mines *m, int scale);
void mines_set_theme(struct Mines *m, unsigned theme);
void mines_draw(const struct Mines *m);

#endif
