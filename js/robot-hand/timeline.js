/* ============================================================
   AutFlow — Brazo robótico 3D · coreografía (GSAP)
   ------------------------------------------------------------
   Al entrar (escritorio): ENSAMBLAJE desde las piezas separadas +
   activación + pausa. Después, en bucle (~13 s):

     SALUDO → DESARME → piezas flotando → REARME → ACTIVACIÓN
     → pausa corta (CONFIG.restPause) ↻

   En móvil se omite solo el ensamblaje inicial; el bucle es el mismo.
   ============================================================ */

import { FINGER_CHAINS, CLAW_POSE } from './hand-model.js';

/* Duraciones base en segundos (se escalan con timeScale) */
export const PHASES = {
  wave: 3.90,        // girarse al cliente + saludo + volver
  hold: 0.60,        // respiro entre el saludo y el desarme
  explode: 1.50,     // cada pieza al separarse
  exStagger: 0.07,   // desfase entre piezas (punta → base)
  float: 1.10,       // piezas suspendidas
  assemble: 1.40,    // cada pieza al volver
  asmStagger: 0.11,  // desfase entre piezas (base → punta)
  activate: 0.90,    // LED + prueba de pinza
  pause: 0.80        // respiro antes del primer saludo
};

const FINGER_ORDER = ['ClawA', 'ClawB', 'ClawC'];

/** Posición "explotada" de cada pieza (punto de partida del ensamblaje). */
function explodeTargets(name) {
  if (name === 'Base') return { pos: [0, -2.6, -1.2], rot: [0.02, 0.06, 0], armorZ: 1.2 };
  if (name === 'Shoulder') return { pos: [1.2, -1.6, -1.2], rot: [0.05, 0.12, 0.03], armorZ: 1.0 };
  if (name === 'UpperArm') return { pos: [-1.4, -1.8, -1.8], rot: [0.06, -0.08, 0.05], armorZ: 1.1 };
  if (name === 'Elbow') return { pos: [-1.1, 1.3, -1.6], rot: [0.08, 0.14, 0.04], armorZ: 0.9 };
  if (name === 'Forearm') return { pos: [-1.2, 1.9, -1.5], rot: [0.07, -0.06, 0.04], armorZ: 1.0 };
  if (name === 'Wrist') return { pos: [0, 1.4, 0.8], rot: [-0.12, 0.14, 0.05], armorZ: 0.7 };
  if (name === 'ClawHub') return { pos: [0, 2.0, 0.4], rot: [0.05, 0.16, 0.02], armorZ: 0.9 };

  const [claw, idxStr] = name.split('_');
  const i = parseInt(idxStr, 10) - 1;            // 0 = proximal, 1 = punta
  const side = { ClawA: 0, ClawB: -1, ClawC: 1 }[claw] ?? 0;
  return {
    pos: [side * (0.9 + 0.7 * i), 1.0 + 1.5 * i, 1.2 + 0.9 * i],
    rot: [0.14 + 0.1 * i, side * (0.12 + 0.08 * i), side * (0.1 + 0.07 * i)],
    armorZ: 0.5 + 0.15 * i
  };
}

/** Orden de montaje: de la base hacia la punta. */
function assembleOrder(name) {
  const chain = ['Base', 'Shoulder', 'UpperArm', 'Elbow', 'Forearm', 'Wrist', 'ClawHub'];
  const k = chain.indexOf(name);
  if (k >= 0) return k;
  const [finger, idxStr] = name.split('_');
  const i = parseInt(idxStr, 10) - 1;
  return 7 + i * 3 + FINGER_ORDER.indexOf(finger);   // 7..12
}

/**
 * Crea la timeline maestra.
 *
 * @param {object} gsap   instancia global de GSAP
 * @param {object} model  { joints, shells, armor, pistons }
 * @param {object} mats   materiales (usa mats.led)
 * @param {object} state  compartido con el render loop { glow, float, moving }
 * @param {object} opts   { face, restPause, intro }
 */
export function createHandTimeline(gsap, model, mats, state, opts = {}) {
  const { joints, shells, armor, pistons } = model;
  const intro = opts.intro !== false;
  const restPause = opts.restPause ?? 1.2;

  /* ---------- Pose base (= ensamblada) ---------- */
  const parts = Object.keys(shells).map((name) => {
    const shell = shells[name];
    const arm = armor[name];
    return {
      name, shell, armor: arm,
      base: {
        pos: shell.position.clone(),
        rot: shell.rotation.clone(),
        armorZ: arm ? arm.position.z : 0
      },
      ex: explodeTargets(name),
      order: assembleOrder(name)
    };
  });
  const jointBase = {};
  Object.keys(joints).forEach((n) => { jointBase[n] = joints[n].rotation.clone(); });

  const ledBase = 0.9;
  const ledOff = 0.05;
  const each = (fn) => FINGER_ORDER.forEach((f, fi) =>
    FINGER_CHAINS[f].forEach((n, i) => joints[n] && fn(joints[n], n, i, fi)));
  const exPos = (p) => ({ x: p.base.pos.x + p.ex.pos[0], y: p.base.pos.y + p.ex.pos[1], z: p.base.pos.z + p.ex.pos[2] });
  const exRot = (p) => ({ x: p.base.rot.x + p.ex.rot[0], y: p.base.rot.y + p.ex.rot[1], z: p.base.rot.z + p.ex.rot[2] });
  const clawOpen = (n, i) => jointBase[n].x + (i === 0 ? 0.3 : -0.26);
  const span = (n) => PHASES.assemble + PHASES.asmStagger * (n - 1);

  /* ---------- Bloques reutilizables ---------- */

  /** Desmontaje: de la punta hacia la base; las piezas se separan y flotan. */
  const addExplode = (tl, t0) => {
    const last = Math.max(...parts.map((p) => p.order));
    parts.forEach((p) => {
      const at = t0 + (last - p.order) * PHASES.exStagger;
      tl.to(p.shell.position, { ...exPos(p), duration: PHASES.explode, ease: 'power2.inOut' }, at);
      tl.to(p.shell.rotation, { ...exRot(p), duration: PHASES.explode, ease: 'power2.inOut' }, at);
      if (p.armor) {
        tl.to(p.armor.position, {
          z: p.base.armorZ + p.ex.armorZ, duration: PHASES.explode * 0.8, ease: 'power2.out'
        }, at + 0.05);
      }
    });
    each((j, n, i, fi) => tl.to(j.rotation, {
      x: clawOpen(n, i), duration: PHASES.explode, ease: 'power2.inOut'
    }, t0 + fi * 0.05));
    tl.to(mats.led, { emissiveIntensity: ledOff, duration: PHASES.explode * 0.7, ease: 'power2.in' }, t0);
    tl.to(state, { glow: 0.04, duration: PHASES.explode * 0.7, ease: 'power2.in' }, t0);
    /* Deriva suave mientras están separadas */
    tl.to(state, { float: 1, duration: PHASES.explode * 0.8, ease: 'power1.out' }, t0 + 0.4);
    return t0 + PHASES.explode + PHASES.exStagger * last;
  };

  /** Ensamblaje: de la base a la punta, encaje con "clac" en las placas. */
  const addAssemble = (tl, t0) => {
    tl.to(state, { float: 0, duration: PHASES.assemble * 0.7, ease: 'power1.in' }, t0);
    parts.forEach((p) => {
      const at = t0 + p.order * PHASES.asmStagger;
      tl.to(p.shell.position, {
        x: p.base.pos.x, y: p.base.pos.y, z: p.base.pos.z,
        duration: PHASES.assemble, ease: 'power2.inOut'
      }, at);
      tl.to(p.shell.rotation, {
        x: p.base.rot.x, y: p.base.rot.y, z: p.base.rot.z,
        duration: PHASES.assemble, ease: 'power2.inOut'
      }, at);
      if (p.armor) {
        tl.to(p.armor.position, {
          z: p.base.armorZ, duration: PHASES.assemble * 0.7, ease: 'power3.out'
        }, at + PHASES.assemble * 0.3);
      }
    });
    each((j, n, i, fi) => tl.to(j.rotation, {
      x: jointBase[n].x, duration: PHASES.assemble, ease: 'power2.inOut'
    }, t0 + 7 * PHASES.asmStagger + fi * 0.06));
    return t0 + span(parts.length);
  };

  /** Activación: LED de estado, actuadores y prueba de pinza. */
  const addActivate = (tl, t0) => {
    tl.to(mats.led, { emissiveIntensity: 1.5, duration: 0.3, ease: 'power3.out' }, t0)
      .to(mats.led, { emissiveIntensity: ledBase, duration: 0.55, ease: 'power2.inOut' }, t0 + 0.32);
    tl.to(state, { glow: 0.9, duration: 0.3, ease: 'power3.out' }, t0)
      .to(state, { glow: 0.6, duration: 0.5, ease: 'power2.inOut' }, t0 + 0.34);
    pistons.forEach((p, i) => {
      tl.to(p.userData.slider.position, {
        y: 0.24, duration: 0.26, ease: 'power2.inOut', yoyo: true, repeat: 1
      }, t0 + 0.12 + i * 0.07);
    });
    each((j, n, i, fi) => tl.to(j.rotation, {
      x: CLAW_POSE.closed[i], duration: 0.34, ease: 'power2.inOut', yoyo: true, repeat: 1
    }, t0 + 0.18 + fi * 0.03));
    return t0 + PHASES.activate;
  };

  const tl = gsap.timeline({ paused: true, defaults: { overwrite: 'auto' } });
  let t = 0.6;

  /* ---------- 1. Primer ensamblaje (solo escritorio) ---------- */
  if (intro) {
    parts.forEach((p) => {
      tl.set(p.shell.position, exPos(p), 0);
      tl.set(p.shell.rotation, exRot(p), 0);
      if (p.armor) tl.set(p.armor.position, { z: p.base.armorZ + p.ex.armorZ }, 0);
    });
    each((j, n, i) => tl.set(j.rotation, { x: clawOpen(n, i) }, 0));
    tl.set(mats.led, { emissiveIntensity: ledOff }, 0);
    tl.set(state, { glow: 0.04, float: 0, moving: true }, 0);
    t = addActivate(tl, addAssemble(tl, 0.25)) + PHASES.pause;
  } else {
    mats.led.emissiveIntensity = ledBase;
    state.glow = 0.6;
  }

  /* ---------- 2. Ciclo: saludo → desarme → rearme → activación ---------- */
  const loop = gsap.timeline({ repeat: -1, repeatDelay: restPause, defaults: { overwrite: 'auto' } });
  loop.call(() => { state.moving = true; }, null, 0);
  addWave(loop, 0, { joints, jointBase, each, face: opts.face });
  let lt = PHASES.wave + PHASES.hold;
  lt = addExplode(loop, lt) + PHASES.float;
  lt = addActivate(loop, addAssemble(loop, lt));
  loop.call(() => { state.moving = false; }, null, lt + 0.15);
  tl.add(loop, t);

  tl.addLabel('wave', t);
  return tl;
}

/**
 * Saludo: la pinza se gira hacia la cámara, abre bien las garras,
 * hace un vaivén lateral con las garras moviéndose alternadas (como
 * dedos) y vuelve a la pose vertical. El gesto sale de la muñeca y la
 * torreta acompaña un poco; el resto del brazo no se mueve.
 */
function addWave(tl, t0, { joints, jointBase, each, face }) {
  const wavePivot = joints.WavePivot;
  const facePivot = joints.FacePivot;
  const shoulder = joints.Shoulder;
  const sb = jointBase.Shoulder;
  const W = PHASES.wave;

  tl.to(shoulder.rotation, { y: sb.y - 0.1, duration: 0.8, ease: 'power2.inOut' }, t0)
    .to(shoulder.rotation, { y: sb.y, duration: 0.9, ease: 'power2.inOut' }, t0 + W - 0.9);

  if (!wavePivot || !facePivot) return;
  const vb = jointBase.WavePivot;
  const fb = jointBase.FacePivot;
  const aim = face || { yaw: 0.45, pitch: 1.45 };

  /* 1. Mirar al visitante */
  tl.to(wavePivot.rotation, { y: vb.y + aim.yaw, duration: 0.7, ease: 'power2.inOut' }, t0);
  tl.to(facePivot.rotation, { x: fb.x + aim.pitch, duration: 0.7, ease: 'power2.inOut' }, t0);

  /* Garras bien abiertas */
  const OPEN = [0.74, -0.24];
  each((j, n, i, fi) => tl.to(j.rotation, {
    x: OPEN[i], duration: 0.5, ease: 'power2.out'
  }, t0 + 0.25 + fi * 0.05));

  /* 2. Vaivén lateral */
  const SWING = 0.34;
  const w0 = t0 + 0.8;
  const cy = vb.y + aim.yaw;
  tl.to(wavePivot.rotation, { y: cy + SWING, duration: 0.4, ease: 'sine.out' }, w0)
    .to(wavePivot.rotation, { y: cy - SWING, duration: 0.52, ease: 'sine.inOut' }, w0 + 0.4)
    .to(wavePivot.rotation, { y: cy + SWING * 0.85, duration: 0.52, ease: 'sine.inOut' }, w0 + 0.92)
    .to(wavePivot.rotation, { y: cy, duration: 0.46, ease: 'sine.inOut' }, w0 + 1.44);

  /* Garras alternadas: desfase de un tercio de ciclo entre garras */
  const FLUTTER = 0.3;
  each((j, n, i, fi) => tl.to(j.rotation, {
    x: i === 0 ? OPEN[0] - 0.4 : OPEN[1] - 0.34,
    duration: FLUTTER, ease: 'sine.inOut', yoyo: true, repeat: 5   // impar: acaba abierta
  }, w0 + 0.05 + fi * (FLUTTER * 2 / 3) + i * 0.05));

  /* 3. Regreso a la pose de reposo */
  const back = t0 + W - 0.8;
  tl.to(wavePivot.rotation, { y: vb.y, duration: 0.75, ease: 'power2.inOut' }, back);
  tl.to(facePivot.rotation, { x: fb.x, duration: 0.75, ease: 'power2.inOut' }, back);
  each((j, n, i, fi) => tl.to(j.rotation, {
    x: jointBase[n].x, duration: 0.6, ease: 'power2.inOut'
  }, back + 0.08 + fi * 0.03));
}
