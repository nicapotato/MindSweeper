#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../cJSON-1.7.18/cJSON.h"

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
                    
                    // Check for revealed-hostile sprite (for mimics and similar entities)
                    cJSON *revealed_hostile = cJSON_GetObjectItem(sprites, "revealed-hostile");
                    if (revealed_hostile) {
                        e->hostile_sprite_pos.x = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(revealed_hostile, "x"));
                        e->hostile_sprite_pos.y = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(revealed_hostile, "y"));
                        e->hostile_sprite_pos.has_hostile_sprite = true;
                        printf("Entity %u (%s) has revealed-hostile sprite at (%u,%u)\n", 
                               e->id, e->name, e->hostile_sprite_pos.x, e->hostile_sprite_pos.y);
                    } else {
                        e->hostile_sprite_pos.has_hostile_sprite = false;
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
    // Parameter validation
    if (!solution || !solution_file) {
        fprintf(stderr, "Invalid parameters to config_load_solution\n");
        return false;
    }
    
    // Initialize solution structure
    memset(solution, 0, sizeof(SolutionData));
    
    // Read file contents
    char *content = read_file_contents(solution_file);
    if (!content) {
        fprintf(stderr, "Failed to read solution file: %s\n", solution_file);
        return false;
    }
    
    // Parse JSON
    cJSON *json = cJSON_Parse(content);
    free(content);
    
    if (!json) {
        fprintf(stderr, "Failed to parse JSON in solution file: %s\n", solution_file);
        return false;
    }
    
    // Validate JSON structure
    if (!cJSON_IsArray(json)) {
        fprintf(stderr, "Solution file is not an array: %s\n", solution_file);
        cJSON_Delete(json);
        return false;
    }
    
    // Check solution index bounds
    int solution_count = cJSON_GetArraySize(json);
    if ((int)solution_index >= solution_count) {
        fprintf(stderr, "Solution index %u out of range (0-%d) in %s\n", 
                solution_index, solution_count - 1, solution_file);
        cJSON_Delete(json);
        return false;
    }
    
    // Get solution object
    cJSON *sol = cJSON_GetArrayItem(json, (int)solution_index);
    if (!sol || !cJSON_IsObject(sol)) {
        fprintf(stderr, "Invalid solution object at index %u in %s\n", solution_index, solution_file);
        cJSON_Delete(json);
        return false;
    }
    
    // Parse UUID
    cJSON *uuid = cJSON_GetObjectItem(sol, "uuid");
    if (uuid && cJSON_IsString(uuid)) {
        strncpy(solution->uuid, cJSON_GetStringValue(uuid), sizeof(solution->uuid) - 1);
        solution->uuid[sizeof(solution->uuid) - 1] = '\0'; // Ensure null termination
    }
    
    // Parse board data
    cJSON *board = cJSON_GetObjectItem(sol, "board");
    if (!board || !cJSON_IsArray(board)) {
        fprintf(stderr, "No valid board data in solution %u\n", solution_index);
        cJSON_Delete(json);
        return false;
    }
    
    // Get board dimensions
    solution->rows = (unsigned)cJSON_GetArraySize(board);
    if (solution->rows == 0) {
        fprintf(stderr, "Empty board in solution %u\n", solution_index);
        cJSON_Delete(json);
        return false;
    }
    
    cJSON *first_row = cJSON_GetArrayItem(board, 0);
    if (!first_row || !cJSON_IsArray(first_row)) {
        fprintf(stderr, "Invalid first row in solution %u\n", solution_index);
        cJSON_Delete(json);
        return false;
    }
    
    solution->cols = (unsigned)cJSON_GetArraySize(first_row);
    if (solution->cols == 0) {
        fprintf(stderr, "Empty columns in solution %u\n", solution_index);
        cJSON_Delete(json);
        return false;
    }
    
    // Allocate 2D array with error handling
    solution->board = malloc(solution->rows * sizeof(unsigned*));
    if (!solution->board) {
        fprintf(stderr, "Failed to allocate board rows in solution %u\n", solution_index);
        cJSON_Delete(json);
        return false;
    }
    
    // Initialize all row pointers to NULL for cleanup safety
    for (unsigned i = 0; i < solution->rows; i++) {
        solution->board[i] = NULL;
    }
    
    // Allocate and populate each row
    for (unsigned i = 0; i < solution->rows; i++) {
        solution->board[i] = malloc(solution->cols * sizeof(unsigned));
        if (!solution->board[i]) {
            fprintf(stderr, "Failed to allocate board row %u in solution %u\n", i, solution_index);
            config_free_solution(solution);
            cJSON_Delete(json);
            return false;
        }
        
        cJSON *row = cJSON_GetArrayItem(board, (int)i);
        if (!row || !cJSON_IsArray(row)) {
            fprintf(stderr, "Invalid row %u in solution %u\n", i, solution_index);
            config_free_solution(solution);
            cJSON_Delete(json);
            return false;
        }
        
        // Validate row size
        if (cJSON_GetArraySize(row) != (int)solution->cols) {
            fprintf(stderr, "Row %u has wrong size in solution %u\n", i, solution_index);
            config_free_solution(solution);
            cJSON_Delete(json);
            return false;
        }
        
        // Populate row data
        for (unsigned j = 0; j < solution->cols; j++) {
            cJSON *cell = cJSON_GetArrayItem(row, (int)j);
            if (!cell || !cJSON_IsNumber(cell)) {
                fprintf(stderr, "Invalid cell [%u,%u] in solution %u\n", i, j, solution_index);
                config_free_solution(solution);
                cJSON_Delete(json);
                return false;
            }
            solution->board[i][j] = (unsigned)cJSON_GetNumberValue(cell);
        }
    }
    
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
    if (!solution) {
        return;
    }
    
    if (solution->board) {
        for (unsigned i = 0; i < solution->rows; i++) {
            if (solution->board[i]) {
                free(solution->board[i]);
            }
        }
        free(solution->board);
        solution->board = NULL;
    }
    
    // Reset all fields
    solution->rows = 0;
    solution->cols = 0;
    memset(solution->uuid, 0, sizeof(solution->uuid));
}

Entity* config_get_entity(const GameConfig *config, unsigned entity_id) {
    for (unsigned i = 0; i < config->entity_count; i++) {
        if (config->entities[i].id == entity_id) {
            return &config->entities[i];
        }
    }
    return NULL;
}

// Helper function to check if an entity has a specific tag
bool entity_has_tag(const Entity *entity, const char *tag) {
    if (!entity || !tag) {
        return false;
    }
    
    for (unsigned i = 0; i < entity->tag_count; i++) {
        if (strcmp(entity->tags[i], tag) == 0) {
            return true;
        }
    }
    return false;
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
