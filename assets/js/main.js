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
    if (params.get('tema')) form.elements.tema.value = params.get('tema');
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
        'Téma: ' + f.tema.value, '', f.zprava.value].join('\n');
      say('is-ok', 'Otevíráme váš e-mailový program. Pokud se nic nestalo, napište na info@agripol.cz.');
      location.href = 'mailto:info@agripol.cz?subject=' + encodeURIComponent('Poptávka z webu — ' + (f.tema.value || 'obecná')) +
        '&body=' + encodeURIComponent(body);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeader(); initReveal(); initToTop(); initList(); initGallery(); initCalc(); initCompat(); initForm();
    $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  });
})();
