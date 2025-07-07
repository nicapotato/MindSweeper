// EntityManager - v2.0 Entity System
// Handles direct ID-to-entity mapping, theme application, and state transitions

class EntityManager {
    constructor(config) {
        this.config = config;
        this.entities = new Map();
        this.constants = config.python_constants?.named_constants || {};
        
        // Build entity map for O(1) lookup
        if (config.entities) {
            config.entities.forEach(entity => {
                this.entities.set(entity.id, entity);
            });
        } else {
            throw new Error('Config must have entities array for v2.0 system');
        }
        
        console.log(`EntityManager initialized with ${this.entities.size} entities`);
    }
    
    // Get entity by ID with O(1) lookup
    getEntity(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) {
            console.warn(`Entity with ID ${entityId} not found`);
            return this.getEntity(0); // Return empty entity as fallback
        }
        return entity;
    }
    
    // Apply theme to entity
    applyTheme(entity, themeName) {
        const baseEntity = { ...entity };
        const themeOverride = entity.theme_overrides?.[themeName];
        
        if (themeOverride) {
            return { ...baseEntity, ...themeOverride };
        }
        
        return baseEntity;
    }
    
    // Get entity with theme applied
    getThemedEntity(entityId, themeName) {
        const entity = this.getEntity(entityId);
        return this.applyTheme(entity, themeName);
    }
    
    // Get all entities
    getAllEntities() {
        return Array.from(this.entities.values());
    }
    
    // Get entities by tag
    getEntitiesByTag(tag) {
        return this.getAllEntities().filter(entity => 
            entity.tags && entity.tags.includes(tag)
        );
    }
    
    // Check if entity has tag
    entityHasTag(entityId, tag) {
        const entity = this.getEntity(entityId);
        return entity.tags && entity.tags.includes(tag);
    }
    
    // Get entity constant name for debugging
    getEntityConstantName(entityId) {
        for (const [name, id] of Object.entries(this.constants)) {
            if (id === entityId) {
                return name;
            }
        }
        return `ENTITY_${entityId}`;
    }
}

// Tile State Manager - handles v2.0 simplified state transitions
class TileStateManager {
    constructor(config) {
        this.states = config.tile_data?.states || [];
        this.transitions = config.tile_data?.transitions || {};
        
        console.log(`TileStateManager initialized with states: ${this.states.join(', ')}`);
    }
    
    // Check if transition is valid
    canTransition(fromState, toState, trigger) {
        const transitionKey = `${fromState}_TO_${toState}`;
        const transition = this.transitions[transitionKey];
        return transition && transition.triggers.includes(trigger);
    }
    
    // Execute state transition with effects
    executeTransition(tile, fromState, toState, trigger) {
        const transitionKey = `${fromState}_TO_${toState}`;
        const transition = this.transitions[transitionKey];
        
        if (transition) {
            // Play animations
            if (transition.animations) {
                transition.animations.forEach(anim => this.playAnimation(tile, anim));
            }
            
            // Play sound effects
            if (transition.sound_effects) {
                transition.sound_effects.forEach(sfx => this.playSound(sfx));
            }
            
            // Handle entity drops
            if (transition.next_entity_drops) {
                this.handleEntityDrops(tile);
            }
            
            return true;
        }
        
        return false;
    }
    
    // Placeholder for animation system
    playAnimation(tile, animationType) {
        console.log(`Playing ${animationType} animation for tile at ${tile.row},${tile.col}`);
    }
    
    // Placeholder for sound system  
    playSound(soundName) {
        if (window.gameAudio) {
            // Integrate with existing audio system
            console.log(`Playing sound: ${soundName}`);
        }
    }
    
    // Placeholder for entity drop system
    handleEntityDrops(tile) {
        console.log(`Handling entity drops for tile at ${tile.row},${tile.col}`);
    }
}

// Global entity manager instance
window.entityManager = null;
window.tileStateManager = null;

// Initialize entity system
function initializeEntitySystem(config) {
    window.entityManager = new EntityManager(config);
    window.tileStateManager = new TileStateManager(config);
    
    console.log('v2.0 Entity system initialized successfully');
    return { entityManager: window.entityManager, tileStateManager: window.tileStateManager };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EntityManager, TileStateManager, initializeEntitySystem };
} 