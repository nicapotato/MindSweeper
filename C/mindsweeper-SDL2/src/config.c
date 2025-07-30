#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#ifdef WASM_BUILD
#include "cJSON.h"
#else
#include <cjson/cJSON.h>
#endif

// Unified file reading function for both WASM and native builds
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
    printf("[CONFIG] Using cJSON for config loading (WASM_BUILD=%d)\n", (int)(
#ifdef WASM_BUILD
1
#else
0
#endif
));
    
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
    
    printf("[CONFIG] cJSON parsed config file successfully!\n");
    
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
            
            // Parse tags array
            e->tag_count = 0;
            e->is_enemy = false;
            e->is_item = false;
            
            cJSON *tags = cJSON_GetObjectItem(entity, "tags");
            if (tags) {
                int tag_count = cJSON_GetArraySize(tags);
                for (int j = 0; j < tag_count && e->tag_count < MAX_ENTITY_TAGS; j++) {
                    cJSON *tag = cJSON_GetArrayItem(tags, j);
                    const char *tag_str = cJSON_GetStringValue(tag);
                    if (tag_str && strlen(tag_str) < MAX_TAG_LENGTH) {
                        strncpy(e->tags[e->tag_count], tag_str, MAX_TAG_LENGTH - 1);
                        e->tags[e->tag_count][MAX_TAG_LENGTH - 1] = '\0';
                        
                        // Set compatibility flags
                        if (strcmp(tag_str, "enemy") == 0) {
                            e->is_enemy = true;
                        } else if (strcmp(tag_str, "item") == 0) {
                            e->is_item = true;
                        }
                        
                        e->tag_count++;
                    }
                }
            }
            
            // Parse sprite position
            cJSON *sprites = cJSON_GetObjectItem(entity, "sprites");
            if (sprites) {
                // Special handling for crystals (entity ID 15) with color variations
                if (e->id == 15) {
                    // Crystal colors: red, blue, yellow, green
                    const char *colors[] = {"red", "blue", "yellow", "green"};
                    const char *selected_color = colors[e->level % 4]; // Use level to select color deterministically
                    
                    cJSON *color_sprite = cJSON_GetObjectItem(sprites, selected_color);
                    if (color_sprite) {
                        // Get x array and use first value (index 0)
                        cJSON *x_array = cJSON_GetObjectItem(color_sprite, "x");
                        if (x_array && cJSON_IsArray(x_array) && cJSON_GetArraySize(x_array) > 0) {
                            cJSON *first_x = cJSON_GetArrayItem(x_array, 0);
                            e->sprite_pos.x = (unsigned)cJSON_GetNumberValue(first_x);
                        }
                        
                        // Get y value
                        cJSON *y_value = cJSON_GetObjectItem(color_sprite, "y");
                        if (y_value) {
                            e->sprite_pos.y = (unsigned)cJSON_GetNumberValue(y_value);
                        }
                    }
                    
                    printf("Crystal entity uses %s color at sprite (%u,%u)\n", 
                           selected_color, e->sprite_pos.x, e->sprite_pos.y);
                } else {
                    // Standard revealed sprite handling for non-crystal entities
                    cJSON *revealed = cJSON_GetObjectItem(sprites, "revealed");
                    if (revealed) {
                        e->sprite_pos.x = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(revealed, "x"));
                        e->sprite_pos.y = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(revealed, "y"));
                    }
                }
            }
            
            // Parse entity transition
            cJSON *entity_transition = cJSON_GetObjectItem(entity, "entity_transition");
            if (entity_transition) {
                cJSON *on_cleared = cJSON_GetObjectItem(entity_transition, "on_cleared");
                if (on_cleared) {
                    e->transition.next_entity_id = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(on_cleared, "entity_id"));
                    
                    cJSON *sound = cJSON_GetObjectItem(on_cleared, "sound");
                    if (sound) {
                        strncpy(e->transition.sound, cJSON_GetStringValue(sound), sizeof(e->transition.sound) - 1);
                    }
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

// Parse solution count from filename like "solutions_1_n_20.json" -> 20
static unsigned parse_solution_count_from_filename(const char *filename) {
    const char *basename = strrchr(filename, '/');
    if (!basename) {
        basename = filename;
    } else {
        basename++; // Skip the '/'
    }
    
    // Look for pattern "solutions_1_n_X.json" where X is the count
    const char *n_pos = strstr(basename, "_n_");
    if (!n_pos) {
        return 0; // No pattern found
    }
    
    n_pos += 3; // Move past "_n_"
    
    // Extract the number
    char *endptr;
    unsigned count = (unsigned)strtoul(n_pos, &endptr, 10);
    
    // Check if we successfully parsed a number and it ends with ".json"
    if (endptr == n_pos || strstr(endptr, ".json") != endptr) {
        return 0; // Invalid format
    }
    
    return count;
}

unsigned config_count_solutions(const char *solution_file) {
    // First try to parse from filename
    unsigned filename_count = parse_solution_count_from_filename(solution_file);
    if (filename_count > 0) {
        printf("Parsed solution count from filename: %u\n", filename_count);
        return filename_count;
    }
    
    // Fallback to parsing the JSON file
    char *content = read_file_contents(solution_file);
    if (!content) {
        return 0;
    }
    
    cJSON *json = cJSON_Parse(content);
    free(content);
    
    if (!json) {
        fprintf(stderr, "Failed to parse JSON solution for counting\n");
        return 0;
    }
    
    if (!cJSON_IsArray(json)) {
        fprintf(stderr, "Solution file is not an array\n");
        cJSON_Delete(json);
        return 0;
    }
    
    int solution_count = cJSON_GetArraySize(json);
    cJSON_Delete(json);
    
    return (unsigned)solution_count;
}
