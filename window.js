

// Function to handle the minimize button
export function handleMinimize() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const formContent = document.getElementById('form-content');
    let isMinimized = false;

    minimizeBtn.addEventListener('click', () => {
        isMinimized = !isMinimized;
        formContent.style.display = isMinimized ? 'none' : 'block';
    });
}