# =============================================================================
# Mindsweeper Game Testing with Playwright
# =============================================================================
# This Makefile provides commands for testing the Mindsweeper game using
# Playwright end-to-end testing framework. It supports both standalone HTML
# testing and Next.js iframe integration testing.
#
# Quick Start:
#   1. make setup-tests     (one-time setup)
#   2. make test-load       (run basic tests)
#   3. make test-headed     (visual debugging)
#
# Prerequisites: Node.js, npm, Python 3
# =============================================================================

# -----------------------------------------------------------------------------
# SETUP TARGETS - Run these first
# -----------------------------------------------------------------------------

# Install test dependencies from package.json
# Creates node_modules/ with Playwright and testing dependencies
# Run this once after cloning the repo or when package.json changes
install-test-deps:
	npm install

# Install Playwright browsers (Chromium, Firefox, WebKit)
# Downloads browser binaries to ~/.cache/ms-playwright/
# Required for running any Playwright tests
# Run this once after install-test-deps
install-browsers:
	npx playwright install

# Complete test environment setup
# Combines dependency installation and browser setup
# Use this for first-time setup or CI/CD environments
setup-tests: install-test-deps install-browsers

# -----------------------------------------------------------------------------
# CORE TESTING TARGETS - Main test execution
# -----------------------------------------------------------------------------

# Run basic game load test (RECOMMENDED FOR DEVELOPMENT)
# - Fast execution (~5-10 seconds)
# - Tests core game initialization and log verification
# - Minimal dependencies, good for rapid feedback loop
# - Uses tests/minimal-test.spec.js
test-load:
	npx playwright test tests/minimal-test.spec.js

# Run comprehensive game functionality test
# - More thorough testing (~15-30 seconds)
# - Tests game state, UI elements, and basic interactions
# - May be timing-sensitive with slower systems
# - Uses tests/game-load-simple.spec.js
test-load-advanced:
	npx playwright test tests/game-load-simple.spec.js

# Run full-featured test suite (EXPERIMENTAL)
# - Most comprehensive testing but may have timing issues
# - Tests complex interactions and edge cases
# - Recommended only for thorough validation
# - Uses tests/game-load.spec.js
test-load-full:
	npx playwright test tests/game-load.spec.js

# Run all available tests
# - Executes every .spec.js file in tests/ directory
# - Good for CI/CD pipelines and comprehensive validation
# - May take longer depending on number of test files
test:
	npx playwright test

# -----------------------------------------------------------------------------
# DEBUGGING TARGETS - For troubleshooting and development
# -----------------------------------------------------------------------------

# Run tests with visible browser (VISUAL DEBUGGING)
# - Opens browser window to watch test execution
# - Useful for understanding test failures
# - Slower but great for debugging interactions
# - Can be combined with specific test files
test-headed:
	npx playwright test --headed

# Run tests in interactive debug mode (STEP-BY-STEP DEBUGGING)
# - Pauses at each action for manual inspection
# - Opens Playwright Inspector for detailed debugging
# - Allows stepping through test code line by line
# - Essential for complex debugging scenarios
test-debug:
	npx playwright test --debug

# -----------------------------------------------------------------------------
# UTILITY TARGETS - Maintenance and development support
# -----------------------------------------------------------------------------

# Clean up test artifacts and reports
# - Removes test-results/ directory (screenshots, videos, traces)
# - Removes playwright-report/ directory (HTML reports)
# - Use when test artifacts consume too much disk space
# - Safe to run anytime
clean-test:
	rm -rf test-results/ playwright-report/

# Start local HTTP server for standalone testing
# - Serves current directory on http://localhost:8080
# - Used by Playwright config for standalone game testing
# - Alternative to Next.js development server
# - Runs Python's built-in HTTP server
serve:
	python3 -m http.server 8080

# -----------------------------------------------------------------------------
# ADVANCED USAGE EXAMPLES
# -----------------------------------------------------------------------------
# 
# Debug specific test file with visual browser:
#   npx playwright test tests/minimal-test.spec.js --headed
#
# Run tests on specific browser:
#   npx playwright test --project=chromium
#
# Generate HTML report after test run:
#   npx playwright show-report
#
# View trace file for failed test:
#   npx playwright show-trace test-results/[test-name]/trace.zip
#
# Run tests with custom timeout:
#   npx playwright test --timeout=60000
#
# Update test snapshots:
#   npx playwright test --update-snapshots
# -----------------------------------------------------------------------------


build_board:
	cd ../../../../../lang-python/fastapi-backend && uv run ds_data_app/logic/or_tools/mindsweeper/CSAT_board_solver/mindsweeper_grid_generator.py

# Declare all targets as phony (not file-based)
.PHONY: install-test-deps install-browsers test-load test-load-advanced test-load-full test test-headed test-debug clean-test setup-tests serve
