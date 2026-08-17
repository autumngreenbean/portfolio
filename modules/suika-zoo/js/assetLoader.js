// ============================================================================
// assetLoader.js
// Produces one Three.Object3D "template" mesh per tier, which game.js then
// clones for every dropped instance. Two modes, switched by
// CONFIG.ASSETS.usePlaceholders:
//
//  - placeholder: a friendly colored blob (sphere + squash + two eyes), so
//    the whole game is fully playable with zero external files.
//  - real: loads /assets/<folder>/<folder>.obj + .mtl via three's OBJLoader/
//    MTLLoader, computes the model's bounding sphere and uniformly rescales
//    it so its radius matches CONFIG.TIERS[i].radius exactly — meaning your
//    mySims .obj files can be at any native scale/orientation and will still
//    drop into the jar at the correct size, just re-export centered.
// ============================================================================

import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";

function makePlaceholderTemplate(tier, colorHex) {
  const group = new THREE.Group();
  const r = tier.radius;

  const bodyGeo = new THREE.SphereGeometry(r, 28, 20);
  bodyGeo.scale(1, 0.92, 1);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.55,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData.tierColored = true;
  group.add(body);

  // Two small ears (cones) — cheap, reads as "animal" without needing real geo.
  const earGeo = new THREE.ConeGeometry(r * 0.22, r * 0.42, 12);
  const earMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6 });
  const earL = new THREE.Mesh(earGeo, earMat);
  const earR = new THREE.Mesh(earGeo, earMat);
  earL.position.set(-r * 0.5, r * 0.78, r * 0.1);
  earR.position.set(r * 0.5, r * 0.78, r * 0.1);
  earL.rotation.z = 0.35;
  earR.rotation.z = -0.35;
  earL.castShadow = earR.castShadow = true;
  earL.userData.tierColored = true;
  earR.userData.tierColored = true;
  group.add(earL, earR);

  // Face: two eyes + nose, on a small canvas-free geometry approach.
  const eyeGeo = new THREE.SphereGeometry(r * 0.09, 10, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x241f18, roughness: 0.3 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-r * 0.32, r * 0.12, r * 0.86);
  eyeR.position.set(r * 0.32, r * 0.12, r * 0.86);
  group.add(eyeL, eyeR);

  const noseGeo = new THREE.SphereGeometry(r * 0.1, 10, 8);
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.3 });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, -r * 0.08, r * 0.95);
  group.add(nose);

  group.userData.isPlaceholder = true;
  return group;
}

function recenterAndScale(object3d, targetRadius) {
  // First pass: get bounding box in world space
  const box = new THREE.Box3().setFromObject(object3d);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Recenter ALL geometry at the vertex level, not just object position.
  // This ensures the visual center is truly at the origin for proper rotation.
  object3d.traverse((node) => {
    if (node.isMesh && node.geometry) {
      node.geometry.translate(-center.x, -center.y, -center.z);
    }
    // Reset any transforms on child nodes to avoid inherited offsets
    if (node !== object3d) {
      node.position.set(0, 0, 0);
      node.rotation.set(0, 0, 0);
      node.scale.set(1, 1, 1);
    }
  });
  
  // Also adjust the object's position since we moved the geometry
  object3d.position.set(0, 0, 0);
  object3d.rotation.set(0, 0, 0);
  object3d.updateMatrixWorld(true);

  // Calculate bounding radius based on the XY dimensions for 2.5D physics.
  // Use the maximum of width/height to ensure the circle fully contains
  // the model, then slightly reduce it (0.8x) for tighter, more natural stacking.
  const boundingRadius = Math.max(size.x, size.y) / 2 * 0.8;
  const scale = boundingRadius > 0 ? targetRadius / boundingRadius : 1;
  
  // Apply scale to the object itself, not the wrapper, so the wrapper
  // always has scale 1 and can be freely scaled for animations
  object3d.scale.setScalar(scale);
  object3d.updateMatrixWorld(true);

  const wrapper = new THREE.Group();
  wrapper.add(object3d);

  wrapper.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
      // Ensure materials render correctly - force double-sided and proper visibility
      if (n.material) {
        if (Array.isArray(n.material)) {
          n.material.forEach(mat => {
            mat.side = THREE.DoubleSide;
            mat.transparent = false;
            mat.depthWrite = true;
            mat.depthTest = true;
          });
        } else {
          n.material.side = THREE.DoubleSide;
          n.material.transparent = false;
          n.material.depthWrite = true;
          n.material.depthTest = true;
        }
      }
    }
  });

  return wrapper;
}

async function loadRealTemplate(tier) {
  const base = CONFIG.ASSETS.basePath;
  const mtlPath = base + CONFIG.ASSETS.mtlFile(tier.folder);
  const objPath = base + CONFIG.ASSETS.objFile(tier.folder);
  const folderPath = base + tier.folder + '/';

  const mtlLoader = new MTLLoader();
  mtlLoader.setResourcePath(folderPath); // Set path for texture loading
  const materials = await mtlLoader.loadAsync(mtlPath);
  materials.preload();

  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  const obj = await objLoader.loadAsync(objPath);

  return recenterAndScale(obj, tier.radius);
}

/**
 * Builds one template Object3D per tier. Falls back to a placeholder blob
 * automatically (per-tier) if a real asset is missing or fails to parse, so
 * a partially-populated /assets folder still results in a playable game.
 */
export async function loadTierTemplates(onProgress) {
  const theme = Theme.refresh();
  const templates = [];

  for (let i = 0; i < CONFIG.TIERS.length; i++) {
    const tier = CONFIG.TIERS[i];
    let template = null;

    if (!CONFIG.ASSETS.usePlaceholders) {
      try {
        template = await loadRealTemplate(tier);
      } catch (err) {
        console.warn(
          `[assetLoader] Falling back to placeholder for "${tier.name}" — ` +
          `couldn't load ${CONFIG.ASSETS.basePath}${tier.folder}/. (${err.message})`
        );
      }
    }

    if (!template) {
      template = makePlaceholderTemplate(tier, theme.tierColors[i] || "#cccccc");
    }

    template.userData.tierId = tier.id;
    templates.push(template);
    if (onProgress) onProgress(i + 1, CONFIG.TIERS.length, tier.name);
  }

  return templates;
}
