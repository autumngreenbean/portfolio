// Theme Toggle Module
// Switches between modern transparent and Windows 95 theme

let currentTheme = 'modern'; // 'modern' or 'win95'

// Get theme message for display in form
export function getThemeMessage() {
    if (currentTheme === 'win95') {
        return 'pixel-perfect win95 theme made with pure css by kitten <3';
    } else {
        return 'lotus theme made with javascript and css by kitten <3';
    }
}

// Initialize theme toggle listener
export function initThemeToggle() {
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-file="theme-toggle"]');
        if (tab) {
            toggleTheme();
        }
    });
}

export function toggleTheme() {
    if (currentTheme === 'modern') {
        // Switch to Windows 95
        document.body.classList.add('win95-theme');
        currentTheme = 'win95';
        console.log('Switched to Windows 95 theme');
    } else {
        // Switch to Modern
        document.body.classList.remove('win95-theme');
        currentTheme = 'modern';
        console.log('Switched to Modern theme');
    }
    
    // Update any open theme-toggle form
    updateThemeForm();
}

function updateThemeForm() {
    const themeForm = document.getElementById('form-container-theme-toggle');
    if (themeForm) {
        const formContent = themeForm.querySelector('#form-content');
        if (formContent) {
            formContent.innerHTML = `<div style="color: rgba(255,255,255,0.9); padding: 20px; font-size: 14px; line-height: 1.6;">${getThemeMessage()}</div>`;
        }
    }
}

export function getCurrentTheme() {
    return currentTheme;
}

// Auto-initialize on module load
initThemeToggle();
