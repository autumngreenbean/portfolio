// ============================================================================
// CONFIG.js — every gameplay, camera, asset and accessibility number lives
// here. Nothing in game.js/physics.js/assetLoader.js should contain a
// hard-coded gameplay constant — they all read from window.CONFIG so the
// whole game is retunable without touching logic.
//
// Visual/color/font values are NOT here — those live in css/theme.css as
// CSS custom properties. THEME below just reads them at runtime so JS/three.js
// (which can't read CSS vars directly) stays in sync with whatever theme is
// active.
// ============================================================================

const CONFIG = {

  // ---- Animal tiers, smallest to largest -----------------------------
  // radius = visual scale radius in world units. Growth is intentionally
  // slightly sub-linear early (small merges feel frequent) and steeper late
  // (big merges feel like an event) — classic Suika curve.
  // collisionRadius (optional) = physics collision radius if different from visual
  TIERS: [
    { id: 0, name: "Dog",       folder: "dog",       radius: 20,  points: 1   },
    { id: 1, name: "Cat",       folder: "cat",       radius: 27,  points: 3   },
    { id: 2, name: "Bunny",     folder: "bunny",     radius: 35,  points: 6   },
    { id: 3, name: "Penguin",   folder: "penguin",   radius: 39,  points: 8   },
    { id: 4, name: "Deer",      folder: "deer",      radius: 44,  points: 10  },
    { id: 5, name: "Giraffe",   folder: "giraffe",   radius: 78,  collisionRadius: 55, points: 15  },
    { id: 6, name: "Alligator", folder: "alligator", radius: 84,  points: 18  },
    { id: 7, name: "Pig",       folder: "pig",       radius: 92,  points: 21  },
    { id: 8, name: "Hippo",     folder: "hippo",     radius: 102, points: 28  },
    { id: 9, name: "Panda",     folder: "panda",     radius: 116, points: 36  },
  ],

  // Only the first N tiers are allowed to spawn as a "next drop" — keeps
  // the early game approachable. The rest can only appear via merging.
  MAX_SPAWN_TIER_INDEX: 5, // dog..deer spawnable

  // Bonus score awarded when two max-tier animals merge (they can't become
  // a tier 9, so they pop instead).
  MAX_TIER_MERGE_BONUS: 60,

  // ---- Jar / world geometry (world units, arbitrary but consistent) ---
  JAR: {
    innerWidth: 800,
    innerHeight: 520,
    wallThickness: 22,
    floorThickness: 2,
    floorY: -100, // Y position of floor center (0 = at bottom, increase to raise floor)
    // Height (measured up from the floor) above which a settled stack
    // triggers the game-over countdown.
    dangerLineY: 540,
    dangerGraceSeconds: 2.2,
  },

  // ---- Physics ---------------------------------------------------------
  // Simple constrained circle-physics (2.5D: simulated on the XY plane,
  // rendered with a fixed-Z front camera) rather than a full 3D rigid-body
  // engine — this is what makes it feel like Suika rather than a rock tumbler.
  PHYSICS: {
    gravity: 1400,          // units/s^2
    restitution: 0.18,      // bounciness on collision
    wallRestitution: 0.12,
    linearDamping: 0.55,    // velocity retained per second (0..1)
    angularDampingVisual: 0.9,
    maxVelocity: 2200,
    substeps: 4,            // collision-resolution substeps per frame
    fixedTimestepMs: 1000 / 120,
    maxCatchupSteps: 8,
    restVelocityEpsilon: 4, // below this, treat as settled for danger-line checks
  },

  // ---- Drop control ------------------------------------------------------
  DROP: {
    cooldownMs: 380,
    keyboardMoveUnitsPerSec: 340,
    edgeMargin: 6,          // keep spawner this far from jar walls, in addition to radius
  },

  // ---- Camera --------------------------------------------------------
  // 2.5D: physics is planar, camera is fixed (no orbit controls) so the
  // whole thing reads as a classic front-on Suika jar.
  CAMERA: {
    type: "orthographic",     // "orthographic" | "perspective"
    perspectiveFov: 45,
    distance: 900,            // camera z distance from the jar's front face
    xOffset: 0,                // shift camera sideways, for a deliberate off-center composition
    verticalMargin: 90,        // extra world units of headroom/footroom framed above/below the jar
  },

  RENDER: {
    pixelRatioCap: 2,
    shadows: true,
    dropLineDash: true,
  },

  // ---- Assets ----------------------------------------------------------
  ASSETS: {
    // Set to false once you've dropped real files into /assets/<folder>/.
    // Real-asset filenames are expected as <folder>.obj / <folder>.mtl inside
    // /assets/<folder>/ — override per-tier below if yours differ.
    usePlaceholders: false,
    basePath: "assets/",
    objFile: (folder) => `${folder}/${folder}.obj`,
    mtlFile: (folder) => `${folder}/${folder}.mtl`,
  },

  // ---- Accessibility -----------------------------------------------------
  A11Y: {
    enableKeyboardControls: true,
    announceMerges: true,
    announceEveryNthMergeOnly: 1, // set >1 on very chatty setups to throttle SR announcements
    defaultTheme: "zoo",          // "zoo" | "night" | "contrast"
    defaultScale: 1,
    minScale: 0.85,
    maxScale: 1.4,
  },

  STORAGE_KEY: "suika-zoo:v1",
};

// ============================================================================
// THEME — a thin runtime bridge to css/theme.css custom properties, since
// three.js materials need actual color values, not CSS strings-on-elements.
// Call Theme.refresh() after switching [data-theme] to re-read everything.
// ============================================================================
const Theme = {
  _cache: {},

  readVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  },

  readColor(name, fallback) {
    return this.readVar(name, fallback);
  },

  readNumber(name, fallback) {
    const v = this.readVar(name, null);
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  },

  refresh() {
    this._cache = {
      bgTop: this.readColor("--color-bg-top", "#dce9d8"),
      bgBottom: this.readColor("--color-bg-bottom", "#b8d3c4"),
      jarGlass1: this.readColor("--color-jar-glass-1", "rgba(207,229,221,0.35)"),
      jarGlass2: this.readColor("--color-jar-glass-2", "rgba(148,189,176,0.18)"),
      jarRim: this.readColor("--color-jar-rim", "#7a9e8e"),
      jarLine: this.readColor("--color-jar-line", "#c0563f"),
      jarFloor: this.readColor("--color-jar-floor", "#8a7355"),
      motionScale: this.readNumber("--motion-scale", 1),
      tierColors: CONFIG.TIERS.map((t) => this.readColor(`--tier-${t.id}-color`, "#cccccc")),
    };
    return this._cache;
  },

  get current() {
    return this._cache;
  },
};

window.CONFIG = CONFIG;
window.Theme = Theme;
