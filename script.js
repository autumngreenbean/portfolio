/* ========================================
   POP-UP INTERFACE SCRIPT
   Front-end proof of concept
   ======================================== */

// ========================================
// DATA: HARDCODED DUMMY TAB CONTENT
// Tab labels are random numbers generated at init.
// Single-digit (1–9) use tab-single-unit assets.
// Double-digit (10–99) use tab-double-unit assets.
// ========================================

const tabData = [
    {
        header: 'Header Tab 1',
        subheader: 'Subheader Tab 1',
        body: 'Body Tab 1xt ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset shext ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset shext ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset shext ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset shext ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset shext ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset shext ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset shext ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset she'
    },
    {
        header: 'Header Tab 2',
        subheader: 'Subheader Tab 2',
        body: 'Body Tab 2'
    },
    {
        header: 'Header Tab 3',
        subheader: 'Subheader Tab 3',
        body: 'Body Tab 3'
    },
    {
        header: 'Header Tab 4',
        subheader: 'Subheader Tab 4',
        body: 'Body Tab 4'
    },
    {
        header: 'Header Tab 5',
        subheader: 'Subheader Tab 5',
        body: 'Body Tab 5'
    }
    ,    {
        header: 'Header Tab 1',
        subheader: 'Subheader Tab 1',
        body: 'Body Tab 1'
    },
    {
        header: 'Header Tab 2',
        subheader: 'Subheader Tab 2',
        body: 'Body Tab 2'
    },
    {
        header: 'Header Tab 3',
        subheader: 'Subheader Tab 3',
        body: 'Body Tab 3'
    },
    {
        header: 'Header Tab 4',
        subheader: 'Subheader Tab 4',
        body: 'Body Tab 4'
    },
    {
        header: 'Header Tab 5',
        subheader: 'Subheader Tab 5',
        body: 'Body Tab 5'
    },    {
        header: 'Header Tab 1',
        subheader: 'Subheader Tab 1',
        body: 'Body Tab 1'
    },
    {
        header: 'Header Tab 2',
        subheader: 'Subheader Tab 2',
        body: 'Body Tab 2'
    },
    {
        header: 'Header Tab 3',
        subheader: 'Subheader Tab 3',
        body: 'Body Tab 3'
    },
    {
        header: 'Header Tab 4',
        subheader: 'Subheader Tab 4',
        body: 'Body Tab 4'
    },
    {
        header: 'Header Tab 5',
        subheader: 'Subheader Tab 5',
        body: 'Body Tab 5'
    }
];

// Generated once at init. Each entry is a number 1–99.
let tabNumbers = [];

// ========================================
// STATE MANAGEMENT
// ========================================

let currentActiveTab = 0; // Index of the currently active tab

// ========================================
// DOM ELEMENT REFERENCES
// ========================================

const popupModal = document.getElementById('popup-modal');
const openBtn = document.getElementById('open-popup');
const leaveBtn = document.getElementById('leave-notebook');
const tabStrip = document.getElementById('tab-strip');
const tabContent = document.getElementById('tab-content');

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    generateTabNumbers();
    initializeEventListeners();
    generateTabs();
    setActiveTab(0);
});

// ========================================
// EVENT LISTENER SETUP
// ========================================

function initializeEventListeners() {
    // Open button
    openBtn.addEventListener('click', openPopup);
    leaveBtn.addEventListener('click', closePopup);

    // Arrow key navigation
    document.addEventListener('keydown', handleKeyNavigation);
}

// ========================================
// POP-UP CONTROL
// ========================================

/**
 * Opens the pop-up modal
 */
function openPopup() {
    popupModal.classList.remove('hidden');
    openBtn.classList.add('hidden');
    currentActiveTab = 0;
    generateTabNumbers(); // Regenerate random numbers on each open
    generateTabs();
    setActiveTab(0);

    // Wait one frame so the browser can apply the initial state,
    // then add the open class to trigger the entrance animation.
    requestAnimationFrame(() => {
        popupModal.classList.add('is-open');
    });
}

/**
 * Closes the pop-up modal
 */
function closePopup() {
    popupModal.classList.remove('is-open');
    popupModal.classList.add('hidden');
    openBtn.classList.remove('hidden');
}

// ========================================
// TAB NUMBER GENERATION
// ========================================

/**
 * Generates random numbers for each tab.
 * Each number is either single-digit (1–9) or double-digit (10–99).
 * 50/50 chance per tab.
 */
function generateTabNumbers() {
    tabNumbers = tabData.map(() => {
        return Math.random() < 0.5
            ? Math.floor(Math.random() * 9) + 1    // 1–9  → single-unit asset
            : Math.floor(Math.random() * 90) + 10; // 10–99 → double-unit asset
    });
}

/**
 * Returns the correct asset path for a tab based on its number and active state.
 * Single-digit numbers (1–9) use tab-single-unit assets.
 * Double-digit numbers (10–99) use tab-double-unit assets.
 * Active tabs use the _invert variant.
 * @param {number} number - The tab's numeric label
 * @param {boolean} isActive - Whether this tab is currently active
 * @returns {string} Asset path
 */
function getTabAsset(number, isActive) {
    const isDouble = number >= 10;
    const variant = isActive ? '_invert' : '';
    return isDouble
        ? `assets/tab-double-unit${variant}.png`
        : `assets/tab-single-unit${variant}.png`;
}

// ========================================
// TAB GENERATION
// ========================================

/**
 * Generates all tabs dynamically from tabData
 */
function generateTabs() {
    tabStrip.innerHTML = ''; // Clear existing tabs

    tabData.forEach((tab, index) => {
        const tabElement = createTabElement(tabNumbers[index], index);
        tabStrip.appendChild(tabElement);
    });
}

/**
 * Creates a single tab element: one image asset with a number label centered on top.
 * @param {number} number - The numeric label for this tab
 * @param {number} index - The tab index
 * @returns {HTMLElement} - The tab element
 */
function createTabElement(number, index) {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tabIndex = index;
    tab.dataset.tabNumber = number; // stored so updateTabImages() can pick the right asset

    // Tab image: single asset (no three-part composition)
    const img = document.createElement('img');
    img.className = 'tab-img';
    img.src = getTabAsset(number, false);
    img.alt = '';

    // Number label centered over the tab image
    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = number;

    tab.appendChild(img);
    tab.appendChild(label);

    tab.addEventListener('click', () => {
        setActiveTab(index);
    });

    return tab;
}

/**
 * Updates every tab's image src based on whether it is active or not.
 */
function updateTabImages() {
    document.querySelectorAll('.tab').forEach((tab) => {
        const index = parseInt(tab.dataset.tabIndex);
        const number = parseInt(tab.dataset.tabNumber);
        const isActive = index === currentActiveTab;
        const img = tab.querySelector('.tab-img');
        img.src = getTabAsset(number, isActive);
    });
}

// ========================================
// TAB SWITCHING & CONTENT UPDATES
// ========================================

/**
 * Sets a tab as active and updates content
 * @param {number} index - The index of the tab to activate
 */
function setActiveTab(index) {
    // Clamp index to valid range
    if (index < 0 || index >= tabData.length) {
        return;
    }

    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach((tab) => {
        tab.classList.remove('active');
    });

    // Set new active tab
    const activeTabElement = document.querySelector(
        `.tab[data-tab-index="${index}"]`
    );
    if (activeTabElement) {
        activeTabElement.classList.add('active');
    }

    // Update current active tab state
    currentActiveTab = index;

    // Update tab images based on active state
    updateTabImages();

    updateContent(index);
}

/**
 * Updates the content area based on the active tab
 * @param {number} index - The index of the active tab
 */
function updateContent(index) {
    const tab = tabData[index];

    const headerEl = tabContent.querySelector('.content-header');
    const subheaderEl = tabContent.querySelector('.content-subheader');
    const bodyEl = tabContent.querySelector('.content-body');

    if (headerEl) headerEl.textContent = tab.header;
    if (subheaderEl) subheaderEl.textContent = tab.subheader;
    if (bodyEl) bodyEl.textContent = tab.body;
}

// ========================================
// KEYBOARD NAVIGATION
// ========================================

/**
 * Handles Left/Right arrow key navigation
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyNavigation(event) {
    // Only handle if pop-up is open
    if (popupModal.classList.contains('hidden')) {
        return;
    }

    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateTabs(-1);
    } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateTabs(1);
    }
}

/**
 * Navigates to the next or previous tab
 * @param {number} direction - Direction to navigate (1 for next, -1 for previous)
 */
function navigateTabs(direction) {
    const nextIndex = currentActiveTab + direction;

    // Wrap around
    if (nextIndex < 0) {
        setActiveTab(tabData.length - 1);
    } else if (nextIndex >= tabData.length) {
        setActiveTab(0);
    } else {
        setActiveTab(nextIndex);
    }
}
