#include "audio.h"
#include <stdio.h>
#include <stdlib.h>

bool audio_init(AudioSystem *audio) {
    if (!audio) {
        fprintf(stderr, "Error: NULL audio pointer in audio_init\n");
        return false;
    }

    // Initialize SDL2_mixer with fallback support
    int mix_flags = MIX_INIT_MP3 | MIX_INIT_FLAC | MIX_INIT_OGG;
    int mix_init_result = Mix_Init(mix_flags);
    
    // Check what formats are actually available
    if (mix_init_result == 0) {
        fprintf(stderr, "Error initializing SDL2_mixer: %s\n", Mix_GetError());
        return false;
    }
    
    // Log which formats are available
    if (mix_init_result & MIX_INIT_MP3) printf("MP3 support available\n");
    if (mix_init_result & MIX_INIT_FLAC) printf("FLAC support available\n");
    if (mix_init_result & MIX_INIT_OGG) printf("OGG support available\n");
    
    // Don't fail if some formats are missing - just warn
    if ((mix_init_result & mix_flags) != mix_flags) {
        fprintf(stderr, "Warning: Some audio formats not available. Available: %d, Requested: %d\n", 
                mix_init_result, mix_flags);
    }

    // Open audio device
    if (Mix_OpenAudio(44100, MIX_DEFAULT_FORMAT, 2, 2048) < 0) {
        fprintf(stderr, "Error opening audio device: %s\n", Mix_GetError());
        return false;
    }

    // Initialize audio system structure
    audio->background_music = NULL;
    audio->click_sound = NULL;
    audio->crystal_sound = NULL;
    audio->level_up_sound = NULL;      // New sound
    audio->mclovin_sound = NULL;       // New sound
    audio->death_sound = NULL;         // New sound
    audio->victory_sound = NULL;       // New sound
    audio->music_enabled = true;
    audio->sound_enabled = true;
    audio->music_volume = MIX_MAX_VOLUME / 4;  // 50% volume
    audio->sound_volume = MIX_MAX_VOLUME;      // 100% volume

    // Load audio files (don't fail if audio loading fails)
    if (!audio_load_sounds(audio)) {
        fprintf(stderr, "Warning: Failed to load some audio files, continuing without audio\n");
        // Don't return false - continue without audio
    }

    printf("Audio system initialized successfully\n");
    return true;
}

void audio_cleanup(AudioSystem *audio) {
    if (!audio) {
        return;
    }

    // Stop and free music
    if (audio->background_music) {
        Mix_HaltMusic();
        Mix_FreeMusic(audio->background_music);
        audio->background_music = NULL;
    }

    // Free sound chunks
    if (audio->click_sound) {
        Mix_FreeChunk(audio->click_sound);
        audio->click_sound = NULL;
    }

    if (audio->crystal_sound) {
        Mix_FreeChunk(audio->crystal_sound);
        audio->crystal_sound = NULL;
    }

    if (audio->level_up_sound) {
        Mix_FreeChunk(audio->level_up_sound);
        audio->level_up_sound = NULL;
    }

    if (audio->mclovin_sound) {
        Mix_FreeChunk(audio->mclovin_sound);
        audio->mclovin_sound = NULL;
    }

    if (audio->death_sound) {
        Mix_FreeChunk(audio->death_sound);
        audio->death_sound = NULL;
    }

    if (audio->victory_sound) {
        Mix_FreeChunk(audio->victory_sound);
        audio->victory_sound = NULL;
    }

    // Close SDL2_mixer
    Mix_CloseAudio();
    Mix_Quit();

    printf("Audio system cleaned up\n");
}

bool audio_load_sounds(AudioSystem *audio) {
    if (!audio) {
        return false;
    }

    // Load background music
    audio->background_music = Mix_LoadMUS("assets/audio/crystal_cave_track.mp3");
    if (!audio->background_music) {
        fprintf(stderr, "Warning: Failed to load crystal_cave_track.mp3: %s\n", Mix_GetError());
    } else {
        printf("Background music loaded successfully (crystal_cave_track.mp3)\n");
    }

    // Load click sound
    audio->click_sound = Mix_LoadWAV("assets/audio/click.wav");
    if (!audio->click_sound) {
        fprintf(stderr, "Warning: Failed to load click sound: %s\n", Mix_GetError());
        // Continue without click sound
    }

    // Load crystal sound
    audio->crystal_sound = Mix_LoadWAV("assets/audio/crystal.mp3");
    if (!audio->crystal_sound) {
        fprintf(stderr, "Warning: Failed to load crystal.wav: %s\n", Mix_GetError());
    } else {
        printf("Crystal sound loaded successfully (WAV)\n");
    }

    // Load level up sound
    audio->level_up_sound = Mix_LoadWAV("assets/audio/level-up.mp3");
    if (!audio->level_up_sound) {
        fprintf(stderr, "Warning: Failed to load level-up.mp3: %s\n", Mix_GetError());
    } else {
        printf("Level up sound loaded successfully (MP3)\n");
    }

    // Load mclovin sound
    audio->mclovin_sound = Mix_LoadWAV("assets/audio/mclovin.mp3");
    if (!audio->mclovin_sound) {
        fprintf(stderr, "Warning: Failed to load mclovin.mp3: %s\n", Mix_GetError());
    } else {
        printf("McLovin sound loaded successfully (MP3)\n");
    }

    // Load death sound
    audio->death_sound = Mix_LoadWAV("assets/audio/mleb-1.mp3");
    if (!audio->death_sound) {
        fprintf(stderr, "Warning: Failed to load mleb-1.mp3: %s\n", Mix_GetError());
    } else {
        printf("Death sound loaded successfully (MP3)\n");
    }

    // Load victory sound
    audio->victory_sound = Mix_LoadWAV("assets/audio/mleb-2.mp3");
    if (!audio->victory_sound) {
        fprintf(stderr, "Warning: Failed to load mleb-2.mp3: %s\n", Mix_GetError());
    } else {
        printf("Victory sound loaded successfully (MP3)\n");
    }

    // Set initial volumes
    if (audio->click_sound) {
        Mix_VolumeChunk(audio->click_sound, audio->sound_volume);
    }
    if (audio->crystal_sound) {
        Mix_VolumeChunk(audio->crystal_sound, audio->sound_volume);
    }
    if (audio->level_up_sound) {
        Mix_VolumeChunk(audio->level_up_sound, audio->sound_volume);
    }
    if (audio->mclovin_sound) {
        Mix_VolumeChunk(audio->mclovin_sound, audio->sound_volume);
    }
    if (audio->death_sound) {
        Mix_VolumeChunk(audio->death_sound, audio->sound_volume);
    }
    if (audio->victory_sound) {
        Mix_VolumeChunk(audio->victory_sound, audio->sound_volume);
    }

    printf("Audio loading completed\n");
    return true;
}

void audio_play_click_sound(AudioSystem *audio) {
    if (!audio || !audio->sound_enabled || !audio->click_sound) {
        return;
    }

    Mix_PlayChannel(-1, audio->click_sound, 0);
}

void audio_play_crystal_sound(AudioSystem *audio) {
    if (!audio || !audio->sound_enabled || !audio->crystal_sound) {
        return;
    }

    Mix_PlayChannel(-1, audio->crystal_sound, 0);
}

void audio_play_background_music(AudioSystem *audio) {
    if (!audio || !audio->music_enabled || !audio->background_music) {
        return;
    }

    // Check if music is already playing
    if (Mix_PlayingMusic()) {
        return;
    }

    // Play music in loop
    if (Mix_PlayMusic(audio->background_music, -1) == -1) {
        fprintf(stderr, "Error playing background music: %s\n", Mix_GetError());
        return;
    }

    // Set music volume
    Mix_VolumeMusic(audio->music_volume);
    printf("Background music started\n");
}

void audio_stop_background_music(AudioSystem *audio) {
    (void)audio; // Unused parameter
    Mix_HaltMusic();
}

void audio_pause_background_music(AudioSystem *audio) {
    (void)audio; // Unused parameter
    Mix_PauseMusic();
}

void audio_resume_background_music(AudioSystem *audio) {
    (void)audio; // Unused parameter
    Mix_ResumeMusic();
}

void audio_set_music_volume(AudioSystem *audio, int volume) {
    if (!audio) {
        return;
    }

    // Clamp volume to valid range
    if (volume < 0) volume = 0;
    if (volume > MIX_MAX_VOLUME) volume = MIX_MAX_VOLUME;

    audio->music_volume = volume;
    Mix_VolumeMusic(volume);
}

void audio_set_sound_volume(AudioSystem *audio, int volume) {
    if (!audio) {
        return;
    }

    // Clamp volume to valid range
    if (volume < 0) volume = 0;
    if (volume > MIX_MAX_VOLUME) volume = MIX_MAX_VOLUME;

    audio->sound_volume = volume;

    // Update chunk volumes
    if (audio->click_sound) {
        Mix_VolumeChunk(audio->click_sound, volume);
    }
    if (audio->crystal_sound) {
        Mix_VolumeChunk(audio->crystal_sound, volume);
    }
    if (audio->level_up_sound) {
        Mix_VolumeChunk(audio->level_up_sound, volume);
    }
    if (audio->mclovin_sound) {
        Mix_VolumeChunk(audio->mclovin_sound, volume);
    }
    if (audio->death_sound) {
        Mix_VolumeChunk(audio->death_sound, volume);
    }
    if (audio->victory_sound) {
        Mix_VolumeChunk(audio->victory_sound, volume);
    }
}

void audio_toggle_music(AudioSystem *audio) {
    if (!audio) {
        return;
    }

    audio->music_enabled = !audio->music_enabled;
    
    if (audio->music_enabled) {
        if (!Mix_PlayingMusic()) {
            audio_play_background_music(audio);
        }
        printf("Music enabled\n");
    } else {
        audio_stop_background_music(audio);
        printf("Music disabled\n");
    }
}

void audio_toggle_sound(AudioSystem *audio) {
    if (!audio) {
        return;
    }

    audio->sound_enabled = !audio->sound_enabled;
    printf("Sound effects %s\n", audio->sound_enabled ? "enabled" : "disabled");
}

void audio_play_level_up_sound(AudioSystem *audio) {
    if (!audio || !audio->sound_enabled || !audio->level_up_sound) {
        return;
    }

    Mix_PlayChannel(-1, audio->level_up_sound, 0);
}

void audio_play_mclovin_sound(AudioSystem *audio) {
    if (!audio || !audio->sound_enabled || !audio->mclovin_sound) {
        return;
    }

    Mix_PlayChannel(-1, audio->mclovin_sound, 0);
}

void audio_play_death_sound(AudioSystem *audio) {
    if (!audio || !audio->sound_enabled || !audio->death_sound) {
        return;
    }

    Mix_PlayChannel(-1, audio->death_sound, 0);
}

void audio_play_victory_sound(AudioSystem *audio) {
    if (!audio || !audio->sound_enabled || !audio->victory_sound) {
        return;
    }

    Mix_PlayChannel(-1, audio->victory_sound, 0);
} 
