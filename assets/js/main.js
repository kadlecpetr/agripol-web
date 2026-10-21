(function () {
  'use strict';
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const czk = n => new Intl.NumberFormat('cs-CZ').format(n).replace(/\s/g, ' ') + ' Kč';

  function initHeader() {
    const header = $('.header'), burger = $('.burger'), mnav = $('.mobile-nav'), hero = $('.hero');
    const onScroll = () => {
      header.classList.toggle('is-stuck', window.scrollY > 12);
      if (hero) header.classList.toggle('header--dark', hero.getBoundingClientRect().bottom > header.offsetHeight);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    burger.addEventListener('click', () => {
      const open = mnav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('no-scroll', open);
    });
    $$('a', mnav).forEach(a => a.addEventListener('click', () => {
      mnav.classList.remove('is-open'); burger.classList.remove('is-open');
      document.body.classList.remove('no-scroll');
    }));
  }

  function initReveal() {
    const items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) { items.forEach(i => i.classList.add('is-visible')); return; }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    items.forEach(i => io.observe(i));
  }

  function initToTop() {
    const btn = $('.to-top');
    const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > 620);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }


  /* Slider na úvodu: čtyři zprávy, přepíná se samo, zastaví se při najetí myší */
  function initSlider() {
    const root = $('[data-slider]');
    if (!root) return;
    const slides = $$('.hero__slide', root), dots = $$('.hero__dot', root);
    let i = 0, timer = null;
    const show = n => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
    };
    const start = () => { stop(); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => show(i + 1), 6500); };
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    dots.forEach((d, k) => d.addEventListener('click', () => { show(k); start(); }));
    root.addEventListener('mouseenter', stop); root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop); root.addEventListener('focusout', start);
    start();
  }

  /* Výpis kategorie: hledání, jen skladem, řazení, podkategorie */
  function initList() {
    const list = $('[data-list]');
    if (!list) return;
    const cards = $$('.pcard', list);
    const q = $('[data-search]'), stock = $('[data-instock]'), sort = $('[data-sort]');
    const chips = $$('.chipbtn[data-sub]');
    const count = $('[data-count]'), empty = $('[data-empty]');
    let sub = '';
    const word = n => n === 1 ? 'položka' : (n > 1 && n < 5 ? 'položky' : 'položek');
    function apply() {
      const term = q ? q.value.trim().toLowerCase() : '';
      let shown = 0;
      cards.forEach(c => {
        const ok = (!term || c.dataset.name.includes(term)) &&
                   (!stock || !stock.checked || ['skladem', 'sleva'].includes(c.dataset.status)) &&
                   (!sub || c.dataset.sub === sub);
        c.hidden = !ok; if (ok) shown++;
      });
      const mode = sort ? sort.value : '';
      const price = c => c.dataset.price === '' ? Infinity : +c.dataset.price;
      const sorted = cards.slice().sort((a, b) =>
        mode === 'asc' ? price(a) - price(b) :
        mode === 'desc' ? (price(b) === Infinity ? -1 : price(b)) - (price(a) === Infinity ? -1 : price(a)) :
        mode === 'name' ? a.dataset.name.localeCompare(b.dataset.name, 'cs') : a.dataset.i - b.dataset.i);
      sorted.forEach(c => list.appendChild(c));
      count.innerHTML = '<b>' + shown + '</b> ' + word(shown);
      empty.hidden = shown > 0;
    }
    [q, stock, sort].forEach(el => el && el.addEventListener('input', apply));
    chips.forEach(b => b.addEventListener('click', () => {
      chips.forEach(x => x.classList.toggle('is-on', x === b)); sub = b.dataset.sub; apply();
    }));
  }

  function initGallery() {
    const main = $('[data-gmain]');
    if (!main) return;
    $$('.gthumb').forEach(t => t.addEventListener('click', () => {
      main.src = t.dataset.src;
      $$('.gthumb').forEach(x => x.classList.toggle('is-on', x === t));
    }));
  }

  /* Konfigurátor nakladače: základní cena podle značky traktoru + výbava */
  function initCalc() {
    const calc = $('[data-calc]');
    if (!calc) return;
    const base = $('[data-base]'), ext = $('[data-ext]'), tot = $('[data-total]'), send = $('[data-send]');
    function upd() {
      const r = $('input[name=znacka]:checked', calc) || $('input[name=znacka]', calc);
      const b = +r.value || 0;
      const picked = $$('[data-extra]:checked', calc);
      const e = picked.reduce((s, x) => s + +x.dataset.price, 0);
      base.textContent = czk(b); ext.textContent = czk(e); tot.textContent = czk(b + e);
      const txt = 'Zajímá mě čelní nakladač ' + calc.dataset.title +
        (r.dataset.znacka ? ' na traktor: ' + r.dataset.znacka : '') +
        (picked.length ? '\nVýbava: ' + picked.map(x => x.dataset.name).join(', ') : '') +
        '\nOrientační cena: ' + czk(b + e) + ' bez DPH.';
      const u = new URL(send.getAttribute('href'), location.href);
      u.searchParams.set('zprava', txt); u.searchParams.set('tema', 'Čelní nakladače');
      send.href = u.pathname + u.search;
    }
    calc.addEventListener('change', upd); upd();
  }

  function initCompat() {
    const rows = $$('[data-compat] tr'), btns = $$('[data-brand]', $('[data-brands]') || document);
    if (!rows.length) return;
    const show = b => { rows.forEach(r => r.hidden = r.dataset.brand !== b); btns.forEach(x => x.classList.toggle('is-on', x.dataset.brand === b)); };
    btns.forEach(x => x.addEventListener('click', () => show(x.dataset.brand)));
    show(btns[0].dataset.brand);
  }

  /* Formulář nemá server — složí e-mail a otevře ho v poštovním programu návštěvníka. */
  function initForm() {
    const form = $('[data-form]');
    if (!form) return;
    const params = new URLSearchParams(location.search);
    if (params.get('tema') && form.elements.tema) form.elements.tema.value = params.get('tema');
    if (params.get('zprava')) form.elements.zprava.value = params.get('zprava');
    else if (params.get('produkt')) form.elements.zprava.value = 'Dobrý den, zajímá mě: ' + params.get('produkt') + '.\n';
    const status = $('.form-status', form);
    const say = (cls, msg) => { status.className = 'form-status ' + cls; status.textContent = msg; };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const f = form.elements;
      if (!f.jmeno.value.trim() || !/^\S+@\S+\.\S+$/.test(f.email.value) || !f.zprava.value.trim()) {
        return say('is-err', 'Vyplňte prosím jméno, platný e-mail a zprávu.');
      }
      if (!f.gdpr.checked) return say('is-err', 'Pro odeslání potřebujeme váš souhlas se zpracováním údajů.');
      const body = ['Jméno: ' + f.jmeno.value, 'E-mail: ' + f.email.value, 'Telefon: ' + f.telefon.value,
        'Téma: ' + (f.tema ? f.tema.value : ''), '', f.zprava.value].join('\n');
      say('is-ok', 'Otevíráme váš e-mailový program. Pokud se nic nestalo, napište na info@agripol.cz.');
      location.href = 'mailto:info@agripol.cz?subject=' + encodeURIComponent('Poptávka z webu — ' + ((f.tema && f.tema.value) || 'obecná')) +
        '&body=' + encodeURIComponent(body);
    });
  }


  /* ===== Animace a interakce ===== */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function initFx() {
    // ukazatel čtení
    const bar = document.createElement('div'); bar.className = 'progress'; document.body.appendChild(bar);
    const header = $('.header'); let lastY = 0;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
      const hero = $('.hero__photo.is-par, .hero__slide.is-active .hero__photo');
      if (hero && !reduce && scrollY < innerHeight) hero.style.translate = '0 ' + Math.round(scrollY * .08) + 'px';
      if (header && innerWidth > 720) header.classList.toggle('is-hidden', scrollY > 160);
      lastY = scrollY;
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    // číslice s počítáním
    $$('.stat b').forEach(el => {
      const m = el.textContent.trim().match(/^(\d+)(\+?)$/); if (!m || +m[1] > 9999 || reduce) return;
      const end = +m[1], suf = m[2]; el.textContent = '0' + suf;
      new IntersectionObserver((es, o) => es.forEach(e => { if (!e.isIntersecting) return; o.disconnect();
        const t0 = performance.now(), d = 1400;
        (function tick(t) { const p = Math.min(1, (t - t0) / d), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
          el.textContent = v + suf; if (p < 1) requestAnimationFrame(tick); })(t0);
      }), { threshold: .6 }).observe(el);
    });
    // záře pod kurzorem na kartách
    $$('.pcard, .offer-tile').forEach(c => c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
    // šipky a swipe ve slideru
    const root = $('[data-slider]');
    if (root) {
      const dots = $$('.hero__dot', root), ctrl = $('.hero__ctrl', root);
      const go = d => { const i = dots.findIndex(x => x.classList.contains('is-active')); dots[(i + d + dots.length) % dots.length].click(); };
      const arrows = document.createElement('div'); arrows.className = 'hero__arrows';
      arrows.innerHTML = '<button class="hero__arrow" aria-label="Předchozí"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg></button><button class="hero__arrow" aria-label="Další"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>';
      ctrl.appendChild(arrows);
      const [pb, nb] = $$('button', arrows); pb.onclick = () => go(-1); nb.onclick = () => go(1);
      let x0 = null; root.addEventListener('touchstart', e => x0 = e.touches[0].clientX, { passive: true });
      root.addEventListener('touchend', e => { if (x0 !== null && Math.abs(e.changedTouches[0].clientX - x0) > 50) go(e.changedTouches[0].clientX < x0 ? 1 : -1); x0 = null; });
    }
    // zvětšení fotky produktu
    const gm = $('.gallery__main');
    if (gm && $('[data-gmain]')) {
      const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = '<img alt=""><button aria-label="Zavřít">×</button>'; document.body.appendChild(lb);
      const close = () => lb.classList.remove('is-open');
      gm.addEventListener('click', () => { $('img', lb).src = $('[data-gmain]').src; lb.classList.add('is-open'); });
      lb.addEventListener('click', close); addEventListener('keydown', e => e.key === 'Escape' && close());
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeader(); initSlider(); initReveal(); initToTop(); initList(); initGallery(); initCalc(); initCompat(); initForm(); initFx();
    $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  });
})();
