import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "./jsm/loaders/MTLLoader.js";
import { KTX2Loader } from "./jsm/loaders/KTX2Loader.js";
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

let renderer, camera, scene, controls, pmremGenerator;
let TurnDis=[];
const Sizes = { Width: window.innerWidth, Height: window.innerHeight };
const targetObjects = [];
const ChessPieces = [];
const Squares=[];
const DiffPieces=[]
let currentIntersects = [];
let HoveredObject = null;
let textureKey, game,links;
let  pointer;
let SocialAlert = 0;
let MainController = true;
let texturesToLoad=0 ,texturesLoaded = 0;
let gamepause=false;
let Blackout=0
let Whiteout=0
let BlackStorage=[];
let WhiteStorage=[];
const Socials=[]

let botMode=0;
// The selection overlay passes local, transparent skill settings here. These
// values are intentionally modest so the game remains responsive in a browser.
let aiDifficulty = {
  white: { skill: 5, time: 900 },
  black: { skill: 10, time: 1400 }
};
let seatedAvatarGroup = null;
let seatedAvatarProfiles = [];
const strategyChairAnchors = { white: null, black: null };
// The supplied Quaternius sitting figures have four authored material groups:
// Skin, Shirt, Pants, and Shoes.  Keep them intact; only the shirt gets a
// small per-profile variation so different opponents do not look identical.
const seatedAvatarShirtPalette = [0x384b61, 0x5f4938, 0x454357, 0x4e5d43, 0x6a4033, 0x3c5960, 0x605846, 0x494747];
let cellblockRoom = null;
let aiProfiles = { white: null, black: null };
const voiceState = {
  enabled: true,
  volume: 0.72,
  voices: [],
  available: "speechSynthesis" in window
};

function initialiseVoice() {
  if (!voiceState.available) return;
  try {
    voiceState.enabled = localStorage.getItem("ccc-voice-enabled") !== "false";
    const savedVolume = Number(localStorage.getItem("ccc-voice-volume"));
    if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) voiceState.volume = savedVolume;
  } catch (_) { /* Private browsing can disallow storage; use session defaults. */ }
  const refreshVoices = () => { voiceState.voices = window.speechSynthesis.getVoices(); updateVoiceControls(); };
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

function updateVoiceControls() {
  document.querySelectorAll("[data-voice-toggle]").forEach((input) => {
    input.checked = voiceState.enabled;
    input.disabled = !voiceState.available;
    input.setAttribute("aria-label", voiceState.available ? (voiceState.enabled ? "AI voice on" : "AI voice off") : "AI voice unavailable");
  });
  document.querySelectorAll("[data-voice-toggle-label]").forEach((label) => {
    label.textContent = voiceState.available ? (voiceState.enabled ? "Voice on" : "Voice off") : "Voice unavailable";
  });
  document.querySelectorAll("[data-voice-volume]").forEach((input) => {
    input.value = String(Math.round(voiceState.volume * 100));
    input.disabled = !voiceState.available || !voiceState.enabled;
  });
  document.querySelectorAll("[data-voice-status]").forEach((status) => {
    status.textContent = voiceState.available ? (voiceState.enabled ? "Voice ready" : "Voice muted") : "Voice unavailable";
  });
}

function setVoiceEnabled(enabled) {
  voiceState.enabled = Boolean(enabled) && voiceState.available;
  if (!voiceState.enabled && voiceState.available) window.speechSynthesis.cancel();
  try { localStorage.setItem("ccc-voice-enabled", String(voiceState.enabled)); } catch (_) {}
  updateVoiceControls();
}

function setVoiceVolume(percent) {
  voiceState.volume = Math.max(0, Math.min(1, Number(percent) / 100));
  try { localStorage.setItem("ccc-voice-volume", String(voiceState.volume)); } catch (_) {}
  updateVoiceControls();
}

function voiceForProfile(profile) {
  if (!profile || !voiceState.voices.length) return null;
  const EnglishVoices = voiceState.voices.filter((voice) => /^en([_-]|$)/i.test(voice.lang));
  const pool = EnglishVoices.length ? EnglishVoices : voiceState.voices;
  return pool[profile.portrait % pool.length] || null;
}

function speakAIEvent(side, message) {
  const profile = aiProfiles[side];
  if (!voiceState.available || !voiceState.enabled || !profile || !message) return;
  const utterance = new SpeechSynthesisUtterance(message);
  const index = Number(profile.portrait) || 0;
  const selectedVoice = voiceForProfile(profile);
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.volume = voiceState.volume;
  utterance.rate = 0.9 + (index % 4) * 0.06;
  utterance.pitch = 0.92 + (index % 5) * 0.04;
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (_) { /* Speech is an optional enhancement. */ }
}

function announceAIsAtMatchStart() {
  const selected = [aiProfiles.white, aiProfiles.black].filter(Boolean);
  if (!selected.length) return;
  const description = selected.map((profile) => profile.name).join(" and ");
  speakAIEvent(selected[0].side, `${description} ${selected.length === 1 ? "is" : "are"} seated at the strategy table.`);
}

function createCellblockRoom() {
  if (cellblockRoom || !scene) return;
  cellblockRoom = new THREE.Group();
  cellblockRoom.name = "ProceduralCellblockStrategyRoom";
  const concrete = new THREE.MeshStandardMaterial({ color: 0x252827, roughness: 0.95, metalness: 0.02 });
  const concreteEdge = new THREE.MeshStandardMaterial({ color: 0x343632, roughness: 0.88, metalness: 0.03 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x151a1a, roughness: 0.68, metalness: 0.78 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x9b762d, roughness: 0.42, metalness: 0.7, emissive: 0x211608, emissiveIntensity: 0.18 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x171a19, roughness: 0.94, metalness: 0.02 });
  const addBox = (name, width, height, depth, x, y, z, material, bevel = false) => {
    const geometry = bevel ? new THREE.BoxGeometry(width, height, depth, 2, 2, 2) : new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cellblockRoom.add(mesh);
    return mesh;
  };
  const addBar = (x, z, y = 0.72, length = 3.45) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, length, 8), iron);
    mesh.name = "CellblockIronBar";
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cellblockRoom.add(mesh);
  };

  addBox("CellblockFloor", 7.8, 0.12, 8.4, 0, -1.08, 0.45, floorMaterial);
  addBox("CellblockWestWall", 0.32, 4.2, 8.2, -3.25, 0.92, 0.45, concrete);
  addBox("CellblockEastWall", 0.32, 4.2, 8.2, 3.25, 0.92, 0.45, concrete);
  addBox("CellblockRearWall", 6.8, 4.2, 0.34, 0, 0.92, 4.35, concrete);
  addBox("CellblockLintel", 6.8, 0.22, 0.52, 0, 2.83, -3.55, concreteEdge);
  addBox("CellblockUpperRail", 6.8, 0.08, 0.12, 0, 2.35, -3.42, iron);
  addBox("CellblockLowerRail", 6.8, 0.08, 0.12, 0, -0.2, -3.42, iron);
  for (let x = -3; x <= 3; x += 0.32) addBar(x, -3.42, 1.06, 3.06);
  [-2.9, 2.9].forEach((x) => {
    addBox("CellblockDoorFrame", 0.14, 3.55, 0.22, x, 0.86, -3.42, iron);
  });
  [-2.83, 2.83].forEach((x) => {
    for (let z = -2.7; z <= 3.5; z += 0.48) addBar(x, z, 0.82, 3.52);
    addBox("CellblockSideRail", 0.12, 0.1, 6.65, x, 2.4, 0.42, iron);
    addBox("CellblockSideRail", 0.12, 0.1, 6.65, x, -0.2, 0.42, iron);
  });
  // Sparse architectural bands keep the scene institutional without turning it into a caricature.
  [-1.6, 0, 1.6].forEach((x) => addBox("CellblockRearPilaster", 0.22, 3.7, 0.18, x, 0.65, 4.1, concreteEdge));
  addBox("CellblockRearBand", 6.35, 0.14, 0.14, 0, 1.72, 4.06, concreteEdge);
  const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.31, 0.12, 20), brass);
  fixture.name = "WarmOverheadFixture";
  fixture.position.set(0, 2.65, -0.2);
  fixture.castShadow = true;
  cellblockRoom.add(fixture);
  const warmLight = new THREE.PointLight(0xd6a844, 10, 9, 2);
  warmLight.name = "CellblockWarmLight";
  warmLight.position.set(0, 2.48, -0.15);
  warmLight.castShadow = !/Mobi|Android/i.test(navigator.userAgent);
  if (warmLight.castShadow) warmLight.shadow.mapSize.set(512, 512);
  cellblockRoom.add(warmLight);
  scene.add(cellblockRoom);
}

function clearSeatedAvatars() {
  if (!seatedAvatarGroup) return;
  while (seatedAvatarGroup.children.length) {
    const avatar = seatedAvatarGroup.children[0];
    seatedAvatarGroup.remove(avatar);
    avatar.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
    });
  }
}

function seatedAvatarPath(profile) {
  const root = "assets/avatars/source/posed-background-characters/Posed Background Characters by @Quaternius/";
  return profile.group === "Women"
    ? root + "Female/Female Poses/OBJ/Female_Sitting.obj"
    : root + "Male/Male Poses/OBJ/Male_Sitting.obj";
}

function seatedAvatarMaterialPath(profile) {
  const root = "assets/avatars/source/posed-background-characters/Posed Background Characters by @Quaternius/";
  return profile.group === "Women"
    ? root + "Female/Female Poses/OBJ/Female_Sitting.mtl"
    : root + "Male/Male Poses/OBJ/Male_Sitting.mtl";
}

function varySuppliedAvatarMaterials(avatar, profile) {
  const shirtColor = seatedAvatarShirtPalette[profile.portrait % seatedAvatarShirtPalette.length];
  avatar.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    // MTLLoader assigns the supplied named materials to the OBJ's four mesh
    // groups. Clone only Shirt before varying it; skin, pants, and shoes stay
    // precisely as authored in the CC0 package.
    const wasMaterialArray = Array.isArray(child.material);
    const material = wasMaterialArray ? child.material : [child.material];
    const updatedMaterials = material.map((source) => {
      if (!source || source.name !== "Shirt") return source;
      const shirt = source.clone();
      shirt.color.setHex(shirtColor);
      shirt.name = "Shirt";
      return shirt;
    });
    child.material = wasMaterialArray ? updatedMaterials : updatedMaterials[0];
    if (child.geometry) child.geometry.computeVertexNormals();
  });
}

function addSeatedAvatar(profile) {
  const expectedName = profile.name;
  const expectedSide = profile.side;
  const materialLoader = new MTLLoader();
  materialLoader.load(seatedAvatarMaterialPath(profile), (materials) => {
    materials.preload();
    const loader = new OBJLoader();
    loader.setMaterials(materials);
    loader.load(seatedAvatarPath(profile), (avatar) => {
      if (!seatedAvatarProfiles.some((item) => item.name === expectedName && item.side === expectedSide)) return;
      avatar.scale.setScalar(0.38);
      positionAvatarInChair(avatar, profile.side);
      avatar.name = `Seated_${profile.side}_${profile.name}`;
      varySuppliedAvatarMaterials(avatar, profile);
      seatedAvatarGroup.add(avatar);
    }, undefined, (error) => console.error("Unable to load seated avatar geometry", error));
  }, undefined, (error) => console.error("Unable to load seated avatar materials", error));
}

function positionAvatarInChair(avatar, side) {
  const anchor = strategyChairAnchors[side];
  // The sitting models have their feet at their local origin.  The original
  // chairs are on the model floor at y = -1, so use their world x/z but keep
  // that floor contact rather than placing the character at the chair mesh
  // origin (which is partway up the seat geometry).
  if (!anchor) {
    avatar.position.set(0, -1.0, side === "white" ? -1.42 : 1.42);
    avatar.rotation.set(0, side === "white" ? Math.PI : 0, 0);
    return;
  }
  avatar.position.set(anchor.position.x, -1.0, anchor.position.z);
  avatar.rotation.set(0, anchor.rotationY, 0);
}

function captureStrategyChairAnchors(model) {
  model.updateMatrixWorld(true);
  const chairMeshes = {};
  model.traverse((child) => {
    if (!child.isMesh) return;
    if (child.name === "Tables Chair1") chairMeshes.white = child;
    if (child.name === "Tables Chair2") chairMeshes.black = child;
  });
  Object.entries(chairMeshes).forEach(([side, chair]) => {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    chair.getWorldPosition(position);
    chair.getWorldQuaternion(quaternion);
    strategyChairAnchors[side] = {
      position,
      rotationY: new THREE.Euler().setFromQuaternion(quaternion, "YXZ").y
    };
  });
  seatedAvatarGroup?.children.forEach((avatar) => {
    const side = avatar.name.includes("Seated_white_") ? "white" : "black";
    positionAvatarInChair(avatar, side);
  });
}

function setSeatedAvatars(profiles) {
  seatedAvatarProfiles = Array.isArray(profiles) ? profiles : [];
  if (!scene) return;
  if (!seatedAvatarGroup) {
    seatedAvatarGroup = new THREE.Group();
    seatedAvatarGroup.name = "SelectedSeatedAvatars";
    scene.add(seatedAvatarGroup);
  }
  clearSeatedAvatars();
  seatedAvatarProfiles.forEach(addSeatedAvatar);
}

// Preserve the original chess table composition exactly.  The cellblock is a
// surrounding room, not a replacement for the board, chairs, table, pieces,
// storage, or turn indicators.  Only these known office decorations are hidden.
function isLegacyOfficeDecorMesh(name = "") {
  return /^(?:Others Flower|Others vaze|flowers|TheFlowers|SideItems Plants Grid|SideItems Walls|SideItems TheDoor|Door classic|Floor|Tables (?:Linkedin|Insta|Github))$/.test(name);
}

function saveOriginalTransform(obj) {
    obj.userData.MainScale = obj.scale.clone();
    obj.userData.MainRotation = obj.rotation.clone();
    obj.userData.MainPosition = obj.position.clone();
  }
function initializeScene() {
  const container = document.getElementById("container");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111312);
  container.appendChild(renderer.domElement);
  const ambient = new THREE.HemisphereLight(0x59615d, 0x131514, 0.62);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xd7b165, 0.7);
  dirLight.position.set(18.130, 15.780, 17.951);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  dirLight.castShadow = !isMobile;
  if (!isMobile) {
    dirLight.shadow.mapSize.width = 512;
    dirLight.shadow.mapSize.height = 512;
  }
  scene.add(dirLight);
  createCellblockRoom();
}
function initializeCamera() {
  camera = new THREE.PerspectiveCamera(
  45,
    Sizes.Width / Sizes.Height,
    0.02,
    100
  );
  camera.position.set(0,2,-2);
}
function initializeRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  }
  // Detect mobile
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  renderer.setPixelRatio(isMobile ? 2.5 : window.devicePixelRatio);
  renderer.setSize(Sizes.Width, Sizes.Height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
}


function initializeControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0,0,0);
  controls.enableDamping = true;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = (Math.PI / 2)-0.29;
  controls.minDistance = 0;
  controls.maxDistance = 3.5;
  controls.zoomSpeed = 2;
  controls.enablePan=false
  controls.update();
}
function initializeEnvironment() {
  pmremGenerator = new THREE.PMREMGenerator(renderer);

  new EXRLoader()
    .setPath('assets/environment/')
    .load('abandoned_hall_01_4k.exr', function (texture) {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;
      scene.background = envMap; 
      scene.backgroundBlurriness = 0.5;
      scene.backgroundIntensity = 0.32;
      texture.dispose();
      pmremGenerator.dispose();
    }, undefined, () => {
      // The architectural room remains fully functional if an older browser
      // cannot decode EXR. No remote asset is requested as a fallback.
      scene.background = new THREE.Color(0x111312);
    });
}

function initializeLoaders() {
  textureKey = {
    Floor:"ktx2/Background.ktx2",
    Black:"ktx2/BlackPiece.ktx2",
    Others:"ktx2/Others.ktx2",
    Square:"ktx2/TheSquares.ktx2",
    Tables:"ktx2/TheWoods.ktx2",
    White:"ktx2/WhitePicese.ktx2",
    TheFlowers:"ktx2/SideItemsGrass.ktx2",
    SideItems:"ktx2/NewSideItems.ktx2"
  };

  links = {};
}

function initializeEventListeners() {
  ["mousemove", "touchstart"].forEach((evt) =>
    window.addEventListener(evt, handlePointerMove, { passive: false })
  );

  ["click", "touchend"].forEach((evt) =>
    window.addEventListener(evt, handlePointerClick, { passive: false })
  );

  renderer.domElement.addEventListener(
    "webglcontextlost",
    handleContextLost,
    false
  );
}
function handlePointerMove(e) {
  const x = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
  const y = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
  pointer.x = (x / window.innerWidth) * 2 - 1;
  pointer.y = -(y / window.innerHeight) * 2 + 1;
}
let selectedPiece=null;
let canMoveTo=[];

let ques=0;
// const MovesList = [
//   { from: "d2", to: "d4" }, // 1. d4
//   { from: "d7", to: "d5" }, // 1... d5
//   { from: "c2", to: "c4" }, // 2. c4
//   { from: "e7", to: "e6" }, // 2... e6
//   { from: "b1", to: "c3" }, // 3. Nc3
//   { from: "g8", to: "f6" }, // 3... Nf6
//   { from: "c1", to: "d2" }, // 4. Bd2 (freeing queen-side rook and king)
//   { from: "b8", to: "c6" }, // 4... Nc6
//   { from: "d1", to: "c2" }, // 5. Qc2 (preparing castling)
//   { from: "f8", to: "e7" }, // 5... Be7
//   { from: "e1", to: "c1" }  // 6. O-O-O (white queenside castling)
// ];


// function AutoCheck(){
//     MoveTo(MovesList[ques].from,MovesList[ques].to)
//     ques++
// }


async function smallBotMove() {
  if (game.game_over()) {
    return;
  }
  const movingSide = game.turn() === "w" ? "white" : "black";
  const bestMove = await askStockfishMove();
  let out =bestMove[4]
  out=((out)?out:"q")
  console.log("Bot Moved: "+bestMove)
  canMoveTo=[
    {to: bestMove.slice(0, 2)},
    {to: bestMove.slice(2, 4)}
  ]
  highlightMove();
  setTimeout(() => {
    PromotionCheck(bestMove.slice(0, 2), bestMove.slice(2, 4),out);
    speakAIEvent(movingSide, `${aiProfiles[movingSide]?.name || "The AI"} has made a move.`);
  }, 700);
}
const engine = new Worker("stockfish/stockfish.js");



function askStockfishMove() {
  return new Promise((resolve) => {
    const fen = game.fen();
    const profile = game.turn() === 'w' ? aiDifficulty.white : aiDifficulty.black;
    engine.postMessage("setoption name Skill Level value " + profile.skill);
    engine.postMessage("position fen " + fen);
    engine.postMessage("go movetime " + profile.time);


    engine.onmessage = function (event) {
      if (typeof event.data === "string" && event.data.startsWith("bestmove")) {
        const best = event.data.split(" ")[1];
        resolve(best); 
      }
    };
  });
}


function TurnDisplay(turn){
  if(turn==-1 || botMode==3){
    TurnDis[0].position.y=TurnDis[0].userData.MainPosition.y;
    TurnDis[1].position.y=TurnDis[1].userData.MainPosition.y;
    return;
  }
  gsap.to(TurnDis[(turn)%2].position, {
    y: TurnDis[(turn)%2].userData.MainPosition.y+0.01,
    duration: .2,
    ease: "power2.inOut"
  });
  gsap.to(TurnDis[(turn+1)%2].position, {
    y: TurnDis[(turn+1)%2].userData.MainPosition.y,
    duration: .2,
    ease: "power2.inOut"
  });
}
function colorCheck(obj,color){
  let Theobj=null
  if(obj.name.includes("shadowPlane")){
    obj=obj.parent;
  }
  if(obj.name.includes("Piece")){
    Theobj=obj
    
  }else if(obj.name.includes("Square")){
    let temp=obj.name.split("_")
    let Post = temp[temp.length - 1];
    Theobj=ChessPieces.find(p => p.userData.NowAt == Post); 
    if(Theobj==null){
      return false
    }
  }
  return Theobj.name.includes(color)
}
function handlePointerClick(e) {
  
  if (e.target.closest("#container")) {
    e.preventDefault();

    if (currentIntersects.length > 0) {
      const obj = (currentIntersects[0].object.name.includes("shadowPlane"))?currentIntersects[0].object.parent:currentIntersects[0].object;
      for (const [key, url] of Object.entries(links)) {
        if (obj.name.includes(key)) {
          const win = window.open();
          win.opener = null;
          win.location = url;
          return
        }
      }

      let currentMover=(game.turn()=='w')?"White":"Black";
      if (game.game_over()) {
        return
      };
      if(gamepause){
        return
      }
      if(obj.name.includes("Square") || obj.name.includes("Piece")){
        if(botMode==3){
          return
        }else if(botMode==1 && (game.turn()=='w')){
          return
        }else if(botMode==2 && (game.turn()=='b')){
          return
        }
      }
      if(selectedPiece && !colorCheck(obj,currentMover)){
        let nextMove=null;
        if (obj.name.includes("Piece")) {
          nextMove=obj.userData.NowAt;
        }else if(obj.name.includes("Square")){
          let temp=obj.name.split("_")
          nextMove = temp[temp.length - 1];
        }
        if (!canMoveTo.some(move => move.to === nextMove)) {
          return;
        }
        PromotionCheck(selectedPiece.userData.NowAt,nextMove)
        return;
      }else{
        clearSelectPiece();
        if (obj.name.includes("Piece")) {
          selectedPiece=obj;
        }else if(obj.name.includes("Square")){
          let temp=obj.name.split("_")
          for(let i=0;i<ChessPieces.length;i++){
            if(temp[temp.length - 1]==ChessPieces[i].userData.NowAt){
              selectedPiece=ChessPieces[i];
              break;
            }
          }
        }

        if(!selectedPiece || !selectedPiece.name.includes(currentMover)){
          return
        }
        gsap.to(selectedPiece.scale, {
            x: 1.3,
            y: 1.3,
            z: 1.3,
            duration: 0.2,
            ease: "power4",
        });
        ShadowAnimation(selectedPiece,1,{r:1,g:1,b:1},1.1,0.5,0)
        
        canMoveTo = game.moves({ square: selectedPiece.userData.NowAt, verbose: true });
        highlightMove()
        return;
      }
    }
    else{
        clearSelectPiece()
      }
  }
}

function savePromotion(from,to,pro){
  const promosObj=document.getElementById("promosion")
  promosObj.classList.remove("promot")
  promosObj.innerHTML=``
  PromotionCheck(from,to,pro)
}

function PromotionCheck(from,to,pro){
  if(pro){
    return MoveTo(from,to,pro);
  }
  let piece = game.get(from);
  let promoPiece='q';
  if (piece && piece.type === "p" && ((piece.color === "w" && to[1] === "8") ||(piece.color === "b" && to[1] === "1"))) {
      const promosObj=document.getElementById("promosion")
      promosObj.classList.add("promot")
      promosObj.innerHTML=`
        <button onclick="savePromotion('${from}','${to}','q')">♕ Queen</button>
        <button onclick="savePromotion('${from}','${to}','r')">♖ Rook</button>
        <button onclick="savePromotion('${from}','${to}','b')">♗ Bishop</button>
        <button onclick="savePromotion('${from}','${to}','n')">♘ Knight</button>`;
    return;
  }
  return MoveTo(from,to,promoPiece);
}
function highlightMove(){
  for(let j=0;j<canMoveTo.length;j++){
    let ele=canMoveTo[j]
    gsap.to(Squares[ele.to].position, {
      y: Squares[ele.to].userData.MainPosition.y+0.01,
      duration: .3,
      ease: "power4",
    });
    if (Squares[ele.to].isMesh && Squares[ele.to].material && Squares[ele.to].material.color) {
      Squares[ele.to].material.color.set(0x00ff00);
      document.body.style.cursor = "pointer";
    }
    const piece = ChessPieces.find(p => p.userData.NowAt == ele.to); 
    if (piece) {
      if(piece.userData.color==((game.turn()=='w')?"White":"Black")){
        Squares[ele.to].material.color.set(0x1313ca);
      }else{
        Squares[ele.to].material.color.set(0xca1313);
      }
      
      gsap.to(piece.position, {
        y: piece.userData.MainPosition.y+0.01,
        duration: .3,
        ease: "power4",
      });
    }
  }
}

function RemovehighlightMove(){
  canMoveTo.forEach((ele)=>{
    gsap.to(Squares[ele.to].position, {
      y: Squares[ele.to].userData.MainPosition.y,
      duration: .3,
      ease: "power4",
  });
    if (Squares[ele.to].isMesh && Squares[ele.to].material && Squares[ele.to].material.color && Squares[ele.to].userData.originalColor) {
      Squares[ele.to].material.color.copy(Squares[ele.to].userData.originalColor);
      document.body.style.cursor = "default";
    }
    const piece = ChessPieces.find(p => p.userData.NowAt == ele.to); 
    if (piece) {
      gsap.to(piece.position, {
        y: piece.userData.MainPosition.y,
        duration: .3,
        ease: "power4",
      });
    }
  })
}
function clearSelectPiece(){
  if(selectedPiece){
    gsap.to(selectedPiece.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.2,
        ease: "power4",
    });
    ShadowAnimation(selectedPiece,1,{r:0,g:0,b:0},-1,0.5,0)

    selectedPiece=null;
  }
  RemovehighlightMove()
  canMoveTo=[];
}
function ShadowAnimation(obj,opacity,color,scale,duration,delay){
  const shadow = obj.getObjectByName("shadowPlane", true);
  if (shadow && shadow.material.uniforms) {
    if(scale>=0){
      gsap.to(shadow.scale, {
        x:scale,
        y:scale,
        duration: duration,
        delay:delay
      });
    }else{
      gsap.to(shadow.scale, {
        x:1,
        y:1,
        duration: duration,
        delay:delay
      });
    }
    gsap.to(shadow.material.uniforms.uOpacity, {
      value: opacity, 
      duration: duration,
      delay:delay
    });

    const colorObj = { 
      r: shadow.material.uniforms.uColor.value.r, 
      g: shadow.material.uniforms.uColor.value.g, 
      b: shadow.material.uniforms.uColor.value.b 
    };

    gsap.to(colorObj, {
      r: color.r, g: color.g, b: color.b,
      duration: duration,
      delay:delay,
      onUpdate: () => {
        shadow.material.uniforms.uColor.value.setRGB(colorObj.r, colorObj.g, colorObj.b);
      }
    });
  }
}


function MoveAnimation(PieceToMove,fromSquare,ToSquare,delay,jump){
    const fromWorld = new THREE.Vector3();
    const toWorld   = new THREE.Vector3();

    fromSquare.getWorldPosition(fromWorld);
    ToSquare.getWorldPosition(toWorld);

    let distance = fromWorld.distanceTo(toWorld);
    const baseSpeed = 4;
    
    if(distance>0.3){
      distance=0.3
    }
    if(distance<0.15){
      distance=.15;
    }
    const duration = distance *baseSpeed;
    if(jump){

      gsap.to(PieceToMove.position, {
        x: ToSquare.userData.MainPosition.x,
        z: ToSquare.userData.MainPosition.z,
        duration: duration,
        delay: delay,
        ease: "power2.inOut"
      });

      gsap.to(PieceToMove.position, {
        y: ToSquare.userData.MainPosition.y + 0.06,
        duration: duration/2,
        delay: delay+.1,
        yoyo: true,
        repeat: 1,
        ease: "power1.out"
      });

    }else{
      ShadowAnimation(PieceToMove,0,{r:0,g:0,b:0},0,0,0)
      ShadowAnimation(PieceToMove,1,{r:0,g:0,b:0},1.01,duration,delay)
      

      gsap.to(PieceToMove.position, {
          x: ToSquare.userData.MainPosition.x,
          z: ToSquare.userData.MainPosition.z,
          duration: duration,
          delay:delay,
          ease: "power4",
      });
      gsap.to(PieceToMove.position, {
        y: ToSquare.userData.MainPosition.y + 0.02,
        duration: duration/3.5,
        yoyo: true,
        repeat: 1,
        ease: "power1"
      });
    }
    return duration;
}



function MoveTo(from,To,promoPiece){
  if(gamepause){
    return
  }
  gamepause=true;
  
  
  let PieceToMove=null,ToSquare=Squares[To];
  for(let i=0;i<ChessPieces.length;i++){
    if(from==ChessPieces[i].userData.NowAt){
      PieceToMove=ChessPieces[i];
      break;
    }
  }
  if(PieceToMove && ToSquare){
    clearSelectPiece();
    let move = game.move({ from: from, to: To, promotion: (promoPiece)?promoPiece:"q" });
    if(move==null){
      console.log("Move Failed")
      botChecker()
      gamepause=false
      return
    }

    let delay=CapturePiece(To)?.1:0;
    PieceToMove.userData.NowAt=To
    const duration=MoveAnimation(PieceToMove,Squares[from],ToSquare,delay,(PieceToMove.name.includes("Knight")))
    if(move.flags.includes("k")||move.flags.includes("q")){
      let fromPoint=null,toPoint=null;
      if(move.flags.includes("k")){
        fromPoint=(move.color=='w')?"h1":"h8";
        toPoint=(move.color=='w')?"f1":"f8";
      }else{
        fromPoint=(move.color=='w')?"a1":"a8";
        toPoint=(move.color=='w')?"d1":"d8";
      }
      if(toPoint && fromPoint){
        for(let i=0;i<ChessPieces.length;i++){
          if(ChessPieces[i].userData.NowAt==fromPoint){
            ChessPieces[i].userData.NowAt=toPoint;
            MoveAnimation(ChessPieces[i],Squares[fromPoint],Squares[toPoint],delay,true)
            break
          }
        }
      }
    }
    
    if(move.promotion){
      let thecolor=(move.color=='w')?"White":"Black";
      const newPiece=(move.promotion=="n")?"Kn":move.promotion.toUpperCase();
      const result = Object.keys(DiffPieces).find(key => key.startsWith((thecolor+"_"+newPiece)));
      if(result){
        const queenClone = duplicatePiece(DiffPieces[result]);
        queenClone.position.copy(ToSquare.userData.MainPosition);
        ChessPieces.push(queenClone);
        targetObjects.push(queenClone);
        queenClone.userData.NowAt=To
        saveOriginalTransform(queenClone)
        gsap.to(queenClone.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.0,
          ease: "back.inOut",
        });
        gsap.to(queenClone.scale, {
          x: 1,
          y: 1,
          z: 1,
          delay: delay+duration-0.2,
          duration: 0.5,
          ease: "back.inOut",
        });
      }
    
      
      gsap.to(PieceToMove.scale, {
        x: 0,
        y: 0,
        z: 0,
        delay: delay+duration-0.2,
        duration: 0.5,
        ease: "back.inOut",
      });
      
      removePiece(PieceToMove,(delay+duration+0.2)*900)
        
    }
    if(!game.game_over()){
      setTimeout(()=>{
        TurnDisplay((game.turn()=='w')?0:1)
        gamepause=false;
        botChecker()
      },(delay+duration+0.2)*600)
    }else{
      TurnDisplay(-1)
    }
  }else{
    gamepause=false
  }
  if (game.game_over()) {
    setTimeout(()=>{
      if(game.in_checkmate()){
        let Winner=(game.turn()=='w')?"Black":"White";
        const winningSide = Winner.toLowerCase();
        speakAIEvent(winningSide, `${aiProfiles[winningSide]?.name || Winner} has checkmate.`);
        alert(Winner+" won the match")
      }else{
        const lastMover = move?.color === "w" ? "white" : "black";
        speakAIEvent(lastMover, game.in_stalemate?.() ? "The game is a stalemate." : "The match is a draw.");
        alert("Its a draw")
      }
      document.getElementById("celebrate").classList.add("active")
    },1000)
    
    return;
  }
  
  isCheck()
  if (game.in_check?.()) {
    const checkingSide = move?.color === "w" ? "white" : "black";
    speakAIEvent(checkingSide, `${aiProfiles[checkingSide]?.name || "The AI"} has placed the king in check.`);
  }
  
}

function botChecker(){
  if(botMode==3){
    setTimeout(smallBotMove,500)
  }else if(botMode==1 && (game.turn()=='w')){
    setTimeout(smallBotMove,500)
  }else if(botMode==2 && (game.turn()=='b')){
    setTimeout(smallBotMove,500)
  }
}
function WinnerShowCase(){
  if (!game.game_over()) {
    return
  }
  document.getElementById("celebrate").classList.remove("active")
  if(game.in_checkmate()){
    let Winner=(game.turn()=='w')?"Black":"White";
    ChessPieces.forEach((ele)=>{
      if(!ele.name.includes(Winner)){
        gsap.to(ele.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.7,
            ease: "back.inOut",
          });
        removePiece(ele,800)
      }
    })
    setTimeout(()=>{
      SingleWinner(ChessPieces,Squares)
    },1000)
  }else{
    drawShowCase(ChessPieces,Squares)
  }
}
function SingleWinner(WinnerPieces, Squares) {
  if (WinnerPieces.length === 0) return;

  WinnerPieces.forEach((ele)=>{
    gsap.to(ele.position, {
      x: ele.userData.MainPosition.x,
      y: ele.userData.MainPosition.y,
      z: ele.userData.MainPosition.z,
      duration: 1,
      ease: "back.inOut",
    });
  })
  const king = WinnerPieces.find(p => p.userData.Name === "King");
  
  const center = new THREE.Vector3()
      .addVectors(Squares['d4'].position, Squares['e5'].position)
      .multiplyScalar(0.5);
  if (king) {
    

    gsap.to(king.position, {
      x: center.x,
      y: center.y,
      z: center.z,
      duration: 1,
      ease: "back.inOut",
    });
  }

  const others = WinnerPieces.filter(p => p !== king);
  const radius = 0.15; 
  const step = (Math.PI * 2) / others.length;

  others.forEach((piece, i) => {
    if(piece.Color==king.Color){
      const angle = i * step;
      gsap.to(piece.position, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y,
        z: center.z + Math.sin(angle) * radius,
        duration: 1,
        delay:.6,
        ease: "back.inOut",
      });
      setTimeout(()=>{
        let angle = i * step;       

        gsap.to({}, {
          duration: 5,       
          repeat: -1,       
          ease: "linear",
          onUpdate: function() {
            angle += 0.02;   
            piece.position.x = center.x + Math.cos(angle) * radius;
            piece.position.z = center.z + Math.sin(angle) * radius;
            piece.position.y = center.y;
          }
        });
      },1500)
    }
  });
  gsap.to(king.rotation, {
    y: "+=" + Math.PI * 2, 
    duration: 1,
    repeat: -1,            
    ease: "linear"          
  });
  gsap.to(king.position, {
    y: king.userData.MainPosition.y+0.03, 
    duration: 2,
    yoyo:true,
    repeat: -1,            
    ease: "ease.inOut"          
  });
}

function drawShowCase(WinnerPieces, Squares) {
  if (WinnerPieces.length === 0) return;

  WinnerPieces.forEach((ele)=>{
    gsap.to(ele.position, {
      x: ele.userData.MainPosition.x,
      y: ele.userData.MainPosition.y,
      z: ele.userData.MainPosition.z,
      duration: 1,
      ease: "back.inOut",
    });
  })
  const king1 = WinnerPieces.find(p => p.name.includes("White-Piece_King"));
  const king2 = WinnerPieces.find(p => p.name.includes("Black-Piece_King"));
  
  const center = new THREE.Vector3()
      .addVectors(Squares['d4'].position, Squares['e5'].position)
      .multiplyScalar(0.5);
  const posA1 = Squares['d4'].position.clone();
  const posA2 = Squares['d5'].position.clone();
  const center1 = new THREE.Vector3().addVectors(posA1, posA2).multiplyScalar(0.5);

  const posB1 = Squares['e4'].position.clone();
  const posB2 = Squares['e5'].position.clone();
  const center2 = new THREE.Vector3().addVectors(posB1, posB2).multiplyScalar(0.5);
  if (king1) {
  gsap.to(king1.position, {
      x: center1.x,
      y: center1.y,
      z: center1.z,
      duration: 1,
      ease: "back.inOut",
    });
  }
  if (king2) {
    gsap.to(king2.position, {
      x: center2.x,
      y: center2.y,
      z: center2.z,
      duration: 1,
      ease: "back.inOut",
    });
  }

  let others = WinnerPieces.filter(p => p !== king1);
  others = others.filter(p => p !== king2);
  const radius = 0.18; 
  const step = (Math.PI * 2) / others.length;

  others.forEach((piece, i) => {
      const angle = i * step;
      gsap.to(piece.position, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y,
        z: center.z + Math.sin(angle) * radius,
        duration: 1,
        delay:.6,
        ease: "back.inOut",
      });
      setTimeout(()=>{
        let angle = i * step;       

        gsap.to({}, {
          duration: 5,       
          repeat: -1,       
          ease: "linear",
          onUpdate: function() {
            angle += 0.02;   
            piece.position.x = center.x + Math.cos(angle) * radius;
            piece.position.z = center.z + Math.sin(angle) * radius;
            piece.position.y = center.y;
          }
        });
      },1500)
  });

  gsap.to(king1.rotation, {
    y: "+=" + Math.PI * 2, 
    duration: 1,
    repeat: -1,            
    ease: "linear"          
  });
  gsap.to(king1.position, {
    y: king1.userData.MainPosition.y+0.03, 
    duration: 2,
    yoyo:true,
    repeat: -1,            
    ease: "ease.inOut"          
  });
  gsap.to(king2.rotation, {
    y: "+=" + Math.PI * 2, 
    duration: 1,
    repeat: -1,            
    ease: "linear"          
  });
  gsap.to(king2.position, {
    y: king1.userData.MainPosition.y+0.03, 
    duration: 2,
    yoyo:true,
    repeat: -1,            
    ease: "ease.inOut"          
  });
}

let checkKing=null
let CheckMove=[]
function isCheck(){
  CheckMove.forEach((ele)=>{
    Squares[ele].material.color.copy(Squares[ele].userData.originalColor);
  })
  if(checkKing){
    checkKing.material.emissive.set(0x000000);
    checkKing.material.emissiveIntensity = 0;
    checkKing=null;
    CheckMove=[]
  }
  if(game.in_check()){
    let currentMover=(game.turn()=='w')?"White":"Black";
    for(let i=0;i<ChessPieces.length;i++){
      if(ChessPieces[i].name.includes("King")&&ChessPieces[i].userData.color==currentMover){
        ChessPieces[i].material.emissive.set(0xff1313);
        ChessPieces[i].material.emissiveIntensity = .5;
        checkKing=ChessPieces[i];
      }
    }
    const allMoves = game.moves({ verbose: true });
    CheckMove = [...new Set(allMoves.map(move => move.from))];
    CheckMove.forEach((ele)=>{
      Squares[ele].material.color.set(0xFFFF00);
    })
    console.log(currentMover+" is on check.")
  }
}

function duplicatePiece(original) {
  original.updateMatrixWorld(true);
  const copy = original.clone(true);
  copy.traverse(child => {
    if (child.isMesh) {
      child.material = Array.isArray(child.material)
        ? child.material.map(m => m.clone())
        : child.material.clone();
    }
  });
  try { 
    copy.userData = JSON.parse(JSON.stringify(original.userData)); 
  } catch { 
    copy.userData = { ...original.userData }; 
  }
  const parent = original.parent;
  parent.add(copy);
  copy.position.copy(original.position);
  copy.quaternion.copy(original.quaternion);
  copy.scale.copy(original.scale);
  return copy;
}


function CapturePiece(Square){
  for(let i=0;i<ChessPieces.length;i++){
    if(Square==ChessPieces[i].userData.NowAt){
      
      gsap.to(ChessPieces[i].scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.5,
        ease: "back.inOut",
      });
      removePiece(ChessPieces[i],500)
      return true
    }
  }
  return false;
}
function removePiece(theObj,delay){
  
  const index = targetObjects.indexOf(theObj);
  if (index !== -1) targetObjects.splice(index, 1);
  let newPosition=null
  if(theObj.userData.color=="Black"){
    if(BlackStorage.length<=Blackout){
      if(WhiteStorage.length<=Whiteout){
        theObj.parent.remove(theObj);
      }else{
        Whiteout++;
        newPosition=WhiteStorage[Whiteout];
      }
    }else{
      Blackout++
      newPosition=BlackStorage[Blackout];
    }
  }else{
    if(WhiteStorage.length<=Whiteout){
        if(BlackStorage.length<=Blackout){
          theObj.parent.remove(theObj);
        }else{
          Blackout++
          newPosition=BlackStorage[Blackout];
        }
    }else{
      Whiteout++;
      newPosition=WhiteStorage[Whiteout];
    }
  }
  
  // theObj.position.copy(ToSquare.userData.MainPosition);
  setTimeout(()=>{
    if(newPosition){
      theObj.position.copy(newPosition.position);
    }
    gsap.to(theObj.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.5,
        ease: "back.inOut",
      });
    // theObj.parent.remove(theObj);
    ChessPieces.splice(ChessPieces.indexOf(theObj), 1);
  },delay)
}

function handleContextLost(event) {
  event.preventDefault();
  clearScene();
  window.location.reload();
}

function handleResize() {
  Sizes.Width = window.innerWidth;
  Sizes.Height = window.innerHeight;
  camera.aspect = Sizes.Width / Sizes.Height;
  camera.updateProjectionMatrix();
  renderer.setSize(Sizes.Width, Sizes.Height);
}

function clearScene() {
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement = null;
  }

  if (scene) {
    scene.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      if (object.material.isMaterial) {
        cleanMaterial(object.material);
      } else {
        for (const material of object.material) cleanMaterial(material);
      }
    });
  }
}

function cleanMaterial(material) {
  material.dispose();
  for (const key in material) {
    const value = material[key];
    if (value && typeof value === "object" && "minFilter" in value) {
      value.dispose();
    }
  }
}




function initializeChess(){
  game = new Chess();
}
function load3D() {
  initializeCamera();
  initializeRenderer();
  initializeScene();
  initializeControls();
  initializeEnvironment();
  initializeLoaders();
  initializeEventListeners();
  initializeChess()
  pointer = new THREE.Vector2();
  const Sizes = { Width: window.innerWidth, Height: window.innerHeight };

  window.addEventListener("resize", handleResize);
  window.addEventListener("beforeunload", clearScene);

  

  const manager = new THREE.LoadingManager();
  const tex = new THREE.TextureLoader(manager);

  const dracoLoader = new DRACOLoader().setDecoderPath("jsm/libs/draco/gltf/");
  const loader = new GLTFLoader(manager).setDRACOLoader(dracoLoader);

  const raycaster = new THREE.Raycaster();
  const stats = new Stats();

  const ktx2Loader = new KTX2Loader()
    .setTranscoderPath("jsm/libs/basis/")
    .detectSupport(renderer);

    loader.load(
      "assets/ChessGLB.glb",
      (gltf) => {
        const model = gltf.scene;
        model.position.set(0, -1, 0);
        scene.add(model);
        model.traverse((child) => {
          if (!child.isMesh) return;
          if (isLegacyOfficeDecorMesh(child.name)) {
            child.visible = false;
            return;
          }
          for (const key of Object.keys(textureKey)) {
            if (child.name.includes(key)) {
              texturesToLoad++;
              break;
            }
          }
        });
        captureStrategyChairAnchors(model);
    
        model.traverse((child) => {
          if (!child.isMesh) return;
          if (isLegacyOfficeDecorMesh(child.name)) return;
          for (const [key, path] of Object.entries(textureKey)) {
            if (child.name.includes(key)) {
              ktx2Loader.load(path, (tex) => {
                tex.encoding = THREE.sRGBEncoding;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.magFilter = THREE.LinearFilter;
                // if(child.name.includes("SideItems_Walls")){
                //   child.scale.y+=.6
                //   child.position.y+=1
                // }
                if(child.name.includes("Floor") || child.name.includes("Tables_Side")){
                  child.material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    map: tex,      
                    clearcoat:0
                  });
                }
                else if(child.name.includes("Piece") || child.name.includes("Square")){
                  child.material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    map: tex,  
                    roughness:(child.name.includes("Square"))?1:0,
                    metalness:(child.name.includes("Square"))?0:.4,      
                    clearcoat:1
                  });
                  // child.material = new THREE.MeshPhysicalMaterial({
                  //   color: 0xffffff,
                  //   map: tex,  
                  //   roughness:(child.name.includes("Square"))?.5:0,
                  //   metalness:(child.name.includes("Square"))?.5:1,      
                  //   clearcoat:1
                  // });
                }else if(child.name.includes("obj")||child.name.includes("Leg")||  child.name.includes("Chair")||child.name.includes("Outer_Frame")){
                  child.material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    map: tex,  
                    roughness:(child.name.includes("Chair")||child.name.includes("Leg"))?.7:.05,
                    metalness:.0,      
                    clearcoat:0.05
                  });
                }else if(child.name.includes("Github")||child.name.includes("Insta")||  child.name.includes("Linkedin")){
                  // The original model's social plaques are omitted from this adaptation.
                  // Attribution remains available in the accessible About panel and notice.
                  child.visible = false;
                }
                else{
                  child.material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    map: tex,  
                    roughness:1,
                  });
                }

              
                if (child.geometry) {
                  child.geometry.computeVertexNormals();
                }

                texturesLoaded++;
                if (texturesLoaded === texturesToLoad) {
                  renderer.compile(scene, camera);
                  renderer.setAnimationLoop(animate);
                }
              });
              break;
            }
          }


          if(child.name.includes("BTurn") || child.name.includes("WTurn")){
            child.material = child.material.clone();
            child.material.color.set(0xefefef);
            TurnDis[(child.name.includes("WTurn"))?0:1]=child;
            saveOriginalTransform(child);
          }
          if(child.name.includes("ChessBack")){
            child.material = child.material.clone(); 
            child.material.color.set(0x000000);
          }else 
          if(child.name.includes('Piece')){
            
            saveOriginalTransform(child);
            ChessPieces.push(child)
            targetObjects.push(child)
            let testvar=child.name.split("_")
            child.userData.NowAt=testvar[testvar.length-1];
            child.userData.color=testvar[0].split("-")[0];
            child.userData.Name=testvar[1]
            if(!(DiffPieces[testvar[0].split("-")[0]+"_"+testvar[1]])){
              DiffPieces[testvar[0].split("-")[0]+"_"+testvar[1]]=child;
            }
            child.userData.originalColor = child.material.color.clone();
            const shadowMaterial = new THREE.ShaderMaterial({
              transparent: true,
              uniforms: {
                uOpacity: { value: 1 },
                uColor: { value: new THREE.Color(0x000000) }
              },
              vertexShader: `
                varying vec2 vUv;
                void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                varying vec2 vUv;
                uniform float uOpacity;
                uniform vec3 uColor;
                void main() {
                  float dist = distance(vUv, vec2(0.5));
                  float alpha = smoothstep(0.5, 0.0, dist); // feather
                  gl_FragColor = vec4(uColor, alpha * uOpacity);
                }
              `
            });

            const shadowPlane = new THREE.Mesh(
              new THREE.PlaneGeometry(.047, .047),
              shadowMaterial
            );
            shadowPlane.rotation.x = -Math.PI / 2;
            shadowPlane.position.y = 0.001;
            shadowPlane.name = "shadowPlane";

            child.add(shadowPlane);

          }else if(child.name.includes("Square")){
            let key=child.name.split("_")[1];
            Squares[key]=child;
            saveOriginalTransform(child);
            targetObjects.push(child);
            if (child.isMesh && child.material) {
              child.material = child.material.clone();
              child.userData.originalColor = child.material.color.clone();
            }
          }else if(child.name.includes("BStorage")){
            let index=parseInt(child.name.split("e")[1])
            BlackStorage[index]=child
          }else if(child.name.includes("WStorage")){
            let index=parseInt(child.name.split("e")[1])
            WhiteStorage[index]=child;
          }
          
        });
        // setTimeout(makeBotMove, 1000);
        setTimeout(()=>{TurnDisplay(0)}, 1000);
        if (texturesToLoad === 0) {
          renderer.compile(scene, camera);
          renderer.setAnimationLoop(animate);
          
        }
      },
      undefined,
      console.error
    );
    


  let Hoverings = false;

  function playHoverAnimation(obj, isPlaying) {
    if(obj.name.includes("Tables")){
      LogoAnimatio(obj, isPlaying)
    }else{
      otherAnimations(obj, isPlaying)
    }
  }
  function LogoAnimatio(obj, isPlaying){
    const dur=.8
    gsap.to(obj.position, {
      y: obj.userData.MainPosition.y+((isPlaying)?0.01:0),
      duration: dur,
      ease: "power4",
    });
    gsap.to(obj.scale, {
      y: (isPlaying)?3:1,
      duration: dur,
      ease: "power4",
    });
  }
  function otherAnimations(obj, isPlaying){
    const dur=.8
      gsap.to(obj.scale, {
        y: (isPlaying)?1.2:1,
        z: (isPlaying)?1.2:1,
        x: (isPlaying)?1.2:1,
        duration: dur,
        ease: "power4",
      });
  }


  let loadStart = false;
  function animate() {
    
    if (!loadStart) {
      if (SocialAlert > 30) {
        Start3DPage();
        loadStart = true;
      }
      SocialAlert++
    } else {
      
      if (MainController) {
        raycaster.setFromCamera(pointer, camera);
        currentIntersects = raycaster.intersectObjects(targetObjects);
        if (currentIntersects.length > 0) {
          const selected = currentIntersects[0].object;
          if (
            ["Linkedin", "Insta",  "Github","Others"].some(
              (k) => selected.name.includes(k)
            )
          ) {
            if (HoveredObject !== selected) {
              if (HoveredObject) playHoverAnimation(HoveredObject, false);
              playHoverAnimation(selected, true);
              HoveredObject = selected;
            }
          }
          document.body.style.cursor = (selected.name.includes("Github")||selected.name.includes("Insta")||  selected.name.includes("Linkedin")||  selected.name.includes("Piece"))
            ? "pointer"
            : "default";
        } else {
          if (HoveredObject) playHoverAnimation(HoveredObject, false);
          HoveredObject = null;
          document.body.style.cursor = "default";
        }
      }
      controls.update();
    }
    stats.update();
    renderer.render(scene, camera);
  }
  
}

function Start3DPage() {
  document.getElementById(
    "LoadInnerText"
  ).innerHTML = `<div><p class="start-label">Cheesborough Carceral Chess</p><button class="btn" onclick="active()"><i class="animation"></i>Enter the Strategy Table<i class="animation"></i></button></div>`;
}
function setBotMode(Mode){
  botMode=Mode
  if(Mode==3){
    TurnDisplay(-1)
  }else if(Mode==1){
    camera.position.set(0,2,2);
    Socials.forEach((ele)=>{
      ele.rotation.y+=Math.PI
    })
  }
  setTimeout(announceAIsAtMatchStart, 350);
  setTimeout(botChecker,1000)
}
function setAIDifficulty(profiles) {
  if (profiles && profiles.white && profiles.black) {
    aiDifficulty = profiles;
  }
}
function setAIProfiles(profiles) {
  aiProfiles = {
    white: profiles?.white ? { ...profiles.white, side: "white" } : null,
    black: profiles?.black ? { ...profiles.black, side: "black" } : null
  };
}
function ReloadGame(){
  if(confirm("Are u sure you want to restart the game?")){
    window.location.reload()
  }
}
function CameraTop() {
  const targetPosition = new THREE.Vector3(
    0,
    1.3,
    0.001
  );
  gsap.to(camera.position, {
    x: targetPosition.x,
    y: targetPosition.y,
    z: targetPosition.z*((botMode==1)?1:-1),
    duration: 4,
    ease: "power2.inOut",
    onUpdate: () => {
      camera.lookAt(0, 0, 0);
    }
  });
}


window.load3D = load3D;
window.CameraTop = CameraTop;
window.setBotMode = setBotMode;
window.setAIDifficulty = setAIDifficulty;
window.setAIProfiles = setAIProfiles;
window.setSeatedAvatars = setSeatedAvatars;
window.setVoiceEnabled = setVoiceEnabled;
window.setVoiceVolume = setVoiceVolume;
window.updateVoiceControls = updateVoiceControls;
window.addEventListener("DOMContentLoaded", initialiseVoice);
window.WinnerShowCase=WinnerShowCase
window.savePromotion=savePromotion
window.ReloadGame=ReloadGame

