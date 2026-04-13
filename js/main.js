/* ============================================================
   RAVISHING SOUL  main.js
   ============================================================ */

// ---- WA Number ----
const WA_NUM = '917396491027';
const WA_MSG = encodeURIComponent("Hey, I just checked your website. I want to know more about your fragrances.");
const WA_URL = `https://wa.me/${WA_NUM}?text=${WA_MSG}`;

/* ============================================================
   1. VISITOR TRACKING
   ============================================================ */
const Tracker = (() => {
  const KEY = 'rs_visitor';
  const LEADS_KEY = 'rs_leads';

  function genId() {
    return 'rs_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
  }

  function getDevice() {
    return /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
  }

  async function getLocation() {
    try {
      const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return null;
      const d = await r.json();
      return { city: d.city, region: d.region, country: d.country_name, ip: d.ip };
    } catch { return null; }
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  }

  function save(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

  async function init() {
    let v = load();
    const now = new Date().toISOString();

    if (!v) {
      v = {
        id: genId(), firstVisit: now, lastActive: now,
        device: getDevice(), location: null,
        pagesVisited: [location.pathname],
        ctaClicks: [], modalOpened: false, leadSubmitted: false,
        leadData: null
      };
      const loc = await getLocation();
      if (loc) v.location = loc;
    } else {
      v.lastActive = now;
      if (!v.pagesVisited.includes(location.pathname)) v.pagesVisited.push(location.pathname);
    }
    save(v);
    return v;
  }

  function trackCTA(label) {
    const v = load();
    if (!v) return;
    if (!v.ctaClicks) v.ctaClicks = [];
    v.ctaClicks.push({ label, time: new Date().toISOString() });
    v.lastActive = new Date().toISOString();
    save(v);
  }

  function trackModalOpen() {
    const v = load();
    if (!v) return;
    v.modalOpened = true;
    v.lastActive = new Date().toISOString();
    save(v);
  }

  function submitLead(name, phone, email) {
    const v = load();
    if (!v) return;
    v.leadSubmitted = true;
    v.leadData = { name, phone, email, submittedAt: new Date().toISOString() };
    v.lastActive = new Date().toISOString();
    save(v);
    // also push to leads list
    try {
      const leads = JSON.parse(localStorage.getItem(LEADS_KEY) || '[]');
      leads.push({ ...v });
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
    } catch {}
  }

  return { init, trackCTA, trackModalOpen, submitLead, load, LEADS_KEY };
})();

/* ============================================================
   2. THEME TOGGLE
   ============================================================ */
function initTheme() {
  const btn = document.getElementById('themeToggle');
  const html = document.documentElement;
  const stored = localStorage.getItem('rs_theme') || 'dark';
  html.setAttribute('data-theme', stored);
  updateThemeIcon(stored);

  btn?.addEventListener('click', () => {
    const cur = html.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('rs_theme', next);
    updateThemeIcon(next);
    Tracker.trackCTA('theme_toggle');
  });
}
function updateThemeIcon(t) {
  const i = document.querySelector('#themeToggle i');
  if (i) i.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

/* ============================================================
   3. NAV SCROLL
   ============================================================ */
function initNav() {
  const nav = document.getElementById('mainNav');
  const ham = document.getElementById('navHam');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu?.querySelectorAll('a');

  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  ham?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('open');
    Tracker.trackCTA('mobile_nav_open');
  });
  mobileLinks?.forEach(a => a.addEventListener('click', () => mobileMenu?.classList.remove('open')));
}

/* ============================================================
   4. LEAD CAPTURE MODAL
   ============================================================ */
const Modal = (() => {
  let autoShown = false;
  const backdrop = () => document.getElementById('leadModal');
  const formInner = () => document.getElementById('leadFormInner');
  const success = () => document.getElementById('leadSuccess');
  const form = () => document.getElementById('leadForm');

  function resetState() {
    formInner()?.classList.remove('hidden');
    success()?.classList.remove('active');
    form()?.reset();
  }

  function open(source='auto') {
    if (source !== 'see_result' && autoShown) return;
    if (source !== 'see_result') autoShown = true;
    resetState();
    backdrop()?.classList.add('open');
    document.body.style.overflow = 'hidden';
    Tracker.trackModalOpen();
    Tracker.trackCTA('modal_open_' + source);
  }

  function close() {
    backdrop()?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showSuccess(name) {
    formInner()?.classList.add('hidden');
    const s = success();
    if (s) { s.classList.add('active'); }
    const nameEl = document.getElementById('successName');
    if (nameEl && name) nameEl.textContent = name ? `, ${name}` : '';
  }

  function init() {
    // Close on backdrop click
    backdrop()?.addEventListener('click', e => {
      if (e.target === backdrop()) close();
    });

    // Close btn
    document.getElementById('modalClose')?.addEventListener('click', close);

    // Form submit
    document.getElementById('leadForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const name  = document.getElementById('leadName')?.value.trim() || '';
      const phone = document.getElementById('leadPhone')?.value.trim() || '';
      const email = document.getElementById('leadEmail')?.value.trim() || '';
      if (!phone) { alert('Please enter your phone number.'); return; }
      Tracker.submitLead(name, phone, email);
      showSuccess(name);
      Tracker.trackCTA('lead_submitted');
    });

    // WA redirect after success
    document.getElementById('waRedirectBtn')?.addEventListener('click', () => {
      Tracker.trackCTA('wa_redirect_click');
      window.open(WA_URL, '_blank', 'noopener');
    });

    // Auto-triggers
    const v = Tracker.load();
    const alreadySubmitted = v?.leadSubmitted;
    if (alreadySubmitted) return; // don't nag

    // 1. Delay 8s
    setTimeout(() => open('delay'), 8000);

    // 2. 60% scroll
    const scrollH = () => {
      const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (pct >= 60) { open('scroll'); window.removeEventListener('scroll', scrollH); }
    };
    window.addEventListener('scroll', scrollH, { passive: true });

    // 3. Exit intent (desktop)
    document.addEventListener('mouseleave', e => {
      if (e.clientY < 10) open('exit_intent');
    });
  }

  return { open, close, init };
})();

/* ============================================================
   5. SECRET PANEL
   ============================================================ */
function initSecretPanel() {
  const panel = document.getElementById('secretPanel');
  const backdrop = document.getElementById('panelBackdrop');

  function openPanel() {
    panel?.classList.add('open');
    backdrop?.classList.add('open');
    document.body.style.overflow = 'hidden';
    Tracker.trackCTA('secret_panel_open');
  }
  function closePanel() {
    panel?.classList.remove('open');
    backdrop?.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-panel]').forEach(btn =>
    btn.addEventListener('click', () => {
      openPanel();
      Tracker.trackCTA('secret_cta_click_' + (btn.dataset.panel || 'unknown'));
    })
  );
  document.getElementById('panelClose')?.addEventListener('click', closePanel);
  backdrop?.addEventListener('click', closePanel);
}

/* ============================================================
   6. CTA TRACKING
   ============================================================ */
function initCTATracking() {
  document.querySelectorAll('[data-cta]').forEach(el => {
    el.addEventListener('click', () => Tracker.trackCTA(el.dataset.cta));
  });

  // "See Your Result" btn  open modal
  document.querySelectorAll('[data-result]').forEach(btn => {
    btn.addEventListener('click', () => {
      Tracker.trackCTA('see_result_click');
      Modal.open('see_result');
    });
  });

  // Reveal modal btn
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      Tracker.trackCTA('modal_cta_' + btn.dataset.modal);
      Modal.open(btn.dataset.modal);
    });
  });
}

/* ============================================================
   7. SCROLL REVEAL
   ============================================================ */
function initReveal() {
  const els = document.querySelectorAll('.reveal, .stagger');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
}

/* ============================================================
   8. PRODUCT IMAGE SLIDER
   ============================================================ */
function initSliders() {
  document.querySelectorAll('.product-slider-new').forEach(slider => {
    const imgs = slider.dataset.images?.split(',') || [];
    if (!imgs.length) return;
    const mainImg = slider.querySelector('.slide-main');
    if (!mainImg) return;
    let idx = 0;

    function go(i) {
      idx = (i + imgs.length) % imgs.length;
      mainImg.style.opacity = '0';
      setTimeout(() => { mainImg.src = imgs[idx]; mainImg.style.opacity = '1'; }, 150);
      // update dots
      slider.querySelectorAll('.slide-dot').forEach((d,j) => d.classList.toggle('active', j === idx));
    }

    // Auto rotate
    let auto = null;
    const startAuto = () => {
      if (auto) return;
      auto = setInterval(() => go(idx + 1), 2800);
    };
    const stopAuto = () => {
      clearInterval(auto);
      auto = null;
    };

    const io = new IntersectionObserver(entries => {
      entries[0].isIntersecting ? startAuto() : stopAuto();
    });
    io.observe(slider);

    // Touch
    let tx = 0;
    slider.addEventListener('touchstart', e => { tx = e.touches[0].clientX; stopAuto(); }, { passive: true });
    slider.addEventListener('touchend', e => {
      const d = tx - e.changedTouches[0].clientX;
      if (Math.abs(d) > 40) go(idx + (d > 0 ? 1 : -1));
      startAuto();
    });

    // Dot clicks
    slider.querySelectorAll('.slide-dot').forEach((d,i) => d.addEventListener('click', () => go(i)));

    mainImg.style.transition = 'opacity 0.3s';
    go(0);
  });
}

/* ============================================================
   9. SCARCITY COUNTER (animated countdown)
   ============================================================ */
function initScarcity() {
  const el = document.getElementById('scarcityCount');
  if (!el) return;
  let n = parseInt(localStorage.getItem('rs_stock') || '17');
  if (n < 5) n = 5;
  el.textContent = n;
}

/* ============================================================
   10. TESTIMONIALS AUTO-SCROLL DUPLICATE
   ============================================================ */
function initTestimonials() {
  const track = document.querySelector('.testimonials-track');
  if (!track) return;
  // Duplicate content for seamless loop
  track.innerHTML += track.innerHTML;
}

/* ============================================================
   11. BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await Tracker.init();
  initTheme();
  initNav();
  initReveal();
  initSliders();
  initScarcity();
  initTestimonials();
  Modal.init();
  initSecretPanel();
  initCTATracking();
});
