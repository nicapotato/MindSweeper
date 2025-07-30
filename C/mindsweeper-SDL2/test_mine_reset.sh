#!/bin/bash

echo "=== MindSweeper Mine Reset Test ==="
echo "This test will verify that mines properly reset when the space key is pressed."
echo ""
echo "Instructions:"
echo "1. Start the game"
echo "2. Click on a mine to see it deals damage (should show threat level > 0)"
echo "3. Press SPACE to reset the game"
echo "4. Check that the same mine position now shows the correct threat level"
echo "5. Click on the mine again - it should deal damage again"
echo ""
echo "Expected behavior:"
echo "- After SPACE reset, mines should show their correct threat levels"
echo "- Clicking mines should deal damage (not be harmless)"
echo ""
echo "Starting game in 3 seconds..."
sleep 3

./minesweeper 