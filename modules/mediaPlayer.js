import { makeDraggable } from './makeDraggable.js';

// Shared z-index counter for all windows
if (!window.windowZIndexCounter) {
    window.windowZIndexCounter = { current: 1000 };
}

function bringWindowToFront(windowElement) {
    if (!windowElement) return;
    const topZ = window.windowZIndexCounter.current++;
    windowElement.style.zIndex = topZ;
}

function detectMobileLayout() {
    if (typeof window !== 'undefined' && typeof window.detectMobileLayout === 'function') {
        return !!window.detectMobileLayout();
    }

    const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenWidth = window.screen && window.screen.width ? window.screen.width : window.innerWidth;
    const viewportWidth = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth, screenWidth);
    return userAgentMobile || screenWidth <= 768 || viewportWidth <= 768;
}

// Modular playlist — add entries as { title, src, art (optional img src) }
const playlist = [
    { title: 'SHIBUYA-KEI 2026_07-25', src: './modules/assets/shibuyakei.mp3' },
    { title: 'footwork 2026_07-18', src: './modules/assets/autumns livestream set.mp3' },
    { title: 'kitten\'s first set 2025_07-25', src: './modules/assets/first set.mp3' },
];

const state = {
    currentTrack: 0,
    isShuffled: false,
    repeatMode: 'none', // 'none' | 'one' | 'all'
};

const uiBindings = [];
let audio;

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// SVG Icon functions
function getPlaySvg(size = 24) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5v14l11-7z" fill="currentColor"/>
    </svg>`;
}

function getPauseSvg(size = 24) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="currentColor"/>
    </svg>`;
}

function getPlayLabel(paused) {
    return paused ? 'Play' : 'Pause';
}

function getRepeatLabel(mode) {
    if (mode === 'one') return 'Rpt1';
    if (mode === 'all') return 'RptA';
    return 'Rpt';
}

function syncAllUi() {
    const current = playlist[state.currentTrack];
    uiBindings.forEach((ui) => {
        if (ui.trackTitle) ui.trackTitle.textContent = current?.title ?? '—';
        if (ui.miniTitle) ui.miniTitle.textContent = current?.title ?? '—';
        if (ui.playBtn) {
            if (ui.useSymbolPlay) {
                ui.playBtn.innerHTML = audio.paused ? getPlaySvg(24) : getPauseSvg(24);
            } else {
                ui.playBtn.textContent = getPlayLabel(audio.paused);
            }
        }
        if (ui.miniPlayBtn) {
            if (ui.useSymbolPlay) {
                ui.miniPlayBtn.innerHTML = audio.paused ? getPlaySvg(16) : getPauseSvg(16);
            } else {
                ui.miniPlayBtn.textContent = getPlayLabel(audio.paused);
            }
        }
        if (ui.durationEl) ui.durationEl.textContent = formatTime(audio.duration || 0);
        if (ui.currentTimeEl) ui.currentTimeEl.textContent = formatTime(audio.currentTime || 0);
        if (ui.progress && audio.duration) {
            ui.progress.value = (audio.currentTime / audio.duration) * 100;
        }
        if (ui.volumeSlider) ui.volumeSlider.value = String(audio.volume);
        if (ui.shuffleBtn) {
            ui.shuffleBtn.style.opacity = state.isShuffled ? '1' : '0.4';
            ui.shuffleBtn.title = `Shuffle: ${state.isShuffled ? 'on' : 'off'}`;
        }
        if (ui.repeatBtn) {
            ui.repeatBtn.style.opacity = state.repeatMode !== 'none' ? '1' : '0.4';
            ui.repeatBtn.title = `Repeat: ${state.repeatMode}`;
            ui.repeatBtn.textContent = getRepeatLabel(state.repeatMode);
        }
        if (ui.artEl) {
            if (current?.art) {
                ui.artEl.innerHTML = `<img src="${current.art}" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                ui.artEl.textContent = 'ART';
            }
        }
        if (ui.renderPlaylist) ui.renderPlaylist();
        if (ui.renderMenuList) ui.renderMenuList();
    });
}

function playTrack(index, shouldAutoplay = true) {
    state.currentTrack = index;
    const track = playlist[index];
    if (!track) return;
    audio.src = track.src;
    audio.load();
    if (shouldAutoplay) {
        audio.play().catch(() => {});
    }
    syncAllUi();
}

function stepTrack(direction) {
    if (!playlist.length) return;
    const nextIndex = (state.currentTrack + direction + playlist.length) % playlist.length;
    playTrack(nextIndex, true);
}

function bindCommonControls(ui) {
    ui.playBtn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
    });

    ui.prevBtn.addEventListener('click', () => stepTrack(-1));
    ui.nextBtn.addEventListener('click', () => stepTrack(1));

    if (ui.miniPlayBtn) {
        ui.miniPlayBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play().catch(() => {});
            } else {
                audio.pause();
            }
        });
    }
    if (ui.miniPrevBtn) ui.miniPrevBtn.addEventListener('click', () => stepTrack(-1));
    if (ui.miniNextBtn) ui.miniNextBtn.addEventListener('click', () => stepTrack(1));

    ui.progress.addEventListener('input', () => {
        if (audio.duration) {
            audio.currentTime = (Number(ui.progress.value) / 100) * audio.duration;
        }
        syncAllUi();
    });

    if (ui.volumeSlider) {
        ui.volumeSlider.addEventListener('input', () => {
            audio.volume = Number(ui.volumeSlider.value);
            syncAllUi();
        });
    }

    if (ui.shuffleBtn) {
        ui.shuffleBtn.addEventListener('click', () => {
            state.isShuffled = !state.isShuffled;
            syncAllUi();
        });
    }

    const repeatModes = ['none', 'one', 'all'];
    if (ui.repeatBtn) {
        ui.repeatBtn.addEventListener('click', () => {
            state.repeatMode = repeatModes[(repeatModes.indexOf(state.repeatMode) + 1) % repeatModes.length];
            syncAllUi();
        });
    }
}

function createWindowPlayer() {
    const isMobile = detectMobileLayout();
    const player = document.createElement('div');
    player.id = 'media-player';

    player.style.position = 'absolute';
    player.style.top = '60px';
    player.style.left = '60px';
    player.style.transform = 'translate(0, 0)';
    player.style.width = '620px';
    player.style.minWidth = '420px';
    player.style.maxWidth = '90vw';
    player.style.resize = 'horizontal';
    player.style.borderRadius = '2px';
    player.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    player.style.zIndex = String(window.windowZIndexCounter.current);
    player.style.backdropFilter = isMobile ? 'none' : 'blur(5px)';
    player.style.webkitBackdropFilter = isMobile ? 'none' : 'blur(5px)';
    player.style.outline = '1px solid rgba(255, 255, 255, 0.2)';
    player.style.background = 'rgba(255, 255, 255, 0.08)';
    player.style.overflow = 'hidden';
    player.style.cursor = 'grab';

    player.innerHTML = `
        <div id="mp-header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        ">
            <span style="font-size: 14px; letter-spacing: 0.08em; opacity: 0.85;">meowsic</span>
            <button id="mp-minimize-btn" style="
                background: transparent;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 22px;
                line-height: 1;
                padding: 0 2px;
            ">−</button>
        </div>

        <div id="mp-body">
            <div style="
                background: rgba(0, 0, 0, 0.62);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                padding: 18px 18px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.07);
            ">
                <div style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 18px;">
                    <div id="mp-art" style="
                        width: 80px;
                        height: 80px;
                        flex-shrink: 0;
                        border-radius: 4px;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        background: rgba(255, 255, 255, 0.05);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 28px;
                        overflow: hidden;
                    ">ART</div>
                    <div style="flex: 1; min-width: 0; padding-top: 2px;">
                        <div id="mp-track-title" style="
                            font-size: 14px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            margin-bottom: 8px;
                            opacity: 0.9;
                        ">—</div>
                        <div style="font-size: 12px; opacity: 0.45; letter-spacing: 0.04em; margin-bottom: 3px;">Now Playing artist:</div>
                        <div id="mp-artist-display" style="
                            font-size: 13px;
                            opacity: 0.6;
                            font-style: italic;
                        ">&lt;element&gt;</div>
                    </div>
                </div>

                <input id="mp-progress" type="range" min="0" max="100" value="0" style="
                    width: 100%;
                    cursor: pointer;
                    accent-color: rgba(255, 255, 255, 0.75);
                    height: 5px;
                    margin-top: 18px;
                    margin-bottom: 10px;
                    display: block;
                ">
                <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.45; margin-bottom: 12px;">
                    <span id="mp-current-time">00:00</span>
                    <span id="mp-duration">00:00</span>
                </div>

                <div style="display: flex; align-items: center; justify-content: center; gap: 14px;">
                    <button id="mp-skip-back" title="Back 10 seconds" style="
                        background: transparent; border: none; color: white;
                        font-size: 12px; cursor: pointer; opacity: 0.8; padding: 0;
                    ">-10s</button>
                    <div style="display: flex; align-items: center; gap: 12px; justify-content: center;">
                        <button id="mp-prev" title="Previous" style="
                            background: transparent; border: none; color: white;
                            font-size: 16px; cursor: pointer; opacity: 0.7; padding: 0;
                        ">< back</button>
                        <button id="mp-play" title="Play / Pause" style="
                            background: rgba(255, 255, 255, 0.12);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            color: skyblue;
                            font-size: 24px;
                            cursor: pointer;
                            border-radius: 50%;
                            width: 58px;
                            height: 58px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 0;
                            padding-left: 2px;
                        ">${getPlaySvg(24)}</button>
                        <button id="mp-next" title="Next" style="
                            background: transparent; border: none; color: white;
                            font-size: 16px; cursor: pointer; opacity: 0.7; padding: 0;
                        ">skip ></button>
                    </div>
                    <button id="mp-skip-forward" title="Forward 10 seconds" style="
                        background: transparent; border: none; color: white;
                        font-size: 12px; cursor: pointer; opacity: 0.8; padding: 0;
                    ">+10s</button>
                </div>
            </div>

            <div style="
                background: rgba(0, 0, 0, 0.52);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                padding: 10px 12px 12px;
            ">
                <div style="font-size: 9px; letter-spacing: 0.12em; opacity: 0.35; margin-bottom: 8px;">Listen and enjoy... (psst! hit play, use your system's built-in media interface for ease of control <3) </div>
                <div id="mp-playlist-items" style="max-height: 148px; overflow-y: auto;"></div>
            </div>
        </div>

        <div id="mp-mini" style="
            display: none;
            align-items: center;
            gap: 10px;
            padding: 7px 12px;
            background: rgba(0, 0, 0, 0.55);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        ">
            <button id="mp-mini-prev" title="Previous" style="background:transparent;border:none;color:white;font-size:12px;cursor:pointer;opacity:0.7;padding:0;flex-shrink:0;">Prev</button>
            <button id="mp-mini-play" title="Play / Pause" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:white;font-size:12px;cursor:pointer;border-radius:0px;width:36px;height:28px;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;">Play</button>
            <button id="mp-mini-next" title="Next" style="background:transparent;border:none;color:white;font-size:12px;cursor:pointer;opacity:0.7;padding:0;flex-shrink:0;">Next</button>
            <span id="mp-mini-title" style="font-size:11px;opacity:0.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;">—</span>
        </div>
    `;

    document.body.appendChild(player);

    const ui = {
        root: player,
        useSymbolPlay: true,
        playBtn: player.querySelector('#mp-play'),
        prevBtn: player.querySelector('#mp-prev'),
        nextBtn: player.querySelector('#mp-next'),
        progress: player.querySelector('#mp-progress'),
        currentTimeEl: player.querySelector('#mp-current-time'),
        durationEl: player.querySelector('#mp-duration'),
        trackTitle: player.querySelector('#mp-track-title'),
        artEl: player.querySelector('#mp-art'),
        listEl: player.querySelector('#mp-playlist-items'),
        miniPlayBtn: player.querySelector('#mp-mini-play'),
        miniPrevBtn: player.querySelector('#mp-mini-prev'),
        miniNextBtn: player.querySelector('#mp-mini-next'),
        miniTitle: player.querySelector('#mp-mini-title'),
    };

    const skipBackBtn = player.querySelector('#mp-skip-back');
    const skipForwardBtn = player.querySelector('#mp-skip-forward');
    const skipBySeconds = (seconds) => {
        if (!audio) return;
        const minTime = 0;
        const maxTime = audio.duration || 0;
        const nextTime = Math.min(Math.max((audio.currentTime || 0) + seconds, minTime), maxTime);
        audio.currentTime = nextTime;
        syncAllUi();
    };

    if (skipBackBtn) {
        skipBackBtn.addEventListener('click', () => skipBySeconds(-10));
    }
    if (skipForwardBtn) {
        skipForwardBtn.addEventListener('click', () => skipBySeconds(10));
    }

    ui.renderPlaylist = () => {
        ui.listEl.innerHTML = '';
        playlist.forEach((track, i) => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 5px 8px;
                font-size: 11px;
                cursor: pointer;
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
                opacity: ${i === state.currentTrack ? '1' : '0.55'};
                background: ${i === state.currentTrack ? 'rgba(255,255,255,0.07)' : 'transparent'};
                transition: background 0.12s;
                white-space: nowrap;
                overflow: hidden;
            `;
            item.innerHTML = `
                <span style="flex-shrink:0; font-size:9px; color:skyblue">${i === state.currentTrack ? 'Now' : ''}</span>
                <span style="overflow:hidden; text-overflow:ellipsis;">${track.title}</span>
            `;
            item.addEventListener('click', () => playTrack(i, true));
            item.addEventListener('mouseenter', () => {
                if (i !== state.currentTrack) item.style.background = 'rgba(255,255,255,0.04)';
            });
            item.addEventListener('mouseleave', () => {
                if (i !== state.currentTrack) item.style.background = 'transparent';
            });
            ui.listEl.appendChild(item);
        });
    };

    bindCommonControls(ui);

    const minimizeBtn = player.querySelector('#mp-minimize-btn');
    const mpBody = player.querySelector('#mp-body');
    const mpMini = player.querySelector('#mp-mini');
    let minimized = false;
    function toggleMinimize(e) {
        e.preventDefault();
        minimized = !minimized;
        mpBody.style.display = minimized ? 'none' : 'block';
        mpMini.style.display = minimized ? 'flex' : 'none';
        player.style.resize = minimized ? 'none' : 'horizontal';
    }
    minimizeBtn.addEventListener('click', toggleMinimize);
    minimizeBtn.addEventListener('touchstart', toggleMinimize);

    const mpHeader = player.querySelector('#mp-header');
    
    // Bring to front on header click
    const bringToFront = () => bringWindowToFront(player);
    mpHeader.addEventListener('pointerdown', bringToFront);
    mpHeader.addEventListener('mousedown', bringToFront);
    player.addEventListener('pointerdown', bringToFront);
    player.addEventListener('mousedown', bringToFront);

    player.addEventListener('mousedown', () => { player.style.cursor = 'grabbing'; });
    document.addEventListener('mouseup', () => { player.style.cursor = 'grab'; });
    makeDraggable(player, mpHeader);

    uiBindings.push(ui);
}

function createWidePlayer() {
    const wide = document.createElement('div');
    wide.id = 'media-player-wide';
    const mobileMode = detectMobileLayout();
    wide.dataset.mobileMode = String(mobileMode);
    wide.style.position = 'fixed';
    wide.style.left = '0';
    wide.style.bottom = '0';
    wide.style.width = '100vw';
    wide.style.zIndex = '985';
    wide.style.background = 'rgba(255, 255, 255, 0.62)';
    wide.style.backdropFilter = 'blur(8px)';
    wide.style.webkitBackdropFilter = 'blur(8px)';
    wide.style.outline = '1px solid rgba(255, 255, 255, 0.45)';
    wide.style.borderTop = '1px solid rgba(255, 255, 255, 0.45)';
    wide.style.padding = '8px 10px';
    wide.style.zIndex = '99999';

    if (mobileMode) {
        wide.style.height = 'auto';
        wide.style.minHeight = '80px';
        wide.style.background = 'rgba(0, 0, 0, 0.92)';
        wide.style.backdropFilter = 'blur(12px)';
        wide.style.webkitBackdropFilter = 'blur(12px)';
        wide.style.borderTop = '1px solid rgba(255, 255, 255, 0.08)';
        console.log('Mobile mode: wide player NTS-style');
        wide.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; width:100%;">
                <div id="w-art" style="
                    width:60px;
                    height:60px;
                    flex-shrink:0;
                    background: rgba(255, 255, 255, 0.05);
                    border:1px solid rgba(255, 255, 255, 0.1);
                    border-radius:2px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:9px;
                    color:rgba(255,255,255,0.4);
                    letter-spacing:0.1em;
                ">ART</div>
                
                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                    <button id="w-prev" title="Previous" style="background:transparent;border:none;color:rgba(255,255,255,0.7);font-size:18px;cursor:pointer;padding:0;line-height:1;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">‹</button>
                    <button id="w-play" title="Play / Pause" style="
                        background:rgba(255,255,255,0.95);
                        border:none;
                        color:rgba(0,0,0,0.9);
                        font-size:14px;
                        cursor:pointer;
                        border-radius:50%;
                        width:36px;
                        height:36px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        padding:0;
                        padding-left:2px;
                        flex-shrink:0;
                    ">${getPlaySvg(16)}</button>
                    <button id="w-next" title="Next" style="background:transparent;border:none;color:rgba(255,255,255,0.7);font-size:18px;cursor:pointer;padding:0;line-height:1;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">›</button>
                </div>
                
                <div style="flex:1; min-width:0; display:flex; align-items:center; justify-content:center;">
                    <div style="width:100%; display:flex; flex-direction:column; gap:2px;">
                        <input id="w-progress" type="range" min="0" max="100" value="0" style="
                            width:100%;
                            cursor:pointer;
                            accent-color: rgba(255,255,255,0.9);
                            height:2px;
                            margin:0;
                        ">
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                            <span id="w-current-time" style="font-size:9px; color:rgba(255,255,255,0.5);">00:00</span>
                            <div id="w-track-title" style="
                                font-size:10px;
                                color:rgba(255,255,255,0.75);
                                white-space:nowrap;
                                overflow:hidden;
                                text-overflow:ellipsis;
                                flex:1;
                                text-align:center;
                                min-width:0;
                            ">—</div>
                            <span id="w-duration" style="font-size:9px; color:rgba(255,255,255,0.5);">00:00</span>
                        </div>
                    </div>
                </div>
                
                <div id="w-logo-area" style="
                    width:50px;
                    height:60px;
                    flex-shrink:0;
                    background: rgba(255, 255, 255, 0.03);
                    border:1px solid rgba(255, 255, 255, 0.08);
                    border-radius:2px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    overflow:hidden;
                    cursor:pointer;
                ">
                    <img src="./modules/assets/logo.png" alt="Logo" style="width:100%; height:100%; object-fit:contain; opacity:0.8;" onerror="this.style.display='none';">
                </div>
            </div>

            <div id="w-menu" style="
                display:none;
                position:absolute;
                right:10px;
                bottom:98px;
                min-width:240px;
                max-width:min(90vw, 420px);
                max-height:220px;
                overflow-y:auto;
                background: rgba(20, 20, 20, 0.95);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 4px;
                padding: 8px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            "></div>
        `;
    } else {
        console.log('Desktop mode: wide media player full');
        wide.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; gap:12px; width:100%;">
                <button id="w-skip-back" title="Back 10 seconds" style="background:transparent;border:none;color:rgba(0,0,0,0.7);font-size:12px;cursor:pointer;padding:0;line-height:1;">-10s</button>
                <div style="display:flex; align-items:center; justify-content:center; gap:10px; flex:1; min-width:0;">
                    <button id="w-prev" title="Previous" style="background:transparent;border:none;color:rgba(0,0,0,0.7);font-size:12px;cursor:pointer;padding:0;line-height:1;">Prev</button>
                    <button id="w-play" title="Play / Pause" style="background:transparent;border:none;color:rgba(0,0,0,0.7);font-size:12px;cursor:pointer;padding:0 2px;line-height:1;font-weight:700;min-width:42px;">Play</button>
                    <button id="w-next" title="Next" style="background:transparent;border:none;color:rgba(0,0,0,0.7);font-size:12px;cursor:pointer;padding:0;line-height:1;">Next</button>
                </div>
                <button id="w-skip-forward" title="Forward 10 seconds" style="background:transparent;border:none;color:rgba(0,0,0,0.7);font-size:12px;cursor:pointer;padding:0;line-height:1;">+10s</button>
                <button id="w-menu-btn" title="Playlist" style="background:transparent;border:none;color:rgba(0,0,0,0.72);font-size:12px;cursor:pointer;line-height:1;padding:0;">Menu</button>
            </div>
            <div style="display:flex; align-items:center; gap:10px; width:100%; margin-top:4px;">
                <span id="w-current-time" style="font-size:12px; color:rgba(0,0,0,0.68); width:38px; text-align:right; flex-shrink:0;">00:00</span>
                <input id="w-progress" type="range" min="0" max="100" value="0" style="width:100%; cursor:pointer; accent-color: rgba(0,0,0,0.35); height:3px;">
                <span id="w-duration" style="font-size:12px; color:rgba(0,0,0,0.68); width:38px; flex-shrink:0;">00:00</span>
            </div>

            <div id="w-menu" style="
                display:none;
                position:absolute;
                right:10px;
                bottom:44px;
                min-width:280px;
                max-width:min(90vw, 430px);
                max-height:220px;
                overflow-y:auto;
                background: rgba(255, 255, 255, 0.7);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.55);
                border-radius: 6px;
                padding: 8px;
                box-shadow: 0 6px 20px rgba(0,0,0,0.25);
            "></div>
        `;
    }

    wide.style.position = 'fixed';
    document.body.appendChild(wide);

    const ui = {
        root: wide,
        playBtn: wide.querySelector('#w-play'),
        prevBtn: wide.querySelector('#w-prev'),
        nextBtn: wide.querySelector('#w-next'),
        progress: wide.querySelector('#w-progress'),
        currentTimeEl: wide.querySelector('#w-current-time'),
        durationEl: wide.querySelector('#w-duration'),
        trackTitle: wide.querySelector('#w-track-title'),
        artEl: wide.querySelector('#w-art'),
        useSymbolPlay: mobileMode,
    };

    bindCommonControls(ui);

    const menuBtn = wide.querySelector('#w-menu-btn');
    const menu = wide.querySelector('#w-menu');
    const toggleExtraBtn = wide.querySelector('#w-toggle-extra');
    const extraControls = wide.querySelector('#w-extra');
    const skipBackBtn = wide.querySelector('#w-skip-back');
    const skipForwardBtn = wide.querySelector('#w-skip-forward');

    const skipBySeconds = (seconds) => {
        if (!audio) return;
        const minTime = 0;
        const maxTime = audio.duration || 0;
        const nextTime = Math.min(Math.max((audio.currentTime || 0) + seconds, minTime), maxTime);
        audio.currentTime = nextTime;
        syncAllUi();
    };

    if (skipBackBtn) {
        skipBackBtn.addEventListener('click', () => skipBySeconds(-10));
    }
    if (skipForwardBtn) {
        skipForwardBtn.addEventListener('click', () => skipBySeconds(10));
    }

    if (toggleExtraBtn && extraControls) {
        const toggleExpandedControls = (e) => {
            if (e) e.preventDefault();
            const isOpen = extraControls.style.display === 'flex';
            extraControls.style.display = isOpen ? 'none' : 'flex';
            wide.style.height = isOpen ? '56px' : 'auto';
            wide.style.minHeight = isOpen ? '56px' : '56px';
            toggleExtraBtn.textContent = isOpen ? 'More' : 'Less';
            toggleExtraBtn.title = isOpen ? 'Expand controls' : 'Collapse controls';
        };

        toggleExtraBtn.addEventListener('click', toggleExpandedControls);
        toggleExtraBtn.addEventListener('touchstart', toggleExpandedControls, { passive: false });
    }

    ui.renderMenuList = () => {
        menu.innerHTML = '';
        playlist.forEach((track, i) => {
            const item = document.createElement('button');
            item.type = 'button';
            const isDark = mobileMode;
            item.style.cssText = `
                width: 100%;
                text-align: left;
                border: none;
                padding: 8px;
                margin: 0;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                color: ${isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.82)'};
                background: ${i === state.currentTrack ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.52)')};
                opacity: ${i === state.currentTrack ? '1' : '0.9'};
            `;
            item.textContent = `${i === state.currentTrack ? '▶ ' : ''}${track.title}`;
            item.addEventListener('click', () => {
                playTrack(i, true);
                menu.style.display = 'none';
            });
            menu.appendChild(item);
        });
    };

    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Mobile: tap logo area to open menu
    const logoArea = wide.querySelector('#w-logo-area');
    if (logoArea && mobileMode) {
        logoArea.style.cursor = 'pointer';
        logoArea.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
    }

    document.addEventListener('click', (e) => {
        if (!wide.contains(e.target)) {
            menu.style.display = 'none';
        }
    });

    menu.addEventListener('click', () => {
        menu.style.display = 'none';
    });

    uiBindings.push(ui);
}

function createMediaPlayer() {
    const existingAudio = document.getElementById('mp-audio-shared');
    if (existingAudio) existingAudio.remove();

    const existingWidePlayer = document.getElementById('media-player-wide');
    if (existingWidePlayer) existingWidePlayer.remove();

    audio = document.createElement('audio');
    audio.id = 'mp-audio-shared';
    audio.volume = 0.8;
    document.body.appendChild(audio);

    const existingWindowPlayer = document.getElementById('media-player');
    if (existingWindowPlayer) existingWindowPlayer.remove();

    createWindowPlayer();
    createWidePlayer();

    audio.addEventListener('timeupdate', syncAllUi);
    audio.addEventListener('loadedmetadata', syncAllUi);
    audio.addEventListener('play', syncAllUi);
    audio.addEventListener('pause', syncAllUi);
    audio.addEventListener('volumechange', syncAllUi);
    audio.addEventListener('ended', () => {
        if (state.repeatMode === 'one') {
            audio.currentTime = 0;
            audio.play().catch(() => {});
            return;
        }

        if (!playlist.length) return;
        const isLast = state.currentTrack >= playlist.length - 1;
        if (!state.isShuffled && isLast && state.repeatMode === 'none') {
            syncAllUi();
            return;
        }

        const nextIndex = state.isShuffled
            ? Math.floor(Math.random() * playlist.length)
            : (state.currentTrack + 1) % playlist.length;
        playTrack(nextIndex, true);
    });

    if (playlist[0]) {
        playTrack(0, false);
    } else {
        syncAllUi();
    }
}

function refreshMobileMediaPlayerLayout() {
    const widePlayer = document.getElementById('media-player-wide');
    if (!widePlayer) return;

    const shouldUseMobile = detectMobileLayout();
    if (String(shouldUseMobile) === widePlayer.dataset.mobileMode) return;

    createMediaPlayer();
}

document.addEventListener('DOMContentLoaded', createMediaPlayer);
window.addEventListener('resize', refreshMobileMediaPlayerLayout);
