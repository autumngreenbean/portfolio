export function makeDraggable(element, header) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    let lastX = 0;
    let lastY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let animationFrameId = null;

    // Function to start the drag
    function startDrag(e) {
        isDragging = true;
        
        // Stop any ongoing fling animation
        cancelAnimationFrame(animationFrameId);

        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

        offsetX = clientX - element.offsetLeft;
        offsetY = clientY - element.offsetTop;

        lastX = clientX;
        lastY = clientY;
        velocityX = 0;
        velocityY = 0;

        document.body.style.userSelect = 'none';
        e.preventDefault();
    }

    // Function to move the element
    function moveElement(e) {
        if (!isDragging) return;

        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

        let newX = clientX - offsetX;
        let newY = clientY - offsetY;

        // Calculate velocity
        velocityX = clientX - lastX;
        velocityY = clientY - lastY;

        lastX = clientX;
        lastY = clientY;

        // Move the element
        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
    }

    // Function to stop the drag and apply fling effect
    function stopDrag() {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.userSelect = '';

        function applyMomentum() {
            velocityX *= 0.95; // Slow down over time (friction effect)
            velocityY *= 0.95;

            let newX = element.offsetLeft + velocityX;
            let newY = element.offsetTop + velocityY;

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;

            // Continue animation until velocity is nearly zero
            if (Math.abs(velocityX) > 0.5 || Math.abs(velocityY) > 0.5) {
                animationFrameId = requestAnimationFrame(applyMomentum);
            }
        }

        // Start momentum animation
        requestAnimationFrame(applyMomentum);
    }

    // Add event listeners for mouse events
    header.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveElement);
    document.addEventListener('mouseup', stopDrag);

    // Add event listeners for touch events
    header.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', moveElement);
    document.addEventListener('touchend', stopDrag);

    
}

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




