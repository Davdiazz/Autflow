/* ============================================================
   AutFlow — Mano robótica 3D · arranque diferido
   ------------------------------------------------------------
   Carga Three.js solo si el dispositivo puede con ello. Mientras
   tanto (y si algo falla) se mantiene el brazo SVG como fallback.
   ============================================================ */

const host = document.getElementById('hand3d');
const visual = document.querySelector('.hero-visual');

/** ¿Hay WebGL? Comprobación barata antes de descargar Three.js. */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

/* Sin 3D (no hay WebGL o falla la carga): se muestra el dibujo SVG */
const fallback = () => {
  if (!visual) return;
  visual.classList.remove('has-3d');
  visual.classList.add('no-3d');
};

if (!host || !visual || !hasWebGL()) {
  fallback();
} else {
  const boot = async () => {
    try {
      const { initRobotHand } = await import('./index.js');
      /* El encuadre se adapta solo al tamaño del marco (ver CONFIG.fitMargin) */
      await initRobotHand(host);
      visual.classList.add('has-3d');
    } catch (err) {
      fallback();
      console.warn('[autflow] mano 3D no disponible, se mantiene el SVG:', err && err.message);
    }
  };

  /* Arrancamos cuando el navegador tiene un hueco, sin bloquear el hero */
  if ('requestIdleCallback' in window) {
    requestIdleCallback(boot, { timeout: 250 });
  } else {
    setTimeout(boot, 50);
  }
}
