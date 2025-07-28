#ifndef CONFIG_H
#define CONFIG_H

#include "main.h"
#ifndef WASM_BUILD
#include <cjson/cJSON.h>
#endif

// Entity data structure
typedef struct {
    unsigned id;
    char name[64];
    char description[256];
    unsigned level;
    unsigned count;
    bool is_enemy;
    bool is_treasure;
    bool blocks_input_on_reveal;
    struct {
        unsigned x;
        unsigned y;
    } sprite_pos;
    
    // Entity transition data
    struct {
        unsigned next_entity_id;  // Entity ID to transition to when cleared
        char sound[32];           // Sound effect to play
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
    char uuid[64];
    unsigned **board;  // 2D array of entity IDs
    unsigned rows;
    unsigned cols;
} SolutionData;

bool config_load(GameConfig *config, const char *config_file);
bool config_load_solution(SolutionData *solution, const char *solution_file, unsigned solution_index);
void config_free(GameConfig *config);
void config_free_solution(SolutionData *solution);
Entity* config_get_entity(const GameConfig *config, unsigned entity_id);

#endif
