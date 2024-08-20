import * as THREE from 'https://unpkg.com/three/build/three.module.js';
const scrollableElement = document.querySelector('.right-column');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(20, window.innerWidth/window.innerHeight, 0.1, 1000);

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({
  canvas: canvas
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);

scene.background = new THREE.Color(0xf9f1f1);

const geometry = new THREE.TorusGeometry(10, 3, 16, 100);

var material = new THREE.MeshBasicMaterial({
  color: (0x000000),
  wireframe: true,
  dithering: true
});


const torus = new THREE.Mesh(geometry, material);
scene.add(torus);  // Ensure this torus is added to the scene

const torus2 = new THREE.Mesh(geometry, material);
torus2.position.setX(1);
torus2.position.setY(1);
torus2.position.setZ(-50);
torus2.rotation.x = 15;
scene.add(torus2);

function moveCamera() {
  const scrollTop = scrollableElement.scrollTop;
  torus2.rotation.x += 0.034;

  renderer.render(scene, camera);
}

if (scrollableElement) {
  scrollableElement.addEventListener('scroll', moveCamera);
}
// document.body.onscroll = moveCamera;

function animate() {
  requestAnimationFrame(animate);

  torus.rotation.x += 0.005;
  torus.rotation.y += 0.005;
  torus.rotation.z += 0.0001;
  renderer.render(scene, camera);
}

animate();

// Handle window resize to maintain aspect ratio
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
