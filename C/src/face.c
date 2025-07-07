#include "face.h"
#include "load_media.h"

bool face_new(struct Face **face, SDL_Renderer *renderer, unsigned columns,
              int scale) {
    *face = calloc(1, sizeof(struct Face));
    if (!*face) {
        fprintf(stderr, "Error in calloc of new face.\n");
        return false;
    }
    struct Face *f = *face;

    f->renderer = renderer;
    f->columns = columns;
    f->scale = scale;
    f->image_index = 0;

    if (!load_media_sheet(f->renderer, &f->image, "images/faces.png", FACE_SIZE,
                          FACE_SIZE, &f->src_rects)) {
        return false;
    }

    face_set_scale(f, f->scale);

    return true;
}

void face_free(struct Face **face) {
    if (*face) {
        struct Face *f = *face;

        if (f->src_rects) {
            free(f->src_rects);
            f->src_rects = NULL;
        }

        if (f->image) {
            SDL_DestroyTexture(f->image);
            f->image = NULL;
        }

        f->renderer = NULL;

        free(*face);
        *face = NULL;

        printf("face clean.\n");
    }
}

void face_set_scale(struct Face *f, int scale) {
    f->scale = scale;
    f->dest_rect.x = ((PIECE_SIZE * (int)f->columns - FACE_SIZE) / 2 +
                      PIECE_SIZE - BORDER_LEFT) *
                     f->scale;
    f->dest_rect.y = FACE_TOP * f->scale;
    f->dest_rect.w = FACE_SIZE * f->scale;
    f->dest_rect.h = FACE_SIZE * f->scale;
}

bool face_mouse_click(struct Face *f, int x, int y, bool down) {
    if (x >= f->dest_rect.x && x <= f->dest_rect.x + f->dest_rect.w) {
        if (y >= f->dest_rect.y && y <= f->dest_rect.y + f->dest_rect.h) {
            if (down) {
                f->image_index = 1;
            } else if (f->image_index == 1) {
                f->image_index = 0;
                return true;
            }
        }
    } else if (!down) {
        f->image_index = 0;
    }

    return false;
}

void face_default(struct Face *f) { f->image_index = 0; }

void face_won(struct Face *f) { f->image_index = 3; }

void face_lost(struct Face *f) { f->image_index = 4; }

void face_question(struct Face *f) { f->image_index = 2; }

void face_set_theme(struct Face *f, unsigned theme) { f->theme = theme * 5; }

void face_set_size(struct Face *f, unsigned columns) {
    f->columns = columns;
    f->dest_rect.x = ((PIECE_SIZE * (int)f->columns - FACE_SIZE) / 2 +
                      PIECE_SIZE - BORDER_LEFT) *
                     f->scale;
}

void face_draw(const struct Face *f) {
    SDL_RenderCopy(f->renderer, f->image,
                   &f->src_rects[f->image_index + f->theme], &f->dest_rect);
}
