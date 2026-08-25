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
  var COUNT_MS = 1800;   /* corsa del contatore */
  var MIN_MS = 2350;     /* le tre title-card devono atterrare */
  var done = false;
  function finish() {
    if (done) return;
    done = true;
    if (count) count.innerHTML = '1<em>00</em>';
    setTimeout(function () {
      loader.classList.add('is-done');
      document.documentElement.classList.add('hero-ready'); /* l'hero parte CON l'apertura dei sipari */
      if (window.lenis && window.lenis.start) { try { window.lenis.start(); } catch (e) {} }
      setTimeout(function () { loader.style.display = 'none'; }, 1050);
    }, 260);
  }
  setTimeout(finish, 6500); /* hard timeout: mai bloccare l'hero */
  function frame(now) {
    var elapsed = now - t0;
    /* il contatore corre sui suoi 1.8s ma non supera 96 finché le card non sono finite */
    var p = Math.min(elapsed / COUNT_MS, 1);
    var gate = elapsed < MIN_MS ? 0.96 : 1;
    var eased = (1 - Math.pow(1 - p, 2)) * gate;
    var n = Math.round(eased * 100);
    if (count) count.textContent = (n < 10 ? '00' : n < 100 ? '0' : '') + n;
    if (bar) bar.style.transform = 'scaleX(' + eased + ')';
    if (elapsed >= Math.max(COUNT_MS, MIN_MS)) { finish(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ---------- I18N ---------- */
(function initI18n() {
  var T = {
    it: {
      skip: 'Vai ai lavori', loader_k: 'DAWID DROZDOWSKI — PORTFOLIO',
      loader1: '<i>Costruisco siti.</i>', loader2: '<i>Voi vendete.</i>', loader3: '<i>Io <em>produco</em>.</i>',
      nav_work: 'Lavori', nav_index: 'Indice', nav_method: 'Metodo', nav_pricing: 'Offerta', nav_contact: 'Contatti',
      nav_status: 'DISPONIBILE',
      hero_badge: 'Produzione white-label per agenzie · Roma sud & Castelli Romani',
      hero_t1: 'Siti', hero_t2: 'che', hero_t3: 'sembrano', hero_t4: 'costare', hero_t5: '<em>il&nbsp;doppio.</em>',
      hero_sub: 'Laboratorio di produzione siti web alle spalle delle agenzie: <strong>design editoriale, motion curato, white-label totale</strong>. Voi vendete al vostro prezzo, io produco in 48/72 ore. Nessun riferimento al produttore nei deliverable.',
      cta_work: 'Vedi i lavori', cta_pricing: 'Listino wholesale',
      meta_k1: 'Siti pubblicati', meta_k2: 'Consegna dai materiali', meta_k3: 'White-label garantito', meta_k4: 'Revisioni incluse',
      hero_scroll: 'Scroll',
      dot_start: 'Start', dot_work: 'Lavori', dot_index: 'Indice', dot_method: 'Metodo', dot_pricing: 'Offerta', dot_contact: 'Contatti',
      sec_work_t: 'Lavori <em>selezionati</em>', sec_work_n: 'Trascina o usa le frecce — 33 pubblicati, 6 in vetrina',
      tag_rest: 'Ristorazione', tag_prof: 'Professionisti', tag_ind: 'Industria', tag_local: 'Local',
      card1_name: 'Trattoria <em>Dei Cacciatori</em>',
      card1_desc: 'Layout editoriale split, tipografia serif con accenti corsivi, 4.3★ con 834 recensioni in vista. Il pezzo forte.',
      card2_name: 'Il <em>Momento</em>',
      card2_desc: 'Lo stack motion più ricco del catalogo: GSAP + ScrollTrigger + Lenis, hero food a tutta pagina, prenotazione diretta.',
      card3_name: 'Studio Notarile <em>Squillaci</em>',
      card3_desc: 'Istituzionale ma non freddo: carta, blu notte, oro. La serietà che uno studio notarile deve trasmettere.',
      card4_name: 'Notaio <em>Minniti</em>',
      card4_desc: 'Architetture in controluce, serif d\'oro, struttura chiara per atti e servizi. Il classico che non passa di moda.',
      card5_name: 'FB Opere <em>Speciali</em>',
      card5_desc: 'Dark industrial con HUD tecnico e gallery scroll-linked: geotecnica raccontata come ingegneria, non come vetroresina.',
      card6_name: 'No More <em>Tears</em>',
      card6_desc: 'Tattoo & barber: nero, rosso, carattere. Il sito di un\'attività che vive di identità deve avere identità.',
      card_open: 'Apri',
      sec_index_t: 'Indice <em>completo</em>', sec_index_n: '33 siti pubblicati · github.com/dawiddroz',
      cat1: 'Ristorazione', cat2: 'Professionisti', cat3: 'Commercio, arti e servizi', cat4: 'Benessere e accoglienza',
      sec_method_t: 'Come <em>lavoro</em>', sec_method_n: 'Brief → anteprima live → consegna',
      step1_k: '01 · Brief', step1_t: 'Scheda progetto, 10 minuti',
      step1_d: 'Settore, sezioni, testi, logo, foto, riferimenti. Niente call infinite: una scheda compilata e si parte. I ritardi sui materiali sospendono il conteggio dei tempi, per trasparenza.',
      step2_k: '02 · Anteprima live', step2_t: 'Link commentabile in 48h',
      step2_d: 'L\'agenzia vede il sito vero, su un link condivisibile col cliente finale, e lascia le correzioni direttamente sull\'anteprima. Due round di revisioni inclusi.',
      step3_k: '03 · Consegna', step3_t: 'Dominio, sorgenti, silenzio',
      step3_d: 'Deploy sul dominio dell\'agenzia, file sorgente consegnati, nessun credito, nessun watermark. Il sito è vostro e del vostro cliente. Punto.',
      sec_offer_t: 'Il <em>listino</em>',
      offer_text: 'Prezzi di produzione wholesale, IVA esclusa: l\'agenzia applica il proprio margine e resta l\'unico interlocutore del cliente finale. Hosting e manutenzione gestiti da me con il cliente finale a 29€/mese, o rivenduti all\'agenzia a 15€/mese per sito: il ricorrente resta vostro.',
      offer_fine: 'Pagamenti: 50% alla conferma, 50% alla consegna · Contratto quadro e NDA su richiesta',
      p1_n: 'Landing page', p1_d: 'Consegna 48h', p2_n: 'Sito vetrina', p2_d: 'Consegna 72h',
      p3_n: 'Pagina extra', p3_d: 'Sul progetto in corso', p4_n: 'E-commerce base', p4_d: 'Consegna 5 giorni',
      p5_n: 'Revisioni extra', p5_d: 'Oltre i 2 round inclusi',
      contact_t: 'Costruiamo il <em>prossimo</em> progetto.',
      c_email_k: 'Email PEC', c_email_s: 'Risposta entro 24 ore lavorative',
      c_tel_k: 'Telefono · WhatsApp', c_tel_s: 'Per i progetti in corsa, direttamente',
      c_ora_k: 'Ora locale · Roma', foot_open: 'Di solito rispondo entro l\'ora', foot_closed: 'Lascia un messaggio: rispondo in mattinata',
      to_top: 'Torna su', footer_wl: 'White-label · Roma sud & Castelli Romani'
    },
    en: {
      skip: 'Skip to work', loader_k: 'DAWID DROZDOWSKI — PORTFOLIO',
      loader1: '<i>I build websites.</i>', loader2: '<i>You sell them.</i>', loader3: '<i>I <em>produce</em>.</i>',
      nav_work: 'Work', nav_index: 'Index', nav_method: 'Method', nav_pricing: 'Pricing', nav_contact: 'Contact',
      nav_status: 'AVAILABLE',
      hero_badge: 'White-label web production for agencies · Rome South & Castelli Romani',
      hero_t1: 'Sites', hero_t2: 'that', hero_t3: 'look like', hero_t4: 'they cost', hero_t5: '<em>double.</em>',
      hero_sub: 'A web production studio working behind agencies: <strong>editorial design, crafted motion, total white-label</strong>. You sell at your price, I produce within 48/72 hours. No maker credit anywhere in the deliverables.',
      cta_work: 'See the work', cta_pricing: 'Wholesale pricing',
      meta_k1: 'Sites shipped', meta_k2: 'Delivery from assets', meta_k3: 'White-label guaranteed', meta_k4: 'Revision rounds included',
      hero_scroll: 'Scroll',
      dot_start: 'Start', dot_work: 'Work', dot_index: 'Index', dot_method: 'Method', dot_pricing: 'Pricing', dot_contact: 'Contact',
      sec_work_t: 'Selected <em>work</em>', sec_work_n: 'Drag or use arrows — 33 published, 6 featured',
      tag_rest: 'Restaurants', tag_prof: 'Professionals', tag_ind: 'Industrial', tag_local: 'Local',
      card1_name: 'Trattoria <em>Dei Cacciatori</em>',
      card1_desc: 'Split editorial layout, serif typography with italic accents, 4.3★ across 834 reviews up front. The flagship piece.',
      card2_name: 'Il <em>Momento</em>',
      card2_desc: 'The richest motion stack in the catalog: GSAP + ScrollTrigger + Lenis, full-page food hero, direct booking.',
      card3_name: 'Studio Notarile <em>Squillaci</em>',
      card3_desc: 'Institutional without being cold: paper, midnight blue, gold. The gravity a notary studio must project.',
      card4_name: 'Notaio <em>Minniti</em>',
      card4_desc: 'Backlit architecture, golden serif, clear structure for deeds and services. The classic that never dates.',
      card5_name: 'FB Opere <em>Speciali</em>',
      card5_desc: 'Dark industrial with technical HUD and scroll-linked gallery: geotechnics told like engineering, not fiberglass.',
      card6_name: 'No More <em>Tears</em>',
      card6_desc: 'Tattoo & barber: black, red, attitude. A business built on identity deserves a site with identity.',
      card_open: 'Open',
      sec_index_t: 'Complete <em>index</em>', sec_index_n: '33 published sites · github.com/dawiddroz',
      cat1: 'Restaurants', cat2: 'Professionals', cat3: 'Retail, trades & services', cat4: 'Wellness & hospitality',
      sec_method_t: 'How I <em>work</em>', sec_method_n: 'Brief → live preview → delivery',
      step1_k: '01 · Brief', step1_t: 'Project sheet, 10 minutes',
      step1_d: 'Sector, sections, copy, logo, photos, references. No endless calls: one filled sheet and we start. Asset delays pause the clock, transparently.',
      step2_k: '02 · Live preview', step2_t: 'Commentable link in 48h',
      step2_d: 'The agency sees the real site on a link shareable with the end client, and leaves corrections right on the preview. Two revision rounds included.',
      step3_k: '03 · Delivery', step3_t: 'Domain, sources, silence',
      step3_d: 'Deployed on the agency\'s domain, source files handed over, no credit, no watermark. The site is yours and your client\'s. Period.',
      sec_offer_t: 'The <em>pricing</em>',
      offer_text: 'Wholesale production prices, VAT excluded: the agency applies its own margin and remains the end client\'s only point of contact. Hosting & maintenance handled by me with the end client at €29/month, or resold to the agency at €15/month per site: the recurring stays yours.',
      offer_fine: 'Payments: 50% upfront, 50% on delivery · Framework contract and NDA on request',
      p1_n: 'Landing page', p1_d: '48h delivery', p2_n: 'Brochure site', p2_d: '72h delivery',
      p3_n: 'Extra page', p3_d: 'On running projects', p4_n: 'Basic e-commerce', p4_d: '5-day delivery',
      p5_n: 'Extra revisions', p5_d: 'Beyond the 2 included rounds',
      contact_t: 'Let\'s build the <em>next</em> one.',
      c_email_k: 'PEC Email', c_email_s: 'Reply within 24 business hours',
      c_tel_k: 'Phone · WhatsApp', c_tel_s: 'For running projects, directly',
      c_ora_k: 'Local time · Rome', foot_open: 'Usually replies within the hour', foot_closed: 'Leave a message: I reply in the morning',
      to_top: 'Back to top', footer_wl: 'White-label · Rome South & Castelli Romani'
    }
  };

  function apply(lang) {
    var dict = T[lang] || T.it;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (dict[k] !== undefined) el.textContent = dict[k];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-html');
      if (dict[k] !== undefined) el.innerHTML = dict[k];
    });
    /* stato dinamico orario footer */
    var fs = document.getElementById('footState');
    if (fs && fs.dataset.open !== undefined) fs.textContent = fs.dataset.open === '1' ? dict.foot_open : dict.foot_closed;
    document.documentElement.setAttribute('lang', lang);
    try { localStorage.setItem('hub-lang', lang); } catch (e) {}
    document.querySelectorAll('.lang__btn').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-lang') === lang);
    });
  }

  var saved = 'it';
  try { saved = localStorage.getItem('hub-lang') || 'it'; } catch (e) {}
  apply(saved === 'en' ? 'en' : 'it');

  document.querySelectorAll('.lang__btn').forEach(function (btn) {
    btn.addEventListener('click', function () { apply(btn.getAttribute('data-lang')); });
  });

  /* espongo il dizionario per lo stato orologio-footer */
  window.__i18nApply = apply;
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
        var open = h >= 9 && h < 19;
        fs.dataset.open = open ? '1' : '0';
        /* il testo giusto lo applica l'i18n nella lingua corrente */
        if (window.__i18nApply) window.__i18nApply(document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'it');
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
  var art = document.querySelector('.hero__art');
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
          if (art) art.style.transform = 'translate3d(' + (hx * -16).toFixed(1) + 'px,' + (hy * -11).toFixed(1) + 'px,0)';
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
