import { test, expect } from '@playwright/test';

test.describe('Mindsweeper Game Loading', () => {
  let consoleLogs = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Clear log arrays
    consoleLogs = [];
    consoleErrors = [];

    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        consoleErrors.push(text);
      } else {
        consoleLogs.push(text);
      }
      
      // Print to test output for human/AI review
      console.log(`[${type.toUpperCase()}] ${text}`);
    });

    // Capture page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    // Capture request failures
    page.on('requestfailed', request => {
      consoleErrors.push(`Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
      console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('Game loads successfully with valid tile data', async ({ page }) => {
    console.log('\n=== STARTING GAME LOAD TEST ===');
    
    // Navigate to game
    await page.goto('http://localhost:8080');
    
    // Wait for initial loading to complete
    await page.waitForFunction(() => {
      return window.gameConfig && 
             window.currentBoard && 
             window.currentBoard.length > 0 &&
             document.getElementById('game-board') &&
             document.getElementById('game-board').children.length > 0;
    }, { timeout: 15000 });

    console.log('\n=== VERIFYING GAME STATE ===');

    // Verify critical log messages appeared
    const expectedLogs = [
      'Page loaded, starting game initialization...',
      'Setting up event listeners...',
      'Base event listeners setup complete',
      'Initializing game...',
      'Config loaded:',
      'Sprite sheets loaded',
      'Game config and board creation complete',
      'Game initialization complete!',
      'Initialization finalized'
    ];

    for (const expectedLog of expectedLogs) {
      const logFound = consoleLogs.some(log => log.includes(expectedLog));
      expect(logFound, `Expected log message not found: "${expectedLog}"`).toBe(true);
    }

    // Verify no critical errors occurred
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Failed to load') || 
      error.includes('Game initialization failed') ||
      error.includes('HTTP error')
    );
    expect(criticalErrors, `Critical errors found: ${criticalErrors.join(', ')}`).toHaveLength(0);

    // Verify game configuration loaded
    const gameConfig = await page.evaluate(() => window.gameConfig);
    expect(gameConfig).toBeTruthy();
    expect(gameConfig.name).toBe('MindSweeper');
    expect(gameConfig.version).toBeTruthy();

    // Verify board was created with tile data
    const boardData = await page.evaluate(() => ({
      currentBoard: window.currentBoard,
      gameState: window.gameState,
      boardSize: {
        rows: window.currentBoard?.length || 0,
        cols: window.currentBoard?.[0]?.length || 0
      }
    }));

    expect(boardData.currentBoard).toBeTruthy();
    expect(boardData.currentBoard.length).toBeGreaterThan(0);
    expect(boardData.gameState).toBeTruthy();
    expect(boardData.gameState.length).toBe(boardData.currentBoard.length);

    // Verify tiles have proper data attributes
    const tilesCount = await page.locator('#game-board td').count();
    expect(tilesCount).toBeGreaterThan(0);
    expect(tilesCount).toBe(boardData.boardSize.rows * boardData.boardSize.cols);

    // Verify first tile has required data attributes
    const firstTile = page.locator('#game-board td').first();
    await expect(firstTile).toHaveAttribute('data-tile-data');
    await expect(firstTile).toHaveAttribute('data-row');
    await expect(firstTile).toHaveAttribute('data-col');
    await expect(firstTile).toHaveAttribute('data-tile-type');

    // Verify tile data is valid JSON with required properties
    const firstTileData = await firstTile.getAttribute('data-tile-data');
    const parsedTileData = JSON.parse(firstTileData);
    expect(parsedTileData).toHaveProperty('name');
    expect(parsedTileData).toHaveProperty('symbol');
    expect(parsedTileData).toHaveProperty('id');
    expect(parsedTileData).toHaveProperty('tags');

    // Verify player stats initialized
    const playerStats = await page.evaluate(() => window.playerStats);
    expect(playerStats).toBeTruthy();
    expect(playerStats.level).toBeGreaterThan(0);
    expect(playerStats.maxHealth).toBeGreaterThan(0);
    expect(playerStats.health).toBeGreaterThan(0);
    expect(playerStats.expToNextLevel).toBeGreaterThan(0);

    // Verify UI elements are visible
    await expect(page.locator('#game-board')).toBeVisible();
    await expect(page.locator('#player-stats')).toBeVisible();
    
    // Check if skeleton elements exist before verifying they're hidden
    const boardSkeleton = page.locator('#board-loading-skeleton');
    const statsSkeleton = page.locator('#stats-loading-skeleton');
    
    if (await boardSkeleton.count() > 0) {
      await expect(boardSkeleton).toBeHidden();
    }
    if (await statsSkeleton.count() > 0) {
      await expect(statsSkeleton).toBeHidden();
    }

    // Verify initial skyglass was revealed (logged)
    const skyglassLogs = consoleLogs.filter(log => 
      log.includes('Skyglass') || log.includes('random Skyglass')
    );
    expect(skyglassLogs.length).toBeGreaterThan(0);

    console.log('\n=== GAME LOAD TEST COMPLETED SUCCESSFULLY ===');
    console.log(`Board size: ${boardData.boardSize.rows}x${boardData.boardSize.cols}`);
    console.log(`Total tiles: ${tilesCount}`);
    console.log(`Player level: ${playerStats.level}, Health: ${playerStats.health}/${playerStats.maxHealth}`);
    console.log(`Console logs captured: ${consoleLogs.length}`);
    console.log(`Console errors: ${consoleErrors.length}`);
  });

  test('Game handles missing assets gracefully', async ({ page }) => {
    console.log('\n=== TESTING ASSET LOADING RESILIENCE ===');
    
    // Block some asset requests to test error handling
    await page.route('**/audio/**', route => route.abort());
    
    await page.goto('http://localhost:8080');
    
    // Game should still load even with missing audio assets
    await page.waitForFunction(() => {
      return window.gameConfig && window.currentBoard && window.currentBoard.length > 0;
    }, { timeout: 15000 });

    // Verify game still functions
    const gameLoaded = await page.evaluate(() => 
      !!(window.gameConfig && window.currentBoard && window.gameState)
    );
    expect(gameLoaded).toBe(true);

    // Should have some audio-related warnings but still work
    const audioErrors = consoleErrors.filter(error => 
      error.includes('audio') || error.includes('Audio')
    );
    console.log(`Audio errors (expected): ${audioErrors.length}`);
  });

  test.afterEach(() => {
    console.log('\n=== FINAL LOG SUMMARY ===');
    console.log(`Total console logs: ${consoleLogs.length}`);
    console.log(`Total console errors: ${consoleErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\nErrors encountered:');
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    }
  });
}); 