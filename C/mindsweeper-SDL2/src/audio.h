#ifndef AUDIO_H
#define AUDIO_H

#include "main.h"
#include <SDL2/SDL_mixer.h>

// Audio system structure
typedef struct {
    Mix_Music *background_music;
    Mix_Chunk *click_sound;
    Mix_Chunk *crystal_sound;
    Mix_Chunk *level_up_sound;      // New: level-up.mp3
    Mix_Chunk *mclovin_sound;       // New: mclovin.mp3
    Mix_Chunk *death_sound;         // New: mleb-1.mp3
    Mix_Chunk *victory_sound;       // New: mleb-2.mp3
    bool music_enabled;
    bool sound_enabled;
    int music_volume;
    int sound_volume;
} AudioSystem;

// Audio system functions
bool audio_init(AudioSystem *audio);
void audio_cleanup(AudioSystem *audio);
bool audio_load_sounds(AudioSystem *audio);
void audio_play_click_sound(AudioSystem *audio);
void audio_play_crystal_sound(AudioSystem *audio);
void audio_play_level_up_sound(AudioSystem *audio);     // New function
void audio_play_mclovin_sound(AudioSystem *audio);      // New function
void audio_play_death_sound(AudioSystem *audio);        // New function
void audio_play_victory_sound(AudioSystem *audio);      // New function
void audio_play_background_music(AudioSystem *audio);
void audio_stop_background_music(AudioSystem *audio);
void audio_pause_background_music(AudioSystem *audio);
void audio_resume_background_music(AudioSystem *audio);
void audio_set_music_volume(AudioSystem *audio, int volume);
void audio_set_sound_volume(AudioSystem *audio, int volume);
void audio_toggle_music(AudioSystem *audio);
void audio_toggle_sound(AudioSystem *audio);

#endif // AUDIO_H 
