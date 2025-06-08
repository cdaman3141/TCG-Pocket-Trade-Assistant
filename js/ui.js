/**
 * ui.js
 * Handles all user interface rendering and updates for the Pokemon TCG Pocket Collection Tracker.
 */

const UI = {
    currentRarityFilter: 'all', // Default filter for tradeable cards list
    currentAdjustmentFilter: 'all-owned', // Default filter for owned cards adjustment list
    currentAdjustmentSetCode: null, // Track the currently selected set in the adjustment section

    /**
     * Renders the list of sets with input fields for missing cards.
     * @param {Array} sets - Array of set objects from API.data.sets.
     */
    renderMissingCardsInput(sets) { // Renamed from renderSets
        const container = document.getElementById('missing-cards-input-container');
        container.innerHTML = ''; // Clear previous content

        sets.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)).forEach(set => {
            const setElement = document.createElement('div');
            setElement.classList.add('set-item');
            setElement.innerHTML = `
                <h3>${set.label.en} (${set.code})</h3>
                <div class="input-group">
                    <label for="missing-${set.code}">Numbers:</label>
                    <input type="text" id="missing-${set.code}" class="missing-input" data-set-code="${set.code}" placeholder="e.g., 1, 5, 10-12">
                </div>
            `;
            container.appendChild(setElement);
        });
    },

    /**
     * Renders the UI for adjusting individual card quantities.
     * Displays cards that are currently owned (quantity > 0) and allows adjustment.
     */
    renderOwnedCardsAdjustment() {
        const container = document.getElementById('owned-cards-adjustment-container');
        container.innerHTML = '';

        // --- Set-by-set dropdown ---
        // Get all sets from API
        const allSets = API.data.sets;
        // Get all set codes with at least one owned card
        const ownedSetCodes = Array.from(new Set(Object.entries(Collection.userCollection)
            .filter(([_, data]) => data.owned > 0 && !Collection.NON_TRADEABLE_RARITIES.includes(data.card.rarityCode))
            .map(([_, data]) => data.card.set)));
        // If no owned sets, fallback to all sets
        const setCodesToShow = ownedSetCodes.length > 0 ? ownedSetCodes : allSets.map(set => set.code);

        // Create dropdown
        let selectedSetCode = this.currentAdjustmentSetCode;
        if (!selectedSetCode || !setCodesToShow.includes(selectedSetCode)) {
            selectedSetCode = setCodesToShow[0];
            this.currentAdjustmentSetCode = selectedSetCode;
        }
        const dropdown = document.createElement('select');
        dropdown.className = 'adjustment-set-dropdown';
        setCodesToShow.forEach(setCode => {
            const set = API.getSet(setCode);
            const option = document.createElement('option');
            option.value = setCode;
            option.textContent = set ? set.label.en : setCode;
            if (setCode === selectedSetCode) option.selected = true;
            dropdown.appendChild(option);
        });
        // Dropdown change handler
        dropdown.addEventListener('change', (e) => {
            this.currentAdjustmentSetCode = e.target.value;
            this.renderOwnedCardsAdjustment();
        });
        // Add dropdown to container
        const dropdownWrapper = document.createElement('div');
        dropdownWrapper.style.marginBottom = '16px';
        dropdownWrapper.appendChild(dropdown);
        container.appendChild(dropdownWrapper);

        // --- Rarity filter buttons ---
        // Do NOT create a new filter bar here. The filter bar is rendered in index.html as .filter-controls.card-adjustment-filters
        // Instead, update the existing filter buttons in index.html to include new rarities.
        // The filter logic below should support the new rarities, but the UI buttons are in index.html
        // So, remove any code here that creates a filterBar or filter buttons for adjustment section.

        // --- Filter cards to selected set ---
        // Always include 1* Art Rare and Double Rare (EX) cards, even if in NON_TRADEABLE_RARITIES
        const DOUBLE_RARE_CODES = ['RR', 'RRR', 'EX']; // Add or adjust codes as needed for your data
        let cardsToDisplay = Object.entries(Collection.userCollection)
            .map(([cardId, data]) => ({ ...data, cardId }))
            .filter(item => {
                const isDoubleRare = DOUBLE_RARE_CODES.includes(item.card.rarityCode);
                const isArtRare = item.card.rarityCode === 'AR'; // 1* Art Rare
                const isTradeable = !Collection.NON_TRADEABLE_RARITIES.includes(item.card.rarityCode) || isDoubleRare;
                // Show all cards in the selected set, regardless of owned count
                return (isTradeable || isArtRare) && item.card.set === selectedSetCode;
            });

        // Apply adjustment section filters
        // Expanded rarityMap to include new rarities
        const rarityMap = {
            'common-owned': 'C',
            'uncommon-owned': 'U',
            'rare-owned': 'R',
            'double-rare-owned': 'RR',
            'triple-rare-owned': 'RRR',
            'ex-owned': 'EX',
            'art-rare-owned': 'AR',
            // Add more as needed for new rarities
        };
        if (rarityMap[this.currentAdjustmentFilter]) {
            cardsToDisplay = cardsToDisplay.filter(item => item.card.rarityCode === rarityMap[this.currentAdjustmentFilter]);
        } else if (this.currentAdjustmentFilter === 'low-owned') {
            cardsToDisplay = cardsToDisplay.filter(item => item.owned > 0 && item.owned < Collection.settings.defaultQuantity);
        }

        if (cardsToDisplay.length === 0) {
            container.innerHTML += `<div class="no-results">No cards found in this set matching the current filter or all cards are marked as missing.</div>`;
            return;
        }

        // Sort by card number
        cardsToDisplay.sort((a, b) => a.card.number - b.card.number);

        // Render cards
        const cardGridElement = document.createElement('div');
        cardGridElement.classList.add('adjustment-card-grid');
        cardsToDisplay.forEach(item => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('adjustment-card-item');
            cardElement.dataset.cardId = item.cardId;
            if (item.owned === 0) {
                cardElement.classList.add('zero-owned');
            }
            // Use imageName property to construct the image path
            const imageSrc = item.card.imageName ? `images/cards/${item.card.imageName}` : '';
            cardElement.innerHTML = `
                <img class="card-image" src="${imageSrc}" alt="${item.card.label.eng}" loading="lazy" style="width: 140px; height: 196px; object-fit: cover; display: block; margin: 0 auto 8px auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" />
                <span class="card-number">#${item.card.number}</span>
                <span class="card-name">${item.card.label.eng}</span>
                <span class="card-rarity-code">${item.card.rarityCode}</span>
                <div class="quantity-control">
                    <button class="quantity-btn minus" data-card-id="${item.cardId}">-</button>
                    <span class="quantity-display" data-card-id="${item.cardId}">${item.owned}</span>
                    <button class="quantity-btn plus" data-card-id="${item.cardId}">+</button>
                </div>
            `;
            cardGridElement.appendChild(cardElement);
        });
        container.appendChild(cardGridElement);

        // Use event delegation for all quantity buttons
        if (this._handleQuantityButtonClick) {
            container.removeEventListener('click', this._handleQuantityButtonClick);
        }
        this._handleQuantityButtonClick = (event) => {
            const btn = event.target;
            if (!btn.classList.contains('quantity-btn')) return;
            const cardId = btn.dataset.cardId;
            const cardData = Collection.userCollection[cardId];
            if (!cardData) return;
            let newQuantity = cardData.owned;
            if (btn.classList.contains('plus')) {
                newQuantity++;
                cardData.manualOverride = true;
            } else if (btn.classList.contains('minus')) {
                newQuantity = Math.max(0, newQuantity - 1);
                cardData.manualOverride = true;
            }
            cardData.owned = newQuantity;
            // Update only the correct display
            const display = container.querySelector(`.quantity-display[data-card-id="${cardId}"]`);
            if (display) display.textContent = newQuantity;
            // Do NOT remove the card from the UI if it drops to 0
            UI.updateTradeList();
            UI.updateStatsDisplay();
            UI.saveCollectionState();
        };
        container.addEventListener('click', this._handleQuantityButtonClick);
    },

    /**
     * Updates the displayed list of tradeable cards based on current collection and filter.
     */
    updateTradeList() {
        const tradeListElement = document.getElementById('trade-list');
        const tradeableCards = Collection.getTradeableCards();
        const filteredCards = Collection.filterTradeableCards(tradeableCards, UI.currentRarityFilter);

        if (filteredCards.length === 0) {
            tradeListElement.innerHTML = '<div class="no-results">No tradeable cards found with the current settings and filters.</div>';
            return;
        }

        tradeListElement.innerHTML = ''; // Clear previous list

        // Group cards by set for better readability
        const groupedTradeable = filteredCards.reduce((acc, item) => {
            const setCode = item.card.set;
            if (!acc[setCode]) {
                acc[setCode] = {
                    name: API.getSet(setCode)?.label?.en || setCode,
                    cards: []
                };
            }
            acc[setCode].cards.push(item);
            return acc;
        }, {});

        Object.values(groupedTradeable).forEach(setGroup => {
            const setGroupElement = document.createElement('div');
            setGroupElement.classList.add('trade-set-group');
            setGroupElement.innerHTML = `<h4>${setGroup.name}</h4>`;

            const cardListElement = document.createElement('ul');
            setGroup.cards.forEach(item => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <span class="card-name">${item.card.label.eng} (#${item.card.number})</span>
                    <span class="card-rarity">(${API.getRarityName(item.card.rarityCode)})</span>
                    <span class="card-available">Available for trade: <span class="quantity">${item.available}</span></span>
                `;
                cardListElement.appendChild(listItem);
            });
            setGroupElement.appendChild(cardListElement);
            tradeListElement.appendChild(setGroupElement);
        });
    },

    /**
     * Generates a plain text list of tradeable cards for export.
     * @param {Array} tradeableCards - Array of tradeable card objects.
     * @returns {string} Formatted text list.
     */
    generateTradeListText(tradeableCards) {
        if (tradeableCards.length === 0) {
            return "No tradeable cards available.";
        }

        let text = "My Pokemon TCG Pocket Trade List:\n\n";

        // Group by set for export readability
        const grouped = tradeableCards.reduce((acc, item) => {
            const setCode = item.card.set;
            if (!acc[setCode]) {
                acc[setCode] = {
                    name: API.getSet(setCode)?.label?.en || setCode,
                    cards: []
                };
            }
            acc[setCode].cards.push(item);
            return acc;
        }, {});

        Object.values(grouped).forEach(setGroup => {
            text += `--- ${setGroup.name} ---\n`;
            setGroup.cards.forEach(item => {
                text += `- ${item.card.label.eng} #${item.card.number} (${API.getRarityName(item.card.rarityCode)}) - Available: ${item.available}\n`;
            });
            text += '\n';
        });

        return text;
    },

    /**
     * Copies text to the clipboard.
     * @param {string} text - The text to copy.
     * @param {string} successMessage - Message to display on success.
     */
    copyToClipboard(text, successMessage = 'Copied to clipboard!') {
        navigator.clipboard.writeText(text).then(() => {
            alert(successMessage);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard. Please copy manually:\n\n' + text);
        });
    },

    /**
     * Updates the statistics display in the UI.
     */
    updateStatsDisplay() {
        const stats = Collection.getStats();
        document.getElementById('stat-total-cards').textContent = stats.totalCards;
        document.getElementById('stat-owned-cards').textContent = stats.ownedCards;
        document.getElementById('stat-missing-cards').textContent = stats.missingCards;
        document.getElementById('stat-tradeable-types').textContent = stats.tradeableTypes;
        document.getElementById('stat-total-tradeable').textContent = stats.totalTradeable;
        document.getElementById('stat-completion').textContent = stats.completionPercentage;
    },

    // --- Persistence Functions (Unchanged, but now they save/load the *entire* userCollection state) ---
    /**
     * Saves current settings to local storage.
     * @param {Object} settings - The settings object to save.
     */
    saveSettings(settings) {
        try {
            localStorage.setItem('collectionSettings', JSON.stringify(settings));
            console.log('Settings saved to local storage.');
        } catch (e) {
            console.error('Error saving settings to local storage', e);
        }
    },

    /**
     * Loads settings from local storage.
     * @returns {Object|null} The loaded settings or null if not found/error.
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem('collectionSettings');
            return settings ? JSON.parse(settings) : null;
        } catch (e) {
            console.error('Error loading settings from local storage', e);
            return null;
        }
    },

    /**
     * Applies loaded settings to the UI elements.
     * @param {Object} settings - The settings object to apply.
     */
    applySettingsToUI(settings) {
        if (settings.defaultQuantity !== undefined) {
            const defaultQuantitySelect = document.getElementById('default-quantity');
            defaultQuantitySelect.value = settings.defaultQuantity;
        }
        if (settings.minKeep !== undefined) {
            const minKeepSelect = document.getElementById('min-keep');
            minKeepSelect.value = settings.minKeep;
        }
    },

    /**
     * IMPORTANT: Now we save/load the entire userCollection state.
     * This will store the 'owned' quantity for *every* card.
     * This replaces saveMissingCards and loadMissingCards.
     * @param {Object} collectionData - The Collection.userCollection object.
     */
    saveCollectionState() {
        // Only save owned quantities, not manualOverride flag (recompute on load)
        const state = {};
        for (const cardId in Collection.userCollection) {
            state[cardId] = Collection.userCollection[cardId].owned;
        }
        localStorage.setItem('collectionState', JSON.stringify(state));
    },

    /**
     * Loads the entire userCollection state.
     * @returns {Object|null} The loaded collection state or null if not found/error.
     */
    loadCollectionState() {
        // Load owned quantities from localStorage
        const state = JSON.parse(localStorage.getItem('collectionState') || '{}');
        return state;
    }
};