/**
 * Collection module for managing user's Pokemon card collection
 * Handles collection state, missing cards, and trade calculations
 */

const Collection = {
    // User's collection data
    userCollection: {},
    
    // Settings
    settings: {
        defaultQuantity: 2,
        minKeep: 1
    },

    // Non-tradeable rarity codes (2* and above)
    NON_TRADEABLE_RARITIES: ['RR', 'SR', 'AR', 'SAR', 'IM', 'UR'],

    /**
     * Initialize the collection with default quantities
     * @param {number} defaultQuantity - Default number of each card owned
     */
    initialize(defaultQuantity = 2) {
        console.log(`Initializing collection with ${defaultQuantity} of each card...`);
        
        this.settings.defaultQuantity = defaultQuantity;
        this.userCollection = {};

        if (!API.isDataLoaded()) {
            console.error('Cannot initialize collection: API data not loaded');
            return;
        }

        API.data.cards.forEach(card => {
            const cardId = this.getCardId(card.set, card.number);
            this.userCollection[cardId] = {
                owned: defaultQuantity,
                card: card,
                manualOverride: false
            };
        });

        console.log(`Collection initialized with ${Object.keys(this.userCollection).length} cards`);
    },

    /**
     * Generate a unique card ID
     * @param {string} setCode - The set code
     * @param {number} cardNumber - The card number
     * @returns {string} Unique card identifier
     */
    getCardId(setCode, cardNumber) {
        return `${setCode}-${cardNumber}`;
    },

    /**
     * Update settings
     * @param {Object} newSettings - New settings to apply
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        // If default quantity changed, reinitialize collection
        if (newSettings.defaultQuantity !== undefined) {
            const currentMissing = this.getAllMissingCards();
            // Only update cards that have not been manually overridden
            Object.entries(this.userCollection).forEach(([cardId, data]) => {
                if (!data.manualOverride) {
                    data.owned = newSettings.defaultQuantity;
                }
            });
            // Reapply missing cards
            Object.entries(currentMissing).forEach(([setCode, missingNumbers]) => {
                if (missingNumbers.length > 0) {
                    this.updateMissingCards(setCode, missingNumbers);
                }
            });
        }
    },

    /**
     * Parse missing card numbers from text input
     * @param {string} text - Input text (e.g., "1,5,12,25-30")
     * @returns {Array} Array of card numbers
     */
    parseMissingNumbers(text) {
        const numbers = [];
        const parts = text.split(',').map(s => s.trim()).filter(s => s);

        parts.forEach(part => {
            if (part.includes('-')) {
                // Handle ranges like "25-30"
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                        numbers.push(i);
                    }
                }
            } else {
                // Handle single numbers
                const num = parseInt(part);
                if (!isNaN(num)) {
                    numbers.push(num);
                }
            }
        });

        return [...new Set(numbers)]; // Remove duplicates
    },

    /**
     * Update missing cards for a specific set
     * @param {string} setCode - The set code
     * @param {Array|string} missingCards - Array of card numbers or text to parse
     */
    updateMissingCards(setCode, missingCards) {
        const missingNumbers = Array.isArray(missingCards) 
            ? missingCards 
            : this.parseMissingNumbers(missingCards);

        console.log(`Updating missing cards for set ${setCode}:`, missingNumbers);

        // Reset all cards in this set to default quantity
        const setCards = API.getCardsBySet(setCode);
        setCards.forEach(card => {
            const cardId = this.getCardId(card.set, card.number);
            if (this.userCollection[cardId]) {
                this.userCollection[cardId].owned = this.settings.defaultQuantity;
            }
        });

        // Set missing cards to 0
        missingNumbers.forEach(number => {
            const cardId = this.getCardId(setCode, number);
            if (this.userCollection[cardId]) {
                this.userCollection[cardId].owned = 0;
            } else {
                console.warn(`Card ${cardId} not found in collection`);
            }
        });
    },

    /**
     * Get all missing cards grouped by set
     * @returns {Object} Object with set codes as keys and missing card numbers as values
     */
    getAllMissingCards() {
        const missing = {};
        
        Object.entries(this.userCollection).forEach(([cardId, data]) => {
            if (data.owned === 0) {
                const [setCode, cardNumber] = cardId.split('-');
                if (!missing[setCode]) {
                    missing[setCode] = [];
                }
                missing[setCode].push(parseInt(cardNumber));
            }
        });

        return missing;
    },

    /**
     * Get tradeable cards based on current collection and settings
     * @returns {Array} Array of tradeable card objects with availability info
     */
    getTradeableCards() {
        const tradeableCards = [];

        Object.values(this.userCollection).forEach(({ owned, card }) => {
            // Skip non-tradeable cards
            if (this.NON_TRADEABLE_RARITIES.includes(card.rarityCode)) {
                return;
            }
            
            const available = owned - this.settings.minKeep;
            if (available > 0) {
                tradeableCards.push({
                    card,
                    available,
                    owned,
                    cardId: this.getCardId(card.set, card.number)
                });
            }
        });

        // Sort by available quantity (ascending) then by name
        tradeableCards.sort((a, b) => {
            if (a.available !== b.available) {
                return a.available - b.available;
            }
            return a.card.label.eng.localeCompare(b.card.label.eng);
        });

        return tradeableCards;
    },

    /**
     * Filter tradeable cards by rarity
     * @param {Array} tradeableCards - Array of tradeable cards
     * @param {string} rarityFilter - Filter type ('all', 'common', 'uncommon', 'rare')
     * @returns {Array} Filtered array of tradeable cards
     */
    filterTradeableCards(tradeableCards, rarityFilter) {
        if (rarityFilter === 'all') {
            return tradeableCards;
        }

        const rarityMap = {
            'common': 'C',
            'uncommon': 'U',
            'rare': 'R'
        };

        const targetRarity = rarityMap[rarityFilter];
        if (!targetRarity) {
            console.warn(`Unknown rarity filter: ${rarityFilter}`);
            return tradeableCards;
        }

        return tradeableCards.filter(item => item.card.rarityCode === targetRarity);
    },

    /**
     * Get collection statistics
     * @returns {Object} Collection stats
     */
    getStats() {
        if (!API.isDataLoaded()) {
            return { error: 'Data not loaded' };
        }

        const totalCards = Object.keys(this.userCollection).length;
        const ownedCards = Object.values(this.userCollection).filter(item => item.owned > 0).length;
        const missingCards = totalCards - ownedCards;
        const tradeableCards = this.getTradeableCards();
        const totalTradeable = tradeableCards.reduce((sum, item) => sum + item.available, 0);

        return {
            totalCards,
            ownedCards,
            missingCards,
            tradeableTypes: tradeableCards.length,
            totalTradeable,
            completionPercentage: Math.round((ownedCards / totalCards) * 100)
        };
    },

    /**
     * Export collection data
     * @returns {Object} Exportable collection data
     */
    exportCollection() {
        return {
            settings: this.settings,
            missingCards: this.getAllMissingCards(),
            stats: this.getStats(),
            exportDate: new Date().toISOString()
        };
    },

    /**
     * Import collection data
     * @param {Object} collectionData - Previously exported collection data
     */
    importCollection(collectionData) {
        if (collectionData.settings) {
            this.updateSettings(collectionData.settings);
        }

        if (collectionData.missingCards) {
            Object.entries(collectionData.missingCards).forEach(([setCode, missingNumbers]) => {
                this.updateMissingCards(setCode, missingNumbers);
            });
        }

        console.log('Collection imported successfully');
    },

    /**
     * Reset collection to defaults
     */
    reset() {
        this.initialize(this.settings.defaultQuantity);
        console.log('Collection reset to defaults');
    }
};

// Export for use in other modules (if using ES6 modules in the future)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Collection;
}