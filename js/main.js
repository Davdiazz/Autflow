/* ============================================================
   AutFlow — main.js
   Motor de animación + cotizador
   ------------------------------------------------------------
   Todo lo editable está en CONFIG (justo abajo).
   ============================================================ */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     CONFIG — edita aquí precios, teléfono y supuestos de ROI
     --------------------------------------------------------- */
  const CONFIG = {
    whatsapp: '573249192451',

    // Mensaje base para convertir la conversación en diagnóstico, no en un "hola" vacío.
    whatsappText: 'Hola AutFlow, quiero revisar un proceso de mi negocio. El problema que quiero resolver es: ',

    // Rangos de precio por puntaje de complejidad (COP)
    tiers: [
      { max: 8,       name: 'Solución puntual',     min: 700000,  top: 1300000 },
      { max: 16,      name: 'Solución integrada',   min: 1300000, top: 2500000 },
      { max: Infinity,name: 'Solución a medida',    min: 2500000, top: 4500000, plus: true }
    ],

    // Supuestos para el cálculo de retorno
    costoHora: 20000,   // COP que le cuesta a la empresa una hora de trabajo manual
    eficiencia: 0.8     // % del tiempo que la automatización realmente elimina
  };

  /* --------------------------- utils --------------------------- */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const html = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp  = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp   = (a, b, t) => a + (b - a) * t;

  const onScroll = (fn) => {
    let tick = false;
    const run = () => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(() => { fn(); tick = false; });
    };
    window.addEventListener('scroll', run, { passive: true });
    window.addEventListener('resize', run, { passive: true });
    run();
    return run;
  };

  const fmtCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');

  /* ============================================================
     1. Intro
     ============================================================ */
  (() => {
    const intro = $('.intro');
    if (!intro) return;
    const close = () => {
      intro.classList.add('is-done');
      html.classList.add('intro-done');
      setTimeout(() => intro.remove(), 800);
    };
    if (reduce) { close(); return; }
    window.addEventListener('load', () => setTimeout(close, 320));
    setTimeout(close, 1900); // red de seguridad
  })();

  /* ============================================================
     2. Cursor magnético
     ============================================================ */
  (() => {
    if (!fine || reduce) return;
    const dot  = $('.cursor');
    const ring = $('.cursor-ring');
    if (!dot || !ring) return;

    html.classList.add('has-cursor');
    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my;
    let magnet = null;

    addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    addEventListener('mouseleave', () => html.classList.add('cur-hide'));
    addEventListener('mouseenter', () => html.classList.remove('cur-hide'));

    const tick = () => {
      rx = lerp(rx, mx, 0.17);
      ry = lerp(ry, my, 0.17);
      let dx = mx, dy = my;

      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        rx = lerp(rx, cx, 0.22);
        ry = lerp(ry, cy, 0.22);
        const pull = 0.32;
        magnet.style.transform = `translate(${(mx - cx) * pull}px, ${(my - cy) * pull}px)`;
      }
      dot.style.transform  = `translate3d(${dx}px,${dy}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const HOVER = 'a,button,.copt,.faq-q,.pill,.card,.mq-item,input,label';
    document.addEventListener('mouseover', (e) => {
      const h = e.target.closest(HOVER);
      html.classList.toggle('cur-hover', !!h);
      const v = e.target.closest('[data-cursor]');
      if (v) {
        $('.cur-label', ring).textContent = v.dataset.cursor;
        html.classList.add('cur-view');
      } else {
        html.classList.remove('cur-view');
      }
      const m = e.target.closest('[data-magnet]');
      if (m !== magnet) {
        if (magnet) magnet.style.transform = '';
        magnet = m;
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget) { html.classList.remove('cur-hover', 'cur-view'); }
    });
  })();

  /* ============================================================
     3. Canvas de red neuronal (hero)
     ============================================================ */
  (() => {
    const cv = $('#neural');
    if (!cv || reduce) return;
    const ctx = cv.getContext('2d', { alpha: true });
    if (!ctx) return;

    let W = 0, H = 0, dpr = 1, nodes = [], edges = [], pulses = [], raf = null, visible = true;
    const pointer = { x: -9999, y: -9999, active: false };

    const build = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width  = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const area = W * H;
      const count = clamp(Math.round(area / 15500), 26, 84);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.5 + 1,
        ox: 0, oy: 0,
        hue: Math.random()
      }));
      edges = [];
      pulses = [];
    };

    const LINK = () => Math.min(W, H) * 0.19 + 60;

    const step = () => {
      ctx.clearRect(0, 0, W, H);
      const linkD = LINK();

      // mover
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -40) n.x = W + 40; if (n.x > W + 40) n.x = -40;
        if (n.y < -40) n.y = H + 40; if (n.y > H + 40) n.y = -40;

        // repulsión suave del puntero
        if (pointer.active) {
          const dx = n.x - pointer.x, dy = n.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          const R = 150;
          if (d2 < R * R && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / R) * 16;
            n.ox = lerp(n.ox, (dx / d) * f, 0.1);
            n.oy = lerp(n.oy, (dy / d) * f, 0.1);
          } else { n.ox = lerp(n.ox, 0, 0.07); n.oy = lerp(n.oy, 0, 0.07); }
        } else { n.ox = lerp(n.ox, 0, 0.07); n.oy = lerp(n.oy, 0, 0.07); }
      }

      // aristas
      edges.length = 0;
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i], ax = a.x + a.ox, ay = a.y + a.oy;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], bx = b.x + b.ox, by = b.y + b.oy;
          const dx = ax - bx, dy = ay - by;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < linkD) {
            const t = 1 - d / linkD;
            ctx.strokeStyle = `rgba(99,170,255,${t * 0.22})`;
            ctx.beginPath();
            ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
            if (t > 0.45) edges.push([ax, ay, bx, by]);
          }
        }
      }

      // nodos
      for (const n of nodes) {
        const x = n.x + n.ox, y = n.y + n.oy;
        const near = pointer.active && Math.hypot(x - pointer.x, y - pointer.y) < 150;
        ctx.beginPath();
        ctx.arc(x, y, n.r * (near ? 2.1 : 1), 0, Math.PI * 2);
        ctx.fillStyle = near
          ? 'rgba(143,243,206,.95)'
          : (n.hue > 0.66 ? 'rgba(143,243,206,.55)' : n.hue > 0.33 ? 'rgba(63,198,245,.5)' : 'rgba(120,150,255,.45)');
        ctx.fill();
      }

      // paquetes viajando por las conexiones
      if (edges.length && pulses.length < 9 && Math.random() < 0.06) {
        const e = edges[(Math.random() * edges.length) | 0];
        pulses.push({ e, t: 0, sp: 0.007 + Math.random() * 0.011 });
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.sp;
        if (p.t >= 1) { pulses.splice(i, 1); continue; }
        const [x1, y1, x2, y2] = p.e;
        const x = lerp(x1, x2, p.t), y = lerp(y1, y2, p.t);
        const fade = Math.sin(p.t * Math.PI);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, `rgba(143,243,206,${0.85 * fade})`);
        g.addColorStop(1, 'rgba(143,243,206,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      }

      raf = requestAnimationFrame(step);
    };

    const start = () => { if (!raf) raf = requestAnimationFrame(step); };
    const stop  = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };

    build(); start();

    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 220); }, { passive: true });

    if (fine) {
      const host = cv.parentElement;
      host.addEventListener('pointermove', (e) => {
        const r = cv.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.active = true;
      }, { passive: true });
      host.addEventListener('pointerleave', () => { pointer.active = false; });
    }

    // pausar cuando el hero sale de pantalla (batería en móvil)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        visible ? start() : stop();
      }, { threshold: 0 }).observe(cv);
    }
    document.addEventListener('visibilitychange', () => {
      document.hidden ? stop() : (visible && start());
    });
  })();

  /* ============================================================
     4. Barra de progreso de lectura
     ============================================================ */
  (() => {
    const bar = $('.progress i');
    if (!bar) return;
    onScroll(() => {
      const max = document.body.scrollHeight - innerHeight;
      bar.style.width = (max > 0 ? clamp(scrollY / max, 0, 1) * 100 : 0) + '%';
    });
  })();

  /* ============================================================
     5. Header, menú y tono
     ============================================================ */
  (() => {
    const hdr = $('.hdr');
    const burger = $('.burger');
    const drawer = $('.drawer');
    if (!hdr) return;

    let last = scrollY;
    onScroll(() => {
      const y = scrollY;
      hdr.classList.toggle('scrolled', y > 24);
      const open = drawer && drawer.classList.contains('open');
      if (!open && y > last && y > 160) hdr.classList.add('hide');
      else hdr.classList.remove('hide');
      last = y;
    });

    if (burger && drawer) {
      const toggle = (force) => {
        const open = force !== undefined ? force : !drawer.classList.contains('open');
        drawer.classList.toggle('open', open);
        burger.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('is-locked', open);
      };
      burger.addEventListener('click', () => toggle());
      $$('a', drawer).forEach((a) => a.addEventListener('click', () => toggle(false)));
      addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
    }

    // Tono del header y del cursor según la sección visible
    const toned = $$('[data-tone]');
    if (toned.length) {
      const probe = () => {
        const y = (hdr.offsetHeight || 70) + 12;
        let tone = 'dark';
        for (const s of toned) {
          const r = s.getBoundingClientRect();
          if (r.top <= y && r.bottom > y) tone = s.dataset.tone;
        }
        hdr.classList.toggle('on-light', tone === 'light');
        html.dataset.cursorTone = tone;
      };
      onScroll(probe);
    }

    // Link activo
    const secs = $$('section[id]');
    const links = $$('.nav-links a[href^="#"]');
    if (secs.length && links.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((ents) => {
        ents.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((l) => l.classList.toggle('on', l.getAttribute('href') === '#' + en.target.id));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach((s) => io.observe(s));
    }
  })();

  /* ============================================================
     6. Reveals + texto por palabras
     Barrido en rAF y no IntersectionObserver: con un scroll muy rápido
     (o un salto por ancla) el observer puede no llegar a ver el elemento
     y el contenido se quedaría invisible para siempre.
     ============================================================ */
  const sweeps = [];
  const runSweeps = () => { for (let i = sweeps.length - 1; i >= 0; i--) if (sweeps[i]()) sweeps.splice(i, 1); };
  onScroll(runSweeps);
  addEventListener('load', runSweeps);

  /** Revela `els` cuando su borde superior cruza `ratio` de la ventana. */
  const revealOnScroll = (els, ratio, onHit) => {
    let pending = els.slice();
    const sweep = () => {
      if (!pending.length) return true;
      const limit = innerHeight * ratio;
      pending = pending.filter((el) => {
        if (el.getBoundingClientRect().top >= limit) return true;
        onHit(el);
        return false;
      });
      return pending.length === 0;
    };
    sweeps.push(sweep);
    sweep();
  };

  (() => {
    // Partir titulares en palabras animables.
    // Recorre el DOM real (no el string de innerHTML) para que las etiquetas
    // inline como <span class="grad-text"> no queden partidas a la mitad.
    const wrapWords = (root, counter) => {
      Array.from(root.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).filter(Boolean).forEach((part) => {
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement('span');
            span.className = 'wd';
            span.style.setProperty('--i', counter.i++);
            span.textContent = part;
            frag.appendChild(span);
          });
          root.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          wrapWords(node, counter);
        }
      });
    };

    $$('[data-split]').forEach((el) => {
      const lineHtmls = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = lineHtmls.map(() => '<span class="ln"></span>').join('');
      const lnEls = $$('.ln', el);
      const counter = { i: 0 };
      lineHtmls.forEach((html, idx) => { lnEls[idx].innerHTML = html; });
      lnEls.forEach((ln) => wrapWords(ln, counter));
      el.classList.add('split');
    });

    const targets = $$('.rv, .stagger, [data-split], .head, .stmt');
    revealOnScroll(targets, 0.94, (el) => el.classList.add('is-in'));
  })();

  /* ============================================================
     7. Contadores
     ============================================================ */
  (() => {
    const els = $$('[data-count]');
    if (!els.length) return;
    const fmt = (v, dec) => v.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });

    const run = (el) => {
      const to = parseFloat(el.dataset.count);
      const dec = (el.dataset.dec | 0);
      if (reduce) { el.textContent = fmt(to, dec); return; }
      const dur = 1500, t0 = performance.now();
      const tick = (now) => {
        const p = clamp((now - t0) / dur, 0, 1);
        el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)), dec);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = fmt(to, dec);
      };
      requestAnimationFrame(tick);
    };
    revealOnScroll(els, 0.88, run);
  })();

  /* ============================================================
     8. Tilt 3D + brillo que sigue al puntero
     ============================================================ */
  (() => {
    if (!fine || reduce) return;
    $$('.card-glow').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }, { passive: true });
    });
    $$('.tilt').forEach((c) => {
      const max = parseFloat(c.dataset.tilt || 7);
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(900px) rotateX(${-py * max}deg) rotateY(${px * max}deg) translateY(-6px)`;
      }, { passive: true });
      c.addEventListener('pointerleave', () => { c.style.transform = ''; });
    });
  })();

  /* ============================================================
     9. Palabra rotatoria
     ============================================================ */
  (() => {
    const rot = $('.rotor');
    if (!rot) return;
    const items = $$('span', rot);
    if (items.length < 2) return;
    items[0].classList.add('on');
    if (reduce) return;
    let i = 0;
    setInterval(() => {
      items[i].classList.remove('on');
      items[i].classList.add('out');
      const prev = items[i];
      setTimeout(() => prev.classList.remove('out'), 700);
      i = (i + 1) % items.length;
      items[i].classList.add('on');
    }, 2300);
  })();

  /* ============================================================
     11. Proceso — scroll-telling
     ============================================================ */
  (() => {
    const steps = $$('.pstep');
    const stage = $('.proc-stage');
    if (!steps.length || !stage) return;

    const badgeN = $('.pb-n', stage);
    const badgeT = $('.pb-t', stage);
    $$('.proc-edge', stage).forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 300;
      p.style.setProperty('--len', Math.ceil(len));
    });

    const setActive = (idx) => {
      steps.forEach((s, i) => s.classList.toggle('on', i === idx));
      $$('.proc-node', stage).forEach((n) => {
        const g = +n.dataset.step;
        n.classList.toggle('on', g <= idx);
        n.classList.toggle('dim', g > idx);
      });
      $$('.proc-edge', stage).forEach((e) => {
        e.classList.toggle('on', +e.dataset.step <= idx);
      });
      if (badgeN) badgeN.textContent = String(idx + 1).padStart(2, '0');
      if (badgeT) badgeT.textContent = steps[idx].dataset.title || '';
    };

    let last = -1;
    setActive(0);

    // El paso activo es el más cercano a la línea del 42% de la ventana.
    onScroll(() => {
      const line = innerHeight * 0.42;
      let best = 0, bestD = Infinity;
      steps.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - line);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best !== last) { last = best; setActive(best); }
    });
  })();

  /* ============================================================
     12. Parallax
     ============================================================ */
  (() => {
    const els = $$('[data-par]');
    if (!els.length || reduce) return;
    onScroll(() => {
      const vh = innerHeight;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        const amt = parseFloat(el.dataset.par);
        el.style.setProperty('--py', `${(-p * amt).toFixed(2)}px`);
      });
    });
  })();

  /* ============================================================
     13. FAQ
     ============================================================ */
  $$('.faq-i').forEach((item) => {
    const q = $('.faq-q', item);
    if (!q) return;
    q.addEventListener('click', () => {
      const open = item.classList.contains('open');
      $$('.faq-i.open').forEach((o) => {
        o.classList.remove('open');
        $('.faq-q', o).setAttribute('aria-expanded', 'false');
      });
      if (!open) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ============================================================
     14. Flotantes
     ============================================================ */
  (() => {
    const top = $('.to-top');
    const wa  = $('.wa-float');
    onScroll(() => {
      const on = scrollY > 700;
      if (top) top.classList.toggle('on', on);
      if (wa)  wa.classList.toggle('on', on);
    });
    if (top) top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  })();

  /* ============================================================
     15. Marquee — duplica el contenido para bucle continuo
     ============================================================ */
  $$('.marq-track').forEach((t) => {
    const inner = t.firstElementChild;
    if (inner) t.appendChild(inner.cloneNode(true));
  });

  /* ============================================================
     16. Año
     ============================================================ */
  $$('[data-year]').forEach((e) => { e.textContent = new Date().getFullYear(); });

  /* ============================================================
     17. COTIZADOR
     ============================================================ */
  (() => {
    const form = $('#calc');
    if (!form) return;

    const STEPS  = $$('.cstep', form).filter((s) => s.dataset.step !== 'result');
    const TOTAL  = STEPS.length;
    const resEl  = $('.cstep[data-step="result"]', form);
    const ringFg = $('.rfg', form);
    const ringTx = $('.ring b', form);
    const topTtl = $('#calcTitle');
    const topSub = $('#calcSub');
    const btnBack = $('#calcBack');
    const btnNext = $('#calcNext');
    const btnReset = $('#calcReset');

    // Panel lateral
    const liveBar   = $('#liveBar');
    const livePrice = $('#livePrice');
    const liveHint  = $('#liveHint');
    const liveHours = $('#liveHours');
    const liveMoney = $('#liveMoney');
    const livePay   = $('#livePay');
    const liveRows  = $('#liveRows');

    // Resultado
    const resTier  = $('#resTier');
    const resPrice = $('#resPrice');
    const resSum   = $('#resSum');
    const resWa    = $('#resWa');

    const state = { points: {}, labels: {}, vals: {} };
    let current = 1, category = null;

    /* ---- helpers ---- */
    const stepEl = (n) => $(`.cstep[data-step="${n}"]`, form);

    const groupsOf = (n) => {
      const el = stepEl(n);
      if (!el) return [];
      if (el.dataset.adaptive !== undefined) {
        const v = $('.cvariant.on', el);
        return v ? $$('.copts', v) : [];
      }
      return $$('.copts', el);
    };

    const stepValid = (n) => {
      const g = groupsOf(n);
      return g.length > 0 && g.every((x) => $('.copt.sel', x));
    };

    const totalPoints = () => Object.values(state.points).reduce((a, b) => a + b, 0);

    const tierFor = (p) => CONFIG.tiers.find((t) => p <= t.max) || CONFIG.tiers[CONFIG.tiers.length - 1];

    const priceText = (t) => t.plus
      ? fmtCOP(t.min) + '+'
      : fmtCOP(t.min) + ' – ' + fmtCOP(t.top);

    /* ---- ROI ---- */
    const VOL  = { v1: 5, v2: 30, v3: 125, v4: 600, v5: 1500 };
    const TIME = { t1: 3, t2: 10, t3: 22, t4: 45, t5: 90 };

    const roi = () => {
      const v = VOL[state.vals.volumen];
      const t = TIME[state.vals.tiempo];
      if (!v || !t) return null;
      const horas = (v * t / 60) * CONFIG.eficiencia;
      const plata = horas * CONFIG.costoHora;
      const tier  = tierFor(totalPoints());
      const inv   = tier.plus ? tier.min : (tier.min + tier.top) / 2;
      const meses = plata > 0 ? inv / plata : null;
      return { horas, plata, meses };
    };

    /* ---- panel en vivo ---- */
    const answered = () => Object.keys(state.points).length;

    const refreshLive = () => {
      const done = answered();
      const pct = clamp(done / (TOTAL + 1), 0.08, 1);
      if (liveBar) liveBar.style.width = (pct * 100) + '%';

      const t = tierFor(totalPoints());
      if (livePrice) {
        livePrice.textContent = done >= 3 ? priceText(t) : '—';
        livePrice.classList.toggle('idle', done < 3);
        livePrice.classList.toggle('grad', done >= 3);
      }
      if (liveHint) {
        liveHint.textContent = done >= 3
          ? t.name + ' · se ajusta con cada respuesta'
          : 'Responde 3 preguntas para ver tu rango';
      }

      const r = roi();
      if (liveHours) liveHours.textContent = r ? Math.round(r.horas).toLocaleString('es-CO') + ' h' : '—';
      if (liveMoney) liveMoney.textContent = r ? fmtCOP(r.plata) : '—';
      if (livePay) {
        livePay.textContent = r && r.meses
          ? (r.meses < 1 ? 'Menos de 1 mes' : Math.ceil(r.meses) + (Math.ceil(r.meses) === 1 ? ' mes' : ' meses'))
          : '—';
      }

      if (liveRows) {
        $$('.live-row', liveRows).forEach((row) => {
          const f = row.dataset.for;
          const has = state.labels[f] !== undefined;
          row.classList.toggle('done', has);
          const v = $('.lr-v', row);
          if (v) v.textContent = has ? state.labels[f] : '';
        });
      }
    };

    /* ---- navegación ---- */
    const show = (n) => {
      $$('.cstep', form).forEach((s) => s.classList.toggle('on', s.dataset.step === String(n)));
      const isRes = n === 'result';
      btnNext.classList.toggle('hid', isRes);
      btnBack.classList.toggle('hid', !isRes && Number(n) === 1);
      btnBack.textContent = isRes ? 'Cambiar respuestas' : 'Atrás';

      const pct = isRes ? 1 : Number(n) / TOTAL;
      if (ringFg) ringFg.style.strokeDashoffset = String(126 - 126 * pct);
      if (ringTx) ringTx.textContent = isRes ? '✓' : Number(n);
      if (topTtl) topTtl.textContent = isRes ? 'Tu estimado está listo' : `Paso ${n} de ${TOTAL}`;
      if (topSub) topSub.textContent = isRes
        ? 'Basado en las respuestas que diste'
        : (stepEl(n)?.dataset.sub || 'Toma menos de 2 minutos');

      if (!isRes) btnNext.disabled = !stepValid(n);
      btnNext.textContent = (!isRes && Number(n) === TOTAL) ? 'Ver mi estimado' : 'Siguiente';
      refreshLive();
    };

    const buildResult = () => {
      const p = totalPoints();
      const t = tierFor(p);
      if (resTier) resTier.textContent = t.name;

      if (resPrice) {
        // contador animado hasta el precio mínimo
        const target = t.min;
        if (reduce) { resPrice.textContent = priceText(t); }
        else {
          const t0 = performance.now(), dur = 1100;
          const tick = (now) => {
            const q = clamp((now - t0) / dur, 0, 1);
            const e = 1 - Math.pow(1 - q, 3);
            resPrice.textContent = q < 1 ? fmtCOP(target * e) : priceText(t);
            if (q < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      }

      const r = roi();
      const rows = [
        ['Proceso', state.labels.category || '—'],
        ['Volumen', state.labels.volumen || '—'],
        ['Sistemas', state.labels.sistemas || '—'],
        ['Frecuencia', state.labels.frecuencia || '—']
      ];
      if (r) {
        rows.push(['Horas liberadas / mes', Math.round(r.horas).toLocaleString('es-CO') + ' h']);
        rows.push(['Se paga solo en', r.meses < 1 ? 'menos de 1 mes' : Math.ceil(r.meses) + ' meses']);
      }
      if (resSum) {
        resSum.innerHTML = rows.map(([k, v]) =>
          `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
      }

      if (resWa) {
        const lines = [
          'Hola AutFlow, completé el cotizador.',
          `Proceso: ${state.labels.category || '—'}`,
          `Volumen: ${state.labels.volumen || '—'}`,
          `Sistemas: ${state.labels.sistemas || '—'}`,
          `Estimado: ${t.name} (${priceText(t)})`
        ];
        if (r) lines.push(`Horas liberadas al mes: ~${Math.round(r.horas)}`);
        lines.push('Quiero agendar la llamada de 20 minutos.');
        resWa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
      }
    };

    /* ---- selección ---- */
    form.addEventListener('click', (e) => {
      const opt = e.target.closest('.copt');
      if (!opt) return;
      const grp = opt.closest('.copts');
      if (!grp) return;

      $$('.copt', grp).forEach((o) => { o.classList.remove('sel'); o.setAttribute('aria-pressed', 'false'); });
      opt.classList.add('sel');
      opt.setAttribute('aria-pressed', 'true');

      const field = grp.dataset.field;
      state.points[field] = Number(opt.dataset.points || 0);
      state.vals[field]   = opt.dataset.value;
      const clone = opt.cloneNode(true);
      const ce = $('.ce', clone); if (ce) ce.remove();
      state.labels[field] = clone.textContent.trim();

      if (field === 'category') {
        const changed = category !== null && category !== opt.dataset.value;
        category = opt.dataset.value;
        $$('.cvariant', form).forEach((v) => v.classList.toggle('on', v.dataset.category === category));
        if (changed) {
          $$('.cvariant .copts[data-field]', form).forEach((g) => {
            const f = g.dataset.field;
            delete state.points[f]; delete state.labels[f]; delete state.vals[f];
            $$('.copt.sel', g).forEach((o) => o.classList.remove('sel'));
          });
        }
      }

      btnNext.disabled = !stepValid(current);
      refreshLive();

      // avance automático en pasos de una sola pregunta
      const single = groupsOf(current).length === 1;
      if (single && stepValid(current) && Number(current) < TOTAL && !reduce) {
        setTimeout(() => { if (stepValid(current)) btnNext.click(); }, 330);
      }
    });

    btnNext.addEventListener('click', () => {
      if (!stepValid(current)) return;
      if (Number(current) === TOTAL) {
        buildResult();
        current = 'result';
        show(current);
        resEl?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
        return;
      }
      current = Number(current) + 1;
      show(current);
    });

    btnBack.addEventListener('click', () => {
      if (current === 'result') { current = TOTAL; show(current); return; }
      if (Number(current) <= 1) return;
      current = Number(current) - 1;
      show(current);
    });

    btnReset.addEventListener('click', () => {
      $$('.copt.sel', form).forEach((o) => o.classList.remove('sel'));
      $$('.cvariant', form).forEach((v) => v.classList.remove('on'));
      state.points = {}; state.labels = {}; state.vals = {};
      category = null; current = 1;
      show(1);
    });

    form.addEventListener('submit', (e) => e.preventDefault());
    show(1);
  })();

  /* ============================================================
     99. Conversión: contexto en WhatsApp
     ------------------------------------------------------------
     Evita conversaciones sin contexto. El mensaje se puede
     enriquecer desde CTAs que lleven data-wa-topic.
     ============================================================ */
  (() => {
    const base = `https://wa.me/${CONFIG.whatsapp}`;
    $$('a[href*="wa.me/"]').forEach((a) => {
      const topic = a.dataset.waTopic;
      if (!topic) return;
      const text = `Hola AutFlow, quiero hablar sobre ${topic}. Mi principal problema es: `;
      a.href = `${base}?text=${encodeURIComponent(text)}`;
    });
  })();

})();
