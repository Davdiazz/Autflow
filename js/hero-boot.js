/* ============================================================
   AutFlow — Arranque de la escena del hero
   ------------------------------------------------------------
   Decide si la escena 3D debe existir y sólo entonces descarga
   three.js. Si no procede, el hero se queda con su fondo
   estático en CSS, que ya es una composición terminada.
   ============================================================ */

(() => {
  const mount = document.querySelector('#heroScene');
  const hero  = document.querySelector('.hero');
  if (!mount || !hero) return;

  /* ---------- ¿Procede cargar? ---------- */
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function hasWebGL() {
    try {
      const cv = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (cv.getContext('webgl2') || cv.getContext('webgl')));
    } catch { return false; }
  }

  function shouldLoad() {
    if (motionQuery.matches) return false;
    if (navigator.connection?.saveData) return false;
    if (!hasWebGL()) return false;
    /* Equipos muy modestos: la escena costaría más de lo que aporta. */
    if ((navigator.deviceMemory ?? 8) < 2) return false;
    if ((navigator.hardwareConcurrency ?? 8) < 3) return false;
    return true;
  }

  /* ---------- Presupuesto según dispositivo ---------- */
  function quality() {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.innerWidth < 860;
    const light  = (navigator.deviceMemory ?? 8) < 4;

    if (narrow || light) {
      /* Sin sombras y menos polvo: en pantallas pequeñas el mapa
         de sombras no se aprecia y cuesta un pase completo. */
      return { shadows: false, particles: 190, maxDpr: coarse ? 1.6 : 2 };
    }
    return { shadows: true, particles: 420, maxDpr: 2 };
  }

  /* ---------- Montaje ---------- */
  let instance = null;
  let booted = false;

  async function boot() {
    if (booted || !shouldLoad()) return;
    booted = true;
    try {
      const { createHeroScene } = await import('./hero-scene.js');
      instance = createHeroScene(mount, quality());
      /* Esta clase funde el fondo estático y revela el canvas:
         mientras tanto el hero nunca se ve vacío. */
      hero.classList.add('hero-3d-on');
    } catch (err) {
      console.warn('[hero] escena no disponible, se mantiene el fondo estático', err);
      hero.classList.remove('hero-3d-on');
    }
  }

  /* Se descarga después del primer render: el titular y los CTA
     no esperan a three.js en ningún caso. */
  function schedule() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(boot, { timeout: 1400 });
    } else {
      setTimeout(boot, 220);
    }
  }

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });

  /* Si el usuario activa "reducir movimiento" en caliente, se
     desmonta y se libera la GPU. */
  const onMotionChange = () => {
    if (motionQuery.matches && instance) {
      instance.dispose();
      instance = null;
      hero.classList.remove('hero-3d-on');
    }
  };
  motionQuery.addEventListener?.('change', onMotionChange);
})();
