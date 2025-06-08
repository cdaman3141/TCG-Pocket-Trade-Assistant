/**
 * main.js
 * Main application logic for the Pokemon TCG Pocket Collection Tracker.
 * Initializes data, handles global events, and orchestrates UI updates.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const loadingElement = document.getElementById('loading');
    const mainContentElement = document.getElementById('main-content');
    const defaultQuantitySelect = document.getElementById('default-quantity');
    const minKeepSelect = document.getElementById('min-keep');
    const exportBtn = document.getElementById('export-btn');
    const tradeListFilterButtons = document.querySelectorAll('.results-section .filter-btn'); // Specific to trade list
    const adjustmentFilterButtons = document.querySelectorAll('.owned-cards-adjustment-section .filter-btn'); // Specific to adjustment

    loadingElement.style.display = 'block';
    mainContentElement.style.display = 'none';

    try {
        await API.loadAllData();
        console.log('API data loaded successfully.');

        // 1. Load settings from local storage and apply to UI & Collection
        const storedSettings = UI.loadSettings();
        if (storedSettings) {
            Collection.updateSettings(storedSettings); // Update Collection's settings first
            UI.applySettingsToUI(storedSettings); // Then apply to UI
        } else {
            // If no stored settings, ensure UI matches initial Collection settings
            UI.applySettingsToUI(Collection.settings);
        }

        // 2. Initialize collection (based on default quantity from settings)
        Collection.initialize(Collection.settings.defaultQuantity);

        // 3. Load full collection state from local storage and apply
        const storedCollectionState = UI.loadCollectionState();
        if (storedCollectionState) {
            // Iterate through stored state and apply owned quantities
            for (const cardId in storedCollectionState) {
                if (Collection.userCollection[cardId]) {
                    Collection.userCollection[cardId].owned = storedCollectionState[cardId];
                    // If the stored value differs from the default, set manualOverride
                    if (storedCollectionState[cardId] !== Collection.settings.defaultQuantity) {
                        Collection.userCollection[cardId].manualOverride = true;
                    }
                }
            }
            console.log('Full collection state loaded from local storage.');
        }


        // Render initial UI elements
        UI.renderMissingCardsInput(API.data.sets); // Now using the new render function
        UI.renderOwnedCardsAdjustment(); // Render the new adjustment section
        UI.updateTradeList(); // Initial render of tradeable cards
        UI.updateStatsDisplay(); // Initial display of stats


        // Event Listeners
        defaultQuantitySelect.addEventListener('change', (event) => {
            const newDefaultQuantity = parseInt(event.target.value);
            Collection.updateSettings({ defaultQuantity: newDefaultQuantity });
            UI.saveSettings(Collection.settings);
            // Re-initialize collection to reset all owned quantities based on new default
            Collection.initialize(newDefaultQuantity);
            // If there was a stored state, re-apply it *after* re-initialization
            const reStoredCollectionState = UI.loadCollectionState();
            if (reStoredCollectionState) {
                for (const cardId in reStoredCollectionState) {
                    if (Collection.userCollection[cardId]) {
                        Collection.userCollection[cardId].owned = reStoredCollectionState[cardId];
                    }
                }
            }
            UI.renderOwnedCardsAdjustment(); // Re-render adjustment UI to reflect changes
            UI.updateTradeList();
            UI.updateStatsDisplay();
            UI.saveCollectionState(); // Save the new state after default change and re-application
        });

        minKeepSelect.addEventListener('change', (event) => {
            const newMinKeep = parseInt(event.target.value);
            Collection.updateSettings({ minKeep: newMinKeep });
            UI.saveSettings(Collection.settings);
            UI.updateTradeList();
            UI.updateStatsDisplay();
        });

        // Delegate event for missing card input changes
        document.getElementById('missing-cards-input-container').addEventListener('input', (event) => {
            if (event.target.classList.contains('missing-input')) {
                const setCode = event.target.dataset.setCode;
                const missingText = event.target.value;
                Collection.updateMissingCards(setCode, missingText);
                UI.renderOwnedCardsAdjustment(); // Re-render adjustment as some cards might now be 0
                UI.updateTradeList();
                UI.updateStatsDisplay();
                UI.saveCollectionState(); // Save the updated collection state
            }
        });

        exportBtn.addEventListener('click', () => {
            const tradeListText = UI.generateTradeListText(Collection.getTradeableCards());
            UI.copyToClipboard(tradeListText, 'Trade list copied to clipboard!');
        });

        // Event listeners for trade list filter buttons
        tradeListFilterButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                tradeListFilterButtons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                UI.currentRarityFilter = event.target.dataset.filter; // Update UI module's filter state
                UI.updateTradeList();
            });
        });

        // Event listeners for owned cards adjustment filter buttons
        adjustmentFilterButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                adjustmentFilterButtons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                UI.currentAdjustmentFilter = event.target.dataset.filter; // Update UI module's filter state
                UI.renderOwnedCardsAdjustment(); // Re-render the adjustment section with new filter
            });
        });


        loadingElement.style.display = 'none';
        mainContentElement.style.display = 'block';

    } catch (error) {
        console.error('Failed to load application:', error);
        loadingElement.textContent = `Error: ${error.message}`;
        loadingElement.style.color = 'red';
    }
});