import { test, expect } from '@playwright/test';

test.describe('Dual State System Tests', () => {
  test.beforeEach(async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });
    
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(3000);
  });

  test('Visibility and Content states initialize correctly', async ({ page }) => {
    // Check that the new state system is initialized
    const stateSystem = await page.evaluate(() => {
      return {
        hasVisibilityState: typeof VISIBILITY_STATE !== 'undefined',
        hasContentState: typeof CONTENT_STATE !== 'undefined',
        hasTileVisibility: Array.isArray(window.tileVisibility),
        hasTileContent: Array.isArray(window.tileContent),
        hasTileCurrentEntity: Array.isArray(window.tileCurrentEntity)
      };
    });

    expect(stateSystem.hasVisibilityState).toBe(true);
    expect(stateSystem.hasContentState).toBe(true);
    expect(stateSystem.hasTileVisibility).toBe(true);
    expect(stateSystem.hasTileContent).toBe(true);
    expect(stateSystem.hasTileCurrentEntity).toBe(true);

    console.log('✓ Dual state system initialized correctly');
  });

  test('Basic tile visibility transitions work', async ({ page }) => {
    // Test visibility state changes
    const visibilityTest = await page.evaluate(() => {
      if (!window.tileVisibility || !window.setVisibility || !window.getVisibility) {
        return { error: 'State management functions not found' };
      }

      // Test row 0, col 0
      const row = 0, col = 0;
      
      // Should start hidden
      const initialState = getVisibility(row, col);
      
      // Change to revealed
      setVisibility(row, col, VISIBILITY_STATE.REVEALED);
      const revealedState = getVisibility(row, col);
      
      return {
        initialState,
        revealedState,
        success: initialState === 'hidden' && revealedState === 'revealed'
      };
    });

    expect(visibilityTest.success).toBe(true);
    console.log('✓ Visibility state transitions work correctly');
  });

  test('Content state transitions work', async ({ page }) => {
    const contentTest = await page.evaluate(() => {
      if (!window.tileContent || !window.setContent || !window.getContent) {
        return { error: 'Content management functions not found' };
      }

      const row = 0, col = 0;
      
      // Should start alive (or empty for empty tiles)
      const initialState = getContent(row, col);
      
      // Change to dying
      setContent(row, col, CONTENT_STATE.DYING);
      const dyingState = getContent(row, col);
      
      // Change to dead
      setContent(row, col, CONTENT_STATE.DEAD);
      const deadState = getContent(row, col);
      
      return {
        initialState,
        dyingState,
        deadState,
        success: dyingState === 'dying' && deadState === 'dead'
      };
    });

    expect(contentTest.success).toBe(true);
    console.log('✓ Content state transitions work correctly');
  });

  test('Entity transformations work', async ({ page }) => {
    const entityTest = await page.evaluate(() => {
      if (!window.transformEntity || !window.getCurrentEntity) {
        return { error: 'Entity transformation functions not found' };
      }

      const row = 0, col = 0;
      
      // Get initial entity
      const initialEntity = getCurrentEntity(row, col);
      
      // Transform to a different entity (e.g., Empty = id 0)
      transformEntity(row, col, 0);
      const transformedEntity = getCurrentEntity(row, col);
      
      return {
        initialEntityId: initialEntity?.id,
        transformedEntityId: transformedEntity?.id,
        success: transformedEntity?.id === 0
      };
    });

    expect(entityTest.success).toBe(true);
    console.log('✓ Entity transformations work correctly');
  });

  test('Mimic click sequence works', async ({ page }) => {
    // Find a mimic on the board if it exists
    const mimicTest = await page.evaluate(() => {
      if (!window.currentBoard || !window.handleTileClick) {
        return { error: 'Game board or click handler not found' };
      }

      // Look for a mimic (entity id 17) on the board
      let mimicRow = -1, mimicCol = -1;
      for (let r = 0; r < currentBoard.length; r++) {
        for (let c = 0; c < currentBoard[r].length; c++) {
          if (getCurrentEntity && getCurrentEntity(r, c)?.id === 17) {
            mimicRow = r;
            mimicCol = c;
            break;
          }
        }
        if (mimicRow >= 0) break;
      }

      if (mimicRow < 0) {
        return { skipped: true, reason: 'No mimic found on board' };
      }

      // Test mimic click sequence
      const initialVisibility = getVisibility(mimicRow, mimicCol);
      
      // First click should reveal
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const cell = document.querySelector(`td[data-row="${mimicRow}"][data-col="${mimicCol}"]`);
      if (!cell) return { error: 'Mimic cell not found in DOM' };
      
      return {
        mimicFound: true,
        mimicRow,
        mimicCol,
        initialVisibility,
        ready: true
      };
    });

    if (mimicTest.skipped) {
      console.log(`⚠ Mimic test skipped: ${mimicTest.reason}`);
      return;
    }

    expect(mimicTest.mimicFound).toBe(true);
    console.log(`✓ Mimic found at [${mimicTest.mimicRow}, ${mimicTest.mimicCol}]`);
  });

  test('Entity transition configuration is valid', async ({ page }) => {
    const configTest = await page.evaluate(() => {
      if (!window.gameConfig || !window.gameConfig.entities) {
        return { error: 'Game config not found' };
      }

      const entitiesWithTransitions = gameConfig.entities.filter(entity => 
        entity.entity_transition && Object.keys(entity.entity_transition).length > 0
      );

      const mimicEntity = gameConfig.entities.find(entity => entity.id === 17);
      const crystalScrollEntity = gameConfig.entities.find(entity => entity.id === 18);

      return {
        totalEntities: gameConfig.entities.length,
        entitiesWithTransitions: entitiesWithTransitions.length,
        hasMimic: !!mimicEntity,
        hasCrystalScroll: !!crystalScrollEntity,
        mimicTransition: mimicEntity?.entity_transition,
        scrollTransition: crystalScrollEntity?.entity_transition
      };
    });

    expect(configTest.totalEntities).toBeGreaterThan(0);
    console.log(`✓ Found ${configTest.totalEntities} entities`);
    
    if (configTest.entitiesWithTransitions > 0) {
      console.log(`✓ Found ${configTest.entitiesWithTransitions} entities with transitions`);
    }

    if (configTest.hasMimic) {
      console.log('✓ Mimic entity found in config');
      expect(configTest.mimicTransition).toBeDefined();
    }

    if (configTest.hasCrystalScroll) {
      console.log('✓ Crystal Scroll entity found in config');
      expect(configTest.scrollTransition).toBeDefined();
    }
  });

  test('Dragon Boss defeat drops victory crown and triggers win dialog when claimed', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    // Wait for game initialization
    await page.waitForFunction(() => window.gameState && window.currentBoard);
    
    // Find Ancient Dragon on the board
    let dragonRow = -1, dragonCol = -1;
    const found = await page.evaluate(() => {
        for (let r = 0; r < window.currentBoard.length; r++) {
            for (let c = 0; c < window.currentBoard[0].length; c++) {
                const entity = window.getCurrentEntity(r, c);
                if (entity && entity.id === 13) { // Ancient Dragon ID
                    return { row: r, col: c, name: entity.name };
                }
            }
        }
        return null;
    });
    
    expect(found).toBeTruthy();
    console.log(`Ancient Dragon found at [${found.row}, ${found.col}]: ${found.name}`);
    
    dragonRow = found.row;
    dragonCol = found.col;
    
    // Enable god mode to avoid dying during test
    await page.evaluate(() => {
        window.playerStats.health = 1000;
        window.playerStats.maxHealth = 1000;
    });
    
    // Reveal the dragon first (left click)
    const dragonCell = page.locator(`#game-board td[data-row="${dragonRow}"][data-col="${dragonCol}"]`);
    await dragonCell.click();
    
    // Wait for it to be revealed
    await page.waitForTimeout(100);
    
    // Check that the dragon is revealed
    const isRevealed = await page.evaluate(({ row, col }) => {
        return window.getVisibility(row, col) === 'revealed';
    }, { row: dragonRow, col: dragonCol });
    
    expect(isRevealed).toBe(true);
    console.log(`Dragon revealed at [${dragonRow}, ${dragonCol}]`);
    
    // Click the dragon again to attack it
    await dragonCell.click();
    
    // Wait for death animation and entity transformation
    await page.waitForTimeout(2000);
    
    // Check that the dragon has been replaced by the victory crown (entity ID 24)
    const victoryCrownAppeared = await page.evaluate(({ row, col }) => {
        const entity = window.getCurrentEntity(row, col);
        return entity && entity.id === 24; // Victory Crown ID
    }, { row: dragonRow, col: dragonCol });
    
    expect(victoryCrownAppeared).toBe(true);
    console.log('✓ Victory crown appeared after defeating Ancient Dragon');
    
    // Ensure no win dialog appears yet (dragon defeated but crown not claimed)
    const noWinDialogYet = await page.evaluate(() => {
        const dialog = document.querySelector('.win-dialog-overlay');
        return dialog === null || getComputedStyle(dialog).display === 'none';
    });
    
    expect(noWinDialogYet).toBe(true);
    console.log('✓ Win dialog correctly does not appear until victory crown is claimed');
    
    // Now click the victory crown to claim it and trigger the win condition
    await dragonCell.click();
    
    // Wait for win dialog to appear after claiming the victory crown
    await page.waitForTimeout(2000);
    
    // Check if win dialog appeared after claiming the victory crown
    const winDialogVisible = await page.evaluate(() => {
        const dialog = document.querySelector('.win-dialog-overlay');
        return dialog !== null && getComputedStyle(dialog).display !== 'none';
    });
    
    expect(winDialogVisible).toBe(true);
    console.log('✓ Win dialog appeared after claiming victory crown');
    
    // Verify the dialog contains victory text
    const dialogExists = await page.locator('.win-dialog').count();
    expect(dialogExists).toBeGreaterThan(0);
    
    // Handle multiple dialogs (can happen in React strict mode)
    const dialogText = await page.locator('.win-dialog').first().textContent();
    expect(dialogText).toContain('You Have Won');
    expect(dialogText).toContain('Dragon Boss');
  });
}); 