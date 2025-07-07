// Shared test utilities for Mindsweeper game testing

export class GameTestHelpers {
  /**
   * Wait for game to fully load with all critical systems initialized
   */
  static async waitForGameLoad(page, timeout = 15000) {
    await page.waitForFunction(() => {
      return window.gameConfig && 
             window.currentBoard && 
             window.currentBoard.length > 0 &&
             window.gameState &&
             window.playerStats &&
             document.getElementById('game-board').style.display !== 'none';
    }, { timeout });
  }

  /**
   * Get comprehensive game state snapshot
   */
  static async getGameSnapshot(page) {
    return await page.evaluate(() => ({
      // Core game data
      gameConfig: window.gameConfig ? {
        name: window.gameConfig.name,
        version: window.gameConfig.version,
        solution_index: window.gameConfig.solution_index
      } : null,
      
      // Board state
      boardData: {
        currentBoard: window.currentBoard,
        gameState: window.gameState,
        boardSize: {
          rows: window.currentBoard?.length || 0,
          cols: window.currentBoard?.[0]?.length || 0
        }
      },
      
      // Player state
      playerStats: window.playerStats ? { ...window.playerStats } : null,
      
      // Game tracking
      entityCounts: window.entityCounts ? { ...window.entityCounts } : null,
      totalSolutions: window.totalSolutions || 0,
      
      // Achievement system
      achievementsEarned: window.achievementsEarned ? [...window.achievementsEarned] : [],
      firefliesKilled: window.firefliesKilled || 0,
      
      // Animation states
      tilesInAnimation: window.tilesInAnimation ? Object.keys(window.tilesInAnimation).length : 0,
      dyingAnimations: window.dyingAnimations ? Object.keys(window.dyingAnimations).length : 0
    }));
  }

  /**
   * Verify tile data structure and properties
   */
  static async verifyTileData(page, row, col) {
    const tile = page.locator(`td[data-row="${row}"][data-col="${col}"]`);
    
    // Check required attributes exist
    await expect(tile).toHaveAttribute('data-tile-data');
    await expect(tile).toHaveAttribute('data-row');
    await expect(tile).toHaveAttribute('data-col');
    await expect(tile).toHaveAttribute('data-tile-type');
    
    // Get and validate tile data JSON
    const tileDataStr = await tile.getAttribute('data-tile-data');
    const tileData = JSON.parse(tileDataStr);
    
    // Verify required properties
    expect(tileData).toHaveProperty('name');
    expect(tileData).toHaveProperty('symbol');
    expect(tileData).toHaveProperty('encoding');
    expect(tileData).toHaveProperty('tags');
    expect(Array.isArray(tileData.tags)).toBe(true);
    
    return { tile, tileData };
  }

  /**
   * Setup console logging capture for tests
   */
  static setupConsoleCapture(page) {
    const logs = {
      all: [],
      errors: [],
      warnings: [],
      info: []
    };

    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      logs.all.push({ type, text });
      
      switch (type) {
        case 'error':
          logs.errors.push(text);
          break;
        case 'warning':
          logs.warnings.push(text);
          break;
        case 'info':
        case 'log':
          logs.info.push(text);
          break;
      }
      
      // Print to test output for debugging
      console.log(`[${type.toUpperCase()}] ${text}`);
    });

    // Capture page errors
    page.on('pageerror', error => {
      logs.errors.push(`Page Error: ${error.message}`);
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    // Capture network failures
    page.on('requestfailed', request => {
      const failureText = `Request Failed: ${request.url()} - ${request.failure()?.errorText}`;
      logs.errors.push(failureText);
      console.log(`[REQUEST FAILED] ${failureText}`);
    });

    return logs;
  }

  /**
   * Verify expected log messages appeared during game loading
   */
  static verifyLoadingLogs(logs) {
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

    const missing = [];
    for (const expectedLog of expectedLogs) {
      const logFound = logs.all.some(log => log.text.includes(expectedLog));
      if (!logFound) {
        missing.push(expectedLog);
      }
    }

    return { 
      success: missing.length === 0, 
      missingLogs: missing,
      totalLogs: logs.all.length,
      errorCount: logs.errors.length
    };
  }

  /**
   * Check for critical errors that should fail the test
   */
  static checkCriticalErrors(logs) {
    const criticalErrors = logs.errors.filter(error => 
      error.includes('Failed to load') || 
      error.includes('Game initialization failed') ||
      error.includes('HTTP error') ||
      error.includes('TypeError') ||
      error.includes('ReferenceError')
    );

    return {
      hasCriticalErrors: criticalErrors.length > 0,
      criticalErrors,
      totalErrors: logs.errors.length
    };
  }

  /**
   * Mock randomness for deterministic testing
   */
  static async mockRandomness(page, values = [0.5]) {
    await page.addInitScript((mockValues) => {
      let callCount = 0;
      const originalRandom = Math.random;
      
      Math.random = () => {
        const value = mockValues[callCount % mockValues.length];
        callCount++;
        return value;
      };
      
      // Store original for restoration if needed
      window._originalRandom = originalRandom;
    }, values);
  }

  /**
   * Print comprehensive test summary
   */
  static printTestSummary(testName, gameSnapshot, logs) {
    console.log(`\n=== ${testName.toUpperCase()} SUMMARY ===`);
    
    if (gameSnapshot.boardData) {
      console.log(`Board: ${gameSnapshot.boardData.boardSize.rows}x${gameSnapshot.boardData.boardSize.cols}`);
    }
    
    if (gameSnapshot.playerStats) {
      console.log(`Player: Level ${gameSnapshot.playerStats.level}, HP ${gameSnapshot.playerStats.health}/${gameSnapshot.playerStats.maxHealth}`);
    }
    
    if (gameSnapshot.gameConfig) {
      console.log(`Game: ${gameSnapshot.gameConfig.name} v${gameSnapshot.gameConfig.version}, Solution ${gameSnapshot.gameConfig.solution_index}`);
    }
    
    console.log(`Logs: ${logs.all.length} total, ${logs.errors.length} errors, ${logs.warnings.length} warnings`);
    
    if (logs.errors.length > 0) {
      console.log('\nErrors encountered:');
      logs.errors.forEach(error => console.log(`  - ${error}`));
    }
  }
} 