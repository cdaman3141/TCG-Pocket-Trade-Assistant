/**
 * API module for fetching Pokemon TCG Pocket data
 * Handles all external data requests from the GitHub database
 */

const API = {
    // Base URLs for the Pokemon TCG Pocket database
    BASE_URL: 'https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/',
    
    // Data storage
    data: {
        cards: [],
        sets: [],
        rarity: {}
    },

    /**
     * Fetch all required data from the API
     * @returns {Promise<Object>} Object containing cards, sets, and rarity data
     */
    async loadAllData() {
        try {
            console.log('Starting data fetch...');
            
            const [cardsResponse, setsResponse, rarityResponse] = await Promise.all([
                fetch(`${this.BASE_URL}cards.json`),
                fetch(`${this.BASE_URL}sets.json`),
                fetch(`${this.BASE_URL}rarity.json`)
            ]);

            // Check if all requests were successful
            if (!cardsResponse.ok || !setsResponse.ok || !rarityResponse.ok) {
                throw new Error('One or more API requests failed');
            }

            // Parse JSON data
            this.data.cards = await cardsResponse.json();
            this.data.sets = await setsResponse.json();
            this.data.rarity = await rarityResponse.json();

            console.log(`Loaded ${this.data.cards.length} cards from ${this.data.sets.length} sets`);
            
            return this.data;
        } catch (error) {
            console.error('Error loading Pokemon data:', error);
            throw new Error('Failed to load Pokemon card database. Please check your internet connection and try again.');
        }
    },

    /**
     * Get cards filtered by set code
     * @param {string} setCode - The set code to filter by
     * @returns {Array} Array of cards in the specified set
     */
    getCardsBySet(setCode) {
        return this.data.cards.filter(card => card.set === setCode);
    },

    /**
     * Get a specific card by set code and number
     * @param {string} setCode - The set code
     * @param {number} cardNumber - The card number within the set
     * @returns {Object|null} The card object or null if not found
     */
    getCard(setCode, cardNumber) {
        return this.data.cards.find(card => 
            card.set === setCode && card.number === cardNumber
        ) || null;
    },

    /**
     * Get set information by set code
     * @param {string} setCode - The set code
     * @returns {Object|null} The set object or null if not found
     */
    getSet(setCode) {
        return this.data.sets.find(set => set.code === setCode) || null;
    },

    /**
     * Get all tradeable cards (excluding 2* and above rarities)
     * @returns {Array} Array of tradeable cards
     */
    getTradeableCards() {
        const NON_TRADEABLE_RARITIES = ['RR', 'SR', 'AR', 'SAR', 'IM', 'UR'];
        return this.data.cards.filter(card => 
            !NON_TRADEABLE_RARITIES.includes(card.rarityCode)
        );
    },

    /**
     * Get cards grouped by set code
     * @returns {Object} Object with set codes as keys and card arrays as values
     */
    getCardsBySetGrouped() {
        const grouped = {};
        this.data.cards.forEach(card => {
            if (!grouped[card.set]) {
                grouped[card.set] = [];
            }
            grouped[card.set].push(card);
        });
        return grouped;
    },

    /**
     * Get rarity information
     * @param {string} rarityCode - The rarity code (e.g., 'C', 'U', 'R')
     * @returns {string} The full rarity name
     */
    getRarityName(rarityCode) {
        return this.data.rarity[rarityCode] || rarityCode;
    },

    /**
     * Check if data has been loaded
     * @returns {boolean} True if data is loaded, false otherwise
     */
    isDataLoaded() {
        return this.data.cards.length > 0 && 
               this.data.sets.length > 0 && 
               Object.keys(this.data.rarity).length > 0;
    },

    /**
     * Get data summary for debugging
     * @returns {Object} Summary of loaded data
     */
    getDataSummary() {
        if (!this.isDataLoaded()) {
            return { loaded: false };
        }

        const cardsBySets = this.getCardsBySetGrouped();
        const tradeableCount = this.getTradeableCards().length;

        return {
            loaded: true,
            totalCards: this.data.cards.length,
            totalSets: this.data.sets.length,
            tradeableCards: tradeableCount,
            rarityTypes: Object.keys(this.data.rarity).length,
            setBreakdown: Object.keys(cardsBySets).map(setCode => ({
                set: setCode,
                name: this.getSet(setCode)?.label?.en || 'Unknown',
                cardCount: cardsBySets[setCode].length
            }))
        };
    }
};

// Export for use in other modules (if using ES6 modules in the future)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}