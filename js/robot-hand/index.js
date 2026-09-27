/* ============================================================
   AutFlow — Mano robótica 3D · escena WebGL
   ------------------------------------------------------------
   Three.js + GSAP. Fondo transparente: la mano se integra sobre
   el hero existente, sin rectángulos ni cajas.

   ▸ Brazo construido con geometría real (ver hand-model.js).
   ▸ Coreografía en timeline.js.
   ============================================================ */

import * as THREE from 'three';
import { buildRobotHand, createMaterials } from './hand-model.js';
import { createHandTimeline } from './timeline.js';

/* ============================================================
   CONFIG — todo lo ajustable vive aquí
   ============================================================ */
export const CONFIG = {
  /* VELOCIDAD — 1 = normal. 1.4 = más rápido, 0.7 = más lento */
  speed: 1,

  /* Pausa quieto al final de cada ciclo, antes de volver a saludar (s) */
  restPause: 1.2,

  /* ENCUADRE AUTOMÁTICO — la cámara se aleja lo justo para que el
     brazo quepa COMPLETO en su marco (.arm-frame), sea cual sea su
     proporción. El TAMAÑO en pantalla lo decide el CSS del marco.
     fitMargin: aire alrededor del brazo (1 = pegado a los bordes).
     viewDir:   desde dónde mira la cámara (x derecha, y arriba, z frente). */
  fitMargin: 1.08,
  viewDir: [0.16, 0.0, 1],     // cámara a media altura: el brazo gana presencia
  fov: 30,

  /* POSICIÓN del modelo (unidades del modelo, 1 ≈ 1 cm) */
  handPosition: [-4.5, 0, 0],
  handRotation: [0.04, -0.30, 0],   // [x, y, z] rad · z inclina el antebrazo a la derecha

  /* Reacción al ratón (radianes) — muy sutil, 2-4° */
  parallax: { y: 0.058, x: 0.036, ease: 0.055 },

  /* Extras ambientales */
  particles: 0,          // el hero ya tiene su red de partículas de fondo
  exposure: 0.95
};

const DEG = Math.PI / 180;

/* ============================================================
   Capacidades del dispositivo
   ============================================================ */
function detectTier() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return null;

  const mem = navigator.deviceMemory || navigator.hardwareConcurrency || 4;
  const narrow = window.matchMedia('(max-width:680px)').matches;
  const coarse = window.matchMedia('(hover:none)').matches;

  if (narrow || (coarse && mem <= 4)) return 'low';
  if (window.innerWidth < 1100 || mem <= 4) return 'mid';
  return 'high';
}

/* ============================================================
   Entorno de estudio para reflejos (PMREM) — oscuro + rim cian
   ============================================================ */
function studioEnvironment(renderer) {
  const envScene = new THREE.Scene();

  const panel = (hexColor, intensity, w, h, pos, rot) => {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    mat.color.setHex(hexColor).multiplyScalar(intensity);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    envScene.add(m);
    return m;
  };

  /* Sala muy oscura: el metal queda contrastado, no lavado */
  const roomMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  roomMat.color.setHex(0x0a0f18).multiplyScalar(1.0);
  envScene.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), roomMat));

  /* Estudio neutro: softbox cenital, recorte lateral y relleno frontal.
     Sin paneles de color, así el marfil se ve marfil y no azulado. */
  panel(0xffffff, 3.6, 16, 12, [-10, 12, 8], [-0.9, -0.5, 0]);   // softbox principal
  panel(0xeef1f6, 1.6, 6, 20, [13, 2, -6], [0, -2.1, 0]);        // tira de recorte
  panel(0xd8dde6, 0.8, 14, 14, [-12, -4, -8], [0, 1.1, 0]);      // rebote tenue
  panel(0xf2f2ee, 1.0, 18, 10, [0, -2, 16], [0, 0, 0]);          // relleno frontal

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(envScene, 0.035);
  pmrem.dispose();
  envScene.traverse((o) => {
    if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
  });
  return target.texture;
}

/* ============================================================
   Luces cinematográficas (key / rim / fill)
   ============================================================ */
function addLights(scene, tier) {
  const key = new THREE.DirectionalLight(0xfff8ee, 2.8);
  key.position.set(7, 11, 8);
  if (tier === 'high') {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const c = key.shadow.camera;
    c.left = -16; c.right = 16; c.top = 22; c.bottom = -26; c.near = 1; c.far = 80;
    key.shadow.bias = -0.0015;
    key.shadow.normalBias = 0.035;
    key.shadow.radius = 3;
  }
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xdfe6f2, 1.5);
  rim.position.set(-8, 3, -9);
  scene.add(rim);

  const rim2 = new THREE.DirectionalLight(0x9fb2ff, 0.45);
  rim2.position.set(9, -3, -6);
  scene.add(rim2);

  const fill = new THREE.HemisphereLight(0x39404d, 0x07090d, 0.8);
  scene.add(fill);

  const core = new THREE.PointLight(0x2855e8, 2.5, 10, 2);
  core.position.set(0, 0.4, 3.2);
  scene.add(core);

  return { key, rim, rim2, fill, core };
}

/* ============================================================
   Textura de halo para los LEDs (glow aditivo, sin postproceso)
   ============================================================ */
function glowTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(210,222,255,1)');
  g.addColorStop(0.2, 'rgba(90,125,240,0.6)');
  g.addColorStop(0.5, 'rgba(40,85,232,0.16)');
  g.addColorStop(1, 'rgba(40,85,232,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addGlows(model, tex) {
  const mat = new THREE.SpriteMaterial({
    map: tex, color: 0xffffff, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55
  });

  /* Un único punto de luz: el sensor del cabezal (el "ojo" del brazo) */
  const spots = [
    ['ClawHub', [0, 1.15, 2.7], 1.3]
  ];

  const sprites = [];
  spots.forEach(([part, pos, scale]) => {
    const host = model.cores[part] || model.shells[part];
    if (!host) return;
    const s = new THREE.Sprite(mat.clone());
    s.position.set(pos[0], pos[1], pos[2]);
    s.scale.setScalar(scale);
    s.userData.baseScale = scale;
    host.add(s);
    sprites.push(s);
  });
  return sprites;
}

/* ============================================================
   Suelo: sombra de contacto y halo, pegados a la base del brazo
   ============================================================ */
function radialTexture(stops) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addFloor(baseShell) {
  const y = -11.5;   // apoyo de las ruedas (ver buildBase)
  const plane = (size, tex, blending, opacity) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending, opacity })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.renderOrder = -1;
    baseShell.add(m);
    return m;
  };
  plane(24, radialTexture([[0, 'rgba(0,0,0,0.7)'], [0.45, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]),
        THREE.NormalBlending, 1);

}

/* ============================================================
   Motas de polvo luminoso — profundidad, muy sutil
   ============================================================ */
function addParticles(scene, count) {
  const pos = new Float32Array(count * 3);
  const spd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 36;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    spd[i] = 0.12 + Math.random() * 0.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x9fdcff, size: 0.11, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  const points = new THREE.Points(geo, mat);
  points.userData.speeds = spd;
  points.frustumCulled = false;
  scene.add(points);
  return points;
}

/* ============================================================
   Orientación de saludo: hacia dónde debe mirar la pinza para
   quedar de frente al visitante (la cámara). Se calcula con la pose
   real, así sigue funcionando si cambias el encuadre en CONFIG.
   ============================================================ */
function computeFaceAim(model, camera) {
  const pivot = model.joints.WavePivot;
  if (!pivot || !pivot.parent) return null;
  model.root.updateMatrixWorld(true);

  const from = new THREE.Vector3();
  pivot.getWorldPosition(from);
  const dir = camera.position.clone().sub(from).normalize();

  /* Dirección expresada en el marco de la muñeca (padre del pivote) */
  const q = new THREE.Quaternion();
  pivot.parent.getWorldQuaternion(q);
  dir.applyQuaternion(q.invert());

  return {
    yaw: Math.atan2(dir.x, dir.z),
    /* 0.80: apunta un pelín por encima de la cámara → se ven las 3 garras
       abiertas en vez de mirar exactamente dentro del cabezal */
    pitch: Math.atan2(Math.hypot(dir.x, dir.z), dir.y) * 0.80
  };
}

function loadGsap() {
  if (window.gsap) return Promise.resolve(window.gsap);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'js/vendor/gsap.min.js';
    s.onload = () => resolve(window.gsap);
    s.onerror = () => reject(new Error('GSAP no disponible'));
    document.head.appendChild(s);
  });
}

/* ============================================================
   Arranque
   ============================================================ */
export async function initRobotHand(container, opts = {}) {
  Object.assign(CONFIG, opts);

  const tier = detectTier();
  if (!tier) throw new Error('WebGL no disponible');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Renderer ---------- */
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: tier !== 'low',
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = CONFIG.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (tier === 'high') {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  renderer.domElement.className = 'hand3d-canvas';
  container.appendChild(renderer.domElement);

  /* ---------- Escena y cámara ---------- */
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 1.0;

  const camera = new THREE.PerspectiveCamera(CONFIG.fov, 1, 0.5, 260);

  const lights = addLights(scene, tier);

  /* ---------- Modelo ---------- */
  const mats = createMaterials(tier);
  const model = buildRobotHand(mats, tier);
  model.source = 'procedural';
  model.emissive = [mats.led];

  model.root.position.set(...CONFIG.handPosition);
  model.root.rotation.set(...CONFIG.handRotation);
  scene.add(model.root);

  const baseRot = model.root.rotation.clone();
  const basePos = model.root.position.clone();

  /* ---------- Encuadre automático ----------
     Caja del brazo en su pose ensamblada. La cámara se coloca sobre
     CONFIG.viewDir a la distancia justa para que esa caja, ampliada
     con CONFIG.fitMargin (hueco para el desmontaje y el saludo), quepa
     entera con la proporción real del marco. Se recalcula al redimensionar. */
  model.root.updateMatrixWorld(true);
  const fitBox = new THREE.Box3().setFromObject(model.root);
  const fitCenter = fitBox.getCenter(new THREE.Vector3());
  const fitSize = fitBox.getSize(new THREE.Vector3());
  const viewDir = new THREE.Vector3(...CONFIG.viewDir).normalize();

  const fitCamera = (aspect) => {
    const m = CONFIG.fitMargin;
    const vHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const hHalf = vHalf * aspect;
    const needV = (fitSize.y * 0.5 * m) / vHalf;
    const needH = (Math.max(fitSize.x, fitSize.z) * 0.5 * m) / hHalf;
    const dist = Math.max(needV, needH) + fitSize.z * 0.5;
    camera.position.copy(fitCenter).addScaledVector(viewDir, dist);
    camera.lookAt(fitCenter);
    camera.aspect = aspect;
    camera.far = Math.max(260, dist + 120);
    camera.updateProjectionMatrix();
  };
  fitCamera((container.clientWidth || 1) / (container.clientHeight || 1));

  /* Sombras: la luz principal apunta al centro real del brazo */
  lights.key.target.position.copy(fitCenter);
  scene.add(lights.key.target);
  lights.key.position.copy(fitCenter).add(new THREE.Vector3(14, 22, 16));
  {
    const r = fitSize.length() * 0.6;
    const sc = lights.key.shadow.camera;
    sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 140;
    sc.updateProjectionMatrix();
  }

  /* Suelo: sombra de contacto + halo cian muy tenue bajo la base.
     Se añade DESPUÉS de medir la caja para no alterar el encuadre. */
  if (model.shells.Base) addFloor(model.shells.Base);

  /* ---------- LEDs y ambiente ---------- */
  const glowTex = glowTexture();
  const sprites = tier === 'low' ? [] : addGlows(model, glowTex);
  const particles = (tier === 'low' || !CONFIG.particles) ? null : addParticles(scene, CONFIG.particles);

  /* Proxy de LED: sirve igual para el modelo procedural y para un GLB */
  const ledProxy = { emissiveIntensity: 1.2 };
  const state = { float: 0, glow: 0.72, breathe: 0, moving: true };

  /* Fases de deriva por pieza (suspensión flotante) */
  const driftList = Object.keys(model.drifts).map((name, i) => ({
    node: model.drifts[name],
    ph: i * 1.37,
    sx: 0.41 + (i % 5) * 0.06,
    sy: 0.33 + (i % 7) * 0.05,
    sz: 0.29 + (i % 3) * 0.07
  }));

  /* ---------- Timeline ---------- */
  let timeline = null;
  if (!reduce) {
    try {
      const gsap = await loadGsap();
      const face = computeFaceAim(model, camera);
      timeline = createHandTimeline(gsap, model, { led: ledProxy }, state, {
        face,
        restPause: CONFIG.restPause,
        /* En móvil se salta solo el ensamblaje inicial */
        intro: tier !== 'low'
      });
      timeline.timeScale(CONFIG.speed);
      timeline.play();
    } catch (e) {
      /* Sin GSAP: se muestra la mano ensamblada y estática. */
    }
  }

  /* ---------- Resize ---------- */
  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    fitCamera(w / h);
    /* setSize borra el lienzo: redibuja aunque el brazo esté en reposo */
    renderer.render(scene, camera);
  };
  resize();

  const ro = new ResizeObserver(resize);
  ro.observe(container);

  /* ---------- Ratón: reacción mínima ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (fine && !reduce) window.addEventListener('pointermove', onPointer, { passive: true });

  /* ---------- Render loop ---------- */
  const clock = new THREE.Clock();
  let raf = 0;
  let visible = true;
  let running = false;
  let samples = 0;
  let acc = 0;
  let degraded = 0;
  let warm = 0;          // frames de calentamiento antes de medir

  const applyLed = () => {
    for (const m of model.emissive) {
      m.emissiveIntensity = ledProxy.emissiveIntensity;
    }
  };

  let stillFrames = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    /* Móvil: en reposo no se redibuja nada (batería). Dos frames extra
       para asentar la última pose tras el saludo. */
    if (tier === 'low') {
      if (state.moving) stillFrames = 0;
      else if (++stillFrames > 2) return;
    }

    /* Respiración mecánica casi imperceptible (no en móvil) */
    if (tier !== 'low') {
      model.root.position.y = basePos.y + Math.sin(t * 0.78) * 0.08;
      model.root.rotation.z = baseRot.z + Math.sin(t * 0.52) * 0.006;
    }

    /* Parallax de ratón, muy suave */
    if (fine && !reduce) {
      pointer.x += (pointer.tx - pointer.x) * CONFIG.parallax.ease;
      pointer.y += (pointer.ty - pointer.y) * CONFIG.parallax.ease;
      model.root.rotation.y = baseRot.y + pointer.x * CONFIG.parallax.y;
      model.root.rotation.x = baseRot.x - pointer.y * CONFIG.parallax.x;
    }

    /* Deriva de las piezas suspendidas */
    if (state.float > 0.001) {
      const f = state.float;
      for (const d of driftList) {
        d.node.position.set(
          Math.sin(t * d.sx + d.ph) * 0.24 * f,
          Math.sin(t * d.sy + d.ph * 1.7) * 0.28 * f,
          Math.cos(t * d.sz + d.ph) * 0.2 * f
        );
        d.node.rotation.z = Math.sin(t * d.sx * 0.7 + d.ph) * 0.03 * f;
      }
    } else if (driftList.length && driftList[0].node.position.lengthSq() > 1e-6) {
      for (const d of driftList) { d.node.position.set(0, 0, 0); d.node.rotation.z = 0; }
    }

    /* LEDs + halos */
    applyLed();
    const gl = state.glow;
    for (const s of sprites) {
      s.material.opacity = 0.05 + gl * 0.3;
      const k = s.userData.baseScale * (0.86 + gl * 0.22);
      s.scale.setScalar(k);
    }
    lights.core.intensity = 0.6 + gl * 2.4;

    /* Motas */
    if (particles) {
      const p = particles.geometry.attributes.position;
      const sp = particles.userData.speeds;
      for (let i = 0; i < sp.length; i++) {
        let y = p.array[i * 3 + 1] + sp[i] * dt;
        if (y > 18) y = -18;
        p.array[i * 3 + 1] = y;
      }
      p.needsUpdate = true;
    }

    renderer.render(scene, camera);

    /* Calidad adaptativa: si no llegamos a ~45fps, bajamos coste.
       Ignoramos los primeros frames (compilación de shaders y PMREM). */
    if (warm < 90) { warm++; return; }
    if (degraded < 2) {
      acc += dt; samples++;
      if (samples >= 90) {
        const avg = acc / samples;
        if (avg > 0.022) {
          degraded++;
          if (degraded === 1) {
            renderer.setPixelRatio(1);
            renderer.shadowMap.enabled = false;
            scene.traverse((o) => { if (o.isMesh) o.castShadow = false; });
          } else if (particles) {
            particles.visible = false;
          }
        } else {
          degraded = 2;   // rendimiento correcto: dejamos de medir
        }
        samples = 0; acc = 0;
      }
    }
  };

  const start = () => {
    if (running) return;
    running = true;
    clock.getDelta();
    raf = requestAnimationFrame(frame);
    if (timeline) timeline.play();
  };
  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    if (timeline) timeline.pause();
  };

  /* Solo renderiza si está a la vista y la pestaña está activa */
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !document.hidden) start(); else stop();
  }, { threshold: 0.01 });
  io.observe(container);

  const onVisibility = () => {
    if (document.hidden) stop(); else if (visible) start();
  };
  document.addEventListener('visibilitychange', onVisibility);

  if (reduce) {
    /* Reduced motion: una sola imagen, mano ensamblada y LEDs encendidos */
    ledProxy.emissiveIntensity = 1.4;
    state.glow = 0.8;
    applyLed();
    for (const s of sprites) s.material.opacity = 0.35;
    lights.core.intensity = 2.5;
    renderer.render(scene, camera);
  } else {
    start();
  }

  const api = {
    renderer, scene, camera, model, timeline, CONFIG, state, tier,
    source: model.source,
    setSpeed(v) { CONFIG.speed = v; if (timeline) timeline.timeScale(v); },
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      if (timeline) timeline.kill();
      scene.traverse((o) => {
        if (o.isMesh || o.isPoints) {
          o.geometry?.dispose();
          const mm = Array.isArray(o.material) ? o.material : [o.material];
          mm.forEach((m) => m?.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    }
  };

  window.__autflowHand = api;
  return api;
}

export default initRobotHand;
