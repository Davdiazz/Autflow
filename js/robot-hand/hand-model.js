/* ============================================================
   AutFlow — Brazo robótico industrial 3D · constructor
   ------------------------------------------------------------
   Geometría REAL (WebGL/Three.js), diseño propio. Brazo completo
   sobre base pesada rodante, con PINZA DE 3 GARRAS como efector
   final (no una mano humanoide).

   RobotArm
    ├── Base        (chasis + ruedas + columna)
    ├── Shoulder    (torreta de giro)
    ├── UpperArm
    ├── Elbow
    ├── Forearm
    ├── Wrist
    ├── ClawHub     (cabezal de la pinza)
    ├── ClawA → ClawA_01 → ClawA_02
    ├── ClawB → ClawB_01 → ClawB_02
    └── ClawC → ClawC_01 → ClawC_02

   Cada nodo articulado ("joint") lleva un hijo "<nombre>_shell" con
   la malla. El joint ROTA (apertura de garras, giro de muñeca) y el
   shell se TRASLADA (exploded view), así la explosión no se acumula
   por la cadena y la articulación sí se propaga.

   Unidades: 1 ≈ 1 cm.
   ============================================================ */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------------------------------------------------------
   Materiales PBR
   --------------------------------------------------------- */
export function createMaterials(tier = 'high') {
  const hi = tier !== 'low';

  /* Dirección de arte: brazo industrial pintado en marfil (carcasas),
     mecanismo en grafito, acero mecanizado en ejes y tornillería, goma
     en las garras y UN solo acento azul pequeño (LED de estado).
     Nada de brillos de colores: el volumen lo da la luz, no el neón. */
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xe9e7e1, metalness: 0.05, roughness: 0.42,
    clearcoat: hi ? 0.55 : 0, clearcoatRoughness: 0.32,
    envMapIntensity: 0.9
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0xa7adb6, metalness: 1, roughness: 0.32, envMapIntensity: 1.0
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xd9dde3, metalness: 1, roughness: 0.14, envMapIntensity: 1.15
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1c212b, metalness: 0.35, roughness: 0.7, envMapIntensity: 0.7
  });
  /* Antes latón: ahora aluminio anodizado grafito (sin segundo acento) */
  const brass = new THREE.MeshStandardMaterial({
    color: 0x323946, metalness: 0.85, roughness: 0.34, envMapIntensity: 1.0
  });
  const led = new THREE.MeshStandardMaterial({
    color: 0x0b1433, metalness: 0.1, roughness: 0.4,
    emissive: new THREE.Color(0x2855e8), emissiveIntensity: 0.9
  });

  return { shell, steel, chrome, dark, brass, led };
}

/* ---------------------------------------------------------
   Utilidades de geometría
   --------------------------------------------------------- */
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function T(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  const sc = Array.isArray(s) ? V(s[0], s[1], s[2]) : V(s, s, s);
  return new THREE.Matrix4().compose(
    V(px, py, pz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    sc
  );
}

function segMatrix(from, to) {
  const dir = V().subVectors(to, from);
  const len = Math.max(dir.length(), 1e-5);
  const mid = V().addVectors(from, to).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  return { m: new THREE.Matrix4().compose(mid, q, V(1, 1, 1)), len };
}

const plate = (w, h, d, r = 0.18, seg = 1) => new RoundedBoxGeometry(w, h, d, seg, r);
const cyl = (rt, rb, h, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, seg);
const hex = (r, h) => new THREE.CylinderGeometry(r, r * 0.94, h, 6);
const ring = (r, t, seg = 22, rad = 8) => new THREE.TorusGeometry(r, t, rad, seg);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

/** Acumula geometrías por material y las fusiona: pocas draw calls. */
class Builder {
  constructor() { this.byMat = new Map(); }

  add(matKey, geo, matrix) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    ['uv', 'uv1', 'uv2', 'uv3'].forEach((a) => g.deleteAttribute(a));
    if (matrix) g.applyMatrix4(matrix);
    if (!this.byMat.has(matKey)) this.byMat.set(matKey, []);
    this.byMat.get(matKey).push(g);
    return this;
  }

  addCable(matKey, points, radius = 0.13, seg = 16, rad = 6) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => V(p[0], p[1], p[2])));
    return this.add(matKey, new THREE.TubeGeometry(curve, seg, radius, rad, false));
  }

  addBolt(from, dir = 'z', r = 0.26, matKey = 'steel') {
    const rot = dir === 'z' ? [Math.PI / 2, 0, 0] : dir === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0];
    this.add(matKey, hex(r, 0.18), T(from[0], from[1], from[2], rot[0], rot[1], rot[2]));
    this.add('dark', cyl(r * 1.45, r * 1.45, 0.07, 10), T(from[0], from[1], from[2], rot[0], rot[1], rot[2]));
    return this;
  }

  /**
   * Capas: <name>_armor (placas exteriores) y <name>_core (mecanismo).
   * El exploded view levanta la armadura y deja el interior a la vista.
   */
  build(mats, target, opts = {}) {
    const castBig = opts.shadow !== false;
    const base = target.name || 'part';

    const drift = new THREE.Group();
    drift.name = `${base}_drift`;
    target.add(drift);

    const armor = new THREE.Group();
    armor.name = `${base}_armor`;
    const core = new THREE.Group();
    core.name = `${base}_core`;
    drift.add(core, armor);

    for (const [key, list] of this.byMat) {
      const geo = list.length === 1 ? list[0] : mergeGeometries(list);
      if (!geo) continue;
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mats[key]);
      mesh.name = `${base}__${key}`;
      mesh.castShadow = castBig && (key === 'shell' || key === 'dark');
      mesh.receiveShadow = castBig;
      (key === 'shell' || key === 'brass' ? armor : core).add(mesh);
    }

    target.userData.armor = armor;
    target.userData.core = core;
    target.userData.drift = drift;
    return target;
  }
}

/** Pistón con vástago deslizante (animable en la fase de activación). */
function createPistonUnit(mats, from, to, rBody = 0.32) {
  const a = V(from[0], from[1], from[2]);
  const b = V(to[0], to[1], to[2]);
  const dir = V().subVectors(b, a);
  const len = Math.max(dir.length(), 0.4);

  const unit = new THREE.Group();
  unit.position.copy(a);
  unit.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());

  const bodyLen = len * 0.56;
  const body = new THREE.Mesh(cyl(rBody, rBody, bodyLen, 12), mats.dark);
  body.position.y = bodyLen / 2;
  unit.add(body);

  const collar = new THREE.Mesh(cyl(rBody * 1.28, rBody * 1.28, 0.16, 12), mats.steel);
  collar.position.y = bodyLen - 0.06;
  unit.add(collar);

  const slider = new THREE.Group();
  slider.name = 'slider';
  const rodLen = len * 0.62;
  const rod = new THREE.Mesh(cyl(rBody * 0.52, rBody * 0.52, rodLen, 10), mats.chrome);
  rod.position.y = bodyLen + rodLen / 2 - 0.14;
  const tip = new THREE.Mesh(cyl(rBody * 0.78, rBody * 0.78, 0.2, 10), mats.steel);
  tip.position.y = bodyLen + rodLen - 0.14;
  slider.add(rod, tip);
  unit.add(slider);

  unit.userData.slider = slider;
  return unit;
}

/* =========================================================
   BASE — chasis pesado con ruedas y columna
   ========================================================= */
function buildBase(mats, node, opts) {
  const b = new Builder();

  /* Pie con brida ancha */
  b.add('shell', cyl(7.0, 7.8, 1.9, 24), T(0, -8.4, 0));
  b.add('steel', ring(7.3, 0.34, 28, 8), T(0, -7.5, 0, Math.PI / 2, 0, 0));
  b.add('dark', cyl(6.2, 6.2, 0.5, 24), T(0, -9.4, 0));

  /* 4 ruedas orientables */
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(a) * 6.3, pz = Math.sin(a) * 6.3;
    b.add('dark', plate(1.6, 1.5, 2.1, 0.3), T(px, -9.1, pz, 0, -a, 0));
    b.add('steel', cyl(0.5, 0.5, 1.5, 10), T(px, -9.6, pz, 0, 0, Math.PI / 2));
    b.add('dark', cyl(1.25, 1.25, 0.9, 18), T(px, -10.2, pz, 0, 0, Math.PI / 2));
    b.add('steel', ring(0.55, 0.16, 14, 6), T(px, -10.2, pz, 0, 0, Math.PI / 2));
  }

  /* Columna principal + cuerpo del chasis */
  b.add('shell', cyl(4.4, 5.6, 5.4, 24), T(0, -4.6, 0));
  b.add('shell', plate(7.6, 4.6, 6.4, 0.7, 2), T(0, -1.2, 0));
  b.add('steel', ring(4.5, 0.32, 26, 8), T(0, -7.2, 0, Math.PI / 2, 0, 0));
  b.add('brass', ring(5.7, 0.18, 28, 8), T(0, -6.4, 0, Math.PI / 2, 0, 0));

  /* Caja de control lateral (detalle industrial) */
  b.add('shell', plate(2.2, 3.0, 2.6, 0.35), T(-4.4, -1.6, 1.1));
  b.add('dark', plate(1.5, 1.9, 0.3, 0.12), T(-5.3, -1.6, 1.9, 0, 0.5, 0));
  b.add('led', plate(0.9, 0.22, 0.1, 0.05), T(-5.4, -0.7, 1.95, 0, 0.5, 0));

  /* Rejillas y paneles */
  for (let i = 0; i < 5; i++) {
    b.add('dark', box(0.28, 0.42, 4.6), T(-2.0 + i, -3.0, 0));
  }
  b.add('shell', plate(4.4, 2.6, 0.55, 0.25), T(0, -1.0, 3.35));
  b.add('dark', plate(2.4, 0.26, 0.1, 0.05), T(0, -0.1, 3.6));
  b.add('steel', plate(0.5, 3.6, 5.6, 0.2), T(3.9, -1.2, 0));
  b.add('steel', plate(0.5, 3.6, 5.6, 0.2), T(-3.9, -1.2, 0));

  /* Corona atornillada bajo la torreta */
  b.add('steel', cyl(4.0, 4.3, 0.7, 24), T(0, 1.3, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.addBolt([Math.cos(a) * 3.6, 1.7, Math.sin(a) * 3.6], 'y', 0.28, i % 2 ? 'brass' : 'steel');
  }

  /* Conductos de cable */
  b.addCable('dark', [[-1.6, 1.2, -3.0], [-3.0, -2.6, -4.4], [-1.8, -7.6, -3.6]], 0.36, 16);
  b.addCable('dark', [[1.8, 1.0, -3.1], [3.2, -3.0, -4.3], [2.0, -7.8, -3.5]], 0.32, 16);

  return b.build(mats, node, opts);
}

/* =========================================================
   TORRETA (hombro)
   ========================================================= */
function buildShoulder(mats, node, opts) {
  const b = new Builder();

  b.add('shell', cyl(3.7, 4.1, 3.1, 22), T(0, 0.7, 0));
  b.add('steel', ring(3.9, 0.36, 26, 8), T(0, -0.8, 0, Math.PI / 2, 0, 0));
  b.add('dark', ring(3.95, 0.14, 30, 8), T(0, 1.2, 0, Math.PI / 2, 0, 0));

  /* Mejillas de pivote del brazo */
  [-1, 1].forEach((sx) => {
    b.add('shell', plate(1.0, 4.6, 3.9, 0.5), T(sx * 3.1, 2.7, 0));
    b.add('steel', ring(1.35, 0.26, 20, 8), T(sx * 3.65, 3.6, 0, 0, Math.PI / 2, 0));
    b.addBolt([sx * 3.82, 3.6, 0], 'x', 0.36, 'brass');
  });
  b.add('dark', cyl(1.1, 1.1, 7.4, 18), T(0, 3.6, 0, 0, 0, Math.PI / 2));

  /* Carcasa trasera (contrapeso / electrónica) */
  b.add('shell', plate(3.6, 2.8, 2.4, 0.4), T(0, 1.8, -3.0));
  b.add('dark', box(2.6, 0.3, 0.26), T(0, 2.6, -4.2));
  b.add('dark', box(2.6, 0.3, 0.26), T(0, 2.0, -4.2));

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    b.addBolt([Math.cos(a) * 3.3, -0.6, Math.sin(a) * 3.3], 'y', 0.26);
  }

  return b.build(mats, node, opts);
}

/* =========================================================
   SEGMENTO DE BRAZO — viga con placas, cables y actuadores
   ========================================================= */
function buildArmSegment(mats, node, opts, pistons, len, w, d, accent) {
  const b = new Builder();

  b.add('shell', plate(w, len * 0.9, d, Math.min(w, d) * 0.22, 2), T(0, len * 0.5, 0));

  [-1, 1].forEach((sx) => {
    b.add('shell', plate(0.6, len * 0.66, d * 0.7, 0.2), T(sx * (w * 0.5 + 0.1), len * 0.5, 0));
    for (let i = 0; i < 3; i++) {
      b.addBolt([sx * (w * 0.5 + 0.22), len * (0.24 + i * 0.26), 0], 'x', 0.24);
    }
  });

  b.add('shell', plate(w * 0.62, len * 0.42, 0.5, 0.22), T(0, len * 0.52, d * 0.5));
  if (accent) b.add('brass', plate(w * 0.16, len * 0.36, 0.3, 0.1), T(w * 0.22, len * 0.52, d * 0.56));

  b.add('steel', cyl(w * 0.24, w * 0.24, len * 0.94, 16), T(0, len * 0.5, -d * 0.12));
  b.add('dark', plate(0.28, len * 0.5, 0.09, 0.04), T(-w * 0.34, len * 0.5, d * 0.46));

  for (let i = 0; i < 4; i++) {
    b.add('dark', box(w * 0.5, 0.3, 0.26), T(0, len * (0.2 + i * 0.2), -d * 0.52));
  }

  b.addCable('dark', [
    [w * 0.36, len * 0.04, -d * 0.5],
    [w * 0.46, len * 0.5, -d * 0.62],
    [w * 0.32, len * 0.96, -d * 0.48]
  ], 0.22, 16);

  [-1, 1].forEach((sx) => {
    const p = createPistonUnit(mats, [sx * w * 0.42, len * 0.08, -d * 0.36], [sx * w * 0.42, len * 0.62, -d * 0.26], 0.34);
    node.add(p);
    pistons.push(p);
  });

  return b.build(mats, node, opts);
}

/* =========================================================
   ARTICULACIÓN CILÍNDRICA (codo)
   ========================================================= */
function buildKnuckleJoint(mats, node, opts, r, width) {
  const b = new Builder();

  b.add('dark', cyl(r, r, width, 20), T(0, 0, 0, 0, 0, Math.PI / 2));
  [-1, 1].forEach((sx) => {
    b.add('shell', cyl(r * 1.04, r * 1.04, 0.5, 20), T(sx * width * 0.5, 0, 0, 0, 0, Math.PI / 2));
    b.add('steel', ring(r * 0.72, 0.2, 22, 8), T(sx * (width * 0.5 + 0.25), 0, 0, 0, Math.PI / 2, 0));
    b.addBolt([sx * (width * 0.5 + 0.4), 0, 0], 'x', 0.32, 'brass');
  });
  b.add('steel', ring(r * 0.46, 0.11, 24, 8), T(width * 0.5 + 0.3, 0, 0, 0, Math.PI / 2, 0));
  b.add('steel', plate(width * 0.9, r * 0.9, r * 0.5, 0.18), T(0, -r * 0.85, 0));

  return b.build(mats, node, opts);
}

/* =========================================================
   MUÑECA — collar de giro entre antebrazo y pinza
   ========================================================= */
function buildWrist(mats, node, opts, pistons) {
  const b = new Builder();

  b.add('steel', ring(2.6, 0.55, 28, 10), T(0, 0, 0, Math.PI / 2, 0, 0));
  b.add('dark', cyl(2.15, 2.15, 1.8, 20), T(0, 0, 0));
  b.add('shell', plate(3.9, 1.6, 3.3, 0.4), T(0, 0.6, 0));
  b.add('led', ring(2.72, 0.11, 30, 8), T(0, -0.2, 0, Math.PI / 2, 0, 0));

  [-1.8, 1.8].forEach((x) => {
    const p = createPistonUnit(mats, [x, -1.8, -0.9], [x, 1.1, -0.7], 0.28);
    node.add(p);
    pistons.push(p);
  });

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.addBolt([Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6], 'y', 0.2, i % 2 ? 'brass' : 'steel');
  }

  return b.build(mats, node, opts);
}

/* =========================================================
   CABEZAL DE LA PINZA — donde se montan las 3 garras
   ========================================================= */
function buildClawHub(mats, node, opts) {
  const b = new Builder();

  /* Cuerpo del cabezal */
  b.add('shell', cyl(2.85, 3.3, 2.4, 22), T(0, 1.15, 0));
  b.add('steel', ring(3.35, 0.28, 26, 8), T(0, 0.2, 0, Math.PI / 2, 0, 0));
  b.add('shell', cyl(2.6, 2.85, 0.75, 22), T(0, 2.6, 0));

  /* Placa de montaje con 3 escuadras a 120° */
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const px = Math.cos(a) * 2.7, pz = Math.sin(a) * 2.7;
    b.add('steel', plate(2.0, 1.5, 1.0, 0.24), T(px, 2.7, pz, 0, -a, 0));
    b.add('dark', cyl(0.5, 0.5, 2.2, 12), T(px, 3.05, pz, Math.PI / 2, -a, 0));
    b.addBolt([px * 1.2, 2.9, pz * 1.2], 'y', 0.22, 'brass');
  }

  /* Anillo LED + sensor central (diseño propio) */
  b.add('led', ring(1.75, 0.13, 26, 8), T(0, 0.55, 0, Math.PI / 2, 0, 0));
  b.add('dark', hex(1.05, 0.5), T(0, 1.15, 2.42, Math.PI / 2, 0, 0));
  b.add('led', cyl(0.42, 0.42, 0.14, 14), T(0, 1.15, 2.6, Math.PI / 2, 0, 0));

  /* Rejillas y tornillería */
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    b.add('dark', box(0.6, 1.0, 0.24), T(Math.cos(a) * 2.62, 1.1, Math.sin(a) * 2.62, 0, -a, 0));
  }
  b.addCable('dark', [[-1.0, 0.2, -2.1], [-1.5, 1.4, -2.7], [-0.8, 2.6, -2.2]], 0.16, 12);
  b.addCable('dark', [[1.0, 0.2, -2.1], [1.55, 1.5, -2.7], [0.85, 2.6, -2.2]], 0.15, 12);

  return b.build(mats, node, opts);
}

/* =========================================================
   GARRA — 2 eslabones por garra, con pistón y punta de agarre
   ========================================================= */
function buildClawLink(mats, node, opts, { l, w, d }, index) {
  const b = new Builder();
  const distal = index === 1;

  /* Junta del eslabón (eje X local) */
  b.add('dark', cyl(w * 0.46, w * 0.46, w * 1.06, 16), T(0, 0, 0, 0, 0, Math.PI / 2));
  b.add('steel', ring(w * 0.44, 0.11, 18, 6), T(-w * 0.54, 0, 0, 0, Math.PI / 2, 0));
  b.add('steel', ring(w * 0.44, 0.11, 18, 6), T(w * 0.54, 0, 0, 0, Math.PI / 2, 0));
  b.addBolt([-w * 0.58, 0, 0], 'x', w * 0.2, 'brass');
  b.addBolt([w * 0.58, 0, 0], 'x', w * 0.2, 'brass');

  if (!distal) {
    /* Eslabón proximal: viga recta con costillas */
    b.add('shell', plate(w, l * 0.88, d, Math.min(w, d) * 0.26, 2), T(0, l * 0.5, 0));
    b.add('steel', cyl(w * 0.2, w * 0.2, l * 0.8, 12), T(0, l * 0.5, -d * 0.22));
    b.add('shell', plate(w * 0.66, l * 0.4, 0.35, 0.14), T(0, l * 0.55, d * 0.6));
    b.add('dark', plate(w * 0.2, l * 0.26, 0.08, 0.03), T(0, l * 0.5, d * 0.66));
    b.addBolt([w * 0.3, l * 0.22, d * 0.58], 'z', 0.15);
    b.addBolt([-w * 0.3, l * 0.22, d * 0.58], 'z', 0.15);
    /* Tope mecánico hacia el eslabón siguiente */
    b.add('steel', cyl(w * 0.34, w * 0.34, w * 0.9, 12), T(0, l * 0.94, 0, 0, 0, Math.PI / 2));
  } else {
    /* Eslabón distal: se afila y curva hacia dentro (pinza) */
    b.add('shell', plate(w * 0.94, l * 0.52, d * 0.92, 0.2, 2), T(0, l * 0.3, -d * 0.04));
    b.add('shell', plate(w * 0.76, l * 0.4, d * 0.74, 0.18, 2), T(0, l * 0.72, -d * 0.22, 0.55, 0, 0));
    /* Punta cónica + almohadilla de agarre */
    b.add('steel', cyl(w * 0.1, w * 0.34, l * 0.34, 14), T(0, l * 1.02, -d * 0.48, 0.55, 0, 0));
    b.add('dark', plate(w * 0.6, l * 0.3, 0.3, 0.1), T(0, l * 0.66, d * 0.16, 0.55, 0, 0));
    b.add('dark', plate(w * 0.42, l * 0.2, 0.26, 0.08), T(0, l * 0.95, -d * 0.16, 0.55, 0, 0));
    b.add('dark', plate(w * 0.16, l * 0.16, 0.07, 0.03), T(0, l * 0.34, d * 0.42));
  }

  /* Cable de control por el dorso */
  b.addCable('dark', [
    [w * 0.3, l * 0.06, -d * 0.5],
    [w * 0.36, l * 0.45, -d * 0.6],
    [w * 0.26, l * 0.8, -d * 0.42]
  ], 0.08, 10);

  return b.build(mats, node, opts);
}

/* Tabla de garras: 3 a 120°, con apertura de reposo */
const CLAWS = [
  { name: 'ClawA', angle: Math.PI / 2 },
  { name: 'ClawB', angle: Math.PI / 2 + (Math.PI * 2) / 3 },
  { name: 'ClawC', angle: Math.PI / 2 + (Math.PI * 4) / 3 }
];

/* Geometría de cada eslabón de garra */
const CLAW_SEG = [
  { l: 3.3, w: 2.25, d: 1.95 },
  { l: 2.8, w: 1.95, d: 1.75 }
];

/* ROBUSTEZ — cada pieza se engrosa sobre su propio eje local sin
   alargarse: [ancho X, alto Y, fondo Z]. En los segmentos del brazo el
   eje Y es el largo, así que solo crecen de lado y de fondo. */
export const BULK = {
  Base: [1.22, 1, 1.22],
  Shoulder: [1.28, 1, 1.28],
  UpperArm: [1.34, 1, 1.3],
  Elbow: [1.34, 1.26, 1.26],
  Forearm: [1.36, 1, 1.3],
  Wrist: [1.3, 1.12, 1.3],
  ClawHub: [1.26, 1.08, 1.26],
  Claw: [1.3, 1.06, 1.26]
};

/* Apertura en reposo (rad). Positivo = abre hacia fuera. */
export const CLAW_POSE = { open: [0.20, -0.42], closed: [-0.14, -0.02] };

/* ---------------------------------------------------------
   Ensamblado de la jerarquía
   --------------------------------------------------------- */
function makeJoint(name, parent, pos, euler) {
  const joint = new THREE.Group();
  joint.name = name;
  if (pos) joint.position.set(pos[0], pos[1], pos[2]);
  if (euler) joint.rotation.set(euler[0], euler[1], euler[2]);
  parent.add(joint);

  const shell = new THREE.Group();
  shell.name = `${name}_shell`;
  joint.add(shell);

  return { joint, shell };
}

/**
 * Construye el brazo industrial completo con pinza de 3 garras.
 * @returns {{root, joints, shells, armor, cores, drifts, pistons}}
 */
export function buildRobotHand(mats, tier = 'high') {
  const opts = { shadow: tier !== 'low' };
  const root = new THREE.Group();
  root.name = 'RobotArm';

  const joints = {};
  const shells = {};
  const armor = {};
  const cores = {};
  const drifts = {};
  const pistons = [];
  const reg = (name, j, s) => {
    const k = BULK[name] || (/^Claw[ABC]_/.test(name) ? BULK.Claw : null);
    if (k) s.scale.set(k[0], k[1], k[2]);
    joints[name] = j;
    shells[name] = s;
    if (s.userData.armor) armor[name] = s.userData.armor;
    if (s.userData.core) cores[name] = s.userData.core;
    if (s.userData.drift) drifts[name] = s.userData.drift;
  };

  /* ---------- Cadena del brazo ----------
     Los nodos se crean con su transform de mundo y luego se
     reparentan con attach(), que conserva la pose: así la muñeca
     queda vertical aunque los segmentos estén inclinados.        */
  const P_BASE = V(10.5, -31.5, -6);
  const P_SHOULDER = V(10.5, -28.0, -6);
  const P_ELBOW = V(2.5, -16.5, -4);
  const P_WRIST = V(0, -4.5, 0);

  const aim = (from, to) =>
    new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V().subVectors(to, from).normalize());
  const dist = (from, to) => V().subVectors(to, from).length();

  const worldJoint = (name, pos, quat) => {
    const joint = new THREE.Group();
    joint.name = name;
    joint.position.copy(pos);
    if (quat) joint.quaternion.copy(quat);
    root.add(joint);
    const shell = new THREE.Group();
    shell.name = `${name}_shell`;
    joint.add(shell);
    return { joint, shell };
  };

  const base = worldJoint('Base', P_BASE);
  buildBase(mats, base.shell, opts);
  reg('Base', base.joint, base.shell);

  const shoulder = worldJoint('Shoulder', P_SHOULDER);
  buildShoulder(mats, shoulder.shell, opts);
  reg('Shoulder', shoulder.joint, shoulder.shell);

  const lenUpper = dist(P_SHOULDER, P_ELBOW);
  const upper = worldJoint('UpperArm', P_SHOULDER, aim(P_SHOULDER, P_ELBOW));
  buildArmSegment(mats, upper.shell, opts, pistons, lenUpper, 5.6, 4.8, true);
  reg('UpperArm', upper.joint, upper.shell);

  const elbow = worldJoint('Elbow', P_ELBOW);
  buildKnuckleJoint(mats, elbow.shell, opts, 3.2, 5.0);
  reg('Elbow', elbow.joint, elbow.shell);

  const lenFore = dist(P_ELBOW, P_WRIST);
  const forearm = worldJoint('Forearm', P_ELBOW, aim(P_ELBOW, P_WRIST));
  buildArmSegment(mats, forearm.shell, opts, pistons, lenFore, 4.7, 4.2, false);
  reg('Forearm', forearm.joint, forearm.shell);

  const wrist = worldJoint('Wrist', P_WRIST);
  buildWrist(mats, wrist.shell, opts, pistons);
  reg('Wrist', wrist.joint, wrist.shell);

  root.updateMatrixWorld(true);
  base.joint.attach(shoulder.joint);
  shoulder.joint.attach(upper.joint);
  upper.joint.attach(elbow.joint);
  elbow.joint.attach(forearm.joint);
  forearm.joint.attach(wrist.joint);

  /* ---------- Pinza de 3 garras ----------
     WavePivot: nodo intermedio SIN malla cuya rotación en reposo es la
     identidad. Como la muñeca queda vertical, sus ejes coinciden con
     los del mundo, así que inclinarlo en Z hace que la pinza salude de
     lado a lado (girar la muñeca en Y solo la haría rotar sobre sí
     misma, que es justo lo que no se lee como saludo).               */
  const wavePivot = new THREE.Group();
  wavePivot.name = 'WavePivot';          // guiñada: vaivén derecha ↔ izquierda
  wrist.joint.add(wavePivot);
  joints.WavePivot = wavePivot;

  /* FacePivot: cabeceo que orienta la pinza hacia el usuario. Va DENTRO
     del WavePivot, así el vaivén siempre gira sobre el eje vertical
     aunque la pinza esté mirando a cámara. Se sitúa en la base del
     cabezal para que gire como una articulación real de muñeca.     */
  const facePivot = new THREE.Group();
  facePivot.name = 'FacePivot';
  facePivot.position.set(0, 1.2, 0);
  wavePivot.add(facePivot);
  joints.FacePivot = facePivot;

  const hub = makeJoint('ClawHub', facePivot, [0, 0.2, 0], null);
  buildClawHub(mats, hub.shell, opts);
  reg('ClawHub', hub.joint, hub.shell);

  CLAWS.forEach((claw) => {
    /* Grupo de guiñada: orienta la garra en su sector de 120° */
    const yaw = new THREE.Group();
    yaw.name = `${claw.name}_yaw`;
    yaw.rotation.y = claw.angle;
    hub.joint.add(yaw);

    let parent = yaw;
    let offset = [0, 3.05 * BULK.ClawHub[1], 2.7 * BULK.ClawHub[2]];   // sale del borde del cabezal
    CLAW_SEG.forEach((seg, i) => {
      const name = `${claw.name}_0${i + 1}`;
      const jn = makeJoint(name, parent, offset, [CLAW_POSE.open[i], 0, 0]);
      buildClawLink(mats, jn.shell, opts, seg, i);
      reg(name, jn.joint, jn.shell);
      parent = jn.joint;
      offset = [0, seg.l * BULK.Claw[1], 0];
    });
    joints[claw.name] = joints[`${claw.name}_01`];
  });

  return { root, joints, shells, armor, cores, drifts, pistons };
}

/** Cadenas de la pinza (para abrir/cerrar y para el exploded view). */
export const FINGER_CHAINS = {
  ClawA: ['ClawA_01', 'ClawA_02'],
  ClawB: ['ClawB_01', 'ClawB_02'],
  ClawC: ['ClawC_01', 'ClawC_02']
};
