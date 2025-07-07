import { test, expect } from '@playwright/test';

test.describe('Mindsweeper Basic Functionality', () => {
  let consoleLogs = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleLogs = [];
    consoleErrors = [];

    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        consoleErrors.push(text);
      } else {
        consoleLogs.push(text);
      }
      
      console.log(`[${type.toUpperCase()}] ${text}`);
    });

    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
      console.log(`[PAGE ERROR] ${error.message}`);
    });
  });

  test('Game loads and initializes successfully', async ({ page }) => {
    console.log('\n=== STARTING BASIC GAME LOAD TEST ===');
    
    await page.goto('http://localhost:8080');
    
    // Wait for critical game components to load
    await page.waitForFunction(() => {
      return window.gameConfig && 
             window.currentBoard && 
             window.gameState &&
             window.playerStats;
    }, { timeout: 10000 });

    console.log('\n=== VERIFYING CORE INITIALIZATION ===');

    // 1. Verify critical log messages appeared
    const criticalLogs = [
      'Page loaded, starting game initialization',
      'Config loaded:',
      'Sprite sheets loaded',
      'Game initialization complete!'
    ];

    for (const expectedLog of criticalLogs) {
      const logFound = consoleLogs.some(log => log.includes(expectedLog));
      expect(logFound, `Critical log message not found: "${expectedLog}"`).toBe(true);
    }

    // 2. Verify game configuration
    const gameConfig = await page.evaluate(() => window.gameConfig);
    expect(gameConfig.name).toBe('MindSweeper');
    expect(gameConfig.version).toBe('0.0.9'); // Updated to match current config version

    // 3. Verify board was created
    const boardData = await page.evaluate(() => ({
      boardSize: window.currentBoard?.length || 0,
      boardCols: window.currentBoard?.[0]?.length || 0,
      gameStateSize: window.gameState?.length || 0
    }));

    expect(boardData.boardSize).toBeGreaterThan(0);
    expect(boardData.boardCols).toBeGreaterThan(0);
    expect(boardData.gameStateSize).toBe(boardData.boardSize);

    // 4. Verify player stats
    const playerStats = await page.evaluate(() => window.playerStats);
    expect(playerStats.level).toBeGreaterThan(0);
    expect(playerStats.health).toBeGreaterThan(0);
    expect(playerStats.maxHealth).toBeGreaterThan(0);

    // 5. Verify UI elements exist
    await expect(page.locator('#game-board')).toBeVisible();
    await expect(page.locator('#player-stats')).toBeVisible();

    // 6. Verify tiles were created
    const tilesCount = await page.locator('#game-board td').count();
    expect(tilesCount).toBe(boardData.boardSize * boardData.boardCols);

    // 7. Verify initial skyglass revealed (this appears in logs)
    const skyglassLogs = consoleLogs.filter(log => 
      log.includes('Revealing random skyglass') || log.includes('Selected random Skyglass')
    );
    expect(skyglassLogs.length).toBeGreaterThan(0);

    console.log('\n=== TEST SUCCESS SUMMARY ===');
    console.log(`Game: ${gameConfig.name} v${gameConfig.version}`);
    console.log(`Board: ${boardData.boardSize}x${boardData.boardCols} (${tilesCount} tiles)`);
    console.log(`Player: Level ${playerStats.level}, HP ${playerStats.health}/${playerStats.maxHealth}`);
    console.log(`Console logs: ${consoleLogs.length}, Errors: ${consoleErrors.length}`);
  });

  test('Basic game interaction works', async ({ page }) => {
    console.log('\n=== TESTING BASIC INTERACTION ===');
    
    await page.goto('http://localhost:8080');
    
    // Wait for game to load
    await page.waitForFunction(() => {
      return window.gameConfig && window.currentBoard && window.gameState;
    }, { timeout: 10000 });

    // Get initial state
    const initialStats = await page.evaluate(() => ({
      health: window.playerStats.health,
      experience: window.playerStats.experience
    }));

    // Try clicking a revealed tile (should be safe from the skyglass reveal)
    const revealedTiles = await page.evaluate(() => {
      const tiles = [];
      for (let row = 0; row < window.gameState.length; row++) {
        for (let col = 0; col < window.gameState[row].length; col++) {
          if (window.gameState[row][col] === 'revealed') { // REVEALED state
            tiles.push({row, col});
          }
        }
      }
      return tiles;
    });

    if (revealedTiles.length > 0) {
      const tile = revealedTiles[0];
      console.log(`Clicking revealed tile at [${tile.row}, ${tile.col}]`);
      
      const tileElement = page.locator(`td[data-row="${tile.row}"][data-col="${tile.col}"]`);
      await tileElement.click();
      
      // Wait a bit for any processing
      await page.waitForTimeout(500);
      
      console.log('Tile click completed successfully');
    }

    // Verify game is still functional
    const finalCheck = await page.evaluate(() => {
      return !!(window.gameConfig && window.currentBoard && window.gameState);
    });
    expect(finalCheck).toBe(true);

    console.log('Basic interaction test completed successfully');
  });

  test.afterEach(() => {
    console.log('\n=== LOG SUMMARY ===');
    console.log(`Total logs: ${consoleLogs.length}, Errors: ${consoleErrors.length}`);
    
    // Filter out expected audio errors (missing assets)
    const nonAudioErrors = consoleErrors.filter(error => 
      !error.includes('audio') && !error.includes('sound') && !error.includes('Failed to load resource')
    );
    
    if (nonAudioErrors.length > 0) {
      console.log('\nUnexpected errors:');
      nonAudioErrors.forEach(error => console.log(`  - ${error}`));
    }
  });
}); 