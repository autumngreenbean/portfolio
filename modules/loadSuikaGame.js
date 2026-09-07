// Load Suika Zoo game into a window using iframe

export async function loadSuikaGame(container) {
    // Create iframe to load the game
    container.innerHTML = `
        <style>
            #zoo-game-iframe {
                width: 100%;
                height: 100%;
                min-width: 600px;
                min-height: 500px;
                border: none;
                display: block;
                background: #ffffff;
            }
        </style>
        <iframe 
            id="zoo-game-iframe"
            src="./modules/suika-zoo/index.html"
            title="Suika Zoo Game"
            allow="fullscreen"
            loading="eager">
        </iframe>
    `;
    
    // Listen for resize messages from the iframe
    window.addEventListener('message', (event) => {
        if (event.data.type === 'suika-zoo-resize') {
            const { width, height } = event.data;
            const iframe = document.getElementById('zoo-game-iframe');
            const formContainer = container.closest('.form-container');
            const formHeader = formContainer?.querySelector('#form-header');
            
            if (iframe && formContainer) {
                // Update iframe dimensions
                iframe.style.width = `${width}px`;
                iframe.style.height = `${height}px`;
                
                // Update container dimensions
                formContainer.style.width = `${width}px`;
                formContainer.style.minWidth = `${width}px`;
                formContainer.style.maxWidth = `${width}px`;
                formContainer.style.height = 'auto';
                
                // Update header width
                if (formHeader) {
                    formHeader.style.width = `${width}px`;
                    formHeader.style.minWidth = `${width}px`;
                    formHeader.style.maxWidth = `${width}px`;
                }
            }
        }
    });
}
