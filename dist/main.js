import './style.css'
import * as THREE from 'https://unpkg.com/three/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1,1000);

// Use WebGLRenderer instead of WebGL1Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth,window.innerHeight);
camera.position.setZ(30);

renderer.render(scene,camera);

const geometry = new THREE.TorusGeometry(10,3,16,100);
const material = new THREE.MeshBasicMaterial({color:0xFF6347, wireframe:true});

// Create a new material instance for torus2
const material2 = new THREE.MeshBasicMaterial({color:0xFF6347, wireframe:true});

const torus = new THREE.Mesh(geometry, material);
const torus2 = new THREE.Mesh(geometry, material2); // Use the new material instance for torus2

torus.position.z = 30;
torus.position.setX(-10);
scene.add(torus);

torus2.position.z = 10;
torus2.position.setX(-10);
scene.add(torus2);

function moveCamera() {
  const t = document.body.getBoundingClientRect().top;
  torus2.rotation.x += 0.05;
  torus2.rotation.y += 0.0075;
  torus2.rotation.z += 0.005;

  // camera.position.z = t * -0.00001;
  camera.position.x = t * 0.0002;
  camera.rotation.y = t * -0.0002;
}

document.body.onscroll = moveCamera

function animate() {
  console.log('animate() called');
  requestAnimationFrame(animate);

  torus.rotation.x += 0.005;
  torus.rotation.y += 0.0005;
  torus.rotation.z += 0.01;
  renderer.render(scene,camera);
}

animate();
