export function makeDraggable(element, header, zIndexCounter) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    // Set initial z-index on drag start
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;

        // Update z-index to make sure it's on top while dragging
        element.style.zIndex = zIndexCounter.current++; // Dynamically update z-index during dragging

        // Disable text selection while dragging
        document.body.style.userSelect = 'none';

        // Prevent default behavior (so elements underneath don't get affected)
        e.preventDefault();
    });

    // Handle mousemove while dragging
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // Move the form to the new position
        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
    });

    // Handle mouseup to stop dragging
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;

        isDragging = false;
        document.body.style.userSelect = ''; // Re-enable text selection
    });
}
