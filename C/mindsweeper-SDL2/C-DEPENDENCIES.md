# C Dependencies Documentation

## Overview
This document describes the external dependencies used in the MindSweeper project and how they are managed for different build targets.

## cJSON Library

### Purpose
The cJSON library is used for parsing JSON configuration files (`config_v2.json`) and solution files (`solutions_1_n_20.json`). It provides a lightweight, portable JSON parser written in C.

### Build Target Handling

#### Native Builds (gcc)
- **Source**: System-installed cJSON library via Homebrew
- **Location**: `/opt/homebrew/opt/cjson/`
- **Include Path**: `<cjson/cJSON.h>`
- **Linking**: `-lcjson` (links against system library)

#### WASM Builds (emcc)
- **Source**: Local cJSON source code
- **Location**: `cJSON-1.7.18/` (in project root)
- **Include Path**: `"cJSON.h"` (relative to cJSON-1.7.18 directory)
- **Linking**: Compiled from source into WASM binary

### Setup Process

#### 1. Download cJSON Source (for WASM builds)
```bash
curl -L https://github.com/DaveGamble/cJSON/archive/refs/tags/v1.7.18.tar.gz | tar -xz
```

This creates the `cJSON-1.7.18/` directory containing:
- `cJSON.c` - Main source file
- `cJSON.h` - Header file
- `LICENSE` - License information
- `README.md` - Documentation

#### 2. Makefile Configuration

The Makefile handles both build targets with conditional compilation:

```makefile
# Include paths
ifdef WASM
WASM_CFLAGS = -s USE_SDL=2 -s USE_SDL_IMAGE=2 -s USE_SDL_TTF=2 -s USE_SDL_MIXER=2 -IcJSON-1.7.18
else
# Native builds use system cJSON
CFLAGS += -I/opt/homebrew/include
LDLIBS += -L/opt/homebrew/lib -lcjson
endif

# Source files
SRCS = $(wildcard $(SRC_DIR)/*.c)
ifdef WASM
SRCS += cJSON-1.7.18/cJSON.c
endif

# Object files
OBJS = $(addprefix $(BUILD_DIR)/, $(notdir $(SRCS:.c=.o)))
ifdef WASM
OBJS += $(BUILD_DIR)/cJSON.o
endif

# Compilation rules
ifdef WASM
$(BUILD_DIR)/cJSON.o: cJSON-1.7.18/cJSON.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -MMD -MP -c $< -o $@
endif
```

#### 3. Source Code Configuration

The source files use conditional includes:

**In `src/config.h`:**
```c
#ifdef WASM_BUILD
#include "cJSON.h"
#else
#include <cjson/cJSON.h>
#endif
```

**In `src/config.c`:**
```c
#ifdef WASM_BUILD
#include "cJSON.h"
#else
#include <cjson/cJSON.h>
#endif
```

### Why This Approach?

1. **Native Builds**: Can use system libraries directly, which is simpler and more efficient
2. **WASM Builds**: Cannot link against native libraries, so source code must be compiled into the WASM binary
3. **Unified Codebase**: Both builds use the same cJSON API, eliminating the need for separate parsing logic

### Version Information
- **cJSON Version**: 1.7.18
- **License**: MIT License
- **Repository**: https://github.com/DaveGamble/cJSON

### Maintenance Notes

- The `cJSON-1.7.18/` directory is included in the project repository
- To update cJSON, download a new version and update the Makefile paths accordingly
- Both build targets should be tested after any cJSON updates

### Build Commands

```bash
# Native build (uses system cJSON)
make clean run

# WASM build (compiles cJSON from source)
make clean serve
```

## Other Dependencies

### SDL2 Libraries
- **SDL2**: Core graphics and input
- **SDL2_image**: Image loading (PNG support)
- **SDL2_ttf**: TrueType font rendering
- **SDL2_mixer**: Audio playback (WAV, OGG support)

These are handled automatically by emcc for WASM builds and should be installed via Homebrew for native builds:

```bash
brew install sdl2 sdl2_image sdl2_ttf sdl2_mixer
```
