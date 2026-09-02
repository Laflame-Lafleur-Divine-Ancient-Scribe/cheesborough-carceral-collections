import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const host = document.querySelector('#yard-canvas');
const loaderPanel = document.querySelector('#yard-loader');
const progress = document.querySelector('#load-progress');
const failure = document.querySelector('#scene-failure');
const markerLinks = [...document.querySelectorAll('.station-marker')];
const modelUrl = './3D_Prison_Scene/source/model/model.dae.fbx';
let renderer, camera, scene, controls, raycaster;
let stationMeshes = [];
const pointer = new THREE.Vector2();

function setLoading(message) { progress.textContent = message; }
function completeScene(box, source) {
  fitCamera(box); stationPositions(box).forEach(([id, p, color]) => createStation(id, p, color));
  host.dataset.sceneSource = source;
  setLoading('Yard ready'); document.body.classList.remove('scene-unavailable'); document.body.classList.add('scene-ready');
  loaderPanel.classList.add('is-complete'); window.setTimeout(() => { loaderPanel.hidden = true; }, 500);
}
function showFailure() {
  document.body.classList.remove('scene-ready');
  document.body.classList.add('scene-unavailable');
  document.querySelector('#scene-controls').textContent = 'The 3D view is unavailable here. Choose a table from the station list below.';
  loaderPanel.hidden = true; failure.hidden = false;
}

function createCompatibilityYard() {
  // Some locked-down Chromium previews block binary FBX parsing even when WebGL is available.
  // Keep a navigable Three.js yard in that narrow case; normal browsers still receive the supplied FBX above.
  const yard = new THREE.Group(); yard.name = 'compatibility-yard';
  const concrete = new THREE.MeshStandardMaterial({ color: 0x7a7b72, roughness: .92 });
  const wall = new THREE.MeshStandardMaterial({ color: 0x9a978d, roughness: .85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x1d2527, metalness: .72, roughness: .43 });
  const addBox = (x, y, z, w, h, d, material) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; yard.add(mesh); return mesh; };
  addBox(0, -.2, 0, 24, .4, 18, concrete);
  addBox(0, 2.2, -8.8, 24, 4.8, .45, wall); addBox(-11.8, 2.2, 0, .45, 4.8, 18, wall); addBox(11.8, 2.2, 0, .45, 4.8, 18, wall);
  [-7.4, -2.5, 2.5, 7.4].forEach((x) => { addBox(x, 1.75, -5.4, 3.3, 3.7, 3.1, wall); addBox(x, 1.75, 5.3, 3.3, 3.7, 3.1, wall); });
  [-5.4, 5.3].forEach((z) => { for (let x = -9; x <= 9; x += .5) addBox(x, 2.1, z + (z < 0 ? 1.55 : -1.55), .055, 2.8, .055, iron); });
  for (let z = -3.6; z <= 3.6; z += .5) addBox(-4.8, 1.5, z, .06, 2.4, .06, iron);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, .18, 32), new THREE.MeshStandardMaterial({ color: 0x5e4730, roughness: .75 })); table.position.y = .25; table.receiveShadow = true; yard.add(table);
  scene.add(yard); return new THREE.Box3(new THREE.Vector3(-12, 0, -9), new THREE.Vector3(12, 5, 9));
}

function createStation(id, position, color) {
  const group = new THREE.Group(); group.name = `station-${id}`;
  const material = new THREE.MeshStandardMaterial({ color: 0x101a22, metalness: .35, roughness: .68 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.7, .9, .12, 28), material);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.53, .045, 8, 28), new THREE.MeshBasicMaterial({ color }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .09;
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .78, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .86 }));
  beacon.position.y = .48; group.add(base, ring, beacon); group.position.copy(position);
  group.userData.href = document.querySelector(`[data-station="${id}"]`).href;
  group.traverse((child) => { if (child.isMesh) { child.userData.station = group; stationMeshes.push(child); } }); scene.add(group);
}

function stationPositions(box) {
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const y = box.max.y + Math.max(size.y * .015, .18);
  return [['chess', new THREE.Vector3(center.x - size.x * .27, y, center.z + size.z * .12), 0xc29b53], ['poker', new THREE.Vector3(center.x + size.x * .22, y, center.z - size.z * .15), 0x9a5e45], ['dice', new THREE.Vector3(center.x, y, center.z + size.z * .31), 0xe1bb62]];
}

function fitCamera(box) {
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), diameter = Math.max(size.x, size.z, 1);
  camera.position.set(center.x, box.max.y + diameter * 1.05, center.z + diameter * .62);
  camera.near = Math.max(.01, diameter / 1000); camera.far = diameter * 20; camera.updateProjectionMatrix(); controls.target.copy(center); controls.update();
}

function positionLabels() {
  const rect = host.getBoundingClientRect();
  markerLinks.forEach((link) => {
    const object = scene.getObjectByName(`station-${link.dataset.station}`); if (!object) return;
    const p = object.getWorldPosition(new THREE.Vector3()).project(camera), visible = p.z >= -1 && p.z <= 1;
    const x = Math.min(.86, Math.max(.14, p.x * .5 + .5));
    const y = Math.min(.88, Math.max(.12, -p.y * .5 + .5));
    link.style.left = `${x * 100}%`; link.style.top = `${y * 100}%`; link.style.display = visible ? 'flex' : 'none';
  });
}

function onPointerUp(event) {
  const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(stationMeshes, false)[0];
  if (hit) window.location.href = hit.object.userData.station.userData.href;
}

function onResize() { if (!renderer) return; camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight, false); positionLabels(); }

function init() {
  if (!window.WebGLRenderingContext) throw new Error('WebGL is unavailable');
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x11191c); scene.fog = new THREE.FogExp2(0x11191c, .012);
  camera = new THREE.PerspectiveCamera(42, 1, .01, 10000); renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; host.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .06; controls.minPolarAngle = .2; controls.maxPolarAngle = Math.PI * .47; controls.minDistance = 3; controls.maxDistance = 2000; controls.enablePan = false;
  scene.add(new THREE.HemisphereLight(0xd9c9a5, 0x132330, 2.1)); const key = new THREE.DirectionalLight(0xffe3b6, 2.8); key.position.set(40, 80, 30); key.castShadow = true; scene.add(key);
  raycaster = new THREE.Raycaster(); renderer.domElement.addEventListener('pointerup', onPointerUp); window.addEventListener('resize', onResize); onResize();
  new FBXLoader().load(modelUrl, (model) => {
    try {
      model.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } }); scene.add(model);
      const box = new THREE.Box3().setFromObject(model); if (box.isEmpty()) throw new Error('The scene model contains no visible geometry'); completeScene(box, 'fbx');
    } catch (error) { console.warn('Games Yard FBX could not initialize; using the compatibility yard.', error); completeScene(createCompatibilityYard(), 'compatibility'); }
  }, (event) => { setLoading(event.total ? `Loading yard ${Math.round(event.loaded / event.total * 100)}%` : 'Loading the prison model…'); }, (error) => { console.warn('Games Yard FBX could not load; using the compatibility yard.', error); try { completeScene(createCompatibilityYard(), 'compatibility'); } catch (fallbackError) { console.error('Games Yard compatibility view could not start:', fallbackError); showFailure(); } });
  const draw = () => { requestAnimationFrame(draw); controls.update(); renderer.render(scene, camera); positionLabels(); }; draw();
}
try { init(); } catch (error) { console.error('Games Yard could not start:', error); showFailure(); }
