/* ============================================================
   ORATA — animation engine v2 (GSAP + Lenis)

   The "circuit": a single SVG layer over the whole page whose
   traces are generated at runtime between real DOM anchors —
   hero chips → stats-card edge dots → every section's kicker
   dot. Because it measures the DOM, the network stays connected
   at any viewport size, and pulses travel it end to end.

   Content is fully readable with JS disabled; everything here
   only enhances. All motion is gated on prefers-reduced-motion.
   ============================================================ */

(function () {
  'use strict';

  const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = reducedMq.matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  let lenis = null;

  // If the user enables reduced motion mid-session, reload into static mode.
  try {
    reducedMq.addEventListener('change', e => { if (e.matches) location.reload(); });
  } catch (err) { /* noop */ }

  /* ---------- nav chrome (always on) ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', (window.scrollY || 0) > 12);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu (always on) ---------- */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  const mainEl = document.getElementById('main');
  const footEl = document.querySelector('.footer');
  const canInert = 'inert' in HTMLElement.prototype;
  let menuOpen = false;
  let menuTl = null;

  function setMenu(open) {
    menuOpen = open;
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
    if (canInert) { mainEl.inert = open; footEl.inert = open; }

    if (hasGSAP && !reduced) {
      if (menuTl) menuTl.kill();
      if (open) {
        menuTl = gsap.timeline()
          .set(menu, { visibility: 'visible' })
          .to(menu, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0)
          .fromTo(menu.querySelectorAll('.menu-links a'),
            { y: 34, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.55, stagger: 0.07, ease: 'power3.out' }, 0.08)
          .fromTo(menu.querySelector('.menu-foot'),
            { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
      } else {
        menuTl = gsap.timeline()
          .to(menu, { opacity: 0, duration: 0.25, ease: 'power2.in' })
          .set(menu, { visibility: 'hidden' });
      }
    } else {
      menu.style.visibility = open ? 'visible' : 'hidden';
      menu.style.opacity = open ? '1' : '0';
    }

    if (open) {
      setTimeout(() => {
        const first = menu.querySelector('a');
        if (first) first.focus({ preventScroll: true });
      }, 80);
    } else {
      burger.focus({ preventScroll: true });
    }
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { if (menuOpen) setMenu(false); }));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  const deskMq = matchMedia('(min-width: 881px)');
  try {
    deskMq.addEventListener('change', e => { if (e.matches && menuOpen) setMenu(false); });
  } catch (err) { /* noop */ }

  /* ---------- form (always on; demo handler — wire your endpoint or
                 booking link in here when going live) ---------- */
  const form = document.querySelector('.form');
  if (form) {
    const note = form.querySelector('.form-note');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.querySelector('#f-name');
      const email = form.querySelector('#f-email');
      let firstBad = null;
      [name, email].forEach(f => {
        const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
        f.classList.toggle('err', bad);
        if (bad) {
          f.setAttribute('aria-invalid', 'true');
          if (!firstBad) firstBad = f;
        } else {
          f.removeAttribute('aria-invalid');
        }
      });
      if (firstBad) {
        note.textContent = 'Add your name and a work email, and we’re away.';
        firstBad.focus();
        return;
      }
      note.textContent = 'Thanks — talk soon.';
      note.classList.add('ok');
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      const label = btn.querySelector('.btn-label');
      if (label) label.textContent = 'Talk soon';
    });
    form.querySelectorAll('input').forEach(f =>
      f.addEventListener('input', () => { f.classList.remove('err'); f.removeAttribute('aria-invalid'); }));
  }

  /* ---------- everything below is motion ---------- */
  if (!hasGSAP) return;

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  if (window.MotionPathPlugin) gsap.registerPlugin(MotionPathPlugin);

  if (reduced) return; // leave the document exactly as authored

  const fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 1800))]).then(initMotion);

  function initMotion() {

  /* ---------- smooth scroll (Lenis) ---------- */
  if (window.Lenis) {
    document.documentElement.classList.add('lenis');
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }

  // anchor links route through Lenis; keyboard focus follows the jump
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    if (a.classList.contains('skip-link')) return;
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -96, duration: 1.2 });
      else target.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', id);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ============================================================
     CIRCUIT — runtime-routed traces between DOM anchors
     ============================================================ */
  const NSVG = 'http://www.w3.org/2000/svg';
  const circuit = document.createElementNS(NSVG, 'svg');
  circuit.setAttribute('class', 'circuit');
  circuit.setAttribute('aria-hidden', 'true');
  circuit.setAttribute('focusable', 'false');
  document.body.appendChild(circuit);

  const reg = { tweens: [], triggers: [] };

  function mk(tag, attrs) {
    const el = document.createElementNS(NSVG, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // anchor: [selector, side, t?, pad?] → point + outward direction
  function anchor(spec) {
    let el = document.querySelector(spec[0]);
    if (!el) return null;
    // pinned elements get wrapped in a spacer; measure the spacer instead
    if (el.parentElement && el.parentElement.classList.contains('pin-spacer')) el = el.parentElement;
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) return null;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return null;
    const side = spec[1], t = spec[2] ?? 0.5, pad = spec[3] ?? 6;
    const x = r.left + window.scrollX, y = r.top + window.scrollY;
    switch (side) {
      case 'top':    return { x: x + r.width * t, y: y - pad, dx: 0, dy: -1 };
      case 'bottom': return { x: x + r.width * t, y: y + r.height + pad, dx: 0, dy: 1 };
      case 'left':   return { x: x - pad, y: y + r.height * t, dx: -1, dy: 0 };
      case 'right':  return { x: x + r.width + pad, y: y + r.height * t, dx: 1, dy: 0 };
    }
  }

  // orthogonal route with rounded corners between two directed anchors
  function route(a, b, opt) {
    const lead = opt.lead ?? 28;
    const p1 = { x: a.x + a.dx * lead, y: a.y + a.dy * lead };
    const p2 = { x: b.x + b.dx * lead, y: b.y + b.dy * lead };
    const pts = [{ x: a.x, y: a.y }, p1];
    const aV = a.dx === 0, bV = b.dx === 0;
    if (aV && bV) {
      const my = opt.midY ?? (p1.y + p2.y) / 2;
      pts.push({ x: p1.x, y: my }, { x: p2.x, y: my });
    } else if (aV && !bV) {
      pts.push({ x: p1.x, y: p2.y });
    } else if (!aV && bV) {
      pts.push({ x: p2.x, y: p1.y });
    } else {
      const mx = opt.midX ?? (p1.x + p2.x) / 2;
      pts.push({ x: mx, y: p1.y }, { x: mx, y: p2.y });
    }
    pts.push(p2, { x: b.x, y: b.y });
    return pts;
  }

  function roundedPath(pts, r = 16) {
    const P = [];
    pts.forEach(p => {
      const q = P[P.length - 1];
      if (!q || Math.abs(q.x - p.x) > 0.5 || Math.abs(q.y - p.y) > 0.5) P.push({ x: p.x, y: p.y });
    });
    for (let i = P.length - 2; i > 0; i--) {
      const a = P[i - 1], b = P[i], c = P[i + 1];
      if ((Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5) ||
          (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)) P.splice(i, 1);
    }
    if (P.length < 2) return '';
    let d = `M ${P[0].x.toFixed(1)} ${P[0].y.toFixed(1)}`;
    for (let i = 1; i < P.length - 1; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1];
      const lin = Math.hypot(b.x - a.x, b.y - a.y), lout = Math.hypot(c.x - b.x, c.y - b.y);
      const rr = Math.min(r, lin / 2, lout / 2);
      const ix = b.x - (b.x - a.x) / lin * rr, iy = b.y - (b.y - a.y) / lin * rr;
      const ox = b.x + (c.x - b.x) / lout * rr, oy = b.y + (c.y - b.y) / lout * rr;
      d += ` L ${ix.toFixed(1)} ${iy.toFixed(1)} Q ${b.x.toFixed(1)} ${b.y.toFixed(1)} ${ox.toFixed(1)} ${oy.toFixed(1)}`;
    }
    d += ` L ${P[P.length - 1].x.toFixed(1)} ${P[P.length - 1].y.toFixed(1)}`;
    return d;
  }

  /* The network. Hero traces draw on load; section connectors draw
     as you scroll (scrubbed); pulses travel while their span is on
     screen. minW/maxW gate connections per breakpoint. */
  const CONNS = [
    // — hero —
    { color: 'pink', edgeFrom: 'left', to: ['#chip-mega', 'left', 0.5, 6],
      draw: 'load', ball: 0.45, pulse: { dur: 6, delay: 2.2 } },
    { color: 'blue', from: ['#chip-user', 'bottom'], to: ['.ed-blue', 'left', 0.5, 5],
      draw: 'load', ball: 0.22, pulse: { dur: 5, delay: 3.2 }, minW: 921 },
    { color: 'green', from: ['#chip-folder', 'right'], to: ['.ed-green', 'top', 0.5, 5],
      draw: 'load', ball: 0.16 },
    { color: 'pink', from: ['#chip-mega', 'bottom'], to: ['#chip-doc', 'top'],
      draw: 'load', pulse: { dur: 4.5, delay: 4.6 }, minW: 921 },
    { color: 'orange', from: ['#chip-chart', 'bottom'], to: ['.ed-orange', 'right', 0.5, 5],
      draw: 'load', ball: 0.3, pulse: { dur: 5, delay: 5.6 }, minW: 921 },
    { color: 'purple', from: ['#chip-doc', 'bottom'], to: ['.ed-purple', 'right', 0.5, 5],
      draw: 'load', minW: 921 },
    // mobile: megaphone feeds the stats' right dot down the margin
    { color: 'pink', from: ['#chip-mega', 'bottom', 0.85], to: ['.ed-orange', 'right', 0.5, 5],
      draw: 'load', pulse: { dur: 5.5, delay: 3 }, maxW: 920 },

    // — section thread —
    { color: 'purple', from: ['.ed-purple', 'bottom', 0.5, 5], to: ['#kd-recog', 'top', 0.5, 7],
      draw: 'scrub', ball: 0.55, pulse: { dur: 4 } },
    { color: 'blue', from: ['#recog-turn', 'bottom', 0.12], to: ['#kd-what', 'top', 0.5, 7],
      draw: 'scrub', ball: 0.4 },
    { color: 'green', from: ['#svc-pin', 'bottom', 0.32], to: ['#kd-proof', 'top', 0.5, 7],
      draw: 'scrub', ball: 0.5, pulse: { dur: 4 } },
    { color: 'orange', from: ['#proof-card', 'bottom', 0.72], to: ['#kd-reassure', 'top', 0.5, 7],
      draw: 'scrub', ball: 0.45 },
    { color: 'lightblue', from: ['#reassure-close', 'bottom', 0.4], to: ['.pn-top', 'top', 0.5, 5],
      draw: 'scrub', ball: 0.5, pulse: { dur: 4 } },
    { color: 'purple', from: ['.pn-bottom', 'bottom', 0.5, 5], to: ['#kd-ai', 'top', 0.5, 7],
      draw: 'scrub', ball: 0.5 },
    { color: 'pink', from: ['#ask-panel', 'bottom', 0.5], to: ['#kd-talk', 'top', 0.5, 7],
      draw: 'scrub', ball: 0.5, pulse: { dur: 4 } },
    { color: 'teal', from: ['#form-card', 'bottom', 0.6], to: ['#logos-eyebrow', 'top', 0.5, 8],
      draw: 'scrub', ball: 0.5 },
  ];

  function destroyCircuit() {
    reg.tweens.forEach(t => { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); });
    reg.triggers.forEach(t => t.kill());
    reg.tweens = []; reg.triggers = [];
    circuit.innerHTML = '';
  }

  function buildCircuit() {
    destroyCircuit();
    const docW = document.documentElement.clientWidth;
    const docH = document.documentElement.scrollHeight;
    circuit.setAttribute('viewBox', `0 0 ${docW} ${docH}`);
    circuit.setAttribute('width', docW);
    circuit.setAttribute('height', docH);
    const vw = innerWidth, vh = innerHeight;
    let loadIdx = 0;

    CONNS.forEach(c => {
      if (c.minW && vw < c.minW) return;
      if (c.maxW && vw > c.maxW) return;
      const b = anchor(c.to);
      if (!b) return;
      let a;
      if (c.edgeFrom === 'left') a = { x: 0, y: b.y, dx: 1, dy: 0 };
      else a = anchor(c.from);
      if (!a) return;

      const pts = route(a, b, c);
      const d = roundedPath(pts, 16);
      if (!d) return;
      const path = mk('path', { d, class: `trace t-${c.color}` });
      circuit.appendChild(path);
      const len = path.getTotalLength();
      if (!len) return;

      if (c.ball != null) {
        const p = path.getPointAtLength(len * c.ball);
        circuit.appendChild(mk('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 6.5, class: `ball b-${c.color}` }));
      }

      const ys = pts.map(p => p.y);
      const minY = Math.min(...ys), maxY = Math.max(...ys);

      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      if (c.draw === 'load') {
        reg.tweens.push(gsap.to(path, {
          strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut',
          delay: 0.8 + (loadIdx++) * 0.13
        }));
      } else {
        reg.tweens.push(gsap.to(path, {
          strokeDashoffset: 0, ease: 'none',
          scrollTrigger: { start: minY - vh * 0.88, end: Math.max(maxY - vh * 0.42, minY - vh * 0.88 + 120), scrub: 0.6 }
        }));
      }

      if (c.pulse && window.MotionPathPlugin) {
        const dot = mk('circle', { r: 4, class: `pulse p-${c.color}` });
        circuit.appendChild(dot);
        const travel = c.pulse.dur;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, delay: c.pulse.delay ?? 1.2, paused: true });
        tl.set(dot, { opacity: 0 }, 0)
          .to(dot, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5] }, duration: travel, ease: 'none' }, 0)
          .to(dot, { opacity: 0.95, duration: 0.4, ease: 'power1.out' }, 0.05)
          .to(dot, { opacity: 0, duration: 0.4, ease: 'power1.in' }, travel - 0.4);
        reg.tweens.push(tl);
        reg.triggers.push(ScrollTrigger.create({
          start: minY - vh, end: maxY + 120,
          onToggle: s => s.isActive ? tl.play() : tl.pause()
        }));
      }
    });
    ScrollTrigger.sort();
  }

  /* ---------- services: horizontal system rail (pin first — its
     spacer changes the page height the circuit measures) ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 921px)', () => {
    const track = document.getElementById('svc-track');
    const pinEl = document.getElementById('svc-pin');
    const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    const trackTween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: pinEl, start: 'top top', end: () => '+=' + (dist() + innerHeight * 0.25),
        scrub: 0.7, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
        onToggle: s => pinEl.classList.toggle('pinned', s.isActive)
      }
    });
    gsap.utils.toArray('.svc').forEach(card => {
      gsap.from(card, {
        y: 46, opacity: 0.15, duration: 0.6, ease: 'power2.out',
        scrollTrigger: { trigger: card, containerAnimation: trackTween, start: 'left 88%', once: true }
      });
    });
  });
  mm.add('(max-width: 920px)', () => {
    gsap.utils.toArray('.svc').forEach(card => {
      gsap.from(card, {
        y: 36, opacity: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 88%', once: true }
      });
    });
  });

  /* Build the circuit BEFORE any from()-style reveal tweens exist:
     immediateRender would offset the anchors and the traces would
     land where the un-revealed elements sit, not where they settle. */
  ScrollTrigger.refresh();
  buildCircuit();

  /* ---------- hero intro ---------- */
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });

  const h1 = document.getElementById('hero-h1');
  let h1Split = null;
  if (window.SplitText) {
    h1Split = new SplitText(h1, { type: 'lines,words', linesClass: 'sl-line' });
    intro.from(h1Split.words, {
      yPercent: 115, opacity: 0, rotate: 2,
      duration: 1.05, stagger: 0.055, ease: 'power4.out'
    }, 0.15);
  } else {
    intro.from(h1, { y: 30, opacity: 0, duration: 1 }, 0.15);
  }
  intro.from('[data-hero]', { y: 26, opacity: 0, duration: 0.9, stagger: 0.14 }, 0.65);
  intro.eventCallback('onComplete', () => { if (h1Split) h1Split.revert(); });

  const chips = gsap.utils.toArray('.hero .chip');
  intro.from(chips, {
    scale: 0.6, opacity: 0, y: 14,
    duration: 0.7, stagger: 0.1, ease: 'back.out(1.7)'
  }, 0.7);

  const heroLoops = [];
  chips.forEach((chip, i) => {
    heroLoops.push(gsap.to(chip, {
      y: i % 2 ? '+=9' : '-=9',
      duration: 2.6 + i * 0.45,
      repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.7
    }));
  });
  ScrollTrigger.create({
    trigger: '.hero', start: 'top bottom', end: 'bottom+=400 top',
    onToggle: s => heroLoops.forEach(t => s.isActive ? t.play() : t.pause())
  });

  /* ---------- generic reveals ---------- */
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    gsap.from(el, {
      y: 34, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 84%', once: true }
    });
  });

  /* ---------- scrubbed word reveals ---------- */
  if (window.SplitText) {
    document.querySelectorAll('[data-words]').forEach(el => {
      const sp = new SplitText(el, { type: 'words' });
      gsap.fromTo(sp.words, { opacity: 0.14 }, {
        opacity: 1, stagger: 0.045, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'top 34%', scrub: 0.4 }
      });
    });

    /* section headline line-reveals (un-split after playing) */
    gsap.utils.toArray('h2.split-lines').forEach(h => {
      const split = new SplitText(h, { type: 'lines', linesClass: 'sl-line-inner' });
      split.lines.forEach(line => {
        const mask = document.createElement('span');
        mask.className = 'sl-line';
        line.parentNode.insertBefore(mask, line);
        mask.appendChild(line);
      });
      gsap.from(split.lines, {
        yPercent: 110, duration: 1.1, stagger: 0.09, ease: 'power4.out',
        scrollTrigger: { trigger: h, start: 'top 85%', once: true },
        onComplete: () => split.revert()
      });
    });
  }

  /* ---------- how we work: progress line + row lighting ---------- */
  gsap.fromTo('.how-progress', { scaleY: 0 }, {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.how-list', start: 'top 72%', end: 'bottom 52%', scrub: 0.5 }
  });
  document.querySelectorAll('.how-row').forEach(row => {
    ScrollTrigger.create({
      trigger: row, start: 'top 70%', once: true,
      onEnter: () => row.classList.add('lit')
    });
  });

  /* ---------- dark + footer decor draw on scroll ---------- */
  ['.how-decor', '.foot-decor'].forEach(sel => {
    const svg = document.querySelector(sel);
    if (!svg) return;
    const paths = [...svg.querySelectorAll('.trace')];
    paths.forEach(p => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    gsap.to(paths, {
      strokeDashoffset: 0, duration: 1.6, stagger: 0.2, ease: 'power2.inOut',
      scrollTrigger: { trigger: svg.closest('section, footer'), start: 'top 78%', once: true }
    });
    gsap.from(svg.querySelectorAll('.ball'), {
      scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2)', delay: 0.9,
      scrollTrigger: { trigger: svg.closest('section, footer'), start: 'top 78%', once: true }
    });
  });

  /* ---------- stat counters ---------- */
  const edgeDotFor = ['.ed-blue', '.ed-purple', '.ed-orange'];
  gsap.utils.toArray('.count').forEach((el, i) => {
    const target = parseInt(el.dataset.count, 10);
    el.textContent = '0'; // real value is authored in HTML for no-JS/reduced
    const state = { v: 0 };
    gsap.to(state, {
      v: target, duration: 1.6, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      onUpdate: () => { el.textContent = Math.round(state.v); },
      onComplete: () => {
        const dot = document.querySelector(edgeDotFor[i] || '');
        if (dot) dot.classList.add('hit');
      }
    });
  });

  /* ---------- AI "needs your attention" panel ---------- */
  const ask = document.getElementById('ask-panel');
  if (ask) {
    const items = [...ask.querySelectorAll('.ask-list li')];
    const count = ask.querySelector('.ask-count');
    count.textContent = '0';
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ask, start: 'top 80%', once: true }
    });
    tl.from(items, { x: -18, opacity: 0, duration: 0.55, stagger: 0.16, ease: 'power2.out' }, 0.2);
    const c = { v: 0 };
    tl.to(c, {
      v: parseInt(count.dataset.countTo, 10), duration: 0.8, ease: 'none',
      onUpdate: () => { count.textContent = Math.round(c.v); }
    }, 0.25);

    // idle: cycle a soft highlight through the alerts while on screen
    const glow = gsap.timeline({ repeat: -1, paused: true, delay: 3 });
    items.forEach(li => {
      glow.call(() => {
        items.forEach(l => l.classList.remove('glow'));
        li.classList.add('glow');
      }).to({}, { duration: 2.4 });
    });
    glow.call(() => items.forEach(l => l.classList.remove('glow'))).to({}, { duration: 1.6 });
    ScrollTrigger.create({
      trigger: ask, start: 'top 95%', end: 'bottom top',
      onToggle: s => s.isActive ? glow.play() : glow.pause()
    });
  }

  /* ---------- magnetic CTA (fine pointers only) ---------- */
  if (matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      const strength = 0.32;
      const qx = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power2.out' });
      const qy = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power2.out' });
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * strength);
        qy((e.clientY - r.top - r.height / 2) * strength);
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
      });
    });
  }

  /* ---------- wire it all up ---------- */
  let rsT = null;
  addEventListener('resize', () => {
    clearTimeout(rsT);
    rsT = setTimeout(() => { ScrollTrigger.refresh(); buildCircuit(); }, 350);
  }, { passive: true });

  } // initMotion
})();
