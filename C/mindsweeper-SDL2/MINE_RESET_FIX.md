# Mine Reset Fix

## Issue Description

When the space key was pressed to reset the game, mines would appear to have 0 threat level (showing as harmless) but would still deal their full damage when clicked. This created a confusing and inconsistent user experience.

## Root Cause

The issue was in the `board_load_solution()` function in `src/board.c`. When a new solution was loaded during game reset, the function would:

1. ✅ Set new entity IDs from the solution
2. ✅ Set all tiles to hidden state
3. ❌ **NOT reset the `dead_entities` array**

This meant that entities that were marked as dead in the previous game remained marked as dead in the new game. The threat level calculation correctly treated dead entities as level 0 (no threat), but when clicked, the entities still had their original level and dealt damage.

## The Fix

Modified `board_load_solution()` in `src/board.c` to properly reset the dead entities array:

```c
// Load entity IDs from solution
printf("Loading solution and resetting dead entities...\n");
for (unsigned r = 0; r < b->rows; r++) {
    for (unsigned c = 0; c < b->columns; c++) {
        unsigned entity_id = solution.board[r][c];
        board_set_entity_id(b, r, c, entity_id);
        
        // All tiles start hidden
        board_set_tile_state(b, r, c, TILE_HIDDEN);
        
        // Reset dead entity status for new game
        size_t index = (size_t)(r * b->columns + c);
        b->dead_entities[index] = false;
    }
}
printf("Solution loaded - all dead entities reset to false\n");
```

## Files Modified

- `src/board.c`: Added dead entity reset in `board_load_solution()`

## Testing

The fix ensures that:
1. When space key is pressed, all dead entities are reset to `false`
2. Threat levels are recalculated correctly for the new game
3. Mines show their proper threat levels
4. Clicking mines deals the correct damage

## Verification

To test the fix:
1. Start the game
2. Click on a mine to see it deals damage
3. Press SPACE to reset the game
4. Check that the same mine position shows the correct threat level
5. Click on the mine again - it should deal damage again

The debug output will show "Loading solution and resetting dead entities..." and "Solution loaded - all dead entities reset to false" when the space key is pressed. 