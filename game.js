/**
 * WEC Hypercar Simulator - Spa-Francorchamps
 * Motor 3D de alta fidelidad en Three.js con físicas arcade-simulador,
 * IA de rivales, retrovisor funcional y HUD telemétrico estilo WEC.
 */

// --- Variables Principales del Juego ---
let scene, camera, renderer, mirrorRenderer, mirrorCamera;
let playerCar;
let opponents = [];
let trackCurve, trackMesh, trackLength;
let clock;
let isAudioEnabled = false;
let audioCtx, engineOsc, engineGain, turboOsc, turboGain, screechGain;

// Estado del Coche del Jugador
const carState = {
  speed: 0,            // m/s
  maxSpeed: 95,        // ~342 km/h
  accel: 24.0,         // aceleración base
  brakeForce: 36.0,    // fuerza de frenado
  steerAngle: 0,
  maxSteer: 0.045,
  posDistance: 0.0,    // distancia recorrida a lo largo de la spline (0 a 1)
  lateralOffset: 0.0,  // desplazamiento lateral desde el centro de la pista (-6 a 6 m)
  gear: 1,
  rpm: 2000,
  downforce: 0,
  grip: 1.8,
  fuel: 89.0,
  lap: 1,
  maxLaps: 3,
  lapStartTime: 0,
  currentLapTime: 0,
  bestLapTime: 0,
  topSpeedKmh: 0,
  position: 22,
  totalCars: 26,
  cameraMode: 0,       // 0: Persecución (Chase), 1: Capó (Hood), 2: Cockpit
  ersBoost: false
};

// Input del Jugador
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  handbrake: false,
  boost: false
};

// Nombres de Curvas de Spa-Francorchamps según distancia en la pista
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

// Equipos WEC para el Leaderboard
const WEC_TEAMS = [
  { num: 12, team: "POR", name: "Porsche Penske #12", color: 0xef4444 },
  { num: 38, team: "POR", name: "Hertz JOTA Porsche #38", color: 0xf59e0b },
  { num: 82, team: "BMW", name: "BMW M Team WRT #82", color: 0x3b82f6 },
  { num: 35, team: "ALP", name: "Alpine Endurance #35", color: 0x06b6d4 },
  { num: 10, team: "POR", name: "Porsche Penske #10", color: 0xef4444 },
  { num: 4,  team: "POR", name: "Porsche Penske #4",  color: 0xdc2626 },
  { num: 20, team: "FER", name: "Ferrari AF Corse #20", color: 0xb91c1c },
  { num: 50, team: "FER", name: "Ferrari 499P #50", color: 0xb91c1c },
  { num: 11, team: "CAD", name: "Cadillac Racing #11", color: 0x1d4ed8 },
  { num: 59, team: "CAD", name: "Action Express #59", color: 0x0284c7 },
  { num: 7,  team: "TOY", name: "Toyota Gazoo #7", color: 0xe2e8f0 },
  { num: 8,  team: "TOY", name: "Toyota Gazoo #8", color: 0xe2e8f0 }
];

// --- Inicialización del Motor Gráfico Three.js ---
function init() {
  const container = document.getElementById("gameCanvas");

  // Escena con Niebla Atmosférica
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Cielo azul brillante
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.0018);

  // Cámara Principal
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 2500);

  // Renderer Principal
  renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Cámara y Renderer para el Retrovisor
  const mirrorCanvas = document.getElementById("mirrorCanvas");
  mirrorRenderer = new THREE.WebGLRenderer({ canvas: mirrorCanvas, antialias: false });
  mirrorRenderer.setSize(mirrorCanvas.clientWidth, mirrorCanvas.clientHeight);
  mirrorCamera = new THREE.PerspectiveCamera(60, mirrorCanvas.clientWidth / mirrorCanvas.clientHeight, 0.5, 400);

  clock = new THREE.Clock();

  // Iluminación
  setupLighting();

  // Crear Trazado de Spa-Francorchamps y Entorno
  createSpaFrancorchampsTrack();
  createEnvironment();

  // Crear Coches Hypercar
  createPlayerCar();
  createOpponentCars();

  // Listeners de Input y Ventana
  setupEventListeners();

  // Iniciar Bucle de Animación
  animate();
}

// --- Iluminación ---
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.65);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfffaed, 1.35);
  sunLight.position.set(300, 450, 200);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 1200;
  const d = 180;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  scene.add(sunLight);
}

// --- Trazado 3D de Spa-Francorchamps con Elevación Realista ---
function createSpaFrancorchampsTrack() {
  // Puntos 3D representativos del legendario circuito de Spa (con subida a Raidillon)
  const trackPoints = [
    // 1. Recta Principal de Salida (Y = 0)
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -120),
    new THREE.Vector3(15, 0, -220),

    // 2. Horquilla de La Source (Curva 1 cerrada a la derecha)
    new THREE.Vector3(50, 0, -270),
    new THREE.Vector3(95, 0, -260),
    new THREE.Vector3(110, -5, -210),
    new THREE.Vector3(100, -10, -140),

    // 3. Descenso veloz hacia Eau Rouge
    new THREE.Vector3(85, -18, -40),
    new THREE.Vector3(75, -25, 70),
    new THREE.Vector3(70, -28, 180),

    // 4. EAU ROUGE & RAIDILLON (Fuerte compresión y subida masiva +42 metros)
    new THREE.Vector3(65, -24, 250), // Izquierda abajo
    new THREE.Vector3(50, -5, 340),  // Subida pronunciada
    new THREE.Vector3(45, 18, 430),  // Derecha en plena colina
    new THREE.Vector3(50, 36, 520),  // Cima de Raidillon
    new THREE.Vector3(60, 42, 600),

    // 5. Recta de Kemmel (Aceleración a fondo a gran altura)
    new THREE.Vector3(80, 42, 750),
    new THREE.Vector3(110, 42, 920),
    new THREE.Vector3(150, 40, 1100),

    // 6. Les Combes & Malmedy (Chicane)
    new THREE.Vector3(180, 38, 1220),
    new THREE.Vector3(220, 35, 1280),
    new THREE.Vector3(270, 30, 1270),
    new THREE.Vector3(300, 24, 1210),

    // 7. Bruxelles / Rivage (Curva en descenso)
    new THREE.Vector3(320, 16, 1100),
    new THREE.Vector3(310, 8, 980),
    new THREE.Vector3(260, 0, 890),

    // 8. Pouhon (Doble ápice rápido a izquierdas)
    new THREE.Vector3(200, -8, 800),
    new THREE.Vector3(140, -18, 720),
    new THREE.Vector3(80, -22, 640),
    new THREE.Vector3(20, -25, 540),

    // 9. Campus & Stavelot
    new THREE.Vector3(-40, -20, 440),
    new THREE.Vector3(-90, -14, 340),
    new THREE.Vector3(-120, -8, 220),

    // 10. Blanchimont (Curva rápida a fondo de vuelta a meta)
    new THREE.Vector3(-130, -2, 100),
    new THREE.Vector3(-120, 0, -20),
    new THREE.Vector3(-90, 0, -90),

    // 11. Chicane Bus Stop
    new THREE.Vector3(-55, 0, -120),
    new THREE.Vector3(-30, 0, -100),
    new THREE.Vector3(-15, 0, -60)
  ];

  // Generar Curva Spline Continua Suave
  trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, 'centripetal', 0.4);
  trackLength = trackCurve.getLength();

  // Construir la Pista con Geometría Extruida
  const segments = 450;
  const trackWidth = 14;
  const curbWidth = 1.2;

  const roadGeom = new THREE.BufferGeometry();
  const curbGeom = new THREE.BufferGeometry();
  const railGeom = new THREE.BufferGeometry();

  const roadVertices = [];
  const roadIndices = [];
  const roadUvs = [];

  const curbVertices = [];
  const curbIndices = [];
  const curbColors = [];

  const railVertices = [];
  const railIndices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Vértices de asfalto
    const leftRoad = point.clone().add(normal.clone().multiplyScalar(-trackWidth / 2));
    const rightRoad = point.clone().add(normal.clone().multiplyScalar(trackWidth / 2));

    roadVertices.push(leftRoad.x, leftRoad.y, leftRoad.z);
    roadVertices.push(rightRoad.x, rightRoad.y, rightRoad.z);
    roadUvs.push(0, t * 80);
    roadUvs.push(1, t * 80);

    // Vértices de Pianos (Curbs rojo y amarillo)
    const leftCurbOut = leftRoad.clone().add(normal.clone().multiplyScalar(-curbWidth));
    const rightCurbOut = rightRoad.clone().add(normal.clone().multiplyScalar(curbWidth));

    const curbIndexOffset = (i * 4);
    curbVertices.push(leftCurbOut.x, leftCurbOut.y + 0.1, leftCurbOut.z);
    curbVertices.push(leftRoad.x, leftRoad.y + 0.05, leftRoad.z);
    curbVertices.push(rightRoad.x, rightRoad.y + 0.05, rightRoad.z);
    curbVertices.push(rightCurbOut.x, rightCurbOut.y + 0.1, rightCurbOut.z);

    // Patrón de color alterno rojo / amarillo
    const isRed = Math.floor(t * 180) % 2 === 0;
    const cR = isRed ? 0.9 : 0.95;
    const cG = isRed ? 0.1 : 0.85;
    const cB = isRed ? 0.1 : 0.05;

    for (let c = 0; c < 4; c++) {
      curbColors.push(cR, cG, cB);
    }

    // Guardarraíles metálicos elevados
    const leftRail = leftRoad.clone().add(normal.clone().multiplyScalar(-3.0));
    leftRail.y += 0.8;
    const rightRail = rightRoad.clone().add(normal.clone().multiplyScalar(3.0));
    rightRail.y += 0.8;

    railVertices.push(leftRail.x, leftRail.y, leftRail.z);
    railVertices.push(rightRail.x, rightRail.y, rightRail.z);

    // Índices de caras (Quads como triángulos)
    if (i < segments) {
      const base = i * 2;
      roadIndices.push(base, base + 1, base + 2);
      roadIndices.push(base + 1, base + 3, base + 2);

      // Pianos izquierdo
      const cb = i * 4;
      curbIndices.push(cb, cb + 1, cb + 4);
      curbIndices.push(cb + 1, cb + 5, cb + 4);
      // Pianos derecho
      curbIndices.push(cb + 2, cb + 3, cb + 6);
      curbIndices.push(cb + 3, cb + 7, cb + 6);

      // Guardarraíl
      railIndices.push(base, base + 1, base + 2);
      railIndices.push(base + 1, base + 3, base + 2);
    }
  }

  // Material de Asfalto con Líneas
  roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
  roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeom.setIndex(roadIndices);
  roadGeom.computeVertexNormals();

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x24272c,
    roughness: 0.82,
    metalness: 0.15
  });
  trackMesh = new THREE.Mesh(roadGeom, roadMaterial);
  trackMesh.receiveShadow = true;
  scene.add(trackMesh);

  // Mesh de Pianos (Curbs)
  curbGeom.setAttribute('position', new THREE.Float32BufferAttribute(curbVertices, 3));
  curbGeom.setAttribute('color', new THREE.Float32BufferAttribute(curbColors, 3));
  curbGeom.setIndex(curbIndices);
  curbGeom.computeVertexNormals();

  const curbMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.6,
    metalness: 0.1
  });
  const curbsMesh = new THREE.Mesh(curbGeom, curbMaterial);
  curbsMesh.receiveShadow = true;
  scene.add(curbsMesh);

  // Guardarraíles metálicos (Armco)
  railGeom.setAttribute('position', new THREE.Float32BufferAttribute(railVertices, 3));
  railGeom.setIndex(railIndices);
  railGeom.computeVertexNormals();

  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.8,
    roughness: 0.3
  });
  const railMesh = new THREE.Mesh(railGeom, railMaterial);
  railMesh.castShadow = true;
  scene.add(railMesh);
}

// --- Entorno (Colinas de las Ardenas, Árboles, Tribunas y Torre Roja) ---
function createEnvironment() {
  // Suelo / Terreno de Hierba verde
  const groundGeo = new THREE.PlaneGeometry(3500, 3500, 60, 60);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a1e, // Verde bosque
    roughness: 0.95
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -35;
  ground.receiveShadow = true;
  scene.add(ground);

  // Tribuna Principal y Gradas en la Colina de Raidillon
  createGrandstand(new THREE.Vector3(-25, 8, -50), 0.1, 140, 18);
  createGrandstand(new THREE.Vector3(15, 25, 450), -0.4, 90, 22);

  // Torre de Control Roja icónica (visible en la foto del usuario)
  createMarshalTower(new THREE.Vector3(45, 0, -210));
  createMarshalTower(new THREE.Vector3(90, 48, 560));

  // Bosque de Pinos a lo largo de las colinas
  createPineTrees();
}

// Tribuna con Techo
function createGrandstand(pos, rotY, length, height) {
  const group = new THREE.Group();
  const seatsGeo = new THREE.BoxGeometry(16, height, length);
  const seatsMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const seats = new THREE.Mesh(seatsGeo, seatsMat);
  seats.castShadow = true;
  seats.receiveShadow = true;
  group.add(seats);

  // Techo verde/azul
  const roofGeo = new THREE.BoxGeometry(22, 1.5, length + 4);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x059669 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(-2, height / 2 + 5, 0);
  roof.rotation.z = -0.15;
  group.add(roof);

  group.position.copy(pos);
  group.rotation.y = rotY;
  scene.add(group);
}

// Torre Roja de Comisarios
function createMarshalTower(pos) {
  const tower = new THREE.Group();
  const baseGeo = new THREE.BoxGeometry(7, 18, 7);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 }); // Rojo brillante
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 9;
  base.castShadow = true;
  tower.add(base);

  const cabGeo = new THREE.BoxGeometry(8, 6, 8);
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.y = 20;
  tower.add(cab);

  tower.position.copy(pos);
  scene.add(tower);
}

// Árboles Procedurales
function createPineTrees() {
  const treeGeo = new THREE.ConeGeometry(4.5, 14, 5);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 });
  const trunkGeo = new THREE.CylinderGeometry(0.8, 1.2, 4);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });

  const numTrees = 160;
  for (let i = 0; i < numTrees; i++) {
    const t = Math.random();
    const trackPoint = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Colocar a los lados de la pista (fuera de las vallas)
    const side = Math.random() > 0.5 ? 1 : -1;
    const dist = 28 + Math.random() * 90;
    const treePos = trackPoint.clone().add(normal.multiplyScalar(side * dist));
    treePos.y -= 2;

    const tree = new THREE.Group();
    const foliage = new THREE.Mesh(treeGeo, treeMat);
    foliage.position.y = 10;
    foliage.castShadow = true;
    tree.add(foliage);

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2;
    tree.add(trunk);

    tree.position.copy(treePos);
    const scale = 0.8 + Math.random() * 0.7;
    tree.scale.set(scale, scale, scale);
    scene.add(tree);
  }
}

// --- Construcción del Coche Hypercar WEC (LMP Prototype) ---
function buildHypercarModel(primaryColor = 0xef4444, secondaryColor = 0x0f172a) {
  const car = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.25,
    metalness: 0.65
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    roughness: 0.4,
    metalness: 0.8
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.85
  });

  // 1. Chasis Principal Aerodinámico
  const chassisGeo = new THREE.BoxGeometry(2.1, 0.42, 4.8);
  const chassis = new THREE.Mesh(chassisGeo, bodyMat);
  chassis.position.y = 0.38;
  chassis.castShadow = true;
  car.add(chassis);

  // 2. Pontones Laterales y Paso de Rueda
  const sidepodGeo = new THREE.BoxGeometry(2.25, 0.38, 2.8);
  const sidepod = new THREE.Mesh(sidepodGeo, bodyMat);
  sidepod.position.set(0, 0.38, -0.2);
  sidepod.castShadow = true;
  car.add(sidepod);

  // 3. Cabina Burbuja Central (Cockpit LMP)
  const cockpitGeo = new THREE.SphereGeometry(0.68, 16, 16);
  cockpitGeo.scale(1.0, 0.85, 2.2);
  const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
  cockpit.position.set(0, 0.78, -0.3);
  cockpit.castShadow = true;
  car.add(cockpit);

  // 4. Aleta de Tiburón Dorsal (Shark Fin reglamentaria de WEC)
  const finGeo = new THREE.BoxGeometry(0.06, 0.6, 2.3);
  const fin = new THREE.Mesh(finGeo, carbonMat);
  fin.position.set(0, 0.88, 0.75);
  fin.castShadow = true;
  car.add(fin);

  // 5. Alerón Trasero Gigante con Soportes Swan-Neck
  const wingGeo = new THREE.BoxGeometry(2.28, 0.08, 0.45);
  const wing = new THREE.Mesh(wingGeo, carbonMat);
  wing.position.set(0, 1.15, 2.15);
  wing.castShadow = true;
  car.add(wing);

  // Endplates del alerón
  const endplateGeo = new THREE.BoxGeometry(0.06, 0.5, 0.6);
  const leftEndplate = new THREE.Mesh(endplateGeo, carbonMat);
  leftEndplate.position.set(-1.14, 1.05, 2.15);
  const rightEndplate = leftEndplate.clone();
  rightEndplate.position.x = 1.14;
  car.add(leftEndplate);
  car.add(rightEndplate);

  // 6. Splitter Delantero y Difusor Trasero de Fibra de Carbono
  const splitterGeo = new THREE.BoxGeometry(2.2, 0.08, 0.9);
  const splitter = new THREE.Mesh(splitterGeo, carbonMat);
  splitter.position.set(0, 0.18, -2.4);
  car.add(splitter);

  const diffuserGeo = new THREE.BoxGeometry(2.1, 0.14, 0.7);
  const diffuser = new THREE.Mesh(diffuserGeo, carbonMat);
  diffuser.position.set(0, 0.22, 2.35);
  car.add(diffuser);

  // 7. Luces LED Delanteras
  const lightGeo = new THREE.BoxGeometry(0.35, 0.1, 0.1);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  const leftLight = new THREE.Mesh(lightGeo, lightMat);
  leftLight.position.set(-0.75, 0.42, -2.4);
  const rightLight = leftLight.clone();
  rightLight.position.x = 0.75;
  car.add(leftLight);
  car.add(rightLight);

  // 8. Tira LED Trasera y Freno
  const brakeLightMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
  const rearLight = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.08), brakeLightMat);
  rearLight.position.set(0, 0.55, 2.42);
  car.add(rearLight);
  car.rearLightMesh = rearLight;

  // 9. Cuatro Ruedas Competición
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.38, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheels = [];
  const wheelPositions = [
    [-1.05, 0.42, -1.55], // FL
    [1.05, 0.42, -1.55],  // FR
    [-1.05, 0.42, 1.55],  // RL
    [1.05, 0.42, 1.55]    // RR
  ];

  wheelPositions.forEach(pos => {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.4, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    wheelGroup.position.set(...pos);
    car.add(wheelGroup);
    wheels.push(wheelGroup);
  });
  car.wheels = wheels;

  // Partículas de Fuego del Escape (Backfire)
  const flameGeo = new THREE.SphereGeometry(0.12, 8, 8);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(0.3, 0.5, 2.45);
  car.add(flame);
  car.flame = flame;

  return car;
}

// Crear Coche del Jugador (Porsche 963 / Ferrari 499P Rojo & Negro)
function createPlayerCar() {
  playerCar = buildHypercarModel(0xdc2626, 0x09090b);
  playerCar.castShadow = true;
  scene.add(playerCar);

  // Posicionar en la recta principal
  carState.posDistance = 0.02;
  carState.lateralOffset = 1.8;
  updateCarTransform(playerCar, carState.posDistance, carState.lateralOffset);
}

// Crear Rivales con IA (Top WEC Grid)
function createOpponentCars() {
  WEC_TEAMS.forEach((data, index) => {
    const oppMesh = buildHypercarModel(data.color, 0x111827);
    scene.add(oppMesh);

    const opp = {
      mesh: oppMesh,
      name: data.name,
      team: data.team,
      num: data.num,
      posDistance: (0.04 + index * 0.038) % 1.0,
      lateralOffset: (index % 2 === 0 ? -1.8 : 1.8) + (Math.random() * 0.8 - 0.4),
      speed: 68 + Math.random() * 16, // m/s (~245-300 km/h)
      maxSpeed: 78 + Math.random() * 12,
      fuel: Math.floor(75 + Math.random() * 20),
      reliability: Math.floor(92 + Math.random() * 8)
    };
    opponents.push(opp);
    updateCarTransform(opp.mesh, opp.posDistance, opp.lateralOffset);
  });
}

// Actualizar Posición y Orientación del Coche según la Spline de la Pista
function updateCarTransform(mesh, tDistance, latOffset) {
  const normDist = ((tDistance % 1.0) + 1.0) % 1.0;
  const centerPoint = trackCurve.getPointAt(normDist);
  const tangent = trackCurve.getTangentAt(normDist).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

  const finalPos = centerPoint.clone().add(normal.multiplyScalar(latOffset));
  mesh.position.copy(finalPos);

  // Orientar hacia el frente de la pista
  const lookTarget = finalPos.clone().add(tangent);
  mesh.lookAt(lookTarget);

  // Rotar ruedas
  if (mesh.wheels) {
    const wheelRot = clock.getElapsedTime() * 25;
    mesh.wheels.forEach(w => w.rotation.x = wheelRot);
  }
}

// --- Físicas y Bucle de Actualización del Coche del Jugador ---
function updatePhysics(dt) {
  // Aceleración y Frenado
  if (keys.forward) {
    const boostMult = keys.boost ? 1.4 : 1.0;
    carState.speed += carState.accel * boostMult * dt;
    carState.ersBoost = keys.boost;
  } else if (keys.backward) {
    if (carState.speed > 1) {
      carState.speed -= carState.brakeForce * dt; // Freno
    } else {
      carState.speed -= 8.0 * dt; // Marcha atrás
    }
  } else {
    // Resistencia aerodinámica y fricción natural
    carState.speed -= (4.5 + Math.pow(carState.speed / 30, 2)) * dt;
    if (carState.speed < 0 && !keys.backward) carState.speed = 0;
  }

  // Límite de Velocidad
  const currentMax = keys.boost ? carState.maxSpeed * 1.12 : carState.maxSpeed;
  carState.speed = Math.max(-12, Math.min(carState.speed, currentMax));

  // Dirección dependiente de la velocidad
  const speedRatio = Math.min(1.0, Math.abs(carState.speed) / 40);
  const steerRate = 3.8 * dt;

  if (keys.left) {
    carState.lateralOffset -= (6.5 * speedRatio) * dt;
    playerCar.rotation.z = Math.min(0.08, playerCar.rotation.z + 0.15 * dt); // Inclinación
  } else if (keys.right) {
    carState.lateralOffset += (6.5 * speedRatio) * dt;
    playerCar.rotation.z = Math.max(-0.08, playerCar.rotation.z - 0.15 * dt);
  } else {
    playerCar.rotation.z *= 0.9;
  }

  // Limitar desplazamiento dentro del ancho de pista (con penalización en césped)
  if (Math.abs(carState.lateralOffset) > 7.0) {
    carState.speed *= 0.985; // Hierba reduce velocidad
  }
  carState.lateralOffset = Math.max(-8.5, Math.min(8.5, carState.lateralOffset));

  // Avanzar distancia a lo largo de la spline
  const deltaDistance = (carState.speed * dt) / trackLength;
  const prevDist = carState.posDistance;
  carState.posDistance = (carState.posDistance + deltaDistance);

  // Detección de vuelta completada
  if (carState.posDistance >= 1.0) {
    carState.posDistance -= 1.0;
    carState.lap = Math.min(carState.maxLaps, carState.lap + 1);
    carState.bestLapTime = carState.currentLapTime;
    carState.lapStartTime = clock.getElapsedTime();
  }

  // Actualizar posición 3D
  updateCarTransform(playerCar, carState.posDistance, carState.lateralOffset);

  // Calcular Marcha y RPM del Motor
  const speedKmh = Math.max(0, Math.round(carState.speed * 3.6));
  carState.topSpeedKmh = Math.max(carState.topSpeedKmh, speedKmh);

  if (speedKmh <= 0) {
    carState.gear = keys.backward ? 'R' : 'N';
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

  // Luz de Freno y Llama de Escape
  if (playerCar.rearLightMesh) {
    playerCar.rearLightMesh.material.color.setHex(keys.backward ? 0xff0000 : 0x7f1d1d);
  }
  if (playerCar.flame) {
    const showFlame = (keys.backward || (!keys.forward && carState.speed > 40)) && Math.random() > 0.4;
    playerCar.flame.material.opacity = showFlame ? 0.9 : 0.0;
  }

  // Telemetría Aerodinámica
  carState.downforce = ((Math.pow(carState.speed, 2) * 0.58) / 1000).toFixed(1);
  carState.grip = (1.2 + Math.min(1.8, carState.downforce * 0.22)).toFixed(1);

  // Consumo de Combustible
  if (carState.speed > 5) {
    carState.fuel = Math.max(1.0, carState.fuel - 0.004 * dt);
  }

  // Audio del Motor en tiempo real
  updateAudio();
}

// --- Actualización de Rivales IA ---
function updateOpponents(dt) {
  opponents.forEach((opp, i) => {
    // Variar velocidad según la curva
    const norm = ((opp.posDistance % 1.0) + 1.0) % 1.0;
    const isCurvaLenta = (norm > 0.08 && norm < 0.16) || (norm > 0.88);
    const targetSpeed = isCurvaLenta ? opp.maxSpeed * 0.55 : opp.maxSpeed;

    opp.speed += (targetSpeed - opp.speed) * 0.8 * dt;
    const delta = (opp.speed * dt) / trackLength;
    opp.posDistance = (opp.posDistance + delta) % 1.0;

    // Movimiento lateral suave para simular trazada
    opp.lateralOffset += Math.sin(clock.getElapsedTime() * 0.5 + i) * 0.015;
    opp.lateralOffset = Math.max(-5.5, Math.min(5.5, opp.lateralOffset));

    updateCarTransform(opp.mesh, opp.posDistance, opp.lateralOffset);
  });
}

// --- Cámaras (Chase Cam, Hood Cam y Retrovisor) ---
function updateCameras() {
  if (!playerCar) return;

  const carPos = playerCar.position.clone();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerCar.quaternion).normalize();
  const up = new THREE.Vector3(0, 1, 0);

  // Cámara Principal (Chase Cam por defecto)
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

  // Cámara del Retrovisor (Apunta directamente hacia atrás)
  const mirrorPos = carPos.clone().add(up.clone().multiplyScalar(1.4));
  mirrorCamera.position.copy(mirrorPos);
  const lookBack = carPos.clone().add(forward.clone().multiplyScalar(-60)).add(up.clone().multiplyScalar(1.0));
  mirrorCamera.lookAt(lookBack);
}

// --- Sonido Sintetizado con Web Audio API (Sin archivos externos) ---
function initAudio() {
  if (isAudioEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    // Oscilador de Motor V8
    engineOsc = audioCtx.createOscillator();
    engineOsc.type = "sawtooth";
    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(0.08, audioCtx.currentTime);

    // Filtro pasa bajos para darle cuerpo al motor
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(750, audioCtx.currentTime);

    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();

    // Silbido Turbo / Híbrido
    turboOsc = audioCtx.createOscillator();
    turboOsc.type = "sine";
    turboGain = audioCtx.createGain();
    turboGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

    turboOsc.connect(turboGain);
    turboGain.connect(audioCtx.destination);
    turboOsc.start();

    isAudioEnabled = true;
  } catch (e) {
    console.warn("Audio no soportado o bloqueado por navegador", e);
  }
}

function updateAudio() {
  if (!isAudioEnabled || !audioCtx) return;

  const baseFreq = 55 + (carState.rpm / 9500) * 220;
  engineOsc.frequency.setTargetAtTime(baseFreq, audioCtx.currentTime, 0.05);

  const vol = Math.min(0.18, 0.04 + (carState.rpm / 9500) * 0.12);
  engineGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.05);

  // Turbo whine
  const turboVol = keys.boost ? 0.08 : (keys.forward && carState.speed > 30 ? 0.03 : 0.0);
  turboGain.gain.setTargetAtTime(turboVol, audioCtx.currentTime, 0.1);
  turboOsc.frequency.setTargetAtTime(800 + (carState.speed * 20), audioCtx.currentTime, 0.1);
}

// --- Actualización de la Interfaz HUD (Idéntica a la imagen del usuario) ---
let lastFpsUpdate = 0;
let frameCount = 0;

function updateHUD() {
  const speedKmh = Math.max(0, Math.round(carState.speed * 3.6));

  // Velocidad y Marcha
  document.getElementById("speedDisplay").textContent = speedKmh;
  document.getElementById("gearDisplay").textContent = carState.gear;

  // Barra LED de RPM
  const rpmPct = (carState.rpm - 2000) / 7500;
  const leds = document.querySelectorAll(".rpm-led");
  const numActive = Math.round(rpmPct * leds.length);
  leds.forEach((led, idx) => {
    if (idx < numActive) {
      led.classList.add("active");
    } else {
      led.classList.remove("active");
    }
  });

  // Telemetría Superior
  document.getElementById("valDownforce").textContent = `${carState.downforce} kN`;
  document.getElementById("valGrip").textContent = `${carState.grip} g`;

  // Combustible
  document.getElementById("fuelVal").textContent = `${Math.round(carState.fuel)} L`;
  document.getElementById("fuelBar").style.width = `${Math.min(100, carState.fuel)}%`;

  // Tiempos de Vuelta
  const elapsed = clock.getElapsedTime() - carState.lapStartTime;
  const mins = Math.floor(elapsed / 60);
  const secs = (elapsed % 60).toFixed(3).padStart(6, '0');
  document.getElementById("lapTime").textContent = `${mins}:${secs}`;
  document.getElementById("lapCount").textContent = carState.lap;
  document.getElementById("maxSpeed").textContent = carState.topSpeedKmh;

  // Curva Actual
  const normDist = ((carState.posDistance % 1.0) + 1.0) % 1.0;
  let currentTurnName = "CIRCUITO DE SPA";
  for (const turn of SPA_TURNS) {
    if (normDist >= turn.start && normDist < turn.end) {
      currentTurnName = turn.name;
      break;
    }
  }
  document.getElementById("turnIndicator").textContent = currentTurnName;

  // Minimapa en Canvas
  drawMinimap();

  // Leaderboard Dinámico
  updateLeaderboard();

  // FPS Counter
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    const ms = (1000 / Math.max(1, fps)).toFixed(1);
    document.getElementById("fpsCounter").textContent = `${fps} FPS · ${ms} ms · res 1.0x`;
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

// Dibujo del Minimapa con Trazado y Puntos de Coches
function drawMinimap() {
  const canvas = document.getElementById("minimapCanvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Escala para ajustar la pista al minimapa
  const scale = 0.088;
  const cx = w * 0.48;
  const cy = h * 0.52;

  // Trazado de la pista en blanco brillante
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
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

  // Rivales en el minimapa (Puntos azules)
  ctx.fillStyle = "#38bdf8";
  opponents.forEach(opp => {
    const pt = trackCurve.getPointAt(opp.posDistance % 1.0);
    const px = cx + pt.x * scale;
    const py = cy + pt.z * scale;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Coche del Jugador (Punto verde/rojo pulsante)
  const playerPt = trackCurve.getPointAt(((carState.posDistance % 1.0) + 1.0) % 1.0);
  const px = cx + playerPt.x * scale;
  const py = cy + playerPt.z * scale;

  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Leaderboard / Tabla de Posiciones
function updateLeaderboard() {
  const list = document.getElementById("leaderboardList");

  // Ordenar coches por distancia total recorrida
  const allDrivers = [
    { num: 6, team: "POR", name: "TÚ (PORSCHE #6)", dist: carState.posDistance, isPlayer: true, fuel: Math.round(carState.fuel) },
    ...opponents.map(o => ({ num: o.num, team: o.team, name: `#${o.num} ${o.team}`, dist: o.posDistance, isPlayer: false, fuel: o.fuel }))
  ];

  allDrivers.sort((a, b) => b.dist - a.dist);

  // Encontrar posición del jugador
  const playerIdx = allDrivers.findIndex(d => d.isPlayer);
  carState.position = playerIdx + 1;
  document.getElementById("playerPos").textContent = carState.position;

  // Renderizar 10 coches alrededor
  let html = "";
  const displayDrivers = allDrivers.slice(0, 10);
  displayDrivers.forEach((d, i) => {
    const gap = i === 0 ? "LÍDER" : `+${((i * 1.34) + 0.12).toFixed(3)}`;
    html += `
      <li class="leaderboard-item ${d.isPlayer ? 'player-row' : ''}">
        <span class="driver-tag">#${d.num} ${d.team}</span>
        <span class="driver-gap">${gap}</span>
        <span class="driver-fuel">${d.fuel} L</span>
        <span>94%</span>
      </li>
    `;
  });
  list.innerHTML = html;
}

// --- Listeners de Teclado, Táctil y Pantalla ---
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

  // Botones táctiles para Móvil
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

  // Botón iniciar carrera
  document.getElementById("btnStartGame").addEventListener("click", () => {
    initAudio();
    document.getElementById("controlsHelp").style.display = "none";
  });

  // Redimensionar Ventana
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

  // Actualizar Físicas y Rivales
  updatePhysics(dt);
  updateOpponents(dt);

  // Actualizar Posiciones de Cámaras
  updateCameras();

  // 1. Renderizar Vista Principal
  renderer.render(scene, camera);

  // 2. Renderizar Retrovisor Superior Derecho
  mirrorRenderer.render(scene, mirrorCamera);

  // Actualizar Indicadores de HUD
  updateHUD();
}

// Iniciar al cargar
window.addEventListener("DOMContentLoaded", init);
