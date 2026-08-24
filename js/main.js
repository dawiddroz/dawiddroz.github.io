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

  /* split titoli di sezione in parole (reveal mascherato) */
  document.querySelectorAll('.section__title, .contact__big').forEach(function (el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    var parts = [];
    el.childNodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/\s+/).forEach(function (w) { if (w) parts.push({ t: w, em: false }); });
      } else if (node.nodeType === 1) {
        node.textContent.split(/\s+/).forEach(function (w) { if (w) parts.push({ t: w, em: true }); });
      }
    });
    el.innerHTML = parts.map(function (p) {
      return '<span class="sw"><span class="swi' + (p.em ? ' em' : '') + '">' + p.t + '</span></span>';
    }).join(' ');
  });
  gsap.utils.toArray('.swi').forEach(function (el) { gsap.set(el, { yPercent: 115 }); });

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

  /* reveal mascherato delle parole dei titoli */
  gsap.utils.toArray('.swi').forEach(function (el) {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: function () {
        gsap.fromTo(el,
          { yPercent: 115 },
          { yPercent: 0, duration: 0.95, ease: 'power4.out' }
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

/* ---------- PRELOADER ---------- */
(function initLoader() {
  var loader = document.getElementById('loader');
  if (!loader) { document.documentElement.classList.add('hero-ready'); return; }
  var count = document.getElementById('loaderCount');
  var bar = document.getElementById('loaderBar');
  if (window.lenis && window.lenis.stop) { try { window.lenis.stop(); } catch (e) {} }
  var t0 = performance.now();
  var DURATION = 1400;
  var done = false;
  function finish() {
    if (done) return;
    done = true;
    if (count) count.innerHTML = '1<em>00</em>';
    setTimeout(function () {
      loader.classList.add('is-done');
      document.documentElement.classList.add('hero-ready');
      if (window.lenis && window.lenis.start) { try { window.lenis.start(); } catch (e) {} }
      setTimeout(function () { loader.style.display = 'none'; }, 950);
    }, 200);
  }
  setTimeout(finish, 4000); /* hard timeout: mai bloccare l'hero (es. tab in background) */
  function frame(now) {
    var p = Math.min((now - t0) / DURATION, 1);
    var eased = 1 - Math.pow(1 - p, 2);
    var n = Math.round(eased * 100);
    if (count) count.textContent = (n < 10 ? '00' : n < 100 ? '0' : '') + n;
    if (bar) bar.style.transform = 'scaleX(' + eased + ')';
    if (p < 1) requestAnimationFrame(frame);
    else finish();
  }
  requestAnimationFrame(frame);
})();

/* ---------- MARQUEE con velocità legata allo scroll ---------- */
(function initMarquee() {
  var track = document.querySelector('.marquee__track');
  var wrap = document.querySelector('.marquee');
  if (!track) return;
  var x = 0, speed = 1, target = 1, last = performance.now();
  if (wrap) {
    wrap.addEventListener('mouseenter', function () { target = 0.12; });
    wrap.addEventListener('mouseleave', function () { target = 1; });
  }
  var tryLenis = function (n) {
    if (window.lenis && window.lenis.on) {
      window.lenis.on('scroll', function (e) {
        var v = Math.abs(e.velocity || 0);
        if (target < 1) return; /* hover ha la priorità */
        target = 1 + Math.min(v * 0.14, 4);
        clearTimeout(window.__mqT);
        window.__mqT = setTimeout(function () { target = 1; }, 140);
      });
    } else if (n > 0) setTimeout(function () { tryLenis(n - 1); }, 300);
  };
  tryLenis(20);
  function tick(now) {
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    speed += (target - speed) * 0.06;
    x -= dt * (100 / 36) * speed;
    if (x <= -50) x += 50;
    track.style.transform = 'translate3d(' + x.toFixed(3) + '%,0,0)';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* ---------- DOT-NAV + GHOST PARALLAX + TO-TOP + OROLOGIO FOOTER ---------- */
(function initExtras() {
  var ids = ['top', 'lavori', 'indice', 'metodo', 'offerta', 'contatti'];
  var dots = Array.prototype.slice.call(document.querySelectorAll('#dotsNav a'));
  var secs = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var ghosts = Array.prototype.slice.call(document.querySelectorAll('.ghost'));
  var gTicking = false;

  function onScrollFrame() {
    var mid = window.innerHeight * 0.4;
    var current = ids[0];
    secs.forEach(function (s, i) { if (s.getBoundingClientRect().top <= mid) current = ids[i]; });
    dots.forEach(function (d) { d.classList.toggle('is-active', d.getAttribute('data-sec') === current); });
    var vh = window.innerHeight;
    ghosts.forEach(function (g) {
      var r = g.parentElement.getBoundingClientRect();
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      g.style.transform = 'translateY(' + (p * -70).toFixed(1) + 'px)';
    });
    gTicking = false;
  }
  window.addEventListener('scroll', function () {
    if (!gTicking) { gTicking = true; requestAnimationFrame(onScrollFrame); }
  }, { passive: true });
  onScrollFrame();

  var toTop = document.getElementById('toTop');
  if (toTop) toTop.addEventListener('click', function () {
    if (window.lenis) window.lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function tickFoot() {
    var fc = document.getElementById('footClock');
    var fs = document.getElementById('footState');
    try {
      var now = new Date();
      var s = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Rome' }).format(now);
      if (fc) fc.textContent = s;
      if (fs) {
        var h = parseInt(new Intl.DateTimeFormat('it-IT', { hour: '2-digit', hour12: false, timeZone: 'Europe/Rome' }).format(now), 10);
        fs.textContent = (h >= 9 && h < 19) ? 'Di solito rispondo entro l\'ora' : 'Lascia un messaggio: rispondo in mattinata';
      }
    } catch (e) {}
  }
  tickFoot(); setInterval(tickFoot, 1000);
})();

/* ---------- VIVO: cursor, magneti, parallax mouse, HUD, skew, tilt ---------- */
(function initVivo() {
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var dot = document.querySelector('.cursor-dot');
  var ring = document.querySelector('.cursor-ring');
  var hero = document.querySelector('.hero');
  var glow = document.querySelector('.hero__glow');
  var ringSvg = document.querySelector('.hero__ring');
  var title = document.querySelector('.hero__title');
  var badge = document.querySelector('.hero__badge');
  var hudX = document.getElementById('hudX');
  var hudY = document.getElementById('hudY');
  var mx = 0, my = 0, rx = 0, ry = 0, gx = 0, hx = 0, hy = 0;

  /* cursore custom */
  if (fine && dot && ring) {
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + (mx - 3) + 'px,' + (my - 3) + 'px)';
      var t = e.target;
      var link = t && t.closest && t.closest('a, button, .chip, .cat__row');
      ring.classList.toggle('is-link', !!link);
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      dot.style.transform = 'translate(-100px,-100px)';
      ring.style.transform = 'translate(-100px,-100px)';
    });
  }

  /* bottoni magnetici */
  if (fine) {
    document.querySelectorAll('.btn, .work__btn').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + dx * 0.22 + 'px,' + dy * 0.28 + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* rAF unico: anello insegue, glow segue, hero parallax, HUD */
  function loop() {
    if (fine) {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      if (ring) ring.style.transform = 'translate(' + (rx - 17) + 'px,' + (ry - 17) + 'px)';
      if (hero) {
        var r = hero.getBoundingClientRect();
        if (r.bottom > 0) {
          var nx = (mx / window.innerWidth - 0.5);
          var ny = (my / window.innerHeight - 0.5);
          gx += (nx - gx) * 0.05; hy += 0; hx += (nx - hx) * 0.05; hy += (ny - hy) * 0.05;
          if (glow) glow.style.transform = 'translate(calc(-50% + ' + gx * 90 + 'px), calc(-50% + ' + hy * 60 + 'px))';
          if (ringSvg) ringSvg.style.transform = 'translate(' + hx * 26 + 'px,' + hy * 20 + 'px)';
          if (title) title.style.transform = 'translate(' + hx * -10 + 'px,' + hy * -6 + 'px)';
          if (badge) badge.style.transform = 'translate(' + hx * 14 + 'px,' + hy * 10 + 'px)';
          if (hudX) hudX.textContent = (mx / window.innerWidth).toFixed(3);
          if (hudY) hudY.textContent = (1 - my / window.innerHeight).toFixed(3);
        }
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* skew da velocità scroll (via Lenis) + ritorno a riposo */
  {
    var applySkew = function (v) {
      document.querySelectorAll('.section__title, .contact__big').forEach(function (el) {
        el.style.transform = 'skewY(' + v.toFixed(2) + 'deg)';
      });
    };
    var onScrollVel = function (vel) {
      var target = Math.max(-2.2, Math.min(2.2, vel * 0.05));
      applySkew(target);
      clearTimeout(window.__skewT);
      window.__skewT = setTimeout(function () { applySkew(0); }, 120);
    };
    var tryLenis = function (n) {
      if (window.lenis && window.lenis.on) { window.lenis.on('scroll', function (e) { onScrollVel(e.velocity || 0); }); }
      else if (n > 0) setTimeout(function () { tryLenis(n - 1); }, 300);
    };
    tryLenis(20);
  }

  /* tilt 3D sui poster della gallery */
  if (fine) {
    document.querySelectorAll('.card__poster').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(700px) rotateY(' + (px * 7).toFixed(2) + 'deg) rotateX(' + (-py * 7).toFixed(2) + 'deg) scale(1.02)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* orologio live (Europa/Roma) in nav e HUD */
  function tickClock() {
    try {
      var s = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Rome' }).format(new Date());
      var nc = document.getElementById('navClock'); if (nc) nc.textContent = s;
      var hc = document.getElementById('hudClock'); if (hc) hc.textContent = s;
    } catch (err) {}
  }
  tickClock(); setInterval(tickClock, 1000);
})();
