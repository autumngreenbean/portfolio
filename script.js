/* ========================================
   POP-UP INTERFACE SCRIPT
   Loads data from data/content.json
   ======================================== */

// ========================================
// GLOBAL STATE
// ========================================

let contentData = {};
let currentSheetName = null;
let tabData = [];
let tabNumbers = [];
let currentActiveTab = 0;

// ========================================
// DOM ELEMENT REFERENCES
// ========================================

const popupModal = document.getElementById('popup-modal');
const pageBg = document.getElementById('page-bg');
const leaveBtn = document.getElementById('leave-notebook');
const tabStrip = document.getElementById('tab-strip');
const tabContent = document.getElementById('tab-content');
const pageContainer = document.querySelector('.page-container');

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadContentJSON();
        createSheetButtons();
        initializeEventListeners();
    } catch (error) {
        console.error('Failed to initialize:', error);
        pageContainer.innerHTML = '<p style="color:red;">Failed to load content. Please refresh.</p>';
    }
});

// ========================================
// JSON LOADING
// ========================================

async function loadContentJSON() {
    const response = await fetch('data/content.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    contentData = await response.json();
    console.log('Content JSON loaded');
}

// ========================================
// LANDING PAGE BUTTONS
// ========================================

/**
 * Creates one button per sheet tab from _metadata.sheets.
 * Date sheets (MM/YYYY) are labelled "Jan 2025" style.
 */
function createSheetButtons() {
    const sheetNames = contentData._metadata?.sheets || [];

    if (sheetNames.length === 0) {
        pageContainer.innerHTML = '<p>No content sheets available.</p>';
        return;
    }

    pageContainer.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'sheet-buttons';

    for (const sheetName of sheetNames) {
        const btn = document.createElement('button');
        btn.className = 'sheet-button';
        btn.textContent = formatSheetLabel(sheetName);
        btn.onclick = () => openSheetNotebook(sheetName);
        container.appendChild(btn);
    }

    pageContainer.appendChild(container);
}

/**
 * Format sheet name for button label.
 * MM/YYYY → "Month YYYY"   |   anything else → as-is
 */
function formatSheetLabel(name) {
    const match = name.match(/^(\d{2})\/(\d{4})$/);
    if (match) {
        const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
        return `${MONTHS[parseInt(match[1], 10) - 1]} ${match[2]}`;
    }
    return name;
}

// ========================================
// OPEN / CLOSE NOTEBOOK
// ========================================

function openSheetNotebook(sheetName) {
    tabData = contentData[sheetName] || [];
    if (tabData.length === 0) return;

    currentSheetName = sheetName;
    currentActiveTab = 0;
    generateTabNumbers();

    pageContainer.style.display = 'none';
    popupModal.classList.remove('hidden');
    pageBg.classList.add('blurred');
    generateTabs();
    setActiveTab(0);

    requestAnimationFrame(() => popupModal.classList.add('is-open'));
}

function closePopup() {
    popupModal.classList.remove('is-open');
    popupModal.classList.add('hidden');
    pageBg.classList.remove('blurred');
    pageContainer.style.display = 'flex';
    currentSheetName = null;
    tabData = [];
}

// ========================================
// EVENT LISTENERS
// ========================================

function initializeEventListeners() {
    leaveBtn.addEventListener('click', closePopup);
    document.addEventListener('keydown', handleKeyNavigation);
}

function handleKeyNavigation(event) {
    if (popupModal.classList.contains('hidden')) return;

    if (event.key === 'ArrowLeft') {
        const i = currentActiveTab - 1;
        setActiveTab(i < 0 ? tabData.length - 1 : i);
    } else if (event.key === 'ArrowRight') {
        const i = currentActiveTab + 1;
        setActiveTab(i >= tabData.length ? 0 : i);
    }
}

// ========================================
// TAB NUMBER GENERATION
// ========================================

/**
 * Assigns each tab a display number.
 * Date sheets (MM/YYYY): parses the entry header as the day number (1–31).
 *   Single-digit (1–9)  → tab-single-unit asset.
 *   Double-digit (10–31) → tab-double-unit asset.
 * Non-date sheets (e.g. "Video Games"): uses null → CSS adaptive text tab.
 */
function generateTabNumbers() {
    const isDateSheet = /^\d{2}\/\d{4}$/.test(currentSheetName);
    tabNumbers = tabData.map(item =>
        isDateSheet ? parseInt(item.header, 10) : null
    );
}

function getTabAsset(number, isActive) {
    const unit = number >= 10 ? 'double' : 'single';
    const invert = isActive ? '_invert' : '';
    return `assets/tab-${unit}-unit${invert}.png`;
}

// ========================================
// TAB GENERATION
// ========================================

function generateTabs() {
    tabStrip.innerHTML = '';

    tabData.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'tab';
        if (i === currentActiveTab) div.classList.add('active');
        div.dataset.tabIndex = i;

        const tabNum = tabNumbers[i];

        if (tabNum === null) {
            // Non-date sheet: CSS-styled adaptive text tab (no image asset).
            div.classList.add('text-tab');

            const label = document.createElement('span');
            label.className = 'tab-label';
            label.textContent = item.header;
            div.appendChild(label);
        } else {
            // Date sheet: image asset sized to the day number.
            const img = document.createElement('img');
            img.className = 'tab-img';
            img.src = getTabAsset(tabNum, i === currentActiveTab);
            img.alt = '';

            const label = document.createElement('span');
            label.className = 'tab-label';
            label.textContent = String(tabNum);

            div.appendChild(img);
            div.appendChild(label);
        }

        div.onclick = () => setActiveTab(i);
        tabStrip.appendChild(div);
    });
}

// ========================================
// TAB SWITCHING & CONTENT
// ========================================

function setActiveTab(index) {
    if (index < 0 || index >= tabData.length) return;
    currentActiveTab = index;

    // Toggle active class and update image assets for date tabs
    let activeTabEl = null;
    document.querySelectorAll('.tab').forEach((tab, i) => {
        const isActive = i === index;
        tab.classList.toggle('active', isActive);
        if (isActive) activeTabEl = tab;

        const img = tab.querySelector('.tab-img');
        if (img) {
            img.src = getTabAsset(tabNumbers[i], isActive);
        }
    });

    // Scroll so the active tab sits at the LEFT edge of the strip.
    // Deferred to rAF so offsetLeft is resolved after the browser lays out the tabs.
    if (activeTabEl) {
        requestAnimationFrame(() => {
            tabStrip.scrollTo({ left: activeTabEl.offsetLeft, behavior: 'smooth' });
        });
    }

    // Render content
    const item = tabData[index];
    tabContent.querySelector('.content-header').textContent = resolveHeader(item.header);
    tabContent.querySelector('.content-subheader').textContent = item.subheader || '';
    // Use innerHTML to preserve line breaks; escape content first to prevent injection
    const bodyEl = tabContent.querySelector('.content-body');
    bodyEl.innerHTML = escapeHtml(item.body || '').replace(/\n/g, '<br>');
}

/**
 * Escape HTML special characters for safe innerHTML insertion.
 */
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Returns col B value as-is for all sheet types.
 */
function resolveHeader(rawHeader) {
    return rawHeader;
}
