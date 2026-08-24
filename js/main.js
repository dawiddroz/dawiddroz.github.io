/* Hub Dawid Drozdowski — main.js
   Lenis (una istanza, retry-loop) + GSAP/ScrollTrigger (retry-loop, sync flag)
   + gallery orizzontale nativa (scrollLeft: frecce, drag, wheel, progress)
   + counter hero + safety net gated */

/* ---------- Lenis ---------- */
(function initLenis() {
  if (typeof Lenis === 'undefined') {
    if (window.__lenisRetries === undefined) window.__lenisRetries = 0;
    if (++window.__lenisRetries > 40) return;
    setTimeout(initLenis, 250); return;
  }
  window.lenis = new Lenis({
    duration: 1.15,
    easing: function (t) { return 1 - Math.pow(1 - t, 3); },
    smoothWheel: true
  });
  function raf(time) { window.lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  if (window.__gsapReady && !window.__lenisSynced) {
    window.lenis.on('scroll', ScrollTrigger.update);
    window.__lenisSynced = true;
  }
})();

/* ---------- Anchor smooth (via Lenis se presente) ---------- */
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (window.lenis) window.lenis.scrollTo(target, { offset: -70, duration: 1.4 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ---------- Counter hero ---------- */
(function initCounters() {
  document.querySelectorAll('.counter').forEach(function (el) {
    var target = parseFloat(el.dataset.count);
    var animated = false;
    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !animated) {
          animated = true; obs.disconnect();
          var start = performance.now();
          function tick() {
            var p = Math.min((performance.now() - start) / 1400, 1);
            var v = Math.round(target * (1 - Math.pow(1 - p, 3)));
            el.textContent = String(v);
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = String(target);
          }
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.4 }).observe(el);
  });
})();

/* ---------- Gallery orizzontale nativa ---------- */
(function initGallery() {
  var track = document.getElementById('workTrack');
  if (!track) return;
  var prev = document.getElementById('workPrev');
  var next = document.getElementById('workNext');
  var bar = document.getElementById('workBar');
  var step = 520;

  function maxShift() { return Math.max(track.scrollWidth - track.clientWidth, 0); }
  function renderBar() {
    var m = maxShift();
    if (bar && m > 0) bar.style.transform = 'scaleX(' + (0.12 + 0.88 * (track.scrollLeft / m)) + ')';
  }
  if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step, behavior: 'smooth' }); });
  if (next) next.addEventListener('click', function () { track.scrollBy({ left: step, behavior: 'smooth' }); });
  track.addEventListener('scroll', renderBar, { passive: true });
  window.addEventListener('resize', renderBar);
  renderBar();

  /* drag: pointerdown sul track, move/up su window (continua fuori), guardia anti-click */
  var startX = 0, startSL = 0, dragging = false, moved = false;
  track.addEventListener('pointerdown', function (e) {
    dragging = true; moved = false;
    startX = e.clientX; startSL = track.scrollLeft;
    track.classList.add('dragging');
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 6) moved = true;
    track.scrollLeft = startSL - dx;
  });
  window.addEventListener('pointerup', function () {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');
    setTimeout(function () { moved = false; }, 50);
  });
  track.addEventListener('click', function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* wheel verticale sul track → scroll orizzontale (solo se c'è strada) */
  track.addEventListener('wheel', function (e) {
    var m = maxShift();
    if (m <= 0) return;
    var goingRight = e.deltaY > 0 && track.scrollLeft < m - 2;
    var goingLeft = e.deltaY < 0 && track.scrollLeft > 2;
    if (goingRight || goingLeft) { e.preventDefault(); track.scrollLeft += e.deltaY; }
  }, { passive: false });
})();

/* ---------- GSAP: reveal con ScrollTrigger ---------- */
(function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    if (window.__gsapRetries === undefined) window.__gsapRetries = 0;
    if (++window.__gsapRetries > 32) return;
    setTimeout(initGSAP, 250); return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if (window.lenis && !window.__lenisSynced) {
    window.lenis.on('scroll', ScrollTrigger.update);
    window.__lenisSynced = true;
  }
  window.__gsapReady = true;

  /* reveal individuali, once:true, ZERO onLeaveBack */
  gsap.utils.toArray('.reveal').forEach(function (el) {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 86%',
      once: true,
      onEnter: function () {
        gsap.fromTo(el,
          { opacity: 0, y: 42 },
          { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' }
        );
      }
    });
  });

  /* parallax leggero sulla griglia tecnica */
  var grid = document.querySelector('.tech-grid');
  if (grid) {
    gsap.to(grid, {
      yPercent: -8, ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'max', scrub: 1.2 }
    });
  }

  ScrollTrigger.refresh();
})();

/* ---------- Safety net: solo se GSAP non è mai partito ---------- */
setTimeout(function () {
  if (window.__gsapReady) return;
  document.querySelectorAll('.reveal').forEach(function (el) {
    el.style.opacity = '1'; el.style.transform = 'none';
  });
}, 4000);

/* ---------- Anno footer ---------- */
var y = document.getElementById('year');
if (y) y.textContent = String(new Date().getFullYear());
