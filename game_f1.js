/**
 * WEC & Formula 1 Spa-Francorchamps Simulator (F1 Edition)
 * - Orientación del coche corregida al 100% (orientación hacia adelante, dirección natural).
 * - Texturas de Grado 1 de F1: parrilla de salida con cajones y gomas quemadas,
 *   pianos con astro turf verde, neumáticos Pirelli P Zero (Soft/Medium),
 *   patrocinadores F1 (Pirelli, Rolex, Aramco, DHL), carteles de frenada (150m, 100m, 50m)
 *   y luz LED trasera estroboscópica de F1.
 */

let scene, camera, renderer, mirrorRenderer, mirrorCamera;
let playerCar, playerCarVisuals;
let opponents = [];
let trackCurve, trackMesh, trackLength;
let clock;
let isAudioEnabled = false;
let audioCtx, engineOsc, engineGain, turboOsc, turboGain;

let textures = {};

// Estado del Coche (Inicia en la recta/bajada hacia Eau Rouge como en la foto)
const carState = {
  speed: 68.0,          // ~245 km/h
  maxSpeed: 96,         // ~345 km/h
  accel: 26.0,
  brakeForce: 42.0,
  posDistance: 0.22,    // Entrada a Eau Rouge
  lateralOffset: 0.8,
  gear: 6,
  rpm: 8300,
  downforce: 5.1,
  grip: 2.1,
  fuel: 89.0,
  lap: 1,
  maxLaps: 3,
  lapStartTime: 0,
  currentLapTime: 43.35,
  bestLapTime: 0,
  topSpeedKmh: 271,
  position: 22,
  totalCars: 26,
  cameraMode: 0,
  ersBoost: false
};

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  handbrake: false,
  boost: false
};

const SPA_TURNS = [
  { start: 0.00, end: 0.08, name: "RECTA PRINCIPAL F1" },
  { start: 0.08, end: 0.16, name: "HORQUILLA LA SOURCE" },
  { start: 0.16, end: 0.23, name: "DESCENSO A EAU ROUGE" },
  { start: 0.23, end: 0.31, name: "EAU ROUGE & RAIDILLON" },
  { start: 0.31, end: 0.44, name: "RECTA DE KEMMEL (DRS)" },
  { start: 0.44, end: 0.52, name: "CHICANE LES COMBES" },
  { start: 0.52, end: 0.60, name: "BRUXELLES (RIVAGE)" },
  { start: 0.60, end: 0.70, name: "POUHON (DOBLE APEX)" },
  { start: 0.70, end: 0.78, name: "CAMPUS & STAVELOT" },
  { start: 0.78, end: 0.88, name: "CURVA BLANCHIMONT" },
  { start: 0.88, end: 1.00, name: "CHICANE BUS STOP" }
];

const F1_WEC_GRID = [
  { num: 12, team: "POR", name: "#12 POR", color: 0xef4444, offsetT: 0.245, lat: -2.4 },
  { num: 38, team: "POR", name: "#38 POR", color: 0xf59e0b, offsetT: 0.268, lat: 0.5 },
  { num: 82, team: "BMW", name: "#82 BMW", color: 0x1d4ed8, offsetT: 0.290, lat: 1.6 },
  { num: 35, team: "ALP", name: "#35 ALP", color: 0x06b6d4, offsetT: 0.315, lat: -1.0 },
  { num: 10, team: "POR", name: "#10 POR", color: 0xdc2626, offsetT: 0.340, lat: 0.8 },
  { num: 20, team: "FER", name: "#20 FER", color: 0xb91c1c, offsetT: 0.370, lat: -1.5 },
  { num: 50, team: "FER", name: "#50 FER", color: 0x991b1b, offsetT: 0.400, lat: 1.2 },
  { num: 11, team: "CAD", name: "#11 CAD", color: 0x0284c7, offsetT: 0.430, lat: -0.6 },
  { num: 59, team: "CAD", name: "#59 CAD", color: 0x0369a1, offsetT: 0.460, lat: 1.8 }
];

// --- GENERACIÓN DE TEXTURAS DE ALTA DEFINICIÓN ESTILO FÓRMULA 1 ---
function generateAllTextures() {
  // 1. Asfalto F1 Grado 1 con Parrilla de Salida, Trazada y Skid Marks
  textures.asphalt = (() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext("2d");

    // Asfalto gris oscuro
    ctx.fillStyle = "#2c2f35";
    ctx.fillRect(0, 0, 1024, 1024);

    // Micro-grano de árido fino
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 36;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i+1] = Math.min(255, Math.max(0, d[i+1] + n));
      d[i+2] = Math.min(255, Math.max(0, d[i+2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Trazada engomada oscura de carrera
    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0.0, "rgba(0,0,0,0)");
    grad.addColorStop(0.22, "rgba(10,12,16,0.55)");
    grad.addColorStop(0.38, "rgba(25,28,34,0.25)");
    grad.addColorStop(0.62, "rgba(10,12,16,0.60)");
    grad.addColorStop(0.78, "rgba(25,28,34,0.25)");
    grad.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Marcas de frenada (Skid Marks) cruzadas estilo F1
    ctx.fillStyle = "rgba(12, 14, 18, 0.4)";
    for (let s = 0; s < 5; s++) {
      ctx.fillRect(180 + s * 140, 0, 35, 1024);
    }

    // Líneas blancas continuas en los bordes
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(20, 0, 22, 1024);
    ctx.fillRect(982, 0, 22, 1024);

    // Cajones de Parrilla de Salida de F1 (Starting Grid Slots)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 8;
    ctx.strokeRect(260, 200, 180, 140);
    ctx.strokeRect(580, 600, 180, 140);

    // Huellas de quemada de salida (Launch Burnout Marks)
    ctx.fillStyle = "rgba(10, 10, 12, 0.7)";
    ctx.fillRect(280, 210, 30, 120);
    ctx.fillRect(390, 210, 30, 120);
    ctx.fillRect(600, 610, 30, 120);
    ctx.fillRect(710, 610, 30, 120);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 55);
    tex.anisotropy = 16;
    return tex;
  })();

  // 2. Pianos de F1 con Dientes de Sierra y Astro Turf Verde
  textures.curb = (() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");

    const h = 64;
    for (let y = 0; y < 512; y += h) {
      const isRed = (y / h) % 2 === 0;
      ctx.fillStyle = isRed ? "#dc2626" : "#facc15"; // Rojo y amarillo
      ctx.fillRect(0, y, 420, h);

      // Franja de Astro Turf (Césped sintético verde F1) en el borde exterior
      ctx.fillStyle = "#059669";
      ctx.fillRect(420, y, 92, h);

      // Ranura 3D de relieve
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, y, 512, 6);

      // Desgaste de goma F1
      ctx.fillStyle = "rgba(10, 10, 15, 0.4)";
      ctx.fillRect(20, y + 10, 240, 6);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 45);
    return tex;
  })();

  // 3. Fibra de Carbono Tejida Realista (Gloss Carbon Weave)
  textures.carbon = (() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0c0d10";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#26282e";
    for (let x = 0; x < 64; x += 8) {
      for (let y = 0; y < 64; y += 8) {
        if ((x / 8 + y / 8) % 2 === 0) ctx.fillRect(x, y, 8, 8);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  })();

  // 4. Muros con Patrocinadores Oficiales de F1 (Pirelli, Rolex, Aramco, DHL)
  textures.wall = (() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, 1024, 256);

    ctx.fillStyle = "rgba(100, 116, 139, 0.4)";
    for (let x = 0; x < 1024; x += 128) {
      ctx.fillRect(x, 0, 4, 256);
    }

    const f1Sponsors = [
      { name: "PIRELLI", bg: "#dc2626", text: "#facc15" },
      { name: "ROLEX", bg: "#065f46", text: "#fde047" },
      { name: "aramco", bg: "#0284c7", text: "#a7f3d0" },
      { name: "DHL", bg: "#eab308", text: "#b91c1c" }
    ];

    f1Sponsors.forEach((sp, idx) => {
      const bx = idx * 256 + 10;
      ctx.fillStyle = sp.bg;
      ctx.fillRect(bx, 35, 236, 185);

      ctx.fillStyle = sp.text;
      ctx.font = "900 36px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sp.name, bx + 118, 128);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(22, 1);
    return tex;
  })();

  // 5. Neumático F1 Pirelli P-Zero Soft (Banda Roja)
  textures.tire = (() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");

    // Goma oscura
    ctx.fillStyle = "#18181b";
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();

    // Banda de compuesto Soft de F1 (Rojo brillante)
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(256, 256, 195, 0, Math.PI * 2);
    ctx.stroke();

    // Llanta de aleación F1
    ctx.fillStyle = "#27272a";
    ctx.beginPath();
    ctx.arc(256, 256, 160, 0, Math.PI * 2);
    ctx.fill();

    // Tuerca central dorada de cambio rápido F1
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.arc(256, 256, 28, 0, Math.PI * 2);
    ctx.fill();

    // Texto Pirelli
    ctx.save();
    ctx.translate(256, 256);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PIRELLI", 0, -215);
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("P ZERO", 0, 230);
    ctx.restore();

    return new THREE.CanvasTexture(c);
  })();

  // 6. Livery F1/Hypercar Oficial con Dorsal y Aerodinámica
  textures.carLivery = (() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext("2d");

    // Rojo carrera brillante
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(0, 0, 1024, 1024);

    // Franja negra aerodinámica central
    ctx.fillStyle = "#09090b";
    ctx.beginPath();
    ctx.moveTo(340, 0);
    ctx.lineTo(684, 0);
    ctx.lineTo(625, 1024);
    ctx.lineTo(399, 1024);
    ctx.closePath();
    ctx.fill();

    // Líneas blancas y doradas de corte
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(330, 0, 10, 1024);
    ctx.fillRect(684, 0, 10, 1024);

    ctx.fillStyle = "#facc15";
    ctx.fillRect(320, 0, 6, 1024);
    ctx.fillRect(698, 0, 6, 1024);

    // Dorsal oficial #6 y marca
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 95px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("#6", 512, 360);
    ctx.font = "bold 46px sans-serif";
    ctx.fillText("PORSCHE", 512, 440);

    return new THREE.CanvasTexture(c);
  })();

  // 7. Carteles de Distancia de Frenada F1 (150m, 100m, 50m)
  textures.brakeBrd150 = createBrakeBoardTexture("150");
  textures.brakeBrd100 = createBrakeBoardTexture("100");
  textures.brakeBrd50 = createBrakeBoardTexture("50");
}

function createBrakeBoardTexture(text) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, 236, 236);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 90px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 128);
  return new THREE.CanvasTexture(c);
}

// --- Environment Map PBR para Reflejos Metálicos ---
function setupEnvironmentMap() {
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, "#1d4ed8");
    grad.addColorStop(0.38, "#60a5fa");
    grad.addColorStop(0.49, "#f1f5f9");
    grad.addColorStop(0.51, "#1e3a1e");
    grad.addColorStop(0.72, "#142d14");
    grad.addColorStop(1.0, "#09090b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(380, 160, 48, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    scene.background = tex;
  } catch (e) {}
}

function init() {
  const container = document.getElementById("gameCanvas");

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x94c1e8, 0.0012);

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.4, 3200);

  renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const mirrorCanvas = document.getElementById("mirrorCanvas");
  mirrorRenderer = new THREE.WebGLRenderer({ canvas: mirrorCanvas, antialias: true });
  mirrorRenderer.setSize(mirrorCanvas.clientWidth, mirrorCanvas.clientHeight);
  mirrorCamera = new THREE.PerspectiveCamera(62, mirrorCanvas.clientWidth / mirrorCanvas.clientHeight, 0.4, 500);

  clock = new THREE.Clock();

  generateAllTextures();
  setupEnvironmentMap();
  setupLighting();

  createSpaFrancorchampsTrack();
  createEnvironment();

  createPlayerCar();
  createOpponentCars();

  setupBrakeBoards();
  setupSpeedBlurEffect();
  setupEventListeners();

  animate();
}

function setupLighting() {
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x27272a, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfffaea, 1.6);
  sun.position.set(280, 520, 180);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 1400;
  const d = 200;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  scene.add(sun);
}

// --- Trazado 3D de Spa-Francorchamps ---
function createSpaFrancorchampsTrack() {
  const trackPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -120),
    new THREE.Vector3(15, 0, -220),

    // La Source
    new THREE.Vector3(50, 0, -270),
    new THREE.Vector3(95, 0, -260),
    new THREE.Vector3(110, -5, -210),
    new THREE.Vector3(100, -10, -140),

    // Descenso hacia Eau Rouge
    new THREE.Vector3(85, -18, -40),
    new THREE.Vector3(75, -25, 70),
    new THREE.Vector3(70, -28, 180),

    // EAU ROUGE & RAIDILLON
    new THREE.Vector3(65, -24, 250),
    new THREE.Vector3(50, -5, 340),
    new THREE.Vector3(45, 18, 430),
    new THREE.Vector3(50, 36, 520),
    new THREE.Vector3(60, 42, 600),

    // Recta de Kemmel
    new THREE.Vector3(80, 42, 750),
    new THREE.Vector3(110, 42, 920),
    new THREE.Vector3(150, 40, 1100),

    // Les Combes & Malmedy
    new THREE.Vector3(180, 38, 1220),
    new THREE.Vector3(220, 35, 1280),
    new THREE.Vector3(270, 30, 1270),
    new THREE.Vector3(300, 24, 1210),

    // Bruxelles
    new THREE.Vector3(320, 16, 1100),
    new THREE.Vector3(310, 8, 980),
    new THREE.Vector3(260, 0, 890),

    // Pouhon
    new THREE.Vector3(200, -8, 800),
    new THREE.Vector3(140, -18, 720),
    new THREE.Vector3(80, -22, 640),
    new THREE.Vector3(20, -25, 540),

    // Campus & Stavelot
    new THREE.Vector3(-40, -20, 440),
    new THREE.Vector3(-90, -14, 340),
    new THREE.Vector3(-120, -8, 220),

    // Blanchimont
    new THREE.Vector3(-130, -2, 100),
    new THREE.Vector3(-120, 0, -20),
    new THREE.Vector3(-90, 0, -90),

    // Bus Stop
    new THREE.Vector3(-55, 0, -120),
    new THREE.Vector3(-30, 0, -100),
    new THREE.Vector3(-15, 0, -60)
  ];

  trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, "centripetal", 0.4);
  trackLength = trackCurve.getLength();

  const segments = 560;
  const trackWidth = 14.8;
  const curbWidth = 1.35;

  const roadGeom = new THREE.BufferGeometry();
  const curbLeftGeom = new THREE.BufferGeometry();
  const curbRightGeom = new THREE.BufferGeometry();
  const wallGeom = new THREE.BufferGeometry();

  const roadVerts = [], roadIndices = [], roadUvs = [];
  const curbLVerts = [], curbLIndices = [], curbLUvs = [];
  const curbRVerts = [], curbRIndices = [], curbRUvs = [];
  const wallVerts = [], wallIndices = [], wallUvs = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const leftPt = pt.clone().add(normal.clone().multiplyScalar(-trackWidth / 2));
    const rightPt = pt.clone().add(normal.clone().multiplyScalar(trackWidth / 2));

    roadVerts.push(leftPt.x, leftPt.y, leftPt.z);
    roadVerts.push(rightPt.x, rightPt.y, rightPt.z);
    roadUvs.push(0, t);
    roadUvs.push(1, t);

    const curbLOut = leftPt.clone().add(normal.clone().multiplyScalar(-curbWidth));
    curbLOut.y += 0.09;
    curbLVerts.push(curbLOut.x, curbLOut.y, curbLOut.z);
    curbLVerts.push(leftPt.x, leftPt.y + 0.02, leftPt.z);
    curbLUvs.push(0, t);
    curbLUvs.push(1, t);

    const curbROut = rightPt.clone().add(normal.clone().multiplyScalar(curbWidth));
    curbROut.y += 0.09;
    curbRVerts.push(rightPt.x, rightPt.y + 0.02, rightPt.z);
    curbRVerts.push(curbROut.x, curbROut.y, curbROut.z);
    curbRUvs.push(0, t);
    curbRUvs.push(1, t);

    const wallBase = rightPt.clone().add(normal.clone().multiplyScalar(2.9));
    const wallTop = wallBase.clone().add(new THREE.Vector3(0, 1.45, 0));
    wallVerts.push(wallBase.x, wallBase.y, wallBase.z);
    wallVerts.push(wallTop.x, wallTop.y, wallTop.z);
    wallUvs.push(t, 0);
    wallUvs.push(t, 1);

    if (i < segments) {
      const b = i * 2;
      roadIndices.push(b, b + 1, b + 2);
      roadIndices.push(b + 1, b + 3, b + 2);

      curbLIndices.push(b, b + 1, b + 2);
      curbLIndices.push(b + 1, b + 3, b + 2);

      curbRIndices.push(b, b + 1, b + 2);
      curbRIndices.push(b + 1, b + 3, b + 2);

      wallIndices.push(b, b + 1, b + 2);
      wallIndices.push(b + 1, b + 3, b + 2);
    }
  }

  roadGeom.setAttribute("position", new THREE.Float32BufferAttribute(roadVerts, 3));
  roadGeom.setAttribute("uv", new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeom.setIndex(roadIndices);
  roadGeom.computeVertexNormals();

  trackMesh = new THREE.Mesh(roadGeom, new THREE.MeshStandardMaterial({
    map: textures.asphalt,
    roughness: 0.72,
    metalness: 0.18
  }));
  trackMesh.receiveShadow = true;
  scene.add(trackMesh);

  const curbMat = new THREE.MeshStandardMaterial({
    map: textures.curb,
    roughness: 0.52,
    metalness: 0.15
  });

  curbLeftGeom.setAttribute("position", new THREE.Float32BufferAttribute(curbLVerts, 3));
  curbLeftGeom.setAttribute("uv", new THREE.Float32BufferAttribute(curbLUvs, 2));
  curbLeftGeom.setIndex(curbLIndices);
  curbLeftGeom.computeVertexNormals();
  scene.add(new THREE.Mesh(curbLeftGeom, curbMat));

  curbRightGeom.setAttribute("position", new THREE.Float32BufferAttribute(curbRVerts, 3));
  curbRightGeom.setAttribute("uv", new THREE.Float32BufferAttribute(curbRUvs, 2));
  curbRightGeom.setIndex(curbRIndices);
  curbRightGeom.computeVertexNormals();
  scene.add(new THREE.Mesh(curbRightGeom, curbMat));

  wallGeom.setAttribute("position", new THREE.Float32BufferAttribute(wallVerts, 3));
  wallGeom.setAttribute("uv", new THREE.Float32BufferAttribute(wallUvs, 2));
  wallGeom.setIndex(wallIndices);
  wallGeom.computeVertexNormals();

  const wallMesh = new THREE.Mesh(wallGeom, new THREE.MeshStandardMaterial({
    map: textures.wall,
    roughness: 0.60,
    metalness: 0.12
  }));
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);
}

// Carteles de Distancia de Frenada F1 (150m, 100m, 50m)
function setupBrakeBoards() {
  const corners = [0.08, 0.44, 0.88]; // La Source, Les Combes, Bus Stop
  corners.forEach(tCorner => {
    [
      { dist: -0.018, tex: textures.brakeBrd150 },
      { dist: -0.012, tex: textures.brakeBrd100 },
      { dist: -0.006, tex: textures.brakeBrd50 }
    ].forEach(b => {
      const t = (tCorner + b.dist + 1.0) % 1.0;
      const pt = trackCurve.getPointAt(t);
      const tangent = trackCurve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const boardPos = pt.clone().add(normal.multiplyScalar(8.8));
      boardPos.y += 1.2;

      const boardMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.6),
        new THREE.MeshBasicMaterial({ map: b.tex, side: THREE.DoubleSide })
      );
      boardMesh.position.copy(boardPos);
      boardMesh.lookAt(boardPos.clone().add(tangent));
      scene.add(boardMesh);
    });
  });
}

function createEnvironment() {
  const groundGeo = new THREE.PlaneGeometry(3800, 3800, 30, 30);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: 0x1f4722, roughness: 0.95 }));
  ground.position.y = -35;
  ground.receiveShadow = true;
  scene.add(ground);

  createDetailedGrandstand(new THREE.Vector3(-25, 8, -50), 0.1, 140, 18);
  createDetailedGrandstand(new THREE.Vector3(15, 25, 450), -0.38, 95, 22);

  createMarshalTower(new THREE.Vector3(45, 0, -210));
  createMarshalTower(new THREE.Vector3(88, 46, 560));

  createPineTrees();
}

function createDetailedGrandstand(pos, rotY, length, height) {
  const group = new THREE.Group();
  const steps = new THREE.Mesh(new THREE.BoxGeometry(16, height, length), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));
  steps.castShadow = true;
  steps.receiveShadow = true;
  group.add(steps);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(22, 1.4, length + 4), new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.5 }));
  roof.position.set(-2, height / 2 + 5, 0);
  roof.rotation.z = -0.14;
  roof.castShadow = true;
  group.add(roof);

  group.position.copy(pos);
  group.rotation.y = rotY;
  scene.add(group);
}

function createMarshalTower(pos) {
  const tower = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(7, 18, 7), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35 }));
  base.position.y = 9;
  base.castShadow = true;
  tower.add(base);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(7.6, 5.5, 7.6), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15 }));
  cab.position.y = 19.5;
  tower.add(cab);

  tower.position.copy(pos);
  scene.add(tower);
}

function createPineTrees() {
  const treeGeo = new THREE.ConeGeometry(5, 16, 6);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.88 });
  const trunkGeo = new THREE.CylinderGeometry(0.8, 1.3, 4);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });

  for (let i = 0; i < 180; i++) {
    const t = Math.random();
    const trackPoint = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const side = Math.random() > 0.5 ? 1 : -1;
    const dist = 30 + Math.random() * 95;
    const treePos = trackPoint.clone().add(normal.multiplyScalar(side * dist));
    treePos.y -= 2;

    const tree = new THREE.Group();
    const foliage = new THREE.Mesh(treeGeo, treeMat);
    foliage.position.y = 11;
    foliage.castShadow = true;
    tree.add(foliage);

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2;
    tree.add(trunk);

    tree.position.copy(treePos);
    const s = 0.85 + Math.random() * 0.75;
    tree.scale.set(s, s, s);
    scene.add(tree);
  }
}

// --- CONSTRUCCIÓN DEL COCHE CON ORIENTACIÓN GARANTIZADA HACIA ADELANTE ---
// En nuestro sistema:
// El morro/frente del coche está en -Z.
// La parte trasera/alerón está en +Z.
function buildHypercarModel(primaryColor = 0xdc2626, isPlayer = false) {
  const carRoot = new THREE.Group();
  const visuals = new THREE.Group();
  carRoot.add(visuals);
  carRoot.visuals = visuals;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    map: isPlayer ? textures.carLivery : null,
    roughness: 0.14,
    metalness: 0.78
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    map: textures.carbon,
    roughness: 0.28,
    metalness: 0.85
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x020617,
    roughness: 0.04,
    metalness: 0.98,
    transparent: true,
    opacity: 0.88
  });

  // 1. Chasis Principal
  const chassisGeo = new THREE.BoxGeometry(2.14, 0.44, 4.88);
  const chassis = new THREE.Mesh(chassisGeo, bodyMat);
  chassis.position.y = 0.40;
  chassis.castShadow = true;
  visuals.add(chassis);

  // 2. Pontones Laterales F1 / Sidepods
  const sidepodGeo = new THREE.BoxGeometry(2.32, 0.42, 2.88);
  const sidepod = new THREE.Mesh(sidepodGeo, bodyMat);
  sidepod.position.set(0, 0.40, -0.2);
  sidepod.castShadow = true;
  visuals.add(sidepod);

  // 3. Cúpula Central (Cockpit)
  const cockpitGeo = new THREE.SphereGeometry(0.72, 24, 24);
  cockpitGeo.scale(1.0, 0.88, 2.28);
  const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
  cockpit.position.set(0, 0.82, -0.3);
  cockpit.castShadow = true;
  visuals.add(cockpit);

  // 4. Aleta de Tiburón Dorsal de Carbono
  const finGeo = new THREE.BoxGeometry(0.06, 0.68, 2.38);
  const fin = new THREE.Mesh(finGeo, carbonMat);
  fin.position.set(0, 0.94, 0.80);
  fin.castShadow = true;
  visuals.add(fin);

  // 5. Alerón Trasero de F1 / WEC (Parte Trasera: +Z)
  const wingGeo = new THREE.BoxGeometry(2.36, 0.08, 0.50);
  const wing = new THREE.Mesh(wingGeo, carbonMat);
  wing.position.set(0, 1.22, 2.20);
  wing.castShadow = true;
  visuals.add(wing);

  // Endplates con Carbono
  const endplateGeo = new THREE.BoxGeometry(0.06, 0.54, 0.68);
  const leftEndplate = new THREE.Mesh(endplateGeo, carbonMat);
  leftEndplate.position.set(-1.18, 1.10, 2.20);
  const rightEndplate = leftEndplate.clone();
  rightEndplate.position.x = 1.18;
  visuals.add(leftEndplate);
  visuals.add(rightEndplate);

  // 6. Splitter Delantero (Parte Delantera: -Z)
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.08, 0.98), carbonMat);
  splitter.position.set(0, 0.18, -2.48);
  visuals.add(splitter);

  // Difusor Trasero (+Z)
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.18, 0.78), carbonMat);
  diffuser.position.set(0, 0.22, 2.40);
  visuals.add(diffuser);

  // 7. Luz de Lluvia / ERS Trasera Estroboscópica de F1 (Parpadeante en el centro del difusor)
  const f1RainLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const f1RainLight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.12), f1RainLightMat);
  f1RainLight.position.set(0, 0.32, 2.45);
  visuals.add(f1RainLight);
  carRoot.f1RainLight = f1RainLight;

  // Tira LED Trasera
  const brakeLightMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
  const rearLight = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.08, 0.08), brakeLightMat);
  rearLight.position.set(0, 0.56, 2.46);
  visuals.add(rearLight);
  carRoot.rearLightMesh = rearLight;

  // 8. Ruedas Pirelli F1 P-Zero Soft con Banda Roja
  const wheelMat = new THREE.MeshStandardMaterial({ map: textures.tire, roughness: 0.7 });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 });
  const caliperMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 });

  const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 20);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheels = [];
  const wheelPositions = [
    [-1.08, 0.44, -1.55],
    [1.08, 0.44, -1.55],
    [-1.08, 0.44, 1.55],
    [1.08, 0.44, 1.55]
  ];

  wheelPositions.forEach(pos => {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16), discMat);
    disc.rotation.z = Math.PI / 2;
    wheelGroup.add(disc);

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.22), caliperMat);
    caliper.position.set(pos[0] > 0 ? -0.1 : 0.1, 0.15, 0);
    wheelGroup.add(caliper);

    wheelGroup.position.set(...pos);
    visuals.add(wheelGroup);
    wheels.push(wheelGroup);
  });
  carRoot.wheels = wheels;

  // Sombra de Contacto
  const shadowGeo = new THREE.PlaneGeometry(2.6, 5.2);
  shadowGeo.rotateX(-Math.PI / 2);
  const contactShadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }));
  contactShadow.position.y = 0.05;
  visuals.add(contactShadow);

  // Llama de Escape
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 });
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), flameMat);
  flame.position.set(0.25, 0.52, 2.5);
  visuals.add(flame);
  carRoot.flame = flame;

  return carRoot;
}

function createPlayerCar() {
  playerCar = buildHypercarModel(0xdc2626, true);
  playerCarVisuals = playerCar.visuals;
  scene.add(playerCar);
  updateCarTransform(playerCar, carState.posDistance, carState.lateralOffset);
}

function createOpponentCars() {
  F1_WEC_GRID.forEach((data) => {
    const oppMesh = buildHypercarModel(data.color, false);
    scene.add(oppMesh);

    const opp = {
      mesh: oppMesh,
      name: data.name,
      team: data.team,
      num: data.num,
      posDistance: data.offsetT,
      lateralOffset: data.lat,
      speed: 68 + Math.random() * 12,
      maxSpeed: 78 + Math.random() * 10,
      fuel: Math.floor(75 + Math.random() * 20),
      reliability: Math.floor(92 + Math.random() * 8)
    };
    opponents.push(opp);
    updateCarTransform(opp.mesh, opp.posDistance, opp.lateralOffset);
  });
}

// --- TRANSFORMACIÓN Y ORIENTACIÓN MATEMÁTICAMENTE CORREGIDA ---
// Tangente apunta en la dirección de la vuelta.
// En Three.js, lookAt(pos + tangent) orienta el eje -Z hacia adelante.
// Dado que nuestro morro está en -Z y el alerón en +Z, el coche avanza NATURALMENTE hacia el frente.
function updateCarTransform(carGroup, tDistance, latOffset) {
  const normDist = ((tDistance % 1.0) + 1.0) % 1.0;
  const centerPoint = trackCurve.getPointAt(normDist);
  const tangent = trackCurve.getTangentAt(normDist).normalize();
  const up = new THREE.Vector3(0, 1, 0);

  // Vector NORMAL a la derecha del sentido de la marcha
  // Cross(tangent, up) da el vector derecha real
  const rightVec = new THREE.Vector3().crossVectors(tangent, up).normalize();

  // Posición con desplazamiento lateral (+latOffset = derecha, -latOffset = izquierda)
  const finalPos = centerPoint.clone().add(rightVec.multiplyScalar(latOffset));
  carGroup.position.copy(finalPos);

  // Orientar hacia el frente de la pista
  const lookTarget = finalPos.clone().add(tangent);
  carGroup.lookAt(lookTarget);

  // Ruedas girando en sentido de avance
  if (carGroup.wheels) {
    const wheelRot = clock.getElapsedTime() * 28;
    carGroup.wheels.forEach(w => w.rotation.x = wheelRot);
  }

  // Parpadeo de la luz de lluvia trasera de F1
  if (carGroup.f1RainLight) {
    const isFlashing = (Math.floor(clock.getElapsedTime() * 10) % 2 === 0);
    carGroup.f1RainLight.visible = isFlashing;
  }
}

// --- FÍSICAS DE CONDUCCIÓN Y DIRECCIÓN NATURAL ---
function updatePhysics(dt) {
  // Aceleración y Frenada
  if (keys.forward) {
    const boostMult = keys.boost ? 1.4 : 1.0;
    carState.speed += carState.accel * boostMult * dt;
    carState.ersBoost = keys.boost;
  } else if (keys.backward) {
    if (carState.speed > 1) {
      carState.speed -= carState.brakeForce * dt;
    } else {
      carState.speed -= 8.0 * dt;
    }
  } else {
    carState.speed -= (4.5 + Math.pow(carState.speed / 30, 2)) * dt;
    if (carState.speed < 0 && !keys.backward) carState.speed = 0;
  }

  const currentMax = keys.boost ? carState.maxSpeed * 1.12 : carState.maxSpeed;
  carState.speed = Math.max(-12, Math.min(carState.speed, currentMax));

  const speedRatio = Math.min(1.0, Math.abs(carState.speed) / 40);

  // DIRECCIÓN CORREGIDA:
  // A / Flecha Izquierda: desplaza hacia la IZQUIERDA (-lateralOffset)
  // D / Flecha Derecha: desplaza hacia la DERECHA (+lateralOffset)
  if (keys.left) {
    carState.lateralOffset -= (6.5 * speedRatio) * dt;
    if (playerCarVisuals) playerCarVisuals.rotation.z = Math.min(0.08, playerCarVisuals.rotation.z + 0.15 * dt);
  } else if (keys.right) {
    carState.lateralOffset += (6.5 * speedRatio) * dt;
    if (playerCarVisuals) playerCarVisuals.rotation.z = Math.max(-0.08, playerCarVisuals.rotation.z - 0.15 * dt);
  } else {
    if (playerCarVisuals) playerCarVisuals.rotation.z *= 0.9;
  }

  if (Math.abs(carState.lateralOffset) > 7.2) {
    carState.speed *= 0.985;
  }
  carState.lateralOffset = Math.max(-8.5, Math.min(8.5, carState.lateralOffset));

  const deltaDistance = (carState.speed * dt) / trackLength;
  carState.posDistance = (carState.posDistance + deltaDistance);

  if (carState.posDistance >= 1.0) {
    carState.posDistance -= 1.0;
    carState.lap = Math.min(carState.maxLaps, carState.lap + 1);
    carState.bestLapTime = carState.currentLapTime;
    carState.lapStartTime = clock.getElapsedTime();
  }

  updateCarTransform(playerCar, carState.posDistance, carState.lateralOffset);

  const speedKmh = Math.max(0, Math.round(carState.speed * 3.6));
  carState.topSpeedKmh = Math.max(carState.topSpeedKmh, speedKmh);

  if (speedKmh <= 0) {
    carState.gear = keys.backward ? "R" : "N";
    carState.rpm = 1800;
  } else if (speedKmh < 65) {
    carState.gear = 1;
    carState.rpm = 2500 + (speedKmh / 65) * 6500;
  } else if (speedKmh < 115) {
    carState.gear = 2;
    carState.rpm = 3500 + ((speedKmh - 65) / 50) * 5500;
  } else if (speedKmh < 165) {
    carState.gear = 3;
    carState.rpm = 4000 + ((speedKmh - 115) / 50) * 5000;
  } else if (speedKmh < 215) {
    carState.gear = 4;
    carState.rpm = 4800 + ((speedKmh - 165) / 50) * 4400;
  } else if (speedKmh < 265) {
    carState.gear = 5;
    carState.rpm = 5400 + ((speedKmh - 215) / 50) * 4000;
  } else if (speedKmh < 305) {
    carState.gear = 6;
    carState.rpm = 6000 + ((speedKmh - 265) / 40) * 3500;
  } else {
    carState.gear = 7;
    carState.rpm = 6800 + ((speedKmh - 305) / 40) * 2600;
  }

  if (playerCar.rearLightMesh) {
    playerCar.rearLightMesh.material.color.setHex(keys.backward ? 0xff0000 : 0x7f1d1d);
  }
  if (playerCar.flame) {
    const showFlame = (keys.backward || (!keys.forward && carState.speed > 40)) && Math.random() > 0.4;
    playerCar.flame.material.opacity = showFlame ? 0.9 : 0.0;
  }

  carState.downforce = ((Math.pow(carState.speed, 2) * 0.58) / 1000).toFixed(1);
  carState.grip = (1.2 + Math.min(1.8, carState.downforce * 0.22)).toFixed(1);

  if (carState.speed > 5) {
    carState.fuel = Math.max(1.0, carState.fuel - 0.004 * dt);
  }

  updateAudio();
}

function updateOpponents(dt) {
  opponents.forEach((opp, i) => {
    const norm = ((opp.posDistance % 1.0) + 1.0) % 1.0;
    const isCurvaLenta = (norm > 0.08 && norm < 0.16) || (norm > 0.88);
    const targetSpeed = isCurvaLenta ? opp.maxSpeed * 0.55 : opp.maxSpeed;

    opp.speed += (targetSpeed - opp.speed) * 0.8 * dt;
    const delta = (opp.speed * dt) / trackLength;
    opp.posDistance = (opp.posDistance + delta) % 1.0;

    opp.lateralOffset += Math.sin(clock.getElapsedTime() * 0.5 + i) * 0.015;
    opp.lateralOffset = Math.max(-5.5, Math.min(5.5, opp.lateralOffset));

    updateCarTransform(opp.mesh, opp.posDistance, opp.lateralOffset);
  });
}

// Cámaras: La cámara se sitúa DETRÁS del coche (+Z local de avance) y mira hacia el morro (-Z)
function updateCameras() {
  if (!playerCar) return;

  const carPos = playerCar.position.clone();
  // Vector que apunta hacia el frente del coche
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerCar.quaternion).normalize();
  const up = new THREE.Vector3(0, 1, 0);

  if (carState.cameraMode === 0) {
    // Cámara de Persecución trasera (Chase Cam)
    const camOffset = forward.clone().multiplyScalar(-8.4).add(up.clone().multiplyScalar(3.3));
    const targetPos = carPos.clone().add(camOffset);
    camera.position.lerp(targetPos, 0.24);
    camera.lookAt(carPos.clone().add(up.clone().multiplyScalar(1.25)));
  } else if (carState.cameraMode === 1) {
    // Cámara de Capó (Hood Cam)
    const hoodOffset = forward.clone().multiplyScalar(0.4).add(up.clone().multiplyScalar(1.1));
    camera.position.copy(carPos.clone().add(hoodOffset));
    camera.lookAt(carPos.clone().add(forward.clone().multiplyScalar(30)));
  } else {
    // Cockpit
    const cockOffset = forward.clone().multiplyScalar(-0.3).add(up.clone().multiplyScalar(0.85));
    camera.position.copy(carPos.clone().add(cockOffset));
    camera.lookAt(carPos.clone().add(forward.clone().multiplyScalar(30)));
  }

  // Retrovisor Superior Derecho (mira hacia atrás del coche)
  const mirrorPos = carPos.clone().add(up.clone().multiplyScalar(1.4));
  mirrorCamera.position.copy(mirrorPos);
  const lookBack = carPos.clone().add(forward.clone().multiplyScalar(-60)).add(up.clone().multiplyScalar(1.0));
  mirrorCamera.lookAt(lookBack);
}

// --- Desenfoque Radial de Velocidad ---
let speedBlurOverlay = null;

function setupSpeedBlurEffect() {
  speedBlurOverlay = document.createElement("div");
  speedBlurOverlay.style.position = "absolute";
  speedBlurOverlay.style.top = "0";
  speedBlurOverlay.style.left = "0";
  speedBlurOverlay.style.width = "100%";
  speedBlurOverlay.style.height = "100%";
  speedBlurOverlay.style.pointerEvents = "none";
  speedBlurOverlay.style.zIndex = "5";
  speedBlurOverlay.style.transition = "opacity 0.1s ease";
  speedBlurOverlay.style.background = "radial-gradient(ellipse at center, rgba(0,0,0,0) 62%, rgba(255,255,255,0.2) 100%)";
  speedBlurOverlay.style.opacity = "0";
  document.body.appendChild(speedBlurOverlay);
}

function updateSpeedBlur() {
  if (!speedBlurOverlay) return;
  const speedKmh = carState.speed * 3.6;
  if (speedKmh > 160) {
    const intensity = Math.min(1.0, (speedKmh - 160) / 120);
    speedBlurOverlay.style.opacity = (intensity * 0.8).toString();
  } else {
    speedBlurOverlay.style.opacity = "0";
  }
}

// --- Audio Sintetizado Web Audio API ---
function initAudio() {
  if (isAudioEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    engineOsc = audioCtx.createOscillator();
    engineOsc.type = "sawtooth";
    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(0.08, audioCtx.currentTime);

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(750, audioCtx.currentTime);

    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();

    turboOsc = audioCtx.createOscillator();
    turboOsc.type = "sine";
    turboGain = audioCtx.createGain();
    turboGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

    turboOsc.connect(turboGain);
    turboGain.connect(audioCtx.destination);
    turboOsc.start();

    isAudioEnabled = true;
  } catch (e) {}
}

function updateAudio() {
  if (!isAudioEnabled || !audioCtx) return;

  const baseFreq = 55 + (carState.rpm / 9500) * 220;
  engineOsc.frequency.setTargetAtTime(baseFreq, audioCtx.currentTime, 0.05);

  const vol = Math.min(0.18, 0.04 + (carState.rpm / 9500) * 0.12);
  engineGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.05);

  const turboVol = keys.boost ? 0.08 : (keys.forward && carState.speed > 30 ? 0.03 : 0.0);
  turboGain.gain.setTargetAtTime(turboVol, audioCtx.currentTime, 0.1);
  turboOsc.frequency.setTargetAtTime(800 + (carState.speed * 20), audioCtx.currentTime, 0.1);
}

// --- Actualización de la Interfaz HUD ---
let lastFpsUpdate = 0;
let frameCount = 0;

function updateHUD() {
  const speedKmh = Math.max(0, Math.round(carState.speed * 3.6));

  document.getElementById("speedDisplay").textContent = speedKmh;
  document.getElementById("gearDisplay").textContent = carState.gear;

  const rpmPct = (carState.rpm - 2000) / 7500;
  const leds = document.querySelectorAll(".rpm-led");
  const numActive = Math.round(rpmPct * leds.length);
  leds.forEach((led, idx) => {
    if (idx < numActive) led.classList.add("active");
    else led.classList.remove("active");
  });

  document.getElementById("valDownforce").textContent = `${carState.downforce} kN`;
  document.getElementById("valGrip").textContent = `${carState.grip} g`;

  document.getElementById("fuelVal").textContent = `${Math.round(carState.fuel)} L`;
  document.getElementById("fuelBar").style.width = `${Math.min(100, carState.fuel)}%`;

  const elapsed = clock.getElapsedTime() - carState.lapStartTime;
  const mins = Math.floor(elapsed / 60);
  const secs = (elapsed % 60).toFixed(3).padStart(6, "0");
  document.getElementById("lapTime").textContent = `${mins}:${secs}`;
  document.getElementById("lapCount").textContent = carState.lap;
  document.getElementById("maxSpeed").textContent = carState.topSpeedKmh;

  const normDist = ((carState.posDistance % 1.0) + 1.0) % 1.0;
  let currentTurnName = "CIRCUITO DE SPA";
  for (const turn of SPA_TURNS) {
    if (normDist >= turn.start && normDist < turn.end) {
      currentTurnName = turn.name;
      break;
    }
  }
  document.getElementById("turnIndicator").textContent = currentTurnName;

  drawMinimap();
  updateLeaderboard();
  updateSpeedBlur();

  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    const ms = (1000 / Math.max(1, fps)).toFixed(1);
    document.getElementById("fpsCounter").textContent = `${fps} FPS · ${ms} ms · res 1.25x`;
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

function drawMinimap() {
  const canvas = document.getElementById("minimapCanvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const scale = 0.088;
  const cx = w * 0.48;
  const cy = h * 0.52;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath();

  const numPts = 120;
  for (let i = 0; i <= numPts; i++) {
    const pt = trackCurve.getPointAt(i / numPts);
    const px = cx + pt.x * scale;
    const py = cy + pt.z * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "#38bdf8";
  opponents.forEach(opp => {
    const pt = trackCurve.getPointAt(opp.posDistance % 1.0);
    const px = cx + pt.x * scale;
    const py = cy + pt.z * scale;
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const playerPt = trackCurve.getPointAt(((carState.posDistance % 1.0) + 1.0) % 1.0);
  const px = cx + playerPt.x * scale;
  const py = cy + playerPt.z * scale;

  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(px, py, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function updateLeaderboard() {
  const list = document.getElementById("leaderboardList");

  const allDrivers = [
    { num: 6, team: "POR", name: "TÚ (PORSCHE #6)", dist: carState.posDistance, isPlayer: true, fuel: Math.round(carState.fuel) },
    ...opponents.map(o => ({ num: o.num, team: o.team, name: o.name, dist: o.posDistance, isPlayer: false, fuel: o.fuel }))
  ];

  allDrivers.sort((a, b) => b.dist - a.dist);

  const playerIdx = allDrivers.findIndex(d => d.isPlayer);
  carState.position = playerIdx + 1;
  document.getElementById("playerPos").textContent = carState.position;

  let html = "";
  const displayDrivers = allDrivers.slice(0, 10);
  displayDrivers.forEach((d, i) => {
    const gap = i === 0 ? "LÍDER" : `+${((i * 1.34) + 0.12).toFixed(3)}`;
    html += `
      <li class="leaderboard-item ${d.isPlayer ? "player-row" : ""}">
        <span class="driver-tag">#${d.num} ${d.team}</span>
        <span class="driver-gap">${gap}</span>
        <span class="driver-fuel">${d.fuel} L</span>
        <span>94%</span>
      </li>
    `;
  });
  list.innerHTML = html;
}

function setupEventListeners() {
  window.addEventListener("keydown", (e) => {
    initAudio();
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.backward = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = true;
        break;
      case "Space":
        keys.handbrake = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        keys.boost = true;
        break;
      case "KeyC":
        carState.cameraMode = (carState.cameraMode + 1) % 3;
        break;
      case "KeyR":
        carState.speed = 0;
        carState.lateralOffset = 0;
        break;
      case "KeyM":
        if (engineGain) engineGain.gain.value = engineGain.gain.value > 0 ? 0 : 0.12;
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.backward = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = false;
        break;
      case "Space":
        keys.handbrake = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        keys.boost = false;
        break;
    }
  });

  const setupTouch = (btnId, keyName) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("touchstart", (e) => { e.preventDefault(); initAudio(); keys[keyName] = true; });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); keys[keyName] = false; });
  };
  setupTouch("btnTouchGas", "forward");
  setupTouch("btnTouchBrake", "backward");
  setupTouch("btnTouchLeft", "left");
  setupTouch("btnTouchRight", "right");

  document.getElementById("btnStartGame").addEventListener("click", () => {
    initAudio();
    document.getElementById("controlsHelp").style.display = "none";
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    const mirrorCanvas = document.getElementById("mirrorCanvas");
    mirrorRenderer.setSize(mirrorCanvas.clientWidth, mirrorCanvas.clientHeight);
    mirrorCamera.aspect = mirrorCanvas.clientWidth / mirrorCanvas.clientHeight;
    mirrorCamera.updateProjectionMatrix();
  });
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(0.06, clock.getDelta());

  updatePhysics(dt);
  updateOpponents(dt);
  updateCameras();

  renderer.render(scene, camera);
  mirrorRenderer.render(scene, mirrorCamera);

  updateHUD();
}

window.addEventListener("DOMContentLoaded", init);
