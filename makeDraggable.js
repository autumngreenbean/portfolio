export function makeDraggable(element, header, zIndexCounter) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    // Function to start the drag
    function startDrag(e) {
        isDragging = true;
        // Use either touch or mouse clientX/clientY values
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        offsetX = clientX - element.offsetLeft;
        offsetY = clientY - element.offsetTop;

        // Update z-index to bring the element to the front
        element.style.zIndex = zIndexCounter.current++;

        // Disable text selection while dragging
        document.body.style.userSelect = 'none';

        // Prevent default behavior (e.g., preventing scrolling when dragging)
        e.preventDefault();
    }

    // Function to move the element
    function moveElement(e) {
        if (!isDragging) return;

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        let newX = clientX - offsetX;
        let newY = clientY - offsetY;

        // Move the form to the new position
        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
    }

    // Function to stop the drag
    function stopDrag() {
        if (!isDragging) return;

        isDragging = false;
        document.body.style.userSelect = ''; // Re-enable text selection
    }

    // Add event listeners for mouse events
    header.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveElement);
    document.addEventListener('mouseup', stopDrag);

    // Add event listeners for touch events (for mobile compatibility)
    header.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', moveElement);
    document.addEventListener('touchend', stopDrag);
}
