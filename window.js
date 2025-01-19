

// Function to handle the minimize button
// window.js - Updated minimize functionality
export function handleMinimize(formContainer) {
    const minimizeBtn = formContainer.querySelector('#minimize-btn');
    const formContent = formContainer.querySelector('#form-content');
    let isMinimized = false;

    minimizeBtn.addEventListener('click', () => {
        isMinimized = !isMinimized;
        formContent.style.display = isMinimized ? 'none' : 'block';
    });
}
