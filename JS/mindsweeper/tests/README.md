# Mindsweeper E2E Testing with Playwright

This directory contains end-to-end tests for the Mindsweeper game using Playwright.

## Quick Start

```bash
# First time setup
make setup-tests

# Run basic game load test
make test-load

# Run all tests
make test

# Run tests with browser visible (for debugging)
make test-headed
```

## Test Structure

### Core Tests
- `game-load.spec.js` - Verifies game initialization, tile data, and basic functionality

### Test Utilities
- `fixtures/test-helpers.js` - Shared utilities for game state inspection and verification

## Available Make Commands

| Command | Description |
|---------|-------------|
| `make setup-tests` | Install dependencies and browsers (run once) |
| `make test-load` | Run basic game loading test |
| `make test` | Run all tests |
| `make test-headed` | Run tests with browser visible |
| `make test-debug` | Run tests in debug mode |
| `make serve` | Start local server on port 8080 |
| `make clean-test` | Clean test results and reports |

## Test Features

### Console Log Monitoring
- All console messages are captured and printed to test output
- Critical errors fail the tests
- Log patterns verify proper game initialization

### Game State Verification
- Validates tile data structure and properties
- Checks player stats initialization
- Verifies UI element visibility
- Ensures board state consistency

### Error Handling
- Tests resilience to missing assets
- Captures network failures
- Validates error recovery mechanisms

## Writing New Tests

Use the `GameTestHelpers` class for common operations:

```javascript
import { GameTestHelpers } from './fixtures/test-helpers.js';

test('My new test', async ({ page }) => {
  const logs = GameTestHelpers.setupConsoleCapture(page);
  
  await page.goto('http://localhost:8080');
  await GameTestHelpers.waitForGameLoad(page);
  
  const snapshot = await GameTestHelpers.getGameSnapshot(page);
  // Your test logic here
  
  GameTestHelpers.printTestSummary('My Test', snapshot, logs);
});
```

## Debugging Tips

1. **Visual Debugging**: Use `make test-headed` to see browser interactions
2. **Step Through**: Use `make test-debug` for interactive debugging
3. **Console Logs**: All game console messages are printed to test output
4. **Screenshots**: Failed tests automatically capture screenshots
5. **Game State**: Use `GameTestHelpers.getGameSnapshot()` to inspect full game state

## Test Philosophy

These tests focus on:
- **Functional Verification**: Ensuring game mechanics work correctly
- **State Consistency**: Validating internal game state matches UI
- **Error Resilience**: Testing graceful handling of edge cases
- **Integration**: Verifying all systems work together properly

## Continuous Integration

Tests are designed to be deterministic and suitable for CI environments:
- Headless by default
- Timeout handling for slow loads
- Comprehensive error capture
- Clear pass/fail criteria 