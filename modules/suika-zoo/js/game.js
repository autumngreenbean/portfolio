import * as THREE from "three";
import { loadTierTemplates } from "./assetLoader.js";
import { World } from "./physics.js";
import {
  announce, applyTheme, loadSavedTheme, applyUIScale, loadSavedScale,
  openDialog, closeDialog,
} from "./accessibility.js";

// ---------------------------------------------------------------- DOM refs
const $ = (id) => document.getElementById(id);
const canvas = $("gameCanvas");
const stageWrap = $("stageWrap");
const liveRegion = $("liveRegion");
const scoreValueEl = $("scoreValue");
const bestValueEl = $("bestValue");
const currentPreviewCanvas = $("currentPreviewCanvas");
const currentLabelEl = $("currentLabel");
const nextPreviewCanvas = $("nextPreviewCanvas");
const nextLabelEl = $("nextLabel");
const tierLadderEl = $("tierLadder");
const comboToastEl = $("comboToast");
const loadingOverlay = $("loadingOverlay");

const settingsBtn = $("settingsBtn");
const helpBtn = $("helpBtn");
const restartBtn = $("restartBtn");
const settingsDialog = $("settingsDialog");
const helpDialog = $("helpDialog");
const gameOverDialog = $("gameOverDialog");
const themeSelect = $("themeSelect");
const scaleSlider = $("scaleSlider");
const scaleOutput = $("scaleOutput");
const keyboardToggle = $("keyboardToggle");
const closeSettingsBtn = $("closeSettingsBtn");
const closeHelpBtn = $("closeHelpBtn");
const finalScoreEl = $("finalScore");
const finalBestEl = $("finalBest");
const playAgainBtn = $("playAgainBtn");

// ---------------------------------------------------------------- State
let scene, camera, renderer;
let currentPreviewScene, currentPreviewCamera, currentPreviewRenderer;
let currentPreviewMesh = null;
let nextPreviewScene, nextPreviewCamera, nextPreviewRenderer;
let nextPreviewMesh = null;
let jarGroup, dangerLine, jarWalls = [], jarFloorMesh;
let templates = [];
let world;
let bodyMeshes = new Map(); // body.id -> THREE.Object3D
let spawnerX = 0;
let spawnerGhost = null;
let currentTierIndex = 0;
let nextTierIndex = 0;
let lastDropTime = -Infinity;
let score = 0;
let best = 0;
let dangerTimer = 0;
let gameOver = false;
let keysDown = new Set();
let pointerTargetX = 0;
let hasPointer = false;
let mergeCount = 0;
let accumulatorMs = 0;
let lastFrameTime = performance.now();
let tweens = []; // {mesh, from, to, start, duration, onDone}

// ============================================================== Setup

function pickSpawnTier() {
  return Math.floor(Math.random() * (CONFIG.MAX_SPAWN_TIER_INDEX + 1));
}

// Unproject through the actual camera frustum (rather than assuming canvas
// width == jar width) so the aim point stays correct regardless of
// CONFIG.CAMERA.verticalMargin, aspect ratio, or camera type.
const _unprojectVec = new THREE.Vector3();
function worldFromScreenX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  _unprojectVec.set(ndcX, 0, 0.5).unproject(camera);
  if (camera.isPerspectiveCamera) {
    // Project the ray onto the z=0 plane where animals actually drop.
    const dir = _unprojectVec.clone().sub(camera.position).normalize();
    const t = (0 - camera.position.z) / dir.z;
    return camera.position.x + dir.x * t;
  }
  return _unprojectVec.x;
}

// Camera framing is derived from the jar's own dimensions rather than
// hand-tuned offsets, so resizing CONFIG.JAR "just works" without also
// having to retune the camera. centerY sits a little below the jar's
// vertical middle so the drop zone above the rim gets extra headroom.
function jarCenterY() {
  return CONFIG.JAR.innerHeight * 0.42;
}

function buildCamera(aspect) {
  const jar = CONFIG.JAR;
  const margin = CONFIG.CAMERA.verticalMargin;
  const centerY = jarCenterY();

  if (CONFIG.CAMERA.type === "orthographic") {
    const viewH = jar.innerHeight + margin * 2;
    const viewW = viewH * aspect;
    const cam = new THREE.OrthographicCamera(-viewW / 2, viewW / 2, viewH / 2, -viewH / 2, 1, 4000);
    cam.position.set(CONFIG.CAMERA.xOffset, centerY, CONFIG.CAMERA.distance);
    cam.lookAt(CONFIG.CAMERA.xOffset, centerY, 0);
    return cam;
  }
  const cam = new THREE.PerspectiveCamera(CONFIG.CAMERA.perspectiveFov, aspect, 1, 4000);
  cam.position.set(CONFIG.CAMERA.xOffset, centerY, CONFIG.CAMERA.distance);
  cam.lookAt(CONFIG.CAMERA.xOffset, centerY, 0);
  return cam;
}

function buildJar(theme) {
  const group = new THREE.Group();
  const jar = CONFIG.JAR;
  const halfW = jar.innerWidth / 2;
  const wallT = jar.wallThickness;
  const h = jar.innerHeight + 40;

  jarWalls = [];

  const glassMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
  });

  const wallGeo = new THREE.BoxGeometry(wallT, h, 60);
  const wallL = new THREE.Mesh(wallGeo, glassMat);
  const wallR = new THREE.Mesh(wallGeo, glassMat);
  wallL.position.set(-halfW - wallT / 2, h / 2 - 20, 0);
  wallR.position.set(halfW + wallT / 2, h / 2 - 20, 0);
  wallL.receiveShadow = wallR.receiveShadow = false;
  group.add(wallL, wallR);
  jarWalls.push(wallL, wallR);

  const rimMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
  const rimGeo = new THREE.BoxGeometry(jar.innerWidth + wallT * 2 + 8, 14, 66);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.set(0, h - 20 + 7, 0);
  group.add(rim);
  jarWalls.push(rim);

  const floorMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  const floorGeo = new THREE.BoxGeometry(jar.innerWidth + wallT * 2, jar.floorThickness, 60);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, jar.floorY, 0);
  floor.receiveShadow = false;
  group.add(floor);
  jarFloorMesh = floor;

  // Danger line (dashed)
  const lineMat = new THREE.LineDashedMaterial({
    color: 0x999999, dashSize: 10, gapSize: 8, transparent: true, opacity: 0.6,
  });
  const linePts = [
    new THREE.Vector3(-halfW, jar.dangerLineY, 31),
    new THREE.Vector3(halfW, jar.dangerLineY, 31),
  ];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
  dangerLine = new THREE.Line(lineGeo, lineMat);
  dangerLine.computeLineDistances();
  group.add(dangerLine);

  return group;
}

function refreshJarColors(theme) {
  if (!jarGroup) return;
  jarWalls[0].material.color.set(0xffffff);
  jarWalls[1].material.color.set(0xffffff);
  jarWalls[2].material.color.set(0xcccccc); // rim
  jarFloorMesh.material.color.set(0xe8e8e8);
  dangerLine.material.color.set(0x999999);
  scene.background = new THREE.Color(0xffffff);
}

function recolorPlaceholders(theme) {
  const recolorObj = (obj, tierIndex) => {
    obj.traverse((n) => {
      if (n.userData && n.userData.tierColored && n.material) {
        n.material.color.set(theme.tierColors[tierIndex]);
      }
    });
  };
  templates.forEach((t, i) => recolorObj(t, i));
  bodyMeshes.forEach((mesh) => recolorObj(mesh, mesh.userData.tierId));
}

// ============================================================== Instances

function spawnMeshForTier(tierIndex) {
  const tpl = templates[tierIndex];
  const mesh = tpl.clone(true);
  mesh.userData.tierId = tierIndex;
  
  // Clone materials to avoid sharing between instances
  mesh.traverse((node) => {
    if (node.isMesh && node.material) {
      if (Array.isArray(node.material)) {
        node.material = node.material.map(m => m.clone());
      } else {
        node.material = node.material.clone();
      }
    }
  });
  
  return mesh;
}

function addBody(tierIndex, x, y, initialScale = 1) {
  const tier = CONFIG.TIERS[tierIndex];
  const collisionRadius = tier.collisionRadius ?? tier.radius;
  const body = world.addBody(tierIndex, collisionRadius, x, y);
  const mesh = spawnMeshForTier(tierIndex);
  mesh.position.set(x, y, 31);
  mesh.rotation.z = 0;
  mesh.scale.setScalar(initialScale);
  mesh.frustumCulled = false; // Prevent incorrect culling
  mesh.visible = true; // Explicitly set visible
  scene.add(mesh);
  bodyMeshes.set(body.id, mesh);
  return body;
}

function removeBody(id) {
  const mesh = bodyMeshes.get(id);
  if (mesh) {
    scene.remove(mesh);
    bodyMeshes.delete(id);
  }
  world.removeBody(id);
}

function popEffect(x, y, colorHex) {
  const ringGeo = new THREE.RingGeometry(4, 10, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(x, y, 35);
  scene.add(ring);
  const motion = Math.max(0.15, Theme.current.motionScale ?? 1);
  addTween(ring, { s: 1, o: 0.9 }, { s: 6, o: 0 }, 500 * (1 / motion), () => {
    scene.remove(ring);
    ringGeo.dispose(); ringMat.dispose();
  }, (v) => { ring.scale.setScalar(v.s); ringMat.opacity = v.o; });
}

function addTween(mesh, from, to, durationMs, onDone, apply) {
  tweens.push({ mesh, from, to, start: performance.now(), duration: Math.max(1, durationMs), onDone, apply });
}

function updateTweens(now) {
  tweens = tweens.filter((t) => {
    const p = Math.min(1, (now - t.start) / t.duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const v = {};
    for (const k in t.from) v[k] = t.from[k] + (t.to[k] - t.from[k]) * eased;
    if (t.apply) t.apply(v); else if (t.mesh) t.mesh.scale.setScalar(v.s ?? 1);
    if (p >= 1) { if (t.onDone) t.onDone(); return false; }
    return true;
  });
}

// ============================================================== Merges

function handleMerges() {
  const merges = world.drainMerges();
  for (const { a, b } of merges) {
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const tierIndex = a.tierIndex;
    const theme = Theme.current;

    removeBody(a.id);
    removeBody(b.id);

    if (tierIndex >= CONFIG.TIERS.length - 1) {
      // Max tier merge: pop, no new body.
      score += CONFIG.MAX_TIER_MERGE_BONUS;
      popEffect(midX, midY, theme.tierColors[tierIndex]);
      showCombo(`${CONFIG.TIERS[tierIndex].name} fusion! +${CONFIG.MAX_TIER_MERGE_BONUS}`);
      maybeAnnounceMerge(`Two pandas fused for a ${CONFIG.MAX_TIER_MERGE_BONUS} point bonus!`);
    } else {
      const newTierIndex = tierIndex + 1;
      const newTier = CONFIG.TIERS[newTierIndex];
      const newBody = addBody(newTierIndex, midX, midY, 0.3);
      newBody.vy = 60;
      const mesh = bodyMeshes.get(newBody.id);
      addTween(mesh, { s: 0.3 }, { s: 1 }, 260, null, (v) => mesh.scale.setScalar(v.s));
      score += newTier.points;
      showCombo(`${CONFIG.TIERS[tierIndex].name} + ${CONFIG.TIERS[tierIndex].name} → ${newTier.name}!`);
      maybeAnnounceMerge(`Merged into ${newTier.name}, plus ${newTier.points} points.`);
    }
  }
  if (merges.length) updateScoreDisplay();
}

let comboTimeout = null;
function showCombo(text) {
  comboToastEl.textContent = text;
  comboToastEl.classList.add("show");
  clearTimeout(comboTimeout);
  comboTimeout = setTimeout(() => comboToastEl.classList.remove("show"), 1100);
}

function maybeAnnounceMerge(text) {
  if (!CONFIG.A11Y.announceMerges) return;
  mergeCount++;
  if (mergeCount % Math.max(1, CONFIG.A11Y.announceEveryNthMergeOnly) !== 0) return;
  announce(liveRegion, text);
}

// ============================================================== Score / storage

function loadBest() {
  try { return parseInt(localStorage.getItem(CONFIG.STORAGE_KEY + ":best"), 10) || 0; }
  catch (_) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(CONFIG.STORAGE_KEY + ":best", String(v)); } catch (_) {}
}

function updateScoreDisplay() {
  scoreValueEl.textContent = String(score);
  if (score > best) {
    best = score;
    bestValueEl.textContent = String(best);
  }
}

// ============================================================== Spawner / next preview

function updateCurrentPreview() {
  const tier = CONFIG.TIERS[currentTierIndex];
  currentLabelEl.textContent = tier.name;
  
  // Render 3D model preview (static, front-facing)
  if (currentPreviewMesh) {
    currentPreviewScene.remove(currentPreviewMesh);
  }
  currentPreviewMesh = spawnMeshForTier(currentTierIndex);
  currentPreviewMesh.position.set(0, 0, 0);
  currentPreviewMesh.rotation.set(0, 0, 0);
  currentPreviewScene.add(currentPreviewMesh);
  
  // Render the preview
  currentPreviewRenderer.render(currentPreviewScene, currentPreviewCamera);
}

function updateNextPreview() {
  const tier = CONFIG.TIERS[nextTierIndex];
  nextLabelEl.textContent = tier.name;
  
  // Render 3D model preview (will rotate in tick)
  if (nextPreviewMesh) {
    nextPreviewScene.remove(nextPreviewMesh);
  }
  nextPreviewMesh = spawnMeshForTier(nextTierIndex);
  nextPreviewMesh.position.set(0, 0, 0);
  nextPreviewMesh.rotation.z = 0;
  nextPreviewScene.add(nextPreviewMesh);
  
  // Render the preview
  nextPreviewRenderer.render(nextPreviewScene, nextPreviewCamera);
}

function buildTierLadder() {
  tierLadderEl.innerHTML = "";
  
  const ladderSize = 40; // Size in pixels for each ladder preview
  
  CONFIG.TIERS.forEach((tier, i) => {
    const chip = document.createElement("div");
    chip.className = "tier-chip";
    
    // Create canvas for 3D model preview
    const canvas = document.createElement("canvas");
    canvas.className = "tier-preview";
    canvas.width = ladderSize;
    canvas.height = ladderSize;
    
    // Create mini scene for this tier
    const miniScene = new THREE.Scene();
    const miniCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 1000);
    miniCamera.position.set(0, 0, 200);
    miniCamera.lookAt(0, 0, 0);
    
    const miniRenderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true, 
      alpha: true 
    });
    miniRenderer.setSize(ladderSize, ladderSize, false);
    miniRenderer.setClearColor(0x000000, 0);
    
    const miniLight = new THREE.AmbientLight(0xffffff, 0.8);
    miniScene.add(miniLight);
    const miniDirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    miniDirLight.position.set(50, 80, 100);
    miniScene.add(miniDirLight);
    
    // Add model to scene
    const model = spawnMeshForTier(i);
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    miniScene.add(model);
    
    // Render once
    miniRenderer.render(miniScene, miniCamera);
    
    chip.appendChild(canvas);
    
    const label = document.createElement("span");
    label.textContent = tier.name;
    chip.appendChild(label);
    tierLadderEl.appendChild(chip);
  });
}

function updateGhost() {
  if (!spawnerGhost) return;
  const tier = CONFIG.TIERS[currentTierIndex];
  const collisionRadius = tier.collisionRadius ?? tier.radius;
  const halfW = CONFIG.JAR.innerWidth / 2;
  const minX = -halfW + collisionRadius + CONFIG.DROP.edgeMargin;
  const maxX = halfW - collisionRadius - CONFIG.DROP.edgeMargin;
  spawnerX = Math.min(maxX, Math.max(minX, spawnerX));
  spawnerGhost.position.set(spawnerX, CONFIG.JAR.innerHeight + 40, 31);
}

function rebuildGhost() {
  if (spawnerGhost) scene.remove(spawnerGhost);
  spawnerGhost = spawnMeshForTier(currentTierIndex);
  spawnerGhost.traverse((n) => { if (n.material) { n.material = n.material.clone(); n.material.transparent = true; n.material.opacity = 0.65; } });
  scene.add(spawnerGhost);
  updateGhost();
}

function doDrop() {
  if (gameOver) return;
  const now = performance.now();
  if (now - lastDropTime < CONFIG.DROP.cooldownMs) return;
  lastDropTime = now;

  updateGhost();
  addBody(currentTierIndex, spawnerX, CONFIG.JAR.innerHeight + 20);

  currentTierIndex = nextTierIndex;
  nextTierIndex = pickSpawnTier();
  rebuildGhost();
  updateCurrentPreview();
  updateNextPreview();
}

// ============================================================== Game over

function checkDangerLine(dtSeconds) {
  if (gameOver) return;
  const top = world.highestSettledTop();
  if (top > CONFIG.JAR.dangerLineY) {
    dangerTimer += dtSeconds;
    const progress = Math.min(1, dangerTimer / CONFIG.JAR.dangerGraceSeconds);
    dangerLine.material.opacity = 0.5 + progress * 0.5;
    if (dangerTimer >= CONFIG.JAR.dangerGraceSeconds) triggerGameOver();
  } else {
    dangerTimer = 0;
    dangerLine.material.opacity = 0.85;
  }
}

function triggerGameOver() {
  gameOver = true;
  saveBest(best);
  finalScoreEl.textContent = String(score);
  finalBestEl.textContent = String(best);
  openDialog(gameOverDialog);
  announce(liveRegion, `Game over. Final score ${score}.`);
}

function resetGame() {
  for (const id of Array.from(bodyMeshes.keys())) removeBody(id);
  world = new World(CONFIG);
  score = 0;
  dangerTimer = 0;
  gameOver = false;
  mergeCount = 0;
  updateScoreDisplay();
  currentTierIndex = pickSpawnTier();
  nextTierIndex = pickSpawnTier();
  spawnerX = 0;
  rebuildGhost();
  updateCurrentPreview();
  updateNextPreview();
  closeDialog(gameOverDialog, restartBtn);
  announce(liveRegion, "New game started.");
}

// ============================================================== Input

function dialogsOpen() {
  return !gameOverDialog.hidden || !settingsDialog.hidden || !helpDialog.hidden;
}

function bindInput() {
  canvas.addEventListener("pointermove", (e) => {
    hasPointer = true;
    pointerTargetX = worldFromScreenX(e.clientX);
    spawnerX = pointerTargetX;
    updateGhost();
  });
  canvas.addEventListener("pointerleave", () => { hasPointer = false; });
  canvas.addEventListener("click", () => doDrop());

  window.addEventListener("keydown", (e) => {
    if (!CONFIG.A11Y.enableKeyboardControls || dialogsOpen()) return;
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) { keysDown.add(e.key); e.preventDefault(); }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      doDrop();
    }
  });
  window.addEventListener("keyup", (e) => keysDown.delete(e.key));
  window.addEventListener("blur", () => keysDown.clear());
}

function stepKeyboard(dtSeconds) {
  if (!CONFIG.A11Y.enableKeyboardControls) return;
  const speed = CONFIG.DROP.keyboardMoveUnitsPerSec;
  if (keysDown.has("ArrowLeft")) spawnerX -= speed * dtSeconds;
  if (keysDown.has("ArrowRight")) spawnerX += speed * dtSeconds;
  if (keysDown.size) updateGhost();
}

// ============================================================== Dialog wiring

function bindDialogs() {
  settingsBtn.addEventListener("click", () => { keysDown.clear(); openDialog(settingsDialog); });
  closeSettingsBtn.addEventListener("click", () => closeDialog(settingsDialog, settingsBtn));
  settingsDialog.addEventListener("click", (e) => { if (e.target === settingsDialog) closeDialog(settingsDialog, settingsBtn); });

  helpBtn.addEventListener("click", () => { keysDown.clear(); openDialog(helpDialog); });
  closeHelpBtn.addEventListener("click", () => closeDialog(helpDialog, helpBtn));
  helpDialog.addEventListener("click", (e) => { if (e.target === helpDialog) closeDialog(helpDialog, helpBtn); });

  restartBtn.addEventListener("click", resetGame);
  playAgainBtn.addEventListener("click", resetGame);

  themeSelect.addEventListener("change", () => {
    const theme = applyTheme(themeSelect.value);
    refreshJarColors(theme);
    recolorPlaceholders(theme);
    buildTierLadder();
    updateCurrentPreview();
    updateNextPreview();
  });

  scaleSlider.addEventListener("input", () => {
    const v = applyUIScale(parseFloat(scaleSlider.value));
    scaleOutput.textContent = `${Math.round(v * 100)}%`;
  });

  keyboardToggle.addEventListener("change", () => {
    CONFIG.A11Y.enableKeyboardControls = keyboardToggle.checked;
  });
}

function initSettingsUI() {
  const savedTheme = loadSavedTheme(CONFIG.A11Y.defaultTheme);
  themeSelect.value = savedTheme;
  const theme = applyTheme(savedTheme);

  const savedScale = loadSavedScale(CONFIG.A11Y.defaultScale);
  scaleSlider.min = CONFIG.A11Y.minScale;
  scaleSlider.max = CONFIG.A11Y.maxScale;
  scaleSlider.step = "0.05";
  scaleSlider.value = savedScale;
  const v = applyUIScale(savedScale);
  scaleOutput.textContent = `${Math.round(v * 100)}%`;

  keyboardToggle.checked = CONFIG.A11Y.enableKeyboardControls;

  return theme;
}

// ============================================================== Render loop

function onResize() {
  const rect = stageWrap.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  const aspect = w / h;
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(CONFIG.RENDER.pixelRatioCap, window.devicePixelRatio || 1));

  if (camera.isOrthographicCamera) {
    const viewH = CONFIG.JAR.innerHeight + CONFIG.CAMERA.verticalMargin * 2;
    const viewW = viewH * aspect;
    camera.left = -viewW / 2; camera.right = viewW / 2;
    camera.top = viewH / 2; camera.bottom = -viewH / 2;
  } else {
    camera.aspect = aspect;
  }
  camera.updateProjectionMatrix();
}

function tick(now) {
  requestAnimationFrame(tick);
  let dtMs = now - lastFrameTime;
  lastFrameTime = now;
  dtMs = Math.min(dtMs, 250); // avoid spiral of death on tab-back

  if (!gameOver) {
    stepKeyboard(dtMs / 1000);
    accumulatorMs += dtMs;
    const step = CONFIG.PHYSICS.fixedTimestepMs;
    let steps = 0;
    while (accumulatorMs >= step && steps < CONFIG.PHYSICS.maxCatchupSteps) {
      world.step(step / 1000);
      handleMerges();
      accumulatorMs -= step;
      steps++;
    }
    checkDangerLine(dtMs / 1000);
  }

  updateTweens(now);

  for (const [id, mesh] of bodyMeshes) {
    const body = world.bodies.get(id);
    if (!body) continue;
    mesh.position.set(body.x, body.y, 31);
    mesh.rotation.z = body.rotation;
    mesh.updateMatrixWorld(true); // Force matrix update
  }

  // Rotate and render next preview (current stays static)
  if (nextPreviewMesh) {
    nextPreviewMesh.rotation.y = (now * 0.001) % (Math.PI * 2);
    nextPreviewRenderer.render(nextPreviewScene, nextPreviewCamera);
  }

  renderer.render(scene, camera);
}

// ============================================================== Boot

async function boot() {
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.shadowMap.enabled = CONFIG.RENDER.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const rect = stageWrap.getBoundingClientRect();
  camera = buildCamera(rect.width / rect.height || 0.66);

  // Initialize current drop preview scene (static)
  const previewSize = 80;
  currentPreviewCanvas.width = previewSize;
  currentPreviewCanvas.height = previewSize;
  
  currentPreviewScene = new THREE.Scene();
  currentPreviewCamera = new THREE.OrthographicCamera(-60, 60, 60, -60, 1, 1000);
  currentPreviewCamera.position.set(0, 0, 200);
  currentPreviewCamera.lookAt(0, 0, 0);
  
  currentPreviewRenderer = new THREE.WebGLRenderer({ 
    canvas: currentPreviewCanvas, 
    antialias: true, 
    alpha: true 
  });
  currentPreviewRenderer.setSize(previewSize, previewSize, false);
  currentPreviewRenderer.setClearColor(0x000000, 0);
  
  const currentLight = new THREE.AmbientLight(0xffffff, 0.8);
  currentPreviewScene.add(currentLight);
  const currentDirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  currentDirLight.position.set(50, 80, 100);
  currentPreviewScene.add(currentDirLight);

  // Initialize next drop preview scene (rotating)
  nextPreviewCanvas.width = previewSize;
  nextPreviewCanvas.height = previewSize;
  
  nextPreviewScene = new THREE.Scene();
  nextPreviewCamera = new THREE.OrthographicCamera(-60, 60, 60, -60, 1, 1000);
  nextPreviewCamera.position.set(0, 0, 200);
  nextPreviewCamera.lookAt(0, 0, 0);
  
  nextPreviewRenderer = new THREE.WebGLRenderer({ 
    canvas: nextPreviewCanvas, 
    antialias: true, 
    alpha: true 
  });
  nextPreviewRenderer.setSize(previewSize, previewSize, false);
  nextPreviewRenderer.setClearColor(0x000000, 0);
  
  const nextLight = new THREE.AmbientLight(0xffffff, 0.8);
  nextPreviewScene.add(nextLight);
  const nextDirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  nextDirLight.position.set(50, 80, 100);
  nextPreviewScene.add(nextDirLight);

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xfff3dd, 1.0);
  dirLight.position.set(220, 500, 400);
  dirLight.castShadow = CONFIG.RENDER.shadows;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.left = -400;
  dirLight.shadow.camera.right = 400;
  dirLight.shadow.camera.top = 700;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 1000;
  scene.add(dirLight);

  const theme = initSettingsUI();
  jarGroup = buildJar(theme);
  scene.add(jarGroup);
  refreshJarColors(theme);
  scene.background = new THREE.Color(0xffffff);

  templates = await loadTierTemplates((done, total, name) => {
    loadingOverlay.textContent = `Loading ${name}… (${done}/${total})`;
  });
  loadingOverlay.hidden = true;

  world = new World(CONFIG);
  best = loadBest();
  bestValueEl.textContent = String(best);

  buildTierLadder();
  currentTierIndex = pickSpawnTier();
  nextTierIndex = pickSpawnTier();
  rebuildGhost();
  updateCurrentPreview();
  updateNextPreview();
  updateScoreDisplay();

  bindInput();
  bindDialogs();

  new ResizeObserver(onResize).observe(stageWrap);
  onResize();

  requestAnimationFrame((t) => { lastFrameTime = t; tick(t); });
}

boot().catch((err) => {
  console.error(err);
  loadingOverlay.textContent = "Something went wrong loading the game — check the console for details.";
});
