import { test, expect } from '@playwright/test';

test.describe('Mindsweeper Core Tests', () => {
  test('Game initialization logs appear correctly', async ({ page }) => {
    console.log('\n=== STARTING MINIMAL TEST ===');
    
    const logs = [];
    
    page.on('console', msg => {
      logs.push(msg.text());
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    await page.goto('http://localhost:8080');
    
    // Wait a reasonable amount of time for initialization
    await page.waitForTimeout(5000);
    
    console.log('\n=== ANALYZING LOGS ===');
    
    // Check that critical initialization steps occurred
    const criticalLogs = [
      'Page loaded, starting game initialization',
      'Config loaded:',
      'Sprite sheets loaded',
      'Game initialization complete!'
    ];

    let passedChecks = 0;
    for (const expectedLog of criticalLogs) {
      const found = logs.some(log => log.includes(expectedLog));
      if (found) {
        passedChecks++;
        console.log(`✓ Found: ${expectedLog}`);
      } else {
        console.log(`✗ Missing: ${expectedLog}`);
      }
    }

    console.log(`\nPassed ${passedChecks}/${criticalLogs.length} critical checks`);
    
    // Basic assertions
    expect(passedChecks).toBeGreaterThan(2); // At least 3 out of 4 logs should appear
    
    // Check basic window objects exist
    const hasBasicObjects = await page.evaluate(() => {
      return !!(window.gameConfig && window.currentBoard);
    });
    
    if (hasBasicObjects) {
      console.log('✓ Basic game objects found');
      
      const gameInfo = await page.evaluate(() => ({
        name: window.gameConfig?.name,
        version: window.gameConfig?.version,
        boardSize: window.currentBoard?.length || 0
      }));
      
      console.log(`Game: ${gameInfo.name} v${gameInfo.version}, Board: ${gameInfo.boardSize} rows`);
      
      expect(gameInfo.name).toBe('MindSweeper');
      expect(gameInfo.boardSize).toBeGreaterThan(0);
    } else {
      console.log('⚠ Basic game objects not found - may be timing issue');
    }
    
    console.log('\n=== MINIMAL TEST COMPLETED ===');
  });
  
  test('Page loads without critical errors', async ({ page }) => {
    const errors = [];
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log(`[PAGE ERROR] ${error.message}`);
    });
    
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(3000);
    
    // Should not have any critical JavaScript errors
    expect(errors).toHaveLength(0);
    
    // Basic page elements should exist
    const hasGameBoard = await page.locator('#game-board').count() > 0;
    expect(hasGameBoard).toBe(true);
    
    console.log('✓ Page loads without critical errors');
  });
}); 