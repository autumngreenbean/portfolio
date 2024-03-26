import * as THREE from 'https://unpkg.com/three/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(20, window.innerWidth/window.innerHeight, 0.1,1000);

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = new THREE.WebGL1Renderer({
  canvas: canvas
});


renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth,window.innerHeight);
camera.position.setZ(30);

scene.background = new THREE.Color(0xe5f2c9);

const geometry = new THREE.TorusGeometry(10,3,16,100);

//const material = new THREE.MeshBasicMaterial({color:0xFF6347, wireframe:true});

var material = new THREE.MeshBasicMaterial({
  color: ('white'),
  wireframe: true,
  wireframeLinewidth: 200,
  dithering:true
});

const torus = new THREE.Mesh(geometry, material);

const torus2 = new THREE.Mesh(geometry, material);

torus.position.setZ(0);
torus.position.setX(0);
torus.position.setY(0);
  // torus.rotation.x = 200;
  // scene.add(torus);

// torus2.setSize= .5;
torus2.position.setX(-40);
torus2.position.setY(1);
torus2.position.setZ(-100);

torus2.rotation.x = 15;
scene.add(torus2);

function moveCamera() {
  const t = document.body.getBoundingClientRect().top;
  torus2.rotation.x += 0.034;
  // torus2.rotation.y += 0.0075;
  // torus2.rotation.z += 0.005;

  // camera.position.z = t * -0.00001;
  // camera.position.x = t * 0.0002;
  // camera.rotation.y = t * -0.0002;

  renderer.render(scene, camera);
}

document.body.onscroll = moveCamera;

function animate() {
  console.log('animate() called');
  requestAnimationFrame(animate);

  torus.rotation.x += 0.005;
  torus.rotation.y += 0.005;
  torus.rotation.z += 0.0001;
  renderer.render(scene,camera);
}

animate();
