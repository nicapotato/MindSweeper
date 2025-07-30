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

    // Close SDL2_mixer
    Mix_CloseAudio();
    Mix_Quit();

    printf("Audio system cleaned up\n");
}

bool audio_load_sounds(AudioSystem *audio) {
    if (!audio) {
        return false;
    }

    // Load background music - use WAV format for consistency across platforms
    audio->background_music = Mix_LoadMUS("assets/audio/crystal_cave_track.wav");
    if (!audio->background_music) {
        fprintf(stderr, "Warning: Failed to load crystal_cave_track.wav: %s\n", Mix_GetError());
#ifdef WASM_BUILD
        // WASM fallback
        audio->background_music = Mix_LoadMUS("assets/audio/mc-lovin.wav");
        if (!audio->background_music) {
            fprintf(stderr, "Warning: Failed to load mc-lovin.wav as fallback: %s\n", Mix_GetError());
        } else {
            printf("Using mc-lovin.wav as background music fallback\n");
        }
#else
        // Native fallback to FLAC
        audio->background_music = Mix_LoadMUS("assets/audio/crystal_cave_track.flac");
        if (!audio->background_music) {
            fprintf(stderr, "Warning: Failed to load crystal_cave_track.flac as fallback: %s\n", Mix_GetError());
        } else {
            printf("Using crystal_cave_track.flac as background music fallback\n");
        }
#endif
    } else {
        printf("Background music loaded successfully (crystal_cave_track.wav)\n");
    }

    // Load click sound
    audio->click_sound = Mix_LoadWAV("assets/audio/click.wav");
    if (!audio->click_sound) {
        fprintf(stderr, "Warning: Failed to load click sound: %s\n", Mix_GetError());
        // Continue without click sound
    }

    // Load crystal sound (try multiple formats)
#ifdef WASM_BUILD
    // In WASM, use dedicated crystal WAV file
    audio->crystal_sound = Mix_LoadWAV("assets/audio/crystal.wav");
    if (!audio->crystal_sound) {
        fprintf(stderr, "Warning: Failed to load crystal.wav: %s\n", Mix_GetError());
        // Fallback to click.wav
        audio->crystal_sound = Mix_LoadWAV("assets/audio/click.wav");
        if (!audio->crystal_sound) {
            fprintf(stderr, "Warning: Failed to load click.wav as fallback: %s\n", Mix_GetError());
        } else {
            printf("Using click.wav as crystal sound fallback\n");
        }
    } else {
        printf("Crystal sound loaded successfully (WAV)\n");
    }
#else
    // In native builds, try MP3 first
    audio->crystal_sound = Mix_LoadWAV("assets/audio/crystal.mp3");
    if (!audio->crystal_sound) {
        fprintf(stderr, "Warning: Failed to load crystal.mp3: %s\n", Mix_GetError());
        // Try alternative formats
        audio->crystal_sound = Mix_LoadWAV("assets/audio/click.wav");
        if (!audio->crystal_sound) {
            fprintf(stderr, "Warning: Failed to load click.wav as fallback: %s\n", Mix_GetError());
            // Continue without crystal sound
        } else {
            printf("Using click.wav as crystal sound fallback\n");
        }
    }
#endif

    // Set initial volumes
    if (audio->click_sound) {
        Mix_VolumeChunk(audio->click_sound, audio->sound_volume);
    }
    if (audio->crystal_sound) {
        Mix_VolumeChunk(audio->crystal_sound, audio->sound_volume);
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
