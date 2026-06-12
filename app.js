/* ============================================================
   ORATA — animation engine (GSAP + Lenis)
   Content is fully readable with JS disabled; everything here
   only enhances. All motion is gated on prefers-reduced-motion.
   ============================================================ */

(function () {
  'use strict';

  const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = reducedMq.matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  let lenis = null;

  // If the user enables reduced motion mid-session, reload into static mode
  // (infinite tweens hold inline styles that CSS alone can't stop).
  try {
    reducedMq.addEventListener('change', e => { if (e.matches) location.reload(); });
  } catch (err) { /* older Safari: addListener — not worth shimming */ }

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

  // resizing up past the burger breakpoint must not leave the overlay stuck
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

  if (reduced) {
    // No motion: leave the document exactly as authored.
    return;
  }

  // Wait for webfonts before splitting text / measuring, so lines
  // are split against the real metrics (fallback: 1.8s).
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
    if (a.classList.contains('skip-link')) return; // keep native skip behavior
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

  /* ---------- helpers ---------- */
  const drawIn = (paths, opts = {}) => {
    paths.forEach(p => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    return gsap.to(paths, {
      strokeDashoffset: 0,
      duration: opts.duration ?? 1.4,
      stagger: opts.stagger ?? 0.1,
      ease: opts.ease ?? 'power2.inOut',
      delay: opts.delay ?? 0,
      scrollTrigger: opts.trigger ? {
        trigger: opts.trigger, start: opts.start ?? 'top 78%', once: true
      } : undefined
    });
  };

  /* ---------- hero intro ---------- */
  const heroDecor = document.querySelector(
    matchMedia('(max-width: 760px)').matches ? '.decor-mobile' : '.decor-desktop'
  );

  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // headline: split into masked words, restored to clean DOM afterwards
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

  intro.from('[data-hero]', {
    y: 26, opacity: 0, duration: 0.9, stagger: 0.14
  }, 0.65);

  // un-split once settled so window resizes re-wrap text naturally
  intro.eventCallback('onComplete', () => { if (h1Split) h1Split.revert(); });

  // decor: draw traces, pop chips and balls; keep loops to pause offscreen
  const heroLoops = [];
  if (heroDecor) {
    const traces = [...heroDecor.querySelectorAll('.trace')];
    traces.forEach(p => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    intro.to(traces, {
      strokeDashoffset: 0, duration: 1.5, stagger: 0.09, ease: 'power2.inOut'
    }, 0.5);

    intro.from(heroDecor.querySelectorAll('.ball'), {
      scale: 0, transformOrigin: '50% 50%', duration: 0.5,
      stagger: 0.08, ease: 'back.out(2.2)'
    }, 0.9);

    // NB: these are SVG <g> nodes with a translate() in their transform
    // attribute — only relative/scale tweens here, absolute y would
    // clobber the authored position.
    const chips = heroDecor.querySelectorAll('.chip');
    intro.from(chips, {
      scale: 0.6, opacity: 0, transformOrigin: '50% 50%',
      duration: 0.7, stagger: 0.1, ease: 'back.out(1.7)'
    }, 0.8);

    // idle float, randomized per chip
    chips.forEach((chip, i) => {
      heroLoops.push(gsap.to(chip, {
        y: i % 2 ? '+=9' : '-=9',
        duration: 2.6 + i * 0.45,
        repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.6
      }));
    });

    // pulses traveling along traces — fade out before looping so the
    // jump back to the path start is invisible
    if (window.MotionPathPlugin) {
      heroDecor.querySelectorAll('.pulse').forEach((dot, i) => {
        const path = heroDecor.querySelector(dot.dataset.along);
        if (!path) return;
        const travel = 5.5 + i * 1.3;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4, delay: 2 + i * 1.7 });
        tl.set(dot, { opacity: 0 }, 0)
          .to(dot, {
            motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
            duration: travel, ease: 'none'
          }, 0)
          .to(dot, { opacity: 0.95, duration: 0.45, ease: 'power1.out' }, 0.05)
          .to(dot, { opacity: 0, duration: 0.45, ease: 'power1.in' }, travel - 0.45);
        heroLoops.push(tl);
      });
    }

    // gentle parallax on the whole decor layer while scrolling the hero
    gsap.to(heroDecor, {
      y: -56, ease: 'none',
      scrollTrigger: {
        trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2
      }
    });

    // don't burn frames on the idle loops when the hero is offscreen
    ScrollTrigger.create({
      trigger: '.hero', start: 'top bottom', end: 'bottom top',
      onToggle: self => heroLoops.forEach(t => self.isActive ? t.play() : t.pause())
    });
  }

  /* ---------- generic reveals ---------- */
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    gsap.from(el, {
      y: 34, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 84%', once: true }
    });
  });

  gsap.utils.toArray('[data-reveal-group]').forEach(group => {
    gsap.from(group.children, {
      y: 30, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 82%', once: true }
    });
  });

  gsap.utils.toArray('[data-reveal-grid]').forEach(grid => {
    gsap.from(grid.children, {
      y: 38, opacity: 0, duration: 0.85, ease: 'power3.out',
      stagger: { each: 0.09, grid: 'auto', from: 'start' },
      scrollTrigger: { trigger: grid, start: 'top 82%', once: true }
    });
  });

  /* ---------- section headline line-reveals ---------- */
  if (window.SplitText) {
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
        onComplete: () => split.revert() // clean DOM → resizes re-wrap fine
      });
    });
  }

  /* ---------- spine: stats → next section ---------- */
  document.querySelectorAll('.spine-path').forEach(p => {
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(p, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: {
        trigger: p.closest('.spine'), start: 'top 88%', end: 'bottom 55%', scrub: 0.6
      }
    });
  });

  /* ---------- dark + footer decor draw on scroll ---------- */
  ['.how-decor', '.foot-decor'].forEach(sel => {
    const svg = document.querySelector(sel);
    if (!svg) return;
    drawIn([...svg.querySelectorAll('.trace')], {
      trigger: svg.closest('section, footer'), duration: 1.6, stagger: 0.2
    });
    gsap.from(svg.querySelectorAll('.ball'), {
      scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2)',
      scrollTrigger: { trigger: svg.closest('section, footer'), start: 'top 78%', once: true },
      delay: 0.9
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
  const ask = document.querySelector('.ask');
  if (ask) {
    const items = ask.querySelectorAll('.ask-list li');
    const count = ask.querySelector('.ask-count');
    count.textContent = '0';
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ask, start: 'top 80%', once: true }
    });
    tl.from(items, {
      x: -18, opacity: 0, duration: 0.55, stagger: 0.16, ease: 'power2.out'
    }, 0.2);
    const c = { v: 0 };
    tl.to(c, {
      v: parseInt(count.dataset.countTo, 10), duration: 0.8, ease: 'none',
      onUpdate: () => { count.textContent = Math.round(c.v); }
    }, 0.25);
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

  ScrollTrigger.refresh();
  } // initMotion
})();
