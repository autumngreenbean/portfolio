export function handleMinimize(formContainer) {
    const minimizeBtn = formContainer.querySelector('#minimize-btn');
    const formContent = formContainer.querySelector('#form-content');
    let isMinimized = false;

    // Function to toggle form visibility
    function toggleMinimize(e) {
        // Prevent the default behavior (such as text selection or scrolling)
        e.preventDefault();
        
        isMinimized = !isMinimized;
        formContent.style.display = isMinimized ? 'none' : 'block';
    }

    // Add event listeners for mouse and touch events
    minimizeBtn.addEventListener('click', toggleMinimize);  // For desktop (mouse click)
    minimizeBtn.addEventListener('touchstart', toggleMinimize);  // For mobile (touch start)
}
