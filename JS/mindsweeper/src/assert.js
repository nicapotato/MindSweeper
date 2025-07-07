// ========== ASSERTION MODULE ==========
// Implements aggressive runtime assertions according to project principles:
// - DO NOT OVER ENGINEER: Fail loud and early
// - No fallbacks, no graceful degradation
// - YOUR CODE IS THE ONLY FUTURE: Assert expectations, don't accommodate legacy

/**
 * Core assertion function - fails immediately with clear error
 * @param {boolean} condition - Condition that MUST be true
 * @param {string} message - Clear error message explaining what failed
 */
function assert(condition, message) {
    if (!condition) {
        const error = new Error(`ASSERTION FAILED: ${message}`);
        console.error(error);
        throw error;
    }
}

/**
 * Assert DOM element exists - no graceful fallbacks
 * @param {string} elementId - ID of required DOM element
 * @param {string} context - Where this element is needed
 */
function assertDOMElement(elementId, context) {
    const element = document.getElementById(elementId);
    assert(element, `DOM element '${elementId}' MUST exist for ${context}`);
    return element;
}

/**
 * Assert object property exists with expected type
 * @param {object} obj - Object to check
 * @param {string} property - Property name
 * @param {string} expectedType - Expected type ('string', 'number', etc.)
 * @param {string} context - Context for error message
 */
function assertProperty(obj, property, expectedType, context) {
    assert(obj && obj.hasOwnProperty(property), 
           `Property '${property}' MUST exist in ${context}`);
    assert(typeof obj[property] === expectedType, 
           `Property '${property}' MUST be ${expectedType} in ${context}, got ${typeof obj[property]}`);
    return obj[property];
}

/**
 * Assert array bounds - no defensive bounds checking
 * @param {Array} array - Array to check
 * @param {number} index - Index to validate
 * @param {string} context - Context for error message
 */
function assertArrayBounds(array, index, context) {
    assert(Array.isArray(array), `Expected array in ${context}`);
    assert(index >= 0 && index < array.length, 
           `Index ${index} out of bounds for array of length ${array.length} in ${context}`);
}

/**
 * Assert game state is valid - core game data must be present
 * @param {object} gameState - Current game state
 */
function assertGameState(gameState) {
    assert(gameState, 'Game state MUST be initialized');
    assert(Array.isArray(gameState), 'Game state MUST be an array');
    assert(gameState.length > 0, 'Game state MUST have rows');
}

/**
 * Assert configuration is complete - no partial configs allowed
 * @param {object} config - Game configuration object
 */
function assertGameConfig(config) {
    assert(config, 'Game configuration MUST be loaded');
    
    // Core required properties for v2.0
    const required = ['rows', 'cols', 'themes', 'name', 'version', 'entities'];
    required.forEach(prop => {
        assert(config.hasOwnProperty(prop), `Game config MUST have '${prop}' property`);
    });
    
    // v2.0 requires entities array
    assert(Array.isArray(config.entities), 'entities MUST be array in v2.0 config');
    
    // Validate data types
    assert(typeof config.rows === 'number' && config.rows > 0, 'rows MUST be positive number');
    assert(typeof config.cols === 'number' && config.cols > 0, 'cols MUST be positive number');
    assert(typeof config.themes === 'object', 'themes MUST be object');
    assert(typeof config.name === 'string' && config.name.length > 0, 'name MUST be non-empty string');
    assert(typeof config.version === 'string' && config.version.length > 0, 'version MUST be non-empty string');
}

// Export assertions for use throughout the codebase
window.assert = assert;
window.assertDOMElement = assertDOMElement;
window.assertProperty = assertProperty;
window.assertArrayBounds = assertArrayBounds;
window.assertGameState = assertGameState;
window.assertGameConfig = assertGameConfig; 