/* ============================================================
   AutFlow — main.js
   Cabecera, apariciones, preguntas, cotizador, demostración y slides.
   ------------------------------------------------------------
   Todo lo editable está en CONFIG. Sin cursor personalizado, sin
   partículas y sin scroll artificial: cada comportamiento de este
   archivo existe porque ayuda a entender o a usar la página.
   ============================================================ */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     CONFIG — precios, teléfono y supuestos de retorno
     --------------------------------------------------------- */
  const CONFIG = {
    whatsapp: '573249192451',

    /* Rangos APROXIMADOS en dólares (USD) por puntaje de complejidad.
       Son orientativos, redondeados y pensados para un equipo pequeño:
       la cifra real se define después del diagnóstico. */
    tiers: [
      { max: 8,        name: 'Solución puntual',   min: 200, top: 450 },
      { max: 16,       name: 'Solución integrada', min: 450, top: 900 },
      { max: Infinity, name: 'Solución a medida',  min: 900, top: 1600, plus: true }
    ],

    // Supuestos para el cálculo de retorno (se muestran en la página)
    costoHora: 5,       // USD que cuesta una hora de trabajo manual
    eficiencia: 0.8     // % del tiempo que la automatización elimina
  };

  /* --------------------------- utils --------------------------- */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const html = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp  = (v, a, b) => Math.min(Math.max(v, a), b);

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
  };

  const fmtUSD = (n) => 'US$' + Math.round(n).toLocaleString('en-US');

  /* Traducción (js/i18n.js). Sin ese archivo, todo queda en español. */
  const T = (s, v) => (window.AF_I18N ? window.AF_I18N.t(s, v) : s);
  const onLang = (fn) => { if (window.AF_I18N) window.AF_I18N.onChange(fn); };

  /* ============================================================
     1. Cabecera: estado, tono según la sección y menú móvil
     ============================================================ */
  const hdr = $('.hdr');
  const drawer = $('#drawer');
  const burger = $('.burger');

  const setDrawer = (open) => {
    if (!drawer || !burger) return;
    drawer.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', T(open ? 'Cerrar menú' : 'Abrir menú'));
    document.body.classList.toggle('is-locked', open);
    if (open) $('a', drawer)?.focus();
  };

  if (hdr) {
    const toned = $$('[data-tone]');
    onScroll(() => {
      hdr.classList.toggle('scrolled', scrollY > 8);
      /* Tono de la sección que queda bajo la cabecera */
      const y = hdr.offsetHeight + 12;
      let tone = 'dark';
      for (const s of toned) {
        if (s.hidden) continue;
        const r = s.getBoundingClientRect();
        if (r.top <= y && r.bottom > y) tone = s.dataset.tone;
      }
      hdr.classList.toggle('on-light', tone === 'light');
    });
  }

  if (burger && drawer) {
    burger.addEventListener('click', () => setDrawer(drawer.hidden));
    $$('a', drawer).forEach((a) => a.addEventListener('click', () => setDrawer(false)));
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); burger.focus(); }
    });
    /* Si el menú se abre y la ventana crece a escritorio, se cierra */
    matchMedia('(min-width:1025px)').addEventListener('change', (m) => { if (m.matches) setDrawer(false); });
  }

  /* ============================================================
     2. Apariciones al hacer scroll
     Barrido en rAF en vez de IntersectionObserver: con un salto por
     ancla el observer puede no ver el elemento y dejarlo invisible.
     ============================================================ */
  const reveal = (() => {
    let pending = $$('.rv');
    const sweep = () => {
      if (!pending.length) return;
      const limit = innerHeight * 0.92;
      pending = pending.filter((el) => {
        if (el.offsetParent === null) return true;            // oculto (slide cerrada)
        if (el.getBoundingClientRect().top >= limit) return true;
        el.classList.add('is-in');
        return false;
      });
    };
    onScroll(sweep);
    addEventListener('load', sweep);
    return {
      sweep,
      /* Vuelve a preparar los elementos de un bloque (al reabrir una slide) */
      reset(root) {
        $$('.rv', root).forEach((el) => { el.classList.remove('is-in'); if (!pending.includes(el)) pending.push(el); });
        requestAnimationFrame(sweep);
      }
    };
  })();

  /* ============================================================
     3. Preguntas frecuentes
     ============================================================ */
  $$('.faq-i').forEach((item) => {
    const q = $('.faq-q', item);
    if (!q) return;
    q.addEventListener('click', () => {
      const open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });

  /* ============================================================
     4. Botón flotante de WhatsApp y año
     ============================================================ */
  (() => {
    const wa = $('.wa-float');
    const hero = $('#inicio');
    if (!wa || !hero) return;
    onScroll(() => wa.classList.toggle('on', hero.getBoundingClientRect().bottom < innerHeight * 0.4));
  })();
  $$('[data-year]').forEach((e) => { e.textContent = new Date().getFullYear(); });

  /* ============================================================
     5. COTIZADOR
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

    /* ---- vista previa del paso 1 (holder que cambia con el cursor) ---- */
    const prev = $('.cprev', form);
    const cats = $('.copts.cats', form);
    const preview = (key) => {
      if (!prev) return;
      const want = key || 'idle';
      $$('.pv', prev).forEach((pv) => pv.classList.toggle('on', pv.dataset.for === want));
      const opt = key && $(`.copt.cat[data-value="${key}"]`, form);
      $$('.copt.cat', form).forEach((o) => o.classList.toggle('pv-on', o === opt));
    };
    if (prev && cats) {
      const hoverOn = (e) => {
        const o = e.target.closest('.copt.cat');
        if (o && !o.classList.contains('pv-on')) preview(o.dataset.value);
      };
      cats.addEventListener('pointerover', hoverOn);
      cats.addEventListener('focusin', hoverOn);
      cats.addEventListener('pointerleave', () => preview(category));
      cats.addEventListener('focusout', (e) => { if (!cats.contains(e.relatedTarget)) preview(category); });
    }

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
      ? T('Desde {v}', { v: fmtUSD(t.min) })
      : fmtUSD(t.min) + ' – ' + fmtUSD(t.top);

    /* ---- ROI ---- */
    const VOL  = { v1: 5, v2: 30, v3: 125, v4: 600, v5: 1500 };
    const TIME = { t1: 3, t2: 10, t3: 22, t4: 45, t5: 90 };

    const payText = (m) => (m < 1 ? T('Menos de 1 mes')
      : T(Math.ceil(m) === 1 ? '{n} mes' : '{n} meses', { n: Math.ceil(m) }));

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
      }
      if (liveHint) {
        liveHint.textContent = done >= 3
          ? T('{name} · aproximado, se ajusta con cada respuesta', { name: T(t.name) })
          : T('Responde 3 preguntas para ver una estimación');
      }

      const r = roi();
      if (liveHours) liveHours.textContent = r ? Math.round(r.horas).toLocaleString('es-CO') + ' h' : '—';
      if (liveMoney) liveMoney.textContent = r ? '≈ ' + fmtUSD(Math.round(r.plata / 10) * 10) : '—';
      if (livePay) {
        livePay.textContent = r && r.meses
          ? payText(r.meses)
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
      btnBack.textContent = T(isRes ? 'Cambiar respuestas' : 'Atrás');

      const pct = isRes ? 1 : Number(n) / TOTAL;
      if (ringFg) ringFg.style.strokeDashoffset = String(126 - 126 * pct);
      if (ringTx) ringTx.textContent = isRes ? '✓' : Number(n);
      if (topTtl) topTtl.textContent = isRes ? T('Tu estimado está listo') : T('Paso {n} de {total}', { n, total: TOTAL });
      if (topSub) topSub.textContent = isRes
        ? T('Basado en las respuestas que diste')
        : T(stepEl(n)?.dataset.sub || 'Toma menos de 2 minutos');

      if (!isRes) btnNext.disabled = !stepValid(n);
      btnNext.textContent = T((!isRes && Number(n) === TOTAL) ? 'Ver mi estimado' : 'Siguiente');
      refreshLive();
    };

    const buildResult = () => {
      const p = totalPoints();
      const t = tierFor(p);
      if (resTier) resTier.textContent = T(t.name);

      /* Rango aproximado, sin contador: una cifra que "sube" se lee exacta */
      if (resPrice) resPrice.textContent = priceText(t);

      const r = roi();
      const rows = [
        [T('Proceso'), state.labels.category || '—'],
        [T('Volumen'), state.labels.volumen || '—'],
        [T('Sistemas'), state.labels.sistemas || '—'],
        [T('Frecuencia'), state.labels.frecuencia || '—']
      ];
      if (r) {
        rows.push([T('Horas liberadas / mes'), Math.round(r.horas).toLocaleString('es-CO') + ' h']);
        rows.push([T('Se paga solo en'), payText(r.meses)]);
      }
      if (resSum) {
        resSum.innerHTML = rows.map(([k, v]) =>
          `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
      }

      if (resWa) {
        const lines = [
          T('Hola AutFlow, completé el cotizador.'),
          `${T('Proceso')}: ${state.labels.category || '—'}`,
          `${T('Volumen')}: ${state.labels.volumen || '—'}`,
          `${T('Sistemas')}: ${state.labels.sistemas || '—'}`,
          `${T('Estimación aproximada')}: ${T(t.name)} (${priceText(t)})`
        ];
        if (r) lines.push(T('Horas liberadas al mes: ~{n}', { n: Math.round(r.horas) }));
        lines.push(T('Quiero agendar la llamada de 20 minutos.'));
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

      /* Avance automático solo con clic/toque: con teclado (detail = 0)
         el usuario decide cuándo seguir. */
      const single = groupsOf(current).length === 1;
      if (e.detail > 0 && single && stepValid(current) && Number(current) < TOTAL && !reduce) {
        const wait = field === 'category' && fine ? 700 : 350;
        const from = current;
        setTimeout(() => { if (current === from && stepValid(current)) btnNext.click(); }, wait);
      }
    });

    btnNext.addEventListener('click', () => {
      if (!stepValid(current)) return;
      if (Number(current) === TOTAL) {
        buildResult();
        current = 'result';
        show(current);
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
      preview(null);
      show(1);
    });

    form.addEventListener('submit', (e) => e.preventDefault());

    /* Cambio de idioma: las respuestas guardadas se vuelven a leer de los
       botones (ya traducidos) y se redibujan paso, panel y resultado. */
    onLang(() => {
      $$('.copts[data-field]', form).forEach((g) => {
        const sel = $('.copt.sel', g);
        if (sel) state.labels[g.dataset.field] = sel.textContent.replace(/\s+/g, ' ').trim();
      });
      if (current === 'result') buildResult();
      show(current);
    });
    show(1);
  })();


  /* ============================================================
     6. Demostración: los cuatro pasos se encienden en orden la
     primera vez que el bloque entra en pantalla. "Ver de nuevo"
     la repite. Es la única animación narrativa de la página.
     ============================================================ */
  const demo = (() => {
    const el = $('#demo');
    if (!el) return { arm() {} };
    const play = () => {
      el.classList.remove('play');
      void el.offsetWidth;
      el.classList.add('play');
    };
    $('#demoReplay')?.addEventListener('click', play);
    let armed = false;
    const check = () => {
      if (!armed || el.offsetParent === null) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.75 && r.bottom > 0) { armed = false; play(); }
    };
    onScroll(check);
    return { arm() { el.classList.remove('play'); armed = true; requestAnimationFrame(check); } };
  })();
  /* Sin slides ocultas (sin JS de slides) se arma directamente */
  demo.arm();

  /* ============================================================
     7. Slides desbloqueables
     ------------------------------------------------------------
     Soluciones, Cómo trabajamos y Preguntas empiezan ocultas. Un
     link del menú a una de ellas la abre debajo del cotizador y la
     página baja hasta ella (scroll nativo). Si el visitante vuelve
     al inicio, se cierra. Sin JavaScript son secciones normales.
     ============================================================ */
  (() => {
    const wrap = $('#slides');
    const hero = $('#inicio');
    if (!wrap || !hero) return;
    const slides = $$('.slide', wrap);
    const ids = slides.map((s) => s.id);
    let current = null;
    let auto = false;
    let autoTimer = 0;

    slides.forEach((s) => { s.hidden = true; });

    const arrow = '<svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

    /* Navegación al pie de cada slide (se rehace al cambiar de idioma) */
    const buildNav = () => slides.forEach((s, i) => {
      const next = slides[i + 1];
      $('.slide-nav', s)?.remove();
      const nav = document.createElement('nav');
      nav.className = 'slide-nav';
      nav.setAttribute('aria-label', T('Navegación entre secciones'));
      nav.innerHTML =
        (next
          ? `<a class="btn btn-primary" href="#${next.id}">${T('Siguiente: {name}', { name: T(next.dataset.title) })} ${arrow}</a>`
          : `<a class="btn btn-primary" href="#cotizador">${T('Ir al cotizador')} ${arrow}</a>`) +
        `<a class="btn btn-quiet" href="#cotizador">${T('Volver al cotizador')}</a>` +
        '<span class="slide-dots">' + slides.map((x) =>
          `<a href="#${x.id}" aria-label="${T(x.dataset.title)}"${x === s ? ' class="on" aria-current="true"' : ''}></a>`).join('') + '</span>';
      $('.wrap', s).appendChild(nav);
    });
    buildNav();
    onLang(buildNav);

    const markLinks = (id) => {
      $$('.nav-links a, .drawer a.dl').forEach((a) => {
        const on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('on', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    };

    const open = (id) => {
      const s = slides.find((x) => x.id === id);
      if (!s) return;
      if (current && current !== s) current.hidden = true;
      s.hidden = false;
      current = s;
      s.classList.remove('is-open');
      void s.offsetWidth;
      s.classList.add('is-open');
      reveal.reset(s);
      if (s.contains($('#demo'))) demo.arm();
      markLinks(id);
      history.replaceState(null, '', '#' + id);

      auto = true;
      clearTimeout(autoTimer);
      const done = () => {
        if (!auto) return;
        auto = false;
        $('h2', s)?.focus({ preventScroll: true });   // lectores de pantalla / teclado
      };
      requestAnimationFrame(() => {
        s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        if ('onscrollend' in window) addEventListener('scrollend', done, { once: true });
        autoTimer = setTimeout(done, 1400);
      });
    };

    const close = () => {
      if (!current) return;
      current.hidden = true;
      current.classList.remove('is-open');
      current = null;
      markLinks(location.hash === '#cotizador' ? 'cotizador' : null);
      history.replaceState(null, '', location.pathname + location.search);
    };

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      if (ids.includes(id)) { e.preventDefault(); open(id); }
      else if (id === 'cotizador') markLinks('cotizador');
      else if (id === 'inicio') markLinks(null);
    });

    /* De vuelta en el inicio → la slide se cierra */
    let lastY = scrollY;
    onScroll(() => {
      const y = scrollY;
      const up = y < lastY;
      lastY = y;
      if (!current || auto || !up) return;
      if (hero.getBoundingClientRect().bottom > innerHeight * 0.5) close();
    });

    /* Enlace directo (autflow.co/#preguntas) */
    const initial = location.hash.slice(1);
    if (ids.includes(initial)) addEventListener('load', () => open(initial));
  })();

  /* ============================================================
     8. WhatsApp con contexto
     Los links con data-wa-topic abren el chat con un mensaje inicial.
     ============================================================ */
  const waLinks = () => {
    const base = `https://wa.me/${CONFIG.whatsapp}`;
    $$('a[data-wa-topic]').forEach((a) => {
      const text = T('Hola AutFlow, quiero hablar sobre {topic}. Mi principal problema es: ', { topic: T(a.dataset.waTopic) });
      a.href = `${base}?text=${encodeURIComponent(text)}`;
    });
  };
  waLinks();
  onLang(waLinks);

})();
