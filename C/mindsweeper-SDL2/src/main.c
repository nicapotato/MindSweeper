#include "game.h"
#include <time.h>
#include <stdlib.h>

int main(void) {
    // Initialize random seed
    srand((unsigned)time(NULL));
    
    bool exit_status = EXIT_FAILURE;

    struct Game *game = NULL;

    if (game_new(&game)) {
        if (game_run(game)) {
            exit_status = EXIT_SUCCESS;
        }
    }

    game_free(&game);

    return exit_status;
}
