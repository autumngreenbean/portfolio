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
let isPeelAnimating = false;
let queuedTabIndex = null;

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
const contentPeel = document.getElementById('content-peel');

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    generateTabNumbers();
    initializeEventListeners();
    generateTabs();
    setActiveTab(0, { animate: false });
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
    setActiveTab(0, { animate: false });

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
    isPeelAnimating = false;
    queuedTabIndex = null;
    contentPeel.classList.remove('is-visible');
    contentPeel.classList.remove('is-divide');
    contentPeel.classList.add('hidden');
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
function setActiveTab(index, options = { animate: true }) {
    // Clamp index to valid range
    if (index < 0 || index >= tabData.length) {
        return;
    }

    if (isPeelAnimating) {
        queuedTabIndex = index;
        return;
    }

    const previousIndex = currentActiveTab;

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

    const shouldAnimate =
        options.animate !== false &&
        previousIndex !== index &&
        !popupModal.classList.contains('hidden');

    if (shouldAnimate) {
        animatePeelTransition(previousIndex, index);
    } else {
        updateContent(index);
    }
}

function animatePeelTransition(previousIndex, nextIndex) {
    if (!window.Peel || !Peel.supported || !contentPeel) {
        updateContent(nextIndex);
        return;
    }

    const topLayer = contentPeel.querySelector('.peel-top');
    const backLayer = contentPeel.querySelector('.peel-back');
    const bottomLayer = contentPeel.querySelector('.peel-bottom');

    topLayer.innerHTML = '';
    backLayer.innerHTML = '';
    bottomLayer.innerHTML = '';

    contentPeel.classList.remove('is-visible');
    contentPeel.classList.add('is-divide');
    contentPeel.classList.remove('hidden');
    isPeelAnimating = true;

    requestAnimationFrame(() => {
        contentPeel.classList.add('is-visible');
    });

    const peel = new Peel(contentPeel, {
        setPeelOnInit: false,
        topShadow: false,
        backShadow: false,
        backReflection: false,
        bottomShadow: false,
        clippingBoxScale: 1
    });

    const w = contentPeel.offsetWidth || 320;
    const h = contentPeel.offsetHeight || 220;

    const tabCount = tabData.length;
    const forwardDelta = (nextIndex - previousIndex + tabCount) % tabCount;
    const isForward = forwardDelta !== 0 && forwardDelta <= tabCount / 2;

    peel.setCorner(isForward ? Peel.Corners.TOP_RIGHT : Peel.Corners.TOP_LEFT);

    if (isForward) {
        // Forward peel: turns from right side toward left.
        peel.setPeelPath(
            w * 0.98, h * 0.02,
            w * 0.76, h * 0.12,
            w * 0.34, h * 0.62,
            -w * 0.18, h * 0.96
        );
    } else {
        // Backward peel: mirrored left-to-right motion.
        peel.setPeelPath(
            w * 0.02, h * 0.02,
            w * 0.24, h * 0.12,
            w * 0.66, h * 0.62,
            w * 1.18, h * 0.96
        );
    }

    peel.setFadeThreshold(0.72);
    peel.setTimeAlongPath(0.01);

    const duration = 1000;
    const start = performance.now();

    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function finish() {
        updateContent(nextIndex);
        contentPeel.classList.remove('is-visible');
        contentPeel.classList.remove('is-divide');
        contentPeel.classList.add('hidden');
        isPeelAnimating = false;

        if (queuedTabIndex !== null && queuedTabIndex !== currentActiveTab) {
            const queued = queuedTabIndex;
            queuedTabIndex = null;
            setActiveTab(queued);
        } else {
            queuedTabIndex = null;
        }
    }

    function step(now) {
        const t = Math.min((now - start) / duration, 1);
        peel.setTimeAlongPath(easeInOutCubic(t));

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            finish();
        }
    }

    requestAnimationFrame(step);
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
