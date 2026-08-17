// Load Suika Zoo game into a window using iframe

export async function loadSuikaGame(container) {
    // Create iframe to load the game
    container.innerHTML = `
        <style>
            #zoo-game-iframe {
                width: 820px;
                height: 605px;
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
}
