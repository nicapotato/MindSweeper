# MindSweeper Admin Panel Guide

## Overview

The MindSweeper C port now includes a comprehensive Admin Panel with three main features:
- **GOD Mode**: Set player level to 1000 with maximum health
- **Reveal All Tiles**: Instantly reveal all hidden tiles on the board
- **Load Map**: Switch between different solution maps

## Board Dimensions

✅ **Confirmed**: Board is properly set to **10 rows × 14 columns** throughout the codebase:
- `game.c`: `g->rows = 10; g->columns = 14;`
- `config.c`: Hardcoded values for WASM build
- `config_v2.json`: JSON configuration specifies 10×14

## Admin Panel Controls

### Keyboard Shortcuts

| Key | Function | Description |
|-----|----------|-------------|
| **F1** | Toggle Admin Panel | Show/hide admin panel with current status |
| **F2** | GOD Mode | Toggle between normal player (level 1) and GOD mode (level 1000) |
| **F3** | Reveal All Tiles | Instantly reveal all hidden tiles on the board |
| **F4** | Load Next Map | Load the next solution from the solutions file |
| **F5** | Load Previous Map | Load the previous solution (if not already at map 0) |
| **F12** | Show Help | Display admin panel help in console |

### Regular Game Controls (Still Available)

| Key | Function |
|-----|----------|
| **Space** | Reset game |
| **Z** | Toggle scale (1x/2x) |
| **1/2** | Switch themes |
| **Q/W/E/R/T** | Change board size (Tiny/Small/Medium/Large/Huge) |

## Player Stats System

### New Player Tracking
- **Level**: Starting at 1, can go up to 1000 in GOD mode
- **Health**: Calculated as `8 + (level × 2)`, max 9999 in GOD mode
- **Experience**: Simple progression system (5 XP per level)
- **Max Health**: Auto-calculated based on level

### Health Calculation
```c
unsigned game_calculate_max_health(unsigned level) {
    if (level >= 1000) {
        return 9999; // GOD mode health
    }
    return 8 + (level * 2); // Base health + 2 per level
}
```

## Admin Features Details

### 1. GOD Mode (F2)
- **Activation**: Sets player level to 1000
- **Effects**: 
  - Health becomes 9999
  - Face shows winning expression
  - Experience reset to 0
  - Console shows: "🔱 GOD MODE ACTIVATED!"
- **Deactivation**: Resets player to level 1
- **Toggle**: Can be turned on/off repeatedly

### 2. Reveal All Tiles (F3)
- **Function**: Instantly reveals all hidden tiles
- **Implementation**: 
  - No animations (immediate reveal)
  - Updates both logical state and visual display
  - Clears any ongoing tile animations
  - Console shows: "🔍 REVEALING ALL TILES..."
- **Board Integration**: Uses `board_reveal_all_tiles()` function

### 3. Load Map (F4/F5)
- **Next Map (F4)**: Loads solution index + 1
- **Previous Map (F5)**: Loads solution index - 1 (minimum 0)
- **Features**:
  - Loads from `latest-s-v0_0_9.json` solutions file
  - Automatically resets game state for new map
  - Tracks current solution index
  - Console feedback: "📍 Loading map X..." / "✅ Successfully loaded map X"
- **Error Handling**: Shows "❌ Failed to load map X" if loading fails

## Technical Implementation

### Code Structure
```c
// Player stats in game struct
typedef struct {
    unsigned level;
    unsigned health;
    unsigned max_health;
    unsigned experience;
    unsigned exp_to_next_level;
} PlayerStats;

// Admin panel state
typedef struct {
    bool god_mode_enabled;
    bool admin_panel_visible;
    unsigned current_solution_index;
    unsigned total_solutions;
} AdminPanel;
```

### Key Functions
- `game_init_player_stats()`: Initialize player stats
- `game_admin_god_mode()`: Toggle GOD mode
- `game_admin_reveal_all()`: Reveal all tiles
- `game_admin_load_map()`: Load specific solution
- `board_reveal_all_tiles()`: Board-level reveal function

## Console Output Examples

### Admin Panel Activation (F1)
```
=== ADMIN PANEL ACTIVATED ===
Admin Panel Controls:
  F1  - Toggle Admin Panel
  F2  - Toggle GOD Mode (Level 1000)
  F3  - Reveal All Tiles
  F4  - Load Next Map
  F5  - Load Previous Map
  F12 - Print this help
Current Player Stats: Level 1, Health 10/10
GOD Mode: DISABLED
Current Map: 0
```

### GOD Mode Activation (F2)
```
🔱 GOD MODE ACTIVATED! Player level set to 1000 with 9999 health!
```

### Reveal All Tiles (F3)
```
🔍 REVEALING ALL TILES...
Revealing all 10x14 tiles...
All tiles revealed!
```

### Map Loading (F4)
```
📍 Loading map 1...
Loaded solution 1: 7c8f3d2a-4b5e-6f1g-9h8i-7j6k5l4m3n2o (10x14)
✅ Successfully loaded map 1
```

## Build Support

### Native Build
- **Full Features**: All admin panel features work
- **JSON Support**: Loads real configuration and solution data
- **Dependencies**: Requires SDL2 and cJSON libraries

### WASM Build  
- **Compatible**: All admin panel features work
- **Fallback**: Uses hardcoded entities when JSON unavailable
- **Limitations**: Limited to hardcoded solution patterns

## Usage Examples

1. **Quick GOD Mode**: Press F2 to become invincible
2. **Explore All Content**: Press F3 to see all entities at once
3. **Switch Maps**: Use F4/F5 to browse different cave layouts
4. **Debug Session**: F1 to see current status, F12 for help

## Integration Notes

- **No Conflicts**: Admin panel doesn't interfere with normal gameplay
- **Animation System**: Compatible with existing tile animations
- **State Management**: Properly tracks both player and admin states
- **Memory Safe**: All allocations properly managed
- **Cross-Platform**: Works on both native and WASM builds

---

**Status**: ✅ **COMPLETE** - All admin panel features implemented and tested successfully. 