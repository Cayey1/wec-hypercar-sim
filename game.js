/**
 * WEC Hypercar Simulator - Spa-Francorchamps (Texturizado de Alta Fidelidad)
 * Motor 3D con texturas procedurales avanzadas: asfalto con trazada engomada,
 * pianos desgastados, fibra de carbono, vallas con patrocinadores, neumáticos
 * Michelin con pinzas de freno, y desenfoque de velocidad radial.
 */

// --- Variables Principales ---
let scene, camera, renderer, mirrorRenderer, mirrorCamera;
let playerCar;
let opponents = [];
let trackCurve, trackMesh, trackLength;
let clock;
let isAudioEnabled = false;
let audioCtx, engineOsc, engineGain, turboOsc, turboGain;

// Texturas Procedurales
let textures = {};

// Estado del Coche del Jugador
const carState = {
  speed: 0,            // m/s
  maxSpeed: 96,        // ~345 km/h
  accel: 25.0,
  brakeForce: 38.0,
  steerAngle: 0,
  posDistance: 0.02,
  lateralOffset: 1.8,
  gear: 6,
  rpm: 8200,
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
  { start: 0.00, end: 0.08, name: "RECTA PRINCIPAL" },
  { start: 0.08, end: 0.16, name: "LA SOURCE" },
  { start: 0.16, end: 0.23, name: "DESCENSO A EAU ROUGE" },
  { start: 0.23, end: 0.31, name: "EAU ROUGE & RAIDILLON" },
  { start: 0.31, end: 0.44, name: "RECTA DE KEMMEL" },
  { start: 0.44, end: 0.52, name: "LES COMBES & MALMEDY" },
  { start: 0.52, end: 0.60, name: "BRUXELLES (RIVAGE)" },
  { start: 0.60, end: 0.70, name: "POUHON (DOBLE APEX)" },
  { start: 0.70, end: 0.78, name: "CAMPUS & STAVELOT" },
  { start: 0.78, end: 0.88, name: "BLANCHIMONT" },
  { start: 0.88, end: 1.00, name: "CHICANE BUS STOP" }
];

const WEC_TEAMS = [
  { num: 12, team: "POR", name: "Porsche Penske #12", color: 0xef4444 },
  { num: 38, team: "POR", name: "Hertz JOTA #38", color: 0xf59e0b },
  { num: 82, team: "BMW", name: "BMW M Team WRT #82", color: 0x2563eb },
  { num: 35, team: "BMW", name: "BMW M Team WRT #35", color: 0x1d4ed8 },
  { num: 10, team: "POR", name: "Porsche Penske #10", color: 0xdc2626 },
  { num: 4,  team: "POR", name: "Porsche Penske #4",  color: 0x991b1b },
  { num: 20, team: "FER", name: "Ferrari AF Corse #20", color: 0xb91c1c },
  { num: 50, team: "BMW", name: "BMW M Hybrid #50", color: 0x1e40af },
  { num: 11, team: "CAD", name: "Cadillac Racing #11", color: 0x0284c7 },
  { num: 59, team: "CAD", name: "Action Express #59", color: 0x0369a1 }
];

// --- GENERADOR DE TEXTURAS PROCEDURALES REALISTAS EN ALTA DEFINICIÓN ---

function generateAllTextures() {
  // 1. Asfalto de Competición con Trazada Engomada y Líneas Blancas
  textures.asphalt = (() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext("2d");

    // Base de asfalto gris oscuro
    ctx.fillStyle = "#282b30";
    ctx.fillRect(0, 0, 1024, 1024);

    // Ruido de áridos y gravilla
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 38;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i+1] = Math.min(255, Math.max(0, d[i+1] + noise));
      d[i+2] = Math.min(255, Math.max(0, d[i+2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Trazada engomada oscura de los neumáticos
    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0.0, "rgba(0,0,0,0)");
    grad.addColorStop(0.20, "rgba(10,12,15,0.45)");
    grad.addColorStop(0.35, "rgba(20,22,25,0.2)");
    grad.addColorStop(0.65, "rgba(10,12,15,0.5)");
    grad.addColorStop(0.80, "rgba(20,22,25,0.2)");
    grad.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Líneas blancas continuas laterales
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(20, 0, 22, 1024);   // Borde izquierdo
    ctx.fillRect(982, 0, 22, 1024);  // Borde derecho

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 55);
    tex.anisotropy = 8;
    return tex;
  })();

  // 2. Pianos / Curbs Rojo y Amarillo de Spa con Desgaste y Ranuras
  textures.curb = (() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");

    const stripeH = 64;
    for (let y = 0; y < 512; y += stripeH) {
      const isRed = (y / stripeH) % 2 === 0;
      ctx.fillStyle = isRed ? "#dc2626" : "#facc15"; // Rojo y amarillo de Spa
      ctx.fillRect(0, y, 512, stripeH);

      // Ranura 3D de relieve entre bloques de hormigón
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(0, y, 512, 5);

      // Marcas de goma de neumáticos
      for (let s = 0; s < 4; s++) {
        ctx.fillStyle = "rgba(15, 15, 18, 0.35)";
        ctx.fillRect(Math.random() * 400, y + Math.random() * 45, Math.random() * 80 + 30, 4);
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 45);
    return tex;
  })();

  // 3. Fibra de Carbono Realista (Twill Weave)
  textures.carbon = (() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#111215";
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = "#24262b";
    for (let x = 0; x < 64; x += 8) {
      for (let y = 0; y < 64; y += 8) {
        if ((x / 8 + y / 8) % 2 === 0) {
          ctx.fillRect(x, y, 8, 8);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  })();

  // 4. Muros de Hormigón con Patrocinadores Oficiales (Rolex, TotalEnergies, Michelin, DHL)
  textures.wall = (() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");

    // Base de hormigón blanco/gris
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(0, 0, 1024, 256);

    // Juntas verticales de bloques
    ctx.fillStyle = "rgba(100, 116, 139, 0.5)";
    for (let x = 0; x < 1024; x += 128) {
      ctx.fillRect(x, 0, 4, 256);
    }

    // Banners de patrocinadores estilo WEC
    const sponsors = [
      { name: "ROLEX", bg: "#065f46", text: "#fde047" },
      { name: "TotalEnergies", bg: "#dc2626", text: "#ffffff" },
      { name: "MICHELIN", bg: "#1e3a8a", text: "#facc15" },
      { name: "DHL", bg: "#eab308", text: "#b91c1c" }
    ];

    sponsors.forEach((sp, idx) => {
      const bx = idx * 256 + 10;
      ctx.fillStyle = sp.bg;
      ctx.fillRect(bx, 40, 236, 170);

      ctx.fillStyle = sp.text;
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sp.name, bx + 118, 125);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 1);
    return tex;
  })();

  // 5. Escapes y Chapa de Protección Térmica (Heatshield)
  textures.heatshield = (() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#71717a";
    ctx.fillRect(0, 0, 128, 128);
    // Patrón gofrado de calor
    ctx.fillStyle = "#a1a1aa";
    for (let x = 0; x < 128; x += 8) {
      ctx.fillRect(x, 0, 3, 128);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  })();

  // 6. Neumáticos Michelin con Letras en el Flanco
  textures.tire = (() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");

    // Goma negra
    ctx.fillStyle = "#18181b";
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();

    // Llanta interior
    ctx.fillStyle = "#27272a";
    ctx.beginPath();
    ctx.arc(256, 256, 160, 0, Math.PI * 2);
    ctx.fill();

    // Texto circular de Michelin en amarillo y blanco
    ctx.save();
    ctx.translate(256, 256);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MICHELIN", 0, -200);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("PILOT SPORT", 0, 215);
    ctx.restore();

    return new THREE.CanvasTexture(c);
  })();

  // 7. Textura de Livery Hypercar (Porsche / Ferrari WEC)
  textures.carLivery = (() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext("2d");

    // Rojo de carreras brillante
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(0, 0, 1024, 1024);

    // Franjas aerodinámicas negras
    ctx.fillStyle = "#09090b";
    ctx.beginPath();
    ctx.moveTo(350, 0);
    ctx.lineTo(674, 0);
    ctx.lineTo(620, 1024);
    ctx.lineTo(404, 1024);
    ctx.closePath();
    ctx.fill();

    // Filetes decorativos blancos y dorados
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(340, 0, 10, 1024);
    ctx.fillRect(674, 0, 10, 1024);

    // Dorsal "#6" y logo WEC
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 90px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("#6", 512, 380);
    ctx.font = "bold 45px sans-serif";
    ctx.fillText("PORSCHE", 512, 450);

    return new THREE.CanvasTexture(c);
  })();

  // 8. Gravilla de Escapatoria (Sand Trap)
  textures.sand = (() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#d4b886";
    ctx.fillRect(0, 0, 512, 512);
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 45;
      d[i] += n;
      d[i+1] += n;
      d[i+2] += n;
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    return tex;
  })();
}

// --- Inicialización del Motor Gráfico Three.js ---
function init() {
  const container = document.getElementById("gameCanvas");

  // Escena con Niebla Realista
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x94c1e8);
  scene.fog = new THREE.FogExp2(0x94c1e8, 0.0014);

  // Cámara Principal con FOV Dinámico
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.4, 2800);

  // Renderer con Antialiasing y Mapeo de Tonos ACESFilmic
  renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // Retrovisor Superior Derecho
  const mirrorCanvas = document.getElementById("mirrorCanvas");
  mirrorRenderer = new THREE.WebGLRenderer({ canvas: mirrorCanvas, antialias: true });
  mirrorRenderer.setSize(mirrorCanvas.clientWidth, mirrorCanvas.clientHeight);
  mirrorCamera = new THREE.PerspectiveCamera(62, mirrorCanvas.clientWidth / mirrorCanvas.clientHeight, 0.4, 450);

  clock = new THREE.Clock();

  // Generar Texturas Procedurales
  generateAllTextures();

  // Iluminación
  setupLighting();

  // Trazado, Escapatorias y Entorno de Spa
  createSpaFrancorchampsTrack();
  createEnvironment();

  // Coches Hypercar
  createPlayerCar();
  createOpponentCars();

  // Efecto de Desenfoque Radial de Velocidad (Speed Blur Vignette)
  setupSpeedBlurEffect();

  // Eventos
  setupEventListeners();

  // Iniciar Bucle de Render
  animate();
}

// --- Iluminación Solar Realista ---
function setupLighting() {
  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f3f46, 0.7);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfffaea, 1.45);
  sunLight.position.set(280, 520, 180);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 1300;
  const d = 190;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  scene.add(sunLight);
}

// --- Trazado 3D de Spa-Francorchamps con Asfalto Texturizado y Pianos 3D ---
function createSpaFrancorchampsTrack() {
  const trackPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -120),
    new THREE.Vector3(15, 0, -220),

    // La Source (Curva 1)
    new THREE.Vector3(50, 0, -270),
    new THREE.Vector3(95, 0, -260),
    new THREE.Vector3(110, -5, -210),
    new THREE.Vector3(100, -10, -140),

    // Descenso a Eau Rouge
    new THREE.Vector3(85, -18, -40),
    new THREE.Vector3(75, -25, 70),
    new THREE.Vector3(70, -28, 180),

    // EAU ROUGE & RAIDILLON (Fuerte compresión y subida masiva a la colina)
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

    // Bruxelles / Rivage
    new THREE.Vector3(320, 16, 1100),
    new THREE.Vector3(310, 8, 980),
    new THREE.Vector3(260, 0, 890),

    // Pouhon (Doble ápice rápido)
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

    // Chicane Bus Stop
    new THREE.Vector3(-55, 0, -120),
    new THREE.Vector3(-30, 0, -100),
    new THREE.Vector3(-15, 0, -60)
  ];

  trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, 'centripetal', 0.4);
  trackLength = trackCurve.getLength();

  const segments = 520;
  const trackWidth = 14.5;
  const curbWidth = 1.3;

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

    // Vértices de asfalto
    const leftPt = pt.clone().add(normal.clone().multiplyScalar(-trackWidth / 2));
    const rightPt = pt.clone().add(normal.clone().multiplyScalar(trackWidth / 2));

    roadVerts.push(leftPt.x, leftPt.y, leftPt.z);
    roadVerts.push(rightPt.x, rightPt.y, rightPt.z);
    roadUvs.push(0, t);
    roadUvs.push(1, t);

    // Pianos Izquierdos
    const curbLOut = leftPt.clone().add(normal.clone().multiplyScalar(-curbWidth));
    curbLOut.y += 0.08;
    curbLVerts.push(curbLOut.x, curbLOut.y, curbLOut.z);
    curbLVerts.push(leftPt.x, leftPt.y + 0.02, leftPt.z);
    curbLUvs.push(0, t);
    curbLUvs.push(1, t);

    // Pianos Derechos
    const curbROut = rightPt.clone().add(normal.clone().multiplyScalar(curbWidth));
    curbROut.y += 0.08;
    curbRVerts.push(rightPt.x, rightPt.y + 0.02, rightPt.z);
    curbRVerts.push(curbROut.x, curbROut.y, curbROut.z);
    curbRUvs.push(0, t);
    curbRUvs.push(1, t);

    // Muros de Hormigón con Patrocinadores en el lateral derecho
    const wallBase = rightPt.clone().add(normal.clone().multiplyScalar(2.8));
    const wallTop = wallBase.clone().add(new THREE.Vector3(0, 1.4, 0));
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

  // 1. Malla de Asfalto con Trazada Engomada
  roadGeom.setAttribute("position", new THREE.Float32BufferAttribute(roadVerts, 3));
  roadGeom.setAttribute("uv", new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeom.setIndex(roadIndices);
  roadGeom.computeVertexNormals();

  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.asphalt,
    roughness: 0.78,
    metalness: 0.12
  });
  trackMesh = new THREE.Mesh(roadGeom, roadMat);
  trackMesh.receiveShadow = true;
  scene.add(trackMesh);

  // 2. Mallas de Pianos con Textura
  const curbMat = new THREE.MeshStandardMaterial({
    map: textures.curb,
    roughness: 0.55,
    metalness: 0.15
  });

  curbLeftGeom.setAttribute("position", new THREE.Float32BufferAttribute(curbLVerts, 3));
  curbLeftGeom.setAttribute("uv", new THREE.Float32BufferAttribute(curbLUvs, 2));
  curbLeftGeom.setIndex(curbLIndices);
  curbLeftGeom.computeVertexNormals();
  const curbLMesh = new THREE.Mesh(curbLeftGeom, curbMat);
  curbLMesh.receiveShadow = true;
  scene.add(curbLMesh);

  curbRightGeom.setAttribute("position", new THREE.Float32BufferAttribute(curbRVerts, 3));
  curbRightGeom.setAttribute("uv", new THREE.Float32BufferAttribute(curbRUvs, 2));
  curbRightGeom.setIndex(curbRIndices);
  curbRightGeom.computeVertexNormals();
  const curbRMesh = new THREE.Mesh(curbRightGeom, curbMat);
  curbRMesh.receiveShadow = true;
  scene.add(curbRMesh);

  // 3. Muro de Hormigón con Patrocinadores WEC
  wallGeom.setAttribute("position", new THREE.Float32BufferAttribute(wallVerts, 3));
  wallGeom.setAttribute("uv", new THREE.Float32BufferAttribute(wallUvs, 2));
  wallGeom.setIndex(wallIndices);
  wallGeom.computeVertexNormals();

  const wallMat = new THREE.MeshStandardMaterial({
    map: textures.wall,
    roughness: 0.65,
    metalness: 0.1
  });
  const wallMesh = new THREE.Mesh(wallGeom, wallMat);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);
}

// --- Entorno: Colinas, Escapatorias de Arena, Árboles y Tribunas ---
function createEnvironment() {
  // Suelo con Césped Verde
  const groundGeo = new THREE.PlaneGeometry(3800, 3800, 40, 40);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1f4722, // Verde bosque natural
    roughness: 0.92
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -35;
  ground.receiveShadow = true;
  scene.add(ground);

  // Escapatoria de Arena / Gravilla en la Cima de Raidillon
  const sandGeo = new THREE.PlaneGeometry(80, 180);
  sandGeo.rotateX(-Math.PI / 2);
  const sandMat = new THREE.MeshStandardMaterial({
    map: textures.sand,
    roughness: 0.9
  });
  const sandMesh = new THREE.Mesh(sandGeo, sandMat);
  sandMesh.position.set(90, 41.8, 560);
  sandMesh.rotation.y = -0.25;
  sandMesh.receiveShadow = true;
  scene.add(sandMesh);

  // Tribunas Detalladas con Techo Verde (como en la foto)
  createDetailedGrandstand(new THREE.Vector3(-25, 8, -50), 0.1, 140, 18);
  createDetailedGrandstand(new THREE.Vector3(15, 25, 450), -0.38, 95, 22);

  // Torre de Control Roja Icónica de Comisarios
  createMarshalTower(new THREE.Vector3(45, 0, -210));
  createMarshalTower(new THREE.Vector3(88, 46, 560));

  // Pinos con Ramas en las Colinas
  createPineTrees();
}

// Tribuna con Asientos Graduados
function createDetailedGrandstand(pos, rotY, length, height) {
  const group = new THREE.Group();

  // Graderío con escalones
  const stepsGeo = new THREE.BoxGeometry(16, height, length);
  const stepsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const steps = new THREE.Mesh(stepsGeo, stepsMat);
  steps.castShadow = true;
  steps.receiveShadow = true;
  group.add(steps);

  // Techo verde WEC con vigas
  const roofGeo = new THREE.BoxGeometry(22, 1.4, length + 4);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.5 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(-2, height / 2 + 5, 0);
  roof.rotation.z = -0.14;
  roof.castShadow = true;
  group.add(roof);

  group.position.copy(pos);
  group.rotation.y = rotY;
  scene.add(group);
}

// Torre Roja de Comisarios con Ventanas
function createMarshalTower(pos) {
  const tower = new THREE.Group();

  const baseGeo = new THREE.BoxGeometry(7, 18, 7);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 }); // Rojo
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 9;
  base.castShadow = true;
  tower.add(base);

  // Cabina de observación con cristal oscuro
  const cabGeo = new THREE.BoxGeometry(7.6, 5.5, 7.6);
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.y = 19.5;
  tower.add(cab);

  tower.position.copy(pos);
  scene.add(tower);
}

// Árboles Frondosos en las Colinas
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

// --- CONSTRUCCIÓN DEL COCHE HYPERCAR CON MÁXIMO DETALLE DE TEXTURAS ---
function buildHypercarModel(primaryColor = 0xdc2626, isPlayer = false) {
  const car = new THREE.Group();

  // Material de Carrocería con Livery Texturizada
  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    map: isPlayer ? textures.carLivery : null,
    roughness: 0.18,
    metalness: 0.72
  });

  // Fibra de Carbono Realista
  const carbonMat = new THREE.MeshStandardMaterial({
    map: textures.carbon,
    roughness: 0.35,
    metalness: 0.82
  });

  // Cristal de Cabina Reflectante
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x020617,
    roughness: 0.05,
    metalness: 0.95,
    transparent: true,
    opacity: 0.88
  });

  // 1. Chasis Principal
  const chassisGeo = new THREE.BoxGeometry(2.12, 0.44, 4.85);
  const chassis = new THREE.Mesh(chassisGeo, bodyMat);
  chassis.position.y = 0.40;
  chassis.castShadow = true;
  car.add(chassis);

  // 2. Pontones Laterales y Paso de Ruedas
  const sidepodGeo = new THREE.BoxGeometry(2.28, 0.40, 2.85);
  const sidepod = new THREE.Mesh(sidepodGeo, bodyMat);
  sidepod.position.set(0, 0.40, -0.2);
  sidepod.castShadow = true;
  car.add(sidepod);

  // 3. Cabina Burbuja Central (LMP Cockpit)
  const cockpitGeo = new THREE.SphereGeometry(0.70, 20, 20);
  cockpitGeo.scale(1.0, 0.86, 2.25);
  const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
  cockpit.position.set(0, 0.80, -0.3);
  cockpit.castShadow = true;
  car.add(cockpit);

  // 4. Aleta de Tiburón Dorsal de Fibra de Carbono
  const finGeo = new THREE.BoxGeometry(0.06, 0.65, 2.35);
  const fin = new THREE.Mesh(finGeo, carbonMat);
  fin.position.set(0, 0.92, 0.78);
  fin.castShadow = true;
  car.add(fin);

  // 5. Alerón Trasero de Fibra de Carbono con Soportes Cuello de Cisne
  const wingGeo = new THREE.BoxGeometry(2.32, 0.08, 0.48);
  const wing = new THREE.Mesh(wingGeo, carbonMat);
  wing.position.set(0, 1.20, 2.18);
  wing.castShadow = true;
  car.add(wing);

  // Placas laterales del alerón (Endplates)
  const endplateGeo = new THREE.BoxGeometry(0.06, 0.52, 0.65);
  const leftEndplate = new THREE.Mesh(endplateGeo, carbonMat);
  leftEndplate.position.set(-1.16, 1.08, 2.18);
  const rightEndplate = leftEndplate.clone();
  rightEndplate.position.x = 1.16;
  car.add(leftEndplate);
  car.add(rightEndplate);

  // 6. Splitter Delantero y Difusor Trasero en Carbono
  const splitterGeo = new THREE.BoxGeometry(2.25, 0.08, 0.95);
  const splitter = new THREE.Mesh(splitterGeo, carbonMat);
  splitter.position.set(0, 0.18, -2.45);
  car.add(splitter);

  const diffuserGeo = new THREE.BoxGeometry(2.15, 0.16, 0.75);
  const diffuser = new THREE.Mesh(diffuserGeo, carbonMat);
  diffuser.position.set(0, 0.22, 2.38);
  car.add(diffuser);

  // 7. Tubos de Escape Dobles con Chapa Anticalórica (Heatshield)
  const exhaustMat = new THREE.MeshStandardMaterial({
    map: textures.heatshield,
    metalness: 0.9,
    roughness: 0.25
  });
  const exhaustGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.4, 16);
  exhaustGeo.rotateX(Math.PI / 2);

  const leftExhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
  leftExhaust.position.set(-0.25, 0.52, 2.44);
  const rightExhaust = leftExhaust.clone();
  rightExhaust.position.x = 0.25;
  car.add(leftExhaust);
  car.add(rightExhaust);

  // 8. Tira LED Trasera Brillante
  const brakeLightMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
  const rearLight = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.08), brakeLightMat);
  rearLight.position.set(0, 0.56, 2.45);
  car.add(rearLight);
  car.rearLightMesh = rearLight;

  // 9. Ruedas de Competición con Textura Michelin y Pinzas de Freno Rojas
  const wheelMat = new THREE.MeshStandardMaterial({
    map: textures.tire,
    roughness: 0.75
  });

  const brakeDiscMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.95,
    roughness: 0.18
  });

  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Rojo Brembo
    roughness: 0.3
  });

  const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 20);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheels = [];
  const wheelPositions = [
    [-1.08, 0.44, -1.55], // FL
    [1.08, 0.44, -1.55],  // FR
    [-1.08, 0.44, 1.55],  // RL
    [1.08, 0.44, 1.55]    // RR
  ];

  wheelPositions.forEach(pos => {
    const wheelGroup = new THREE.Group();

    // Neumático con textura Michelin
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Disco de freno ventilado
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16), brakeDiscMat);
    disc.rotation.z = Math.PI / 2;
    wheelGroup.add(disc);

    // Pinza de freno roja
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.22), caliperMat);
    caliper.position.set(pos[0] > 0 ? -0.1 : 0.1, 0.15, 0);
    wheelGroup.add(caliper);

    wheelGroup.position.set(...pos);
    car.add(wheelGroup);
    wheels.push(wheelGroup);
  });
  car.wheels = wheels;

  // Llama de Escape para Backfire
  const flameGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(0.25, 0.52, 2.5);
  car.add(flame);
  car.flame = flame;

  return car;
}

function createPlayerCar() {
  playerCar = buildHypercarModel(0xdc2626, true);
  playerCar.castShadow = true;
  scene.add(playerCar);
  updateCarTransform(playerCar, carState.posDistance, carState.lateralOffset);
}

function createOpponentCars() {
  WEC_TEAMS.forEach((data, index) => {
    const oppMesh = buildHypercarModel(data.color, false);
    scene.add(oppMesh);

    const opp = {
      mesh: oppMesh,
      name: data.name,
      team: data.team,
      num: data.num,
      posDistance: (0.035 + index * 0.038) % 1.0,
      lateralOffset: (index % 2 === 0 ? -1.8 : 1.8) + (Math.random() * 0.7 - 0.35),
      speed: 68 + Math.random() * 16,
      maxSpeed: 78 + Math.random() * 12,
      fuel: Math.floor(75 + Math.random() * 20),
      reliability: Math.floor(92 + Math.random() * 8)
    };
    opponents.push(opp);
    updateCarTransform(opp.mesh, opp.posDistance, opp.lateralOffset);
  });
}

function updateCarTransform(mesh, tDistance, latOffset) {
  const normDist = ((tDistance % 1.0) + 1.0) % 1.0;
  const centerPoint = trackCurve.getPointAt(normDist);
  const tangent = trackCurve.getTangentAt(normDist).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

  const finalPos = centerPoint.clone().add(normal.multiplyScalar(latOffset));
  mesh.position.copy(finalPos);

  const lookTarget = finalPos.clone().add(tangent);
  mesh.lookAt(lookTarget);

  if (mesh.wheels) {
    const wheelRot = clock.getElapsedTime() * 26;
    mesh.wheels.forEach(w => w.rotation.x = wheelRot);
  }
}

// --- Físicas del Coche del Jugador ---
function updatePhysics(dt) {
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

  if (keys.left) {
    carState.lateralOffset -= (6.5 * speedRatio) * dt;
    playerCar.rotation.z = Math.min(0.08, playerCar.rotation.z + 0.15 * dt);
  } else if (keys.right) {
    carState.lateralOffset += (6.5 * speedRatio) * dt;
    playerCar.rotation.z = Math.max(-0.08, playerCar.rotation.z - 0.15 * dt);
  } else {
    playerCar.rotation.z *= 0.9;
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

function updateCameras() {
  if (!playerCar) return;

  const carPos = playerCar.position.clone();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerCar.quaternion).normalize();
  const up = new THREE.Vector3(0, 1, 0);

  // Cámara Persecución (Chase Cam idéntica a la foto)
  if (carState.cameraMode === 0) {
    const camOffset = forward.clone().multiplyScalar(-8.2).add(up.clone().multiplyScalar(3.2));
    const targetPos = carPos.clone().add(camOffset);
    camera.position.lerp(targetPos, 0.22);
    camera.lookAt(carPos.clone().add(up.clone().multiplyScalar(1.2)));
  } else if (carState.cameraMode === 1) {
    // Capó (Hood Cam)
    const hoodOffset = forward.clone().multiplyScalar(0.4).add(up.clone().multiplyScalar(1.1));
    camera.position.copy(carPos.clone().add(hoodOffset));
    camera.lookAt(carPos.clone().add(forward.clone().multiplyScalar(30)));
  } else {
    // Cockpit
    const cockOffset = forward.clone().multiplyScalar(-0.3).add(up.clone().multiplyScalar(0.85));
    camera.position.copy(carPos.clone().add(cockOffset));
    camera.lookAt(carPos.clone().add(forward.clone().multiplyScalar(30)));
  }

  // Retrovisor Superior Derecho
  const mirrorPos = carPos.clone().add(up.clone().multiplyScalar(1.4));
  mirrorCamera.position.copy(mirrorPos);
  const lookBack = carPos.clone().add(forward.clone().multiplyScalar(-60)).add(up.clone().multiplyScalar(1.0));
  mirrorCamera.lookAt(lookBack);
}

// --- Efecto de Desenfoque de Movimiento Radial Periférico (Speed Blur) ---
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
  speedBlurOverlay.style.boxShadow = "inset 0 0 120px rgba(255, 255, 255, 0)";
  speedBlurOverlay.style.transition = "opacity 0.1s ease";
  speedBlurOverlay.style.background = "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(255,255,255,0.15) 100%)";
  speedBlurOverlay.style.opacity = "0";
  document.body.appendChild(speedBlurOverlay);
}

function updateSpeedBlur() {
  if (!speedBlurOverlay) return;
  const speedKmh = carState.speed * 3.6;
  if (speedKmh > 160) {
    const intensity = Math.min(1.0, (speedKmh - 160) / 120);
    speedBlurOverlay.style.opacity = (intensity * 0.75).toString();
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

// --- Actualización del HUD Telemétrico ---
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
    ...opponents.map(o => ({ num: o.num, team: o.team, name: `#${o.num} ${o.team}`, dist: o.posDistance, isPlayer: false, fuel: o.fuel }))
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

// --- Listeners de Teclado y Táctil ---
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

// --- Bucle de Animación a 60 FPS ---
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
