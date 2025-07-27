#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef WASM_BUILD
// WASM fallback implementations without JSON parsing
bool config_load(GameConfig *config, const char *config_file) {
    (void)config_file;
    
    // Hardcode basic config values for WASM build
    config->rows = 10;
    config->cols = 14;
    config->starting_health = 8;
    config->starting_experience = 5;
    config->starting_level = 1;
    
    // Create basic entities (just empty and a test dragon)
    config->entity_count = 2;
    config->entities = calloc(config->entity_count, sizeof(Entity));
    
    // Entity 0: Empty
    config->entities[0].id = 0;
    strcpy(config->entities[0].name, "Empty");
    strcpy(config->entities[0].description, "An empty tile");
    config->entities[0].sprite_pos.x = 5;
    config->entities[0].sprite_pos.y = 4;
    
    // Entity 1: Test Dragon
    config->entities[1].id = 1;
    strcpy(config->entities[1].name, "Dragon Whelp");
    strcpy(config->entities[1].description, "A small dragon");
    config->entities[1].level = 1;
    config->entities[1].is_enemy = true;
    config->entities[1].sprite_pos.x = 0;
    config->entities[1].sprite_pos.y = 3;
    
    printf("WASM: Loaded hardcoded config with %u entities\n", config->entity_count);
    return true;
}

bool config_load_solution(SolutionData *solution, const char *solution_file, unsigned solution_index) {
    (void)solution_file;
    (void)solution_index;
    
    // Create a simple test board for WASM
    solution->rows = 10;
    solution->cols = 14;
    strcpy(solution->uuid, "wasm-test-board");
    
    // Allocate 2D array
    solution->board = malloc(solution->rows * sizeof(unsigned*));
    for (unsigned i = 0; i < solution->rows; i++) {
        solution->board[i] = malloc(solution->cols * sizeof(unsigned));
        
        for (unsigned j = 0; j < solution->cols; j++) {
            // Simple pattern: mostly empty with some dragons
            if ((i + j) % 7 == 0) {
                solution->board[i][j] = 1; // Dragon
            } else {
                solution->board[i][j] = 0; // Empty
            }
        }
    }
    
    printf("WASM: Created test board (%ux%u)\n", solution->rows, solution->cols);
    return true;
}

#else
// Full JSON implementation for native builds

static char* read_file_contents(const char *filename) {
    FILE *file = fopen(filename, "r");
    if (!file) {
        fprintf(stderr, "Failed to open file: %s\n", filename);
        return NULL;
    }
    
    fseek(file, 0, SEEK_END);
    long length = ftell(file);
    fseek(file, 0, SEEK_SET);
    
    char *content = malloc((size_t)length + 1);
    if (!content) {
        fclose(file);
        return NULL;
    }
    
    fread(content, 1, (size_t)length, file);
    content[length] = '\0';
    fclose(file);
    
    return content;
}

bool config_load(GameConfig *config, const char *config_file) {
    char *content = read_file_contents(config_file);
    if (!content) {
        return false;
    }
    
    cJSON *json = cJSON_Parse(content);
    free(content);
    
    if (!json) {
        fprintf(stderr, "Failed to parse JSON config\n");
        return false;
    }
    
    // Parse game state
    cJSON *game_state = cJSON_GetObjectItem(json, "game_state");
    if (game_state) {
        // Print the game_state JSON object
        char *game_state_str = cJSON_Print(game_state);
        printf("Game state JSON: %s\n", game_state_str);
        free(game_state_str);
        
        config->rows = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(json, "rows"));
        config->cols = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(json, "cols"));
        config->starting_health = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(game_state, "starting_max_health"));
        config->starting_experience = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(game_state, "starting_max_experience"));
        config->starting_level = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(game_state, "starting_level"));
    }
    
    
    // Parse entities
    cJSON *entities = cJSON_GetObjectItem(json, "entities");
    if (entities) {
        // Print the entities JSON array
        // char *entities_str = cJSON_Print(entities);
        // printf("Entities JSON: %s\n", entities_str);
        // free(entities_str);
        
        config->entity_count = (unsigned)cJSON_GetArraySize(entities);
        config->entities = calloc(config->entity_count, sizeof(Entity));
        
        for (unsigned i = 0; i < config->entity_count; i++) {
            cJSON *entity = cJSON_GetArrayItem(entities, (int)i);
            Entity *e = &config->entities[i];
            
            e->id = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(entity, "id"));
            
            cJSON *name = cJSON_GetObjectItem(entity, "name");
            if (name) {
                strncpy(e->name, cJSON_GetStringValue(name), sizeof(e->name) - 1);
            }
            
            cJSON *desc = cJSON_GetObjectItem(entity, "description");
            if (desc) {
                strncpy(e->description, cJSON_GetStringValue(desc), sizeof(e->description) - 1);
            }
            
            e->level = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(entity, "level"));
            e->count = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(entity, "count"));
            
            // Parse tags to determine entity type
            cJSON *tags = cJSON_GetObjectItem(entity, "tags");
            if (tags) {
                int tag_count = cJSON_GetArraySize(tags);
                for (int j = 0; j < tag_count; j++) {
                    cJSON *tag = cJSON_GetArrayItem(tags, j);
                    const char *tag_str = cJSON_GetStringValue(tag);
                    if (strcmp(tag_str, "enemy") == 0) {
                        e->is_enemy = true;
                    } else if (strcmp(tag_str, "treasure") == 0) {
                        e->is_treasure = true;
                    }
                }
            }
            
            // Parse sprite position
            cJSON *sprites = cJSON_GetObjectItem(entity, "sprites");
            if (sprites) {
                cJSON *revealed = cJSON_GetObjectItem(sprites, "revealed");
                if (revealed) {
                    e->sprite_pos.x = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(revealed, "x"));
                    e->sprite_pos.y = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(revealed, "y"));
                }
            }
        }
    }
    
    cJSON_Delete(json);
    return true;
}

bool config_load_solution(SolutionData *solution, const char *solution_file, unsigned solution_index) {
    char *content = read_file_contents(solution_file);
    if (!content) {
        return false;
    }
    
    cJSON *json = cJSON_Parse(content);
    free(content);
    
    if (!json) {
        fprintf(stderr, "Failed to parse JSON solution\n");
        return false;
    }
    
    if (!cJSON_IsArray(json)) {
        fprintf(stderr, "Solution file is not an array\n");
        cJSON_Delete(json);
        return false;
    }
    
    int solution_count = cJSON_GetArraySize(json);
    if ((int)solution_index >= solution_count) {
        fprintf(stderr, "Solution index %u out of range (0-%d)\n", solution_index, solution_count - 1);
        cJSON_Delete(json);
        return false;
    }
    
    cJSON *sol = cJSON_GetArrayItem(json, (int)solution_index);
    
    // Parse UUID
    cJSON *uuid = cJSON_GetObjectItem(sol, "uuid");
    if (uuid) {
        strncpy(solution->uuid, cJSON_GetStringValue(uuid), sizeof(solution->uuid) - 1);
    }
    
    // Parse board
    cJSON *board = cJSON_GetObjectItem(sol, "board");
    if (!board) {
        fprintf(stderr, "No board data in solution\n");
        cJSON_Delete(json);
        return false;
    }
    
    solution->rows = (unsigned)cJSON_GetArraySize(board);
    if (solution->rows == 0) {
        fprintf(stderr, "Empty board in solution\n");
        cJSON_Delete(json);
        return false;
    }
    
    cJSON *first_row = cJSON_GetArrayItem(board, 0);
    solution->cols = (unsigned)cJSON_GetArraySize(first_row);
    
    // Allocate 2D array
    solution->board = malloc(solution->rows * sizeof(unsigned*));
    for (unsigned i = 0; i < solution->rows; i++) {
        solution->board[i] = malloc(solution->cols * sizeof(unsigned));
        
        cJSON *row = cJSON_GetArrayItem(board, (int)i);
        for (unsigned j = 0; j < solution->cols; j++) {
            cJSON *cell = cJSON_GetArrayItem(row, (int)j);
            solution->board[i][j] = (unsigned)cJSON_GetNumberValue(cell);
        }
    }
    
    // Print the solution board
    printf("Solution board (%ux%u):\n", solution->rows, solution->cols);
    for (unsigned i = 0; i < solution->rows; i++) {
        for (unsigned j = 0; j < solution->cols; j++) {
            printf("%u ", solution->board[i][j]);
        }
        printf("\n");
    }
    printf("\n");
    
    cJSON_Delete(json);
    return true;
}
#endif

void config_free(GameConfig *config) {
    if (config->entities) {
        free(config->entities);
        config->entities = NULL;
    }
    config->entity_count = 0;
}

void config_free_solution(SolutionData *solution) {
    if (solution->board) {
        for (unsigned i = 0; i < solution->rows; i++) {
            free(solution->board[i]);
        }
        free(solution->board);
        solution->board = NULL;
    }
    solution->rows = 0;
    solution->cols = 0;
}

Entity* config_get_entity(const GameConfig *config, unsigned entity_id) {
    for (unsigned i = 0; i < config->entity_count; i++) {
        if (config->entities[i].id == entity_id) {
            return &config->entities[i];
        }
    }
    return NULL;
} 
