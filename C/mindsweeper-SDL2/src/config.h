#ifndef CONFIG_H
#define CONFIG_H

#include "main.h"
#ifndef WASM_BUILD
#include <cjson/cJSON.h>
#endif

// Entity data structure
typedef struct {
    unsigned id;
    char name[MAX_ENTITY_NAME];
    char description[MAX_ENTITY_DESCRIPTION];
    unsigned level;
    unsigned count;
    bool is_enemy;
    bool is_item;
    bool blocks_input_on_reveal;
    char tags[MAX_ENTITY_TAGS][MAX_TAG_LENGTH];
    unsigned tag_count;
    struct {
        unsigned x;
        unsigned y;
    } sprite_pos;
    
    // Entity transition data
    struct {
        unsigned next_entity_id;  // Entity ID to transition to when cleared
        char sound[MAX_SOUND_NAME];           // Sound effect to play
    } transition;
} Entity;

// Game configuration
typedef struct {
    unsigned rows;
    unsigned cols;
    unsigned starting_health;
    unsigned starting_experience;
    unsigned starting_level;
    Entity *entities;
    unsigned entity_count;
} GameConfig;

// Solution data
typedef struct {
    char uuid[MAX_UUID_LENGTH];
    unsigned **board;  // 2D array of entity IDs
    unsigned rows;
    unsigned cols;
} SolutionData;

bool config_load(GameConfig *config, const char *config_file);
bool config_load_solution(SolutionData *solution, const char *solution_file, unsigned solution_index);
unsigned config_count_solutions(const char *solution_file);
void config_free(GameConfig *config);
void config_free_solution(SolutionData *solution);
Entity* config_get_entity(const GameConfig *config, unsigned entity_id);

#endif
