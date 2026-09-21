/* ============================================================
   AutFlow — Escena cinematográfica del hero
   ------------------------------------------------------------
   Busto robótico en tres cuartos, iluminación fría de estudio
   y partículas en suspensión.

   Módulo ES aislado: no toca ni depende de js/main.js.
   Se carga en diferido y sólo cuando el dispositivo lo
   justifica. El texto del hero nunca espera a este archivo.
   ============================================================ */

import * as THREE from '../vendor/three/three.module.min.js';

/* ---------- Paleta (misma de css/styles.css) ---------- */
const C = {
  bg:      0x05070f,
  blue:    0x2440ff,
  sky:     0x3fc6f5,
  mint:    0x8ff3ce,
  steel:   0x353f52,
  steelHi: 0x4a566d,
  dark:    0x111722,
  graphite:0x161d2b,
  glass:   0x060a12,
  white:   0xe6f0ff
};

/* ---------- Curvas ---------- */
const easeOutExpo  = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const smooth       = (t) => t * t * (3 - 2 * t);
const clamp01      = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp         = (a, b, t) => a + (b - a) * t;

/* Amortiguación independiente del framerate: el mismo "peso"
   se siente igual a 60Hz que a 120Hz. */
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/* ============================================================
   Entorno de reflexión
   ------------------------------------------------------------
   Sin esto un metal (metalness alto) no tiene nada que
   reflejar y se renderiza prácticamente negro, por muchas
   luces que haya. El envMap es lo que convierte la pieza en
   metal en lugar de plástico oscuro.

   Se construye un equirectangular a mano: dos softbox frías
   arriba, un suelo oscuro y un acento cian lateral.
   ============================================================ */
function buildEnvironment(renderer) {
  const w = 512, h = 256;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');

  /* Cielo → horizonte → suelo */
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0.00, '#20304a');
  sky.addColorStop(0.42, '#121b2c');
  sky.addColorStop(0.55, '#0a1018');
  sky.addColorStop(1.00, '#04060b');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  /* Softbox: los rectángulos claros son los que se ven
     deslizarse por los cantos biselados al girar la pieza. */
  const box = (x, y, bw, bh, color, blur) => {
    g.save();
    g.filter = `blur(${blur}px)`;
    g.fillStyle = color;
    g.fillRect(x, y, bw, bh);
    g.restore();
  };
  /* Desenfoques amplios: un softbox de canto duro se refleja
     como una banda y delata la geometria del entorno. */
  box(30, 4, 168, 74, 'rgba(226,240,255,0.85)', 34);    // clave, izquierda
  box(296, 18, 124, 56, 'rgba(120,205,245,0.62)', 38);  // contraluz cian
  box(200, 0, 70, 34, 'rgba(255,255,255,0.3)', 40);     // realce alto
  box(0, 158, w, 22, 'rgba(48,74,150,0.16)', 44);       // rebote inferior

  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(tex).texture;

  pmrem.dispose();
  tex.dispose();
  return env;
}

/* ============================================================
   Geometría base: losa biselada
   ------------------------------------------------------------
   Todo el robot se construye con esto. Un bisel real (no un
   cubo pelado) es lo que hace que la luz recorra los cantos.
   ============================================================ */
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function slab(w, h, depth, radius, bevel = 0.04, seg = 3) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w, h, radius), {
    depth: Math.max(depth - bevel * 2, 0.01),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: seg,
    curveSegments: 12
  });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

/* Textura radial suave — halo de la óptica y sprite de partícula. */
function radialTexture(stops, size = 128) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) grd.addColorStop(at, color);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ============================================================
   Construcción del robot
   ------------------------------------------------------------
   Unidad robótica articulada: base, dos segmentos de brazo con
   juntas y un cabezal sensor.

   Un busto humanoide hecho de primitivas siempre termina
   leyéndose como mascota: la simetría frontal y la proporción
   cabeza/hombros lo empujan ahí. Una unidad articulada es
   asimétrica por construcción, se apoya en cilindros y
   carcasas — que es lo que un brazo real es — y además es el
   lenguaje visual de la automatización industrial.

   La pose es deliberada: el cabezal mira hacia la izquierda,
   es decir, hacia el titular. La escena señala al mensaje.
   ============================================================ */
function buildRobot(quality) {
  const root = new THREE.Group();
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };

  /* ---- Materiales ---- */
  /* envMapIntensity alto: casi todo el modelado del volumen
     viene del entorno reflejado, no de las luces directas. */
  const matShell = track(new THREE.MeshStandardMaterial({
    color: C.steel, metalness: 1.0, roughness: 0.3, envMapIntensity: 1.5
  }));
  const matPlate = track(new THREE.MeshStandardMaterial({
    color: C.steelHi, metalness: 1.0, roughness: 0.19, envMapIntensity: 1.8
  }));
  /* Piezas mate: rompen el brillo y dejan leer la silueta. */
  const matMatte = track(new THREE.MeshStandardMaterial({
    color: C.graphite, metalness: 0.4, roughness: 0.8, envMapIntensity: 0.6
  }));
  const matGlass = track(new THREE.MeshPhysicalMaterial({
    color: C.glass, metalness: 0.2, roughness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.4
  }));

  /* Emisivos: arrancan apagados, se encienden en la entrada. */
  const matOptic = track(new THREE.MeshStandardMaterial({
    color: 0x071620, emissive: new THREE.Color(C.sky),
    emissiveIntensity: 0, metalness: 0.3, roughness: 0.18
  }));
  const matSeam = track(new THREE.MeshStandardMaterial({
    color: 0x08111c, emissive: new THREE.Color(C.sky),
    emissiveIntensity: 0, metalness: 0.5, roughness: 0.4
  }));
  const matCore = track(new THREE.MeshStandardMaterial({
    color: 0x07140f, emissive: new THREE.Color(C.mint),
    emissiveIntensity: 0, metalness: 0.5, roughness: 0.35
  }));

  const emissives = { optic: matOptic, seam: matSeam, core: matCore };

  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => {
    track(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const cyl = (rt, rb, h, seg = 20) => new THREE.CylinderGeometry(rt, rb, h, seg);

  /* Junta: cilindro grueso + dos tapas pulidas + anillo
     luminoso. Es la pieza que se repite y la que hace creer
     que el brazo puede moverse de verdad. */
  function joint(parent, radius, width) {
    const g = new THREE.Group();
    parent.add(g);
    const body = mesh(cyl(radius, radius, width, 24), matMatte, g);
    body.rotation.z = Math.PI / 2;
    body.castShadow = quality.shadows;
    for (const side of [-1, 1]) {
      const cap = mesh(cyl(radius * 0.72, radius * 0.72, 0.05, 24), matPlate, g,
        side * (width / 2 + 0.02), 0, 0);
      cap.rotation.z = Math.PI / 2;
      const ring = mesh(new THREE.TorusGeometry(radius * 0.46, 0.022, 8, 24), matSeam, g,
        side * (width / 2 + 0.05), 0, 0);
      ring.rotation.y = Math.PI / 2;
    }
    return g;
  }

  /* Segmento de brazo: carcasa biselada, dos nervios laterales
     y una costura luminosa que corre a lo largo. */
  function segment(parent, len, w, d) {
    const g = new THREE.Group();
    parent.add(g);
    const shell = mesh(slab(w, len, d, 0.09, 0.04, 3), matShell, g, 0, len / 2, 0);
    shell.castShadow = quality.shadows;
    for (const side of [-1, 1]) {
      const rib = mesh(slab(len * 0.82, w * 0.34, 0.06, 0.03, 0.02), matPlate, g,
        side * (w / 2 + 0.01), len / 2, 0);
      rib.rotation.z = Math.PI / 2;
      rib.rotation.y = side * Math.PI / 2;
    }
    mesh(slab(0.05, len * 0.66, 0.04, 0.02, 0.012), matSeam, g, 0, len / 2, d / 2 + 0.01);
    return g;
  }

  /* ========== BASE ==========
     Anclada abajo y saliendo del encuadre: da peso y sugiere
     que la unidad está montada en algo, no flotando. */
  const baseDisc = mesh(cyl(0.72, 0.9, 0.3, 28), matShell, root, 0, -2.75, 0);
  baseDisc.castShadow = quality.shadows;
  mesh(new THREE.TorusGeometry(0.74, 0.03, 8, 32), matSeam, root, 0, -2.58, 0)
    .rotation.x = Math.PI / 2;
  mesh(cyl(0.46, 0.58, 0.44, 24), matMatte, root, 0, -2.36, 0);
  /* Pedestal: baja mucho mas de lo que se ve. Asi el corte
     inferior nunca cae dentro del encuadre, sea cual sea la
     proporcion de la pantalla. */
  mesh(cyl(0.6, 0.6, 3.4, 20), matMatte, root, 0, -4.6, 0);

  /* Columna giratoria */
  const column = mesh(slab(0.62, 0.9, 0.62, 0.1, 0.04, 3), matShell, root, 0, -1.82, 0);
  column.castShadow = quality.shadows;
  mesh(slab(0.07, 0.5, 0.05, 0.02, 0.012), matCore, root, 0, -1.82, 0.33);

  /* ========== BRAZO ==========
     Cadena de grupos: cada junta es el padre del segmento
     siguiente, igual que en un brazo real. Cambiar una
     rotación reposa todo lo que cuelga por debajo. */
  const j1 = joint(root, 0.34, 0.66);
  j1.position.set(0, -1.34, 0);

  /* Sube inclinándose a la izquierda */
  const armA = new THREE.Group();
  armA.rotation.z = 0.52;
  j1.add(armA);
  segment(armA, 1.95, 0.58, 0.62);

  const j2 = joint(armA, 0.28, 0.54);
  j2.position.y = 1.95;

  /* Vuelve a la derecha: la S es lo que hace elegante la pose */
  const armB = new THREE.Group();
  armB.rotation.z = -0.88;
  j2.add(armB);
  segment(armB, 1.5, 0.5, 0.54);

  /* Muñeca */
  const j3 = joint(armB, 0.22, 0.42);
  j3.position.y = 1.5;

  /* ========== CABEZAL SENSOR ==========
     Compacto y angular. Girado hacia la izquierda: mira al
     titular, que es donde queremos que vaya la lectura. */
  const head = new THREE.Group();
  head.position.y = 0.3;
  j3.add(head);

  const housing = mesh(slab(0.92, 0.66, 0.86, 0.07, 0.035, 3), matShell, head);
  housing.castShadow = quality.shadows;

  /* Visera inclinada sobre el frente */
  const hood = mesh(slab(0.82, 0.3, 0.26, 0.04, 0.025), matPlate, head, 0, 0.3, 0.3);
  hood.rotation.x = -0.42;

  /* Hueco oscuro + cristal: el rehundido es lo que da
     profundidad; sin él la lente se ve impresa. */
  mesh(slab(0.7, 0.44, 0.16, 0.05, 0.025), matMatte, head, 0, -0.02, 0.4);
  mesh(slab(0.64, 0.38, 0.08, 0.04, 0.02), matGlass, head, 0, -0.02, 0.5).renderOrder = 1;

  /* Lente: anillo emisivo + núcleo. Un anillo lee como óptica
     de instrumento; una franja horizontal leería como ojo. */
  const lensRing = mesh(new THREE.TorusGeometry(0.15, 0.028, 12, 32), matOptic, head, 0, -0.02, 0.52);
  mesh(cyl(0.075, 0.075, 0.04, 24), matOptic, head, 0, -0.02, 0.53).rotation.x = Math.PI / 2;

  /* Halo aditivo. Sustituye al post-proceso de bloom, que
     exigiría archivos extra de three/addons. */
  const glowTex = track(radialTexture([
    [0, 'rgba(170,240,255,0.98)'],
    [0.26, 'rgba(63,198,245,0.34)'],
    [1, 'rgba(36,64,255,0)']
  ]));
  const glowMat = track(new THREE.SpriteMaterial({
    map: glowTex, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, opacity: 0
  }));
  const opticGlow = new THREE.Sprite(glowMat);
  opticGlow.scale.set(1.5, 1.5, 1);
  opticGlow.position.set(0, -0.02, 0.6);
  head.add(opticGlow);

  /* Detalle lateral del cabezal */
  for (const side of [-1, 1]) {
    const panel = mesh(slab(0.72, 0.5, 0.06, 0.04, 0.02), matPlate, head, side * 0.47, 0, 0);
    panel.rotation.y = side * Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const v = mesh(slab(0.26, 0.04, 0.04, 0.015, 0.01), matMatte, head,
        side * 0.51, 0.16 - i * 0.1, -0.16);
      v.rotation.y = side * Math.PI / 2;
    }
  }

  /* Antena corta hacia atrás: rompe la simetría del cabezal. */
  const ant = mesh(cyl(0.022, 0.032, 0.46, 10), matPlate, head, 0.18, 0.26, -0.42);
  ant.rotation.x = 0.5;
  ant.rotation.z = -0.2;
  mesh(new THREE.SphereGeometry(0.045, 12, 10), matCore, head, 0.28, 0.44, -0.58);

  /* ========== CONDUCTO ==========
     Un cable siguiendo el brazo. Es el detalle que más vende
     que la pieza es una máquina y no una figura. */
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -2.3, 0.34),
    new THREE.Vector3(0.16, -1.5, 0.42),
    new THREE.Vector3(-0.42, -0.6, 0.46),
    new THREE.Vector3(-0.92, 0.35, 0.4),
    new THREE.Vector3(-0.72, 1.1, 0.34),
    new THREE.Vector3(-0.3, 1.62, 0.3)
  ]);
  mesh(new THREE.TubeGeometry(path, 48, 0.055, 8, false), matMatte, root);

  return { root, head, opticGlow, emissives, disposables };
}

/* ============================================================
   Partículas
   ============================================================ */
function buildParticles(count) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 14;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 0.5;
    seed[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const tex = radialTexture([
    [0, 'rgba(225,248,255,1)'],
    [0.3, 'rgba(110,205,250,0.55)'],
    [1, 'rgba(36,64,255,0)']
  ], 64);

  const mat = new THREE.PointsMaterial({
    size: 0.085,
    map: tex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    color: new THREE.Color(0xbfe9ff)
  });

  return { points: new THREE.Points(geo, mat), geo, mat, seed, base: pos.slice(0) };
}

/* ============================================================
   Escena
   ============================================================ */
export function createHeroScene(canvas, opts = {}) {
  const quality = {
    shadows: opts.shadows !== false,
    particles: opts.particles ?? 340,
    maxDpr: opts.maxDpr ?? 2
  };

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  if (quality.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const scene = new THREE.Scene();
  /* La niebla integra al robot: los hombros se disuelven en el
     mismo #05070f del fondo del hero. */
  scene.fog = new THREE.FogExp2(C.bg, 0.086);

  const envMap = buildEnvironment(renderer);
  scene.environment = envMap;

  /* Lente larga: menos deformación, lectura de render de producto. */
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.1, 9.4);

  /* ---------- Robot ---------- */
  const robot = buildRobot(quality);
  const pivot = new THREE.Group();   // encuadre (responsive)
  const sway  = new THREE.Group();   // vida: respiración y giro
  sway.add(robot.root);
  pivot.add(sway);
  scene.add(pivot);

  /* Tres cuartos marcado: domina el plano lateral, que es el
     que lleva las líneas de panel y el disco sensor. */
  /* La unidad va ligeramente girada para que se vean a la vez
     el frente del cabezal y el costado de los segmentos. */
  const REST_Y = -0.34;
  /* El cabezal mira hacia la izquierda: hacia el titular. */
  const HEAD_Y = -0.62;
  robot.root.rotation.y = REST_Y;
  robot.head.rotation.y = HEAD_Y;
  robot.head.rotation.x = 0.16;

  /* ---------- Suelo ---------- */
  let ground = null;
  if (quality.shadows) {
    const gGeo = new THREE.PlaneGeometry(30, 30);
    const gMat = new THREE.MeshStandardMaterial({
      color: 0x070b13, metalness: 0.6, roughness: 0.72, envMapIntensity: 0.5
    });
    ground = new THREE.Mesh(gGeo, gMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.35;
    ground.receiveShadow = true;
    pivot.add(ground);
  }

  /* ---------- Luces ----------
     Poca ambiental y mucho contraste: el entorno reflejado ya
     rellena las sombras, así que las luces directas se usan
     sólo para dibujar. */
  scene.add(new THREE.AmbientLight(0x2c4260, 0.35));

  /* Clave: blanco frío desde el frente-izquierda, el lado del
     texto. Modela la frente, el peto y la tapa del hombro. */
  const key = new THREE.DirectionalLight(C.white, 3.1);
  key.position.set(-3.4, 3.6, 5.4);
  if (quality.shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 24;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.bias = -0.0021;
    key.shadow.normalBias = 0.024;
  }
  scene.add(key);

  /* Contraluz cian desde atrás-derecha. Separa la silueta del
     fondo: es la luz que hace la foto. */
  const rim = new THREE.DirectionalLight(C.sky, 5.2);
  rim.position.set(6.0, 2.2, -3.6);
  scene.add(rim);

  /* Relleno frontal: levanta las caras que miran a camara, que
     sin esto quedaban en silueta y aplanaban el brazo. */
  const fill = new THREE.DirectionalLight(0xbfd6ff, 0.85);
  fill.position.set(1.2, 0.6, 6.0);
  scene.add(fill);

  /* Segundo contraluz, frío y bajo, por el lado del texto. */
  const rim2 = new THREE.DirectionalLight(0x9ec7ff, 1.6);
  rim2.position.set(-5.2, -1.2, -2.6);
  scene.add(rim2);

  /* Rebote inferior: sólo levanta las sombras. A intensidad
     alta el azul saturado tine el torso y lo vuelve plastico,
     asi que va desaturado y flojo. */
  const bounce = new THREE.PointLight(0x3a5bd0, 5.5, 14, 2);
  bounce.position.set(-3.0, -2.4, 2.4);
  scene.add(bounce);

  /* Luz ambiental dinámica: orbita muy lento y hace viajar el
     reflejo especular por los cantos biselados. */
  const drift = new THREE.PointLight(C.mint, 5, 11, 2);
  drift.position.set(2.4, 1.4, 2.6);
  scene.add(drift);

  /* ---------- Partículas ---------- */
  const dust = buildParticles(quality.particles);
  scene.add(dust.points);

  /* ---------- Encuadre responsive ----------
     En escritorio el robot se corre a la derecha para dejar
     limpia la columna de texto. Al apilarse sube, se aleja y
     se reduce para no invadir el titular. */
  let layout = 'wide';
  function frame(w, h) {
    const aspect = w / h;
    /* El busto mide ~3.6 unidades de alto. A fov 28 y z 9.2 el
       encuadre son ~4.6 unidades, asi que a escala 1 ocuparia
       el 78% del alto y se saldria por arriba y por abajo.
       Se deja en torno al 55% para que respire. */
    if (aspect >= 1.15) {
      layout = 'wide';
      pivot.position.set(2.28, -0.62, 0);
      pivot.scale.setScalar(0.6);
      camera.fov = 28; camera.position.z = 9.2;
    } else if (aspect >= 0.85) {
      layout = 'mid';
      pivot.position.set(1.15, 0.95, -0.4);
      pivot.scale.setScalar(0.46);
      camera.fov = 30; camera.position.z = 10.2;
    } else {
      /* Movil: el robot ocupa solo la banda superior, por
         encima del titular. */
      layout = 'tall';
      pivot.position.set(0.88, 1.95, -0.8);
      pivot.scale.setScalar(0.4);
      camera.fov = 33; camera.position.z = 11.0;
    }
    camera.updateProjectionMatrix();
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(r.width, 1), h = Math.max(r.height, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    frame(w, h);
  }

  /* ---------- Parallax ---------- */
  const pointer = { x: 0, y: 0 };
  const eased   = { x: 0, y: 0 };
  let scrollN = 0;

  const onPointer = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  const onLeave = () => { pointer.x = 0; pointer.y = 0; };
  const onScroll = () => {
    const r = canvas.getBoundingClientRect();
    scrollN = clamp01(-r.top / Math.max(r.height, 1));
  };

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerout', onLeave, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Timeline de entrada ----------
     2.8s a propósito. Una entrada rápida se lee como efecto;
     una lenta se lee como cámara. */
  const IN = 2800;
  let t0 = 0, raf = null, running = false, last = 0;

  function render(now) {
    raf = requestAnimationFrame(render);
    if (!t0) t0 = now;
    const el = now - t0;
    const dt = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    const t = now * 0.001;

    /* --- Entrada --- */
    const pIn = clamp01(el / IN);
    const e = easeOutExpo(pIn);

    robot.root.position.z = lerp(-4.8, 0, e);
    robot.root.position.y = lerp(-0.5, 0, easeOutCubic(pIn));
    /* Gira hasta su reposo: entra más de perfil y se abre. */
    robot.root.rotation.y = lerp(REST_Y - 0.5, REST_Y, e);
    sway.scale.setScalar(lerp(0.93, 1, e));

    /* Encendido de la óptica: dos destellos y se estabiliza.
       Arranca al 36% de la entrada, cuando el robot ya está en
       cuadro — encenderse antes lo delataría como efecto. */
    const pLight = clamp01((el - IN * 0.36) / (IN * 0.6));
    let lit = smooth(pLight);
    if (pLight > 0.05 && pLight < 0.44) {
      lit *= 0.42 + 0.58 * Math.abs(Math.sin(pLight * 21));
    }
    const breathe = 1 + Math.sin(t * 1.1) * 0.07;
    robot.emissives.optic.emissiveIntensity = lit * 7.5 * breathe;
    robot.emissives.seam.emissiveIntensity  = lit * 2.6;
    robot.emissives.core.emissiveIntensity  = lit * 2.0 * (1 + Math.sin(t * 0.85 + 1.2) * 0.15);
    robot.opticGlow.material.opacity = lit * 0.9 * breathe;

    dust.mat.opacity = easeOutCubic(clamp01((el - 500) / 2400)) * 0.75;

    /* --- Vida en reposo ---
       Amplitudes mínimas y periodos largos: respira sin llamar
       la atención. */
    sway.rotation.y = Math.sin(t * 0.19) * 0.045;
    sway.rotation.x = Math.sin(t * 0.16 + 1.1) * 0.02;
    sway.position.y = Math.sin(t * 0.36) * 0.03;
    robot.head.rotation.y = HEAD_Y + Math.sin(t * 0.12 + 0.6) * 0.06;
    robot.head.rotation.z = Math.sin(t * 0.1) * 0.015;
    robot.head.rotation.x = 0.16 + Math.sin(t * 0.14 + 2.2) * 0.012;

    /* --- Luz ambiental dinámica --- */
    drift.position.x = Math.cos(t * 0.18) * 3.6;
    drift.position.z = 2.2 + Math.sin(t * 0.18) * 2.4;
    drift.position.y = 1.1 + Math.sin(t * 0.13) * 1.4;
    drift.intensity  = 4.6 + Math.sin(t * 0.29) * 1.6;
    rim.intensity    = 5.2 + Math.sin(t * 0.22 + 2) * 0.7;

    /* --- Partículas --- */
    const arr = dust.geo.attributes.position.array;
    for (let i = 0; i < dust.seed.length; i++) {
      const i3 = i * 3, s = dust.seed[i];
      arr[i3]     = dust.base[i3]     + Math.sin(t * 0.13 + s) * 0.45;
      arr[i3 + 1] = dust.base[i3 + 1] + Math.cos(t * 0.09 + s * 1.3) * 0.36
                    + ((t * 0.05 + s * 0.6) % 6) - 3;
      arr[i3 + 2] = dust.base[i3 + 2] + Math.sin(t * 0.11 + s * 0.8) * 0.32;
    }
    dust.geo.attributes.position.needsUpdate = true;
    dust.points.rotation.y = t * 0.01;

    /* --- Parallax de cámara ---
       Muy amortiguado para que la cámara "pese". */
    eased.x = damp(eased.x, pointer.x, 1.5, dt);
    eased.y = damp(eased.y, pointer.y, 1.5, dt);
    const range = layout === 'wide' ? 0.4 : 0.18;
    camera.position.x = eased.x * range;
    camera.position.y = 0.1 - eased.y * range * 0.5 - scrollN * 0.6;
    camera.lookAt(pivot.position.x * 0.38, pivot.position.y * 0.26 - scrollN * 0.35, 0);

    renderer.render(scene, camera);
  }

  /* ---------- Ciclo de vida ---------- */
  function start() {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(render);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  /* Sólo dibuja mientras el hero está en pantalla. */
  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden) start();
      else stop();
    }, { threshold: 0.01 });
    io.observe(canvas);
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize, { passive: true });

  resize();
  onScroll();
  start();

  /* ---------- Liberación ---------- */
  function dispose() {
    stop();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('pointerout', onLeave);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    if (io) io.disconnect();

    for (const d of robot.disposables) d.dispose?.();
    dust.geo.dispose();
    dust.mat.map?.dispose();
    dust.mat.dispose();
    if (ground) { ground.geometry.dispose(); ground.material.dispose(); }
    envMap.dispose();
    scene.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isSprite) {
        o.geometry?.dispose?.();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose?.());
        else m?.dispose?.();
      }
    });
    renderer.dispose();
  }

  return { dispose, start, stop, renderer, scene };
}
