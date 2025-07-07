#include "mines.h"
#include "load_media.h"

void mines_update_digits(struct Mines *m);

bool mines_new(struct Mines **mines, SDL_Renderer *renderer, int scale,
               int mine_count) {
    *mines = calloc(1, sizeof(struct Mines));
    if (!*mines) {
        fprintf(stderr, "Error in calloc of new clock.\n");
        return false;
    }
    struct Mines *m = *mines;

    m->renderer = renderer;
    m->scale = scale;
    m->mine_count = mine_count;

    if (!load_media_sheet(m->renderer, &m->back_image, "images/digitback.png",
                          DIGIT_BACK_WIDTH, DIGIT_BACK_HEIGHT,
                          &m->back_src_rects)) {
        return false;
    }

    if (!load_media_sheet(m->renderer, &m->digit_image, "images/digits.png",
                          DIGIT_WIDTH, DIGIT_HEIGHT, &m->digit_src_rects)) {
        return false;
    }

    mines_set_scale(m, m->scale);
    mines_update_digits(m);

    return true;
}

void mines_free(struct Mines **mines) {
    if (*mines) {
        struct Mines *m = *mines;

        if (m->back_src_rects) {
            free(m->back_src_rects);
            m->back_src_rects = NULL;
        }

        if (m->back_image) {
            SDL_DestroyTexture(m->back_image);
            m->back_image = NULL;
        }

        if (m->digit_src_rects) {
            free(m->digit_src_rects);
            m->digit_src_rects = NULL;
        }

        if (m->digit_image) {
            SDL_DestroyTexture(m->digit_image);
            m->digit_image = NULL;
        }

        m->renderer = NULL;

        free(*mines);
        *mines = NULL;

        printf("mines clean.\n");
    }
}

void mines_update_digits(struct Mines *m) {
    unsigned default_digit = 11;
    unsigned mine_count = (unsigned)abs(m->mine_count);

    if (m->mine_count > 999) {
        mine_count = 999;
    }

    if (m->mine_count < -99) {
        mine_count = 99;
    }

    if (mine_count > 99) {
        m->digits[0] = mine_count / 100;
        default_digit = 0;
    } else {
        m->digits[0] = default_digit;
    }

    if (mine_count > 9) {
        m->digits[1] = (mine_count / 10) % 10;
    } else {
        m->digits[1] = default_digit;
    }

    m->digits[2] = mine_count % 10;

    if (m->mine_count < 0) {
        m->digits[0] = 10;
    }
}

void mines_reset(struct Mines *m, int mine_count) {
    m->mine_count = mine_count;
    mines_update_digits(m);
}

void mines_increment(struct Mines *m) {
    m->mine_count++;
    mines_update_digits(m);
}

void mines_decrement(struct Mines *m) {
    m->mine_count--;
    mines_update_digits(m);
}

void mines_set_scale(struct Mines *m, int scale) {
    m->scale = scale;
    m->back_dest_rect.x = DIGIT_BACK_LEFT * m->scale;
    m->back_dest_rect.y = DIGIT_BACK_TOP * m->scale;
    m->back_dest_rect.w = DIGIT_BACK_WIDTH * m->scale;
    m->back_dest_rect.h = DIGIT_BACK_HEIGHT * m->scale;
    m->digit_rect.x = DIGIT_BACK_LEFT * m->scale + m->scale;
    m->digit_rect.y = DIGIT_BACK_TOP * m->scale + m->scale;
    m->digit_rect.w = DIGIT_WIDTH * m->scale;
    m->digit_rect.h = DIGIT_HEIGHT * m->scale;
}

void mines_set_theme(struct Mines *m, unsigned theme) {
    m->back_theme = theme;
    m->digit_theme = theme * 12;
}

void mines_draw(const struct Mines *m) {
    SDL_RenderCopy(m->renderer, m->back_image,
                   &m->back_src_rects[m->back_theme], &m->back_dest_rect);
    SDL_Rect dest_rect = {m->digit_rect.x, m->digit_rect.y, m->digit_rect.w,
                          m->digit_rect.h};
    for (int i = 0; i < 3; i++) {
        dest_rect.x = m->digit_rect.x + m->digit_rect.w * i;
        SDL_RenderCopy(m->renderer, m->digit_image,
                       &m->digit_src_rects[m->digits[i] + m->digit_theme],
                       &dest_rect);
    }
}
