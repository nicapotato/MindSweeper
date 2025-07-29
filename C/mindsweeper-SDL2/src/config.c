#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef WASM_BUILD
// WASM implementations - simplified but functional

static char* read_file_contents_wasm(const char *filename) {
    FILE *file = fopen(filename, "r");
    if (!file) {
        fprintf(stderr, "WASM: Failed to open file: %s\n", filename);
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

// Simple JSON parser for solution data - handles the specific structure we need
static char* find_json_string(const char *json, const char *key) {
    char search_pattern[128];
    snprintf(search_pattern, sizeof(search_pattern), "\"%s\":", key);
    
    char *pos = strstr(json, search_pattern);
    if (!pos) return NULL;
    
    pos += strlen(search_pattern);
    while (*pos == ' ' || *pos == '\t') pos++; // Skip whitespace
    
    if (*pos != '"') return NULL;
    pos++; // Skip opening quote
    
    char *end = strchr(pos, '"');
    if (!end) return NULL;
    
    size_t len = (size_t)(end - pos);
    char *result = malloc(len + 1);
    strncpy(result, pos, len);
    result[len] = '\0';
    
    return result;
}

static char* find_board_array(const char *json) {
    char *board_pos = strstr(json, "\"board\":");
    if (!board_pos) return NULL;
    
    board_pos += 8; // Skip "board":
    while (*board_pos == ' ' || *board_pos == '\t') board_pos++;
    
    if (*board_pos != '[') return NULL;
    
    // Find the matching closing bracket
    int bracket_count = 0;
    char *start = board_pos;
    char *pos = board_pos;
    
    do {
        if (*pos == '[') bracket_count++;
        else if (*pos == ']') bracket_count--;
        pos++;
    } while (bracket_count > 0 && *pos != '\0');
    
    size_t len = (size_t)(pos - start);
    char *result = malloc(len + 1);
    strncpy(result, start, len);
    result[len] = '\0';
    
    return result;
}

static bool parse_board_array(const char *board_json, SolutionData *solution) {
    // Count rows (number of '[' at start of lines)
    solution->rows = 0;
    const char *pos = board_json;
    while ((pos = strchr(pos, '[')) != NULL) {
        // Check if this is a row start (not the main array start)
        if (pos > board_json && *(pos-1) != ':') {
            solution->rows++;
        }
        pos++;
    }
    
    if (solution->rows == 0) return false;
    
    // Find first row to count columns
    pos = strchr(board_json, '[');
    if (!pos) return false;
    pos = strchr(pos + 1, '['); // Skip main array start, find first row
    if (!pos) return false;
    
    solution->cols = 0;
    pos++; // Skip '['
    while (*pos != ']' && *pos != '\0') {
        if (*pos >= '0' && *pos <= '9') {
            solution->cols++;
            // Skip to next number
            while (*pos != ',' && *pos != ']' && *pos != '\0') pos++;
            if (*pos == ',') pos++;
        } else {
            pos++;
        }
    }
    
    // Allocate 2D array
    solution->board = malloc(solution->rows * sizeof(unsigned*));
    for (unsigned i = 0; i < solution->rows; i++) {
        solution->board[i] = malloc(solution->cols * sizeof(unsigned));
    }
    
    // Parse all numbers
    pos = board_json;
    unsigned row = 0, col = 0;
    bool in_row = false;
    
    while (*pos != '\0' && row < solution->rows) {
        if (*pos == '[' && in_row) {
            // Start of a new row
            col = 0;
        } else if (*pos == '[' && !in_row) {
            // Check if this is a row start
            if (pos > board_json && *(pos-1) != ':') {
                in_row = true;
                col = 0;
            }
        } else if (*pos == ']' && in_row) {
            // End of row
            row++;
            in_row = false;
        } else if ((*pos >= '0' && *pos <= '9') && in_row && col < solution->cols) {
            // Parse number
            unsigned num = 0;
            while (*pos >= '0' && *pos <= '9') {
                num = num * 10 + (unsigned)(*pos - '0');
                pos++;
            }
            solution->board[row][col] = num;
            col++;
            continue; // Don't increment pos again
        }
        pos++;
    }
    
    return true;
}

static bool parse_wasm_entities(const char *content, GameConfig *config) {
    // Find entities array start
    char *entities_start = strstr(content, "\"entities\":");
    if (!entities_start) {
        printf("WASM: Could not find 'entities' key in config\n");
        return false;
    }
    
    entities_start = strchr(entities_start, '[');
    if (!entities_start) {
        printf("WASM: Could not find entities array start\n");
        return false;
    }
    
    // Find entities array end
    char *entities_end = entities_start;
    int bracket_count = 0;
    do {
        if (*entities_end == '[') bracket_count++;
        else if (*entities_end == ']') bracket_count--;
        entities_end++;
    } while (bracket_count > 0 && *entities_end != '\0');
    
    if (bracket_count != 0) {
        printf("WASM: Could not find entities array end\n");
        return false;
    }
    
    // Count entities by looking for "id": pattern within entities array
    unsigned entity_count = 0;
    char *pos = entities_start;
    while (pos < entities_end && (pos = strstr(pos, "\"id\":")) != NULL) {
        entity_count++;
        pos += 5; // Move past "id":
    }
    
    if (entity_count == 0) {
        printf("WASM: Found 0 entities\n");
        return false;
    }
    
    printf("WASM: Found %u entities in config\n", entity_count);
    config->entity_count = entity_count;
    config->entities = calloc(entity_count, sizeof(Entity));
    
    // Parse each entity by finding "id": patterns
    pos = entities_start;
    unsigned parsed_entities = 0;
    
    while (parsed_entities < entity_count && pos < entities_end && (pos = strstr(pos, "\"id\":")) != NULL) {
        // Find the start of this entity object (work backwards to find '{')
        char *entity_start = pos;
        while (entity_start > entities_start && *entity_start != '{') {
            entity_start--;
        }
        
        if (*entity_start != '{') {
            printf("WASM: Could not find entity start for entity %u\n", parsed_entities);
            pos += 5;
            continue;
        }
        
        // Find end of this entity
        int brace_count = 0;
        char *entity_end = entity_start;
        do {
            if (*entity_end == '{') brace_count++;
            else if (*entity_end == '}') brace_count--;
            entity_end++;
        } while (brace_count > 0 && *entity_end != '\0' && entity_end < entities_end);
        
        // Extract entity JSON
        size_t entity_len = (size_t)(entity_end - entity_start);
        char *entity_json = malloc(entity_len + 1);
        strncpy(entity_json, entity_start, entity_len);
        entity_json[entity_len] = '\0';
        
        Entity *e = &config->entities[parsed_entities];
        
        // Parse ID (we know this exists since we found it)
        char *id_pos = strstr(entity_json, "\"id\":");
        if (id_pos) {
            id_pos += 5;
            while (*id_pos == ' ' || *id_pos == '\t') id_pos++;
            e->id = (unsigned)atoi(id_pos);
        }
        
        // Parse name
        char *name = find_json_string(entity_json, "name");
        if (name) {
            strncpy(e->name, name, sizeof(e->name) - 1);
            e->name[sizeof(e->name) - 1] = '\0';
            free(name);
        }
        
        // Parse description
        char *desc = find_json_string(entity_json, "description");
        if (desc) {
            strncpy(e->description, desc, sizeof(e->description) - 1);
            e->description[sizeof(e->description) - 1] = '\0';
            free(desc);
        }
        
        // Parse level
        char *level_pos = strstr(entity_json, "\"level\":");
        if (level_pos) {
            level_pos += 8;
            while (*level_pos == ' ' || *level_pos == '\t') level_pos++;
            e->level = (unsigned)atoi(level_pos);
        }
        
        // Parse tags array
        e->tag_count = 0;
        e->is_enemy = false;
        e->is_item = false;
        
        char *tags_pos = strstr(entity_json, "\"tags\":");
        if (tags_pos) {
            tags_pos = strchr(tags_pos, '[');
            if (tags_pos) {
                char *tags_end = strchr(tags_pos, ']');
                if (tags_end) {
                    // Extract tags array content
                    size_t tags_len = (size_t)(tags_end - tags_pos + 1);
                    char *tags_array = malloc(tags_len + 1);
                    strncpy(tags_array, tags_pos, tags_len);
                    tags_array[tags_len] = '\0';
                    
                    // Parse individual tags
                    char *tag_start = tags_array;
                    while ((tag_start = strchr(tag_start, '"')) != NULL && e->tag_count < MAX_ENTITY_TAGS) {
                        tag_start++; // Skip opening quote
                        char *tag_end = strchr(tag_start, '"');
                        if (!tag_end) break;
                        
                        size_t tag_len = (size_t)(tag_end - tag_start);
                        if (tag_len > 0 && tag_len < MAX_TAG_LENGTH) {
                            strncpy(e->tags[e->tag_count], tag_start, tag_len);
                            e->tags[e->tag_count][tag_len] = '\0';
                            
                            // Set compatibility flags
                            if (strcmp(e->tags[e->tag_count], "enemy") == 0) {
                                e->is_enemy = true;
                            } else if (strcmp(e->tags[e->tag_count], "item") == 0) {
                                e->is_item = true;
                            }
                            
                            e->tag_count++;
                        }
                        
                        tag_start = tag_end + 1;
                    }
                    
                    free(tags_array);
                }
            }
        }
        
        // Parse sprite position (look for first x and y in revealed section)
        char *sprites_pos = strstr(entity_json, "\"sprites\":");
        if (sprites_pos) {
            char *revealed_pos = strstr(sprites_pos, "\"revealed\":");
            if (revealed_pos) {
                char *x_pos = strstr(revealed_pos, "\"x\":");
                char *y_pos = strstr(revealed_pos, "\"y\":");
                if (x_pos && y_pos && x_pos < (revealed_pos + 200) && y_pos < (revealed_pos + 200)) {
                    x_pos += 4;
                    while (*x_pos == ' ' || *x_pos == '\t') x_pos++;
                    e->sprite_pos.x = (unsigned)atoi(x_pos);
                    
                    y_pos += 4;
                    while (*y_pos == ' ' || *y_pos == '\t') y_pos++;
                    e->sprite_pos.y = (unsigned)atoi(y_pos);
                }
            }
        }
        
        // Parse entity transition (simplified)
        char *transition_pos = strstr(entity_json, "\"entity_transition\":");
        if (transition_pos) {
            char *cleared_pos = strstr(transition_pos, "\"on_cleared\":");
            if (cleared_pos) {
                char *entity_id_pos = strstr(cleared_pos, "\"entity_id\":");
                if (entity_id_pos) {
                    entity_id_pos += 12;
                    while (*entity_id_pos == ' ' || *entity_id_pos == '\t') entity_id_pos++;
                    e->transition.next_entity_id = (unsigned)atoi(entity_id_pos);
                }
                
                char *sound = find_json_string(cleared_pos, "sound");
                if (sound) {
                    strncpy(e->transition.sound, sound, sizeof(e->transition.sound) - 1);
                    e->transition.sound[sizeof(e->transition.sound) - 1] = '\0';
                    free(sound);
                }
            }
        } else {
            // Default: no transition (stays same entity)
            e->transition.next_entity_id = e->id;
        }
        
        printf("WASM: Parsed entity %u: ID=%u, Name='%s', Level=%u, Sprite=(%u,%u)\n", 
               parsed_entities, e->id, e->name, e->level, e->sprite_pos.x, e->sprite_pos.y);
        
        free(entity_json);
        parsed_entities++;
        pos += 5; // Move past current "id":
    }
    
    printf("WASM: Successfully parsed %u entities\n", parsed_entities);
    return parsed_entities > 0;
}

bool config_load(GameConfig *config, const char *config_file) {
    printf("WASM: Loading config from %s\n", config_file);
    
    char *content = read_file_contents_wasm(config_file);
    if (!content) {
        printf("WASM: Failed to read config file, using minimal defaults\n");
        // Minimal fallback
        config->rows = 10;
        config->cols = 14;
        config->starting_health = 8;
        config->starting_experience = 5;
        config->starting_level = 2;
        config->entity_count = 1;
        config->entities = calloc(1, sizeof(Entity));
        config->entities[0].id = 0;
        strcpy(config->entities[0].name, "Empty");
        config->entities[0].tag_count = 0;
        config->entities[0].is_enemy = false;
        config->entities[0].is_item = false;
        return true;
    }
    
    // Parse basic config values
    config->rows = 10;
    config->cols = 14;
    config->starting_health = 8;
    config->starting_experience = 5;
    config->starting_level = 2;
    
    // Parse game_state section
    char *game_state_pos = strstr(content, "\"game_state\":");
    if (game_state_pos) {
        char *health_pos = strstr(game_state_pos, "\"starting_max_health\":");
        if (health_pos) {
            health_pos += 22;
            while (*health_pos == ' ' || *health_pos == '\t') health_pos++;
            config->starting_health = (unsigned)atoi(health_pos);
        }
        
        char *exp_pos = strstr(game_state_pos, "\"starting_max_experience\":");
        if (exp_pos) {
            exp_pos += 26;
            while (*exp_pos == ' ' || *exp_pos == '\t') exp_pos++;
            config->starting_experience = (unsigned)atoi(exp_pos);
        }
        
        char *level_pos = strstr(game_state_pos, "\"starting_level\":");
        if (level_pos) {
            level_pos += 17;
            while (*level_pos == ' ' || *level_pos == '\t') level_pos++;
            config->starting_level = (unsigned)atoi(level_pos);
        }
    }
    
    // Parse entities
    if (!parse_wasm_entities(content, config)) {
        printf("WASM: Failed to parse entities, using fallback\n");
        config->entity_count = 2;
        config->entities = calloc(2, sizeof(Entity));
        
        // Entity 0: Empty
        config->entities[0].id = 0;
        strcpy(config->entities[0].name, "Empty");
        strcpy(config->entities[0].description, "An empty tile");
        config->entities[0].sprite_pos.x = 3;
        config->entities[0].sprite_pos.y = 4;
        config->entities[0].tag_count = 0;
        config->entities[0].is_enemy = false;
        config->entities[0].is_item = false;
        
        // Entity 1: Cave Rat
        config->entities[1].id = 1;
        strcpy(config->entities[1].name, "Cave Rat");
        strcpy(config->entities[1].description, "A small rodent");
        config->entities[1].level = 1;
        config->entities[1].is_enemy = true;
        config->entities[1].sprite_pos.x = 0;
        config->entities[1].sprite_pos.y = 0;
        config->entities[1].transition.next_entity_id = 0;
        strcpy(config->entities[1].transition.sound, "crystal");
        config->entities[1].tag_count = 1;
        strcpy(config->entities[1].tags[0], "enemy");
        config->entities[1].is_item = false;
    }
    
    free(content);
    
    printf("WASM: Loaded config with %u entities, starting level %u, health %u\n", 
           config->entity_count, config->starting_level, config->starting_health);
    
    return true;
}

bool config_load_solution(SolutionData *solution, const char *solution_file, unsigned solution_index) {
    printf("WASM: Loading solution from %s, index %u\n", solution_file, solution_index);
    
    char *content = read_file_contents_wasm(solution_file);
    if (!content) {
        printf("WASM: Failed to read solution file, using fallback\n");
        // Fallback to hardcoded solution
        solution->rows = 10;
        solution->cols = 14;
        strcpy(solution->uuid, "wasm-fallback-board");
        
        solution->board = malloc(solution->rows * sizeof(unsigned*));
        for (unsigned i = 0; i < solution->rows; i++) {
            solution->board[i] = malloc(solution->cols * sizeof(unsigned));
            for (unsigned j = 0; j < solution->cols; j++) {
                if ((i + j) % 7 == 0) {
                    solution->board[i][j] = 1; // Dragon
                } else {
                    solution->board[i][j] = 0; // Empty
                }
            }
        }
        return true;
    }
    
    // Find the requested solution in the JSON array
    char *solution_start = content;
    for (unsigned i = 0; i <= solution_index; i++) {
        solution_start = strchr(solution_start, '{');
        if (!solution_start) {
            printf("WASM: Solution index %u not found\n", solution_index);
            free(content);
            return false;
        }
        if (i < solution_index) {
            // Find the end of this solution and move to the next
            int brace_count = 0;
            char *pos = solution_start;
            do {
                if (*pos == '{') brace_count++;
                else if (*pos == '}') brace_count--;
                pos++;
            } while (brace_count > 0 && *pos != '\0');
            solution_start = pos;
        }
    }
    
    // Find the end of the current solution
    int brace_count = 0;
    char *solution_end = solution_start;
    do {
        if (*solution_end == '{') brace_count++;
        else if (*solution_end == '}') brace_count--;
        solution_end++;
    } while (brace_count > 0 && *solution_end != '\0');
    
    // Extract just this solution
    size_t sol_len = (size_t)(solution_end - solution_start);
    char *solution_json = malloc(sol_len + 1);
    strncpy(solution_json, solution_start, sol_len);
    solution_json[sol_len] = '\0';
    
    // Parse UUID
    char *uuid = find_json_string(solution_json, "uuid");
    if (uuid) {
        strncpy(solution->uuid, uuid, sizeof(solution->uuid) - 1);
        solution->uuid[sizeof(solution->uuid) - 1] = '\0';
        free(uuid);
    } else {
        strcpy(solution->uuid, "unknown-uuid");
    }
    
    // Parse board array
    char *board_json = find_board_array(solution_json);
    if (!board_json || !parse_board_array(board_json, solution)) {
        printf("WASM: Failed to parse board array\n");
        free(content);
        free(solution_json);
        if (board_json) free(board_json);
        return false;
    }
    
    printf("WASM: Successfully loaded solution %u: %s (%ux%u)\n", 
           solution_index, solution->uuid, solution->rows, solution->cols);
    
    free(content);
    free(solution_json);
    free(board_json);
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
                cJSON *revealed = cJSON_GetObjectItem(sprites, "revealed");
                if (revealed) {
                    e->sprite_pos.x = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(revealed, "x"));
                    e->sprite_pos.y = (unsigned)cJSON_GetNumberValue(cJSON_GetObjectItem(revealed, "y"));
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

unsigned config_count_solutions(const char *solution_file) {
#ifdef WASM_BUILD
    char *content = read_file_contents_wasm(solution_file);
    if (!content) {
        printf("WASM: Failed to read solution file for counting\n");
        return 0;
    }
    
    // Count occurrences of "uuid" to count solutions (each solution has one uuid)
    unsigned count = 0;
    char *pos = content;
    while ((pos = strstr(pos, "\"uuid\"")) != NULL) {
        count++;
        pos += 6; // Move past "uuid"
    }
    
    free(content);
    return count;
#else
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
#endif
}
