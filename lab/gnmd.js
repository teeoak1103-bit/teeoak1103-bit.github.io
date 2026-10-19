/* gnmd テイストの動き v0.1  2026-10-18
   gnmd.com は GSAP＋Lenis＋Three.js で動かしている。ここでは同じ見え方を、ライブラリなし（無料・軽い）で再現する。
   Lenis（なめらかスクロール、MIT ライセンス・無料）が読み込まれていれば使う。 */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 目には見えず、読み上げだけに届く文字
  const srOnly = t => `<span style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`;

  /* 1. data-split：<br> ごとに行を分け、1行ずつ下からせり上げる */
  document.querySelectorAll('[data-split]').forEach(el => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines.map((l, i) => `<span class="g-mask" style="--i:${i * 4}"><span class="g-mask_in">${l}</span></span>`).join('');
  });
  /* data-chars：1文字ずつ（問い合わせの大きな2行など） */
  document.querySelectorAll('[data-chars]').forEach(el => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    let n = 0;
    // 読み上げでは1文字ずつにならないよう、文のまとまりを見えない文字で添え、分けた文字は読ませない（LP v0.12 で追加）
    const said = el.textContent.replace(/\s+/g, ' ').trim();
    el.innerHTML = lines.map(l => `<span class="g-mask" aria-hidden="true"><span class="g-mask_in" style="transition-delay:0s">${[...l].map(c => `<span class="ch" style="--i:${n++}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</span></span>`).join('') + srOnly(said);
  });

  /* 2. 画面に入ったら is-in をつける（1回だけ） */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  document.querySelectorAll('.g-mask, .g-draw, .g-fade, .g-media').forEach(el => io.observe(el));

  /* 3. ticker の文字を1字ずつに分ける */
  document.querySelectorAll('.g-ticker').forEach(el => {
    const text = el.textContent.trim();
    el.innerHTML = [...text].map(c => `<span aria-hidden="true">${c}</span>`).join('') + srOnly(text);
  });

  /* 4. スクロールに合わせて変わるもの */
  const header = document.querySelector('.g-header');
  const inkZones = [...document.querySelectorAll('[data-header="ink"]')];
  const missionPs = [...document.querySelectorAll('.g-mission_txts p')];
  const features = [...document.querySelectorAll('.g-feature')];
  const slots = [...document.querySelectorAll('.g-slot')];
  const sideLinks = [...document.querySelectorAll('.g-side_nav a[href^="#"]')];

  function onScroll() {
    const vh = window.innerHeight;
    // ヘッダーの文字色：明るい面の上では黒、写真や黒い面の上では白
    if (header) {
      const y = header.offsetHeight / 2;
      const onInk = inkZones.some(z => { const r = z.getBoundingClientRect(); return r.top <= y && r.bottom >= y; });
      header.classList.toggle('is-ink', onInk);
      header.classList.toggle('is-scrolled', window.scrollY > vh * 0.6);
    }
    // 使命の段落：画面の 65% の位置を越えたら明るく
    missionPs.forEach(p => p.classList.toggle('is-lit', reduce || p.getBoundingClientRect().top < vh * 0.65));
    // 写真の上の英文：進んだ分だけ左から明るく
    features.forEach(f => {
      const r = f.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (vh - r.top) / (vh * 1.2)));
      f.querySelectorAll('.g-ticker').forEach(t => {
        const s = t.children; const lit = Math.round(s.length * prog);
        for (let i = 0; i < s.length; i++) s[i].classList.toggle('is-lit', reduce || i < lit);
      });
    });
    // 黒い帯の巨大文字：列ごとに上下逆向きに流れる
    if (!reduce) slots.forEach(s => {
      const r = s.getBoundingClientRect();
      const prog = (vh - r.top) / (vh + r.height);
      s.querySelectorAll('.g-slot_col').forEach((c, i) => {
        const dir = i % 2 ? 1 : -1;
        c.style.transform = `translateY(${(dir * (prog - 0.5) * 30).toFixed(2)}%)`;
      });
    });
    // 左の目次：いま見ているブロックを濃く
    if (sideLinks.length) {
      let cur = sideLinks[0];
      sideLinks.forEach(a => { const t = document.querySelector(a.getAttribute('href')); if (t && t.getBoundingClientRect().top < vh * 0.5) cur = a; });
      sideLinks.forEach(a => a.classList.toggle('is-current', a === cur));
    }
  }

  /* 5. 問い合わせ：さわると文字が順に差し色の帯を受ける */
  document.querySelectorAll('.g-contact').forEach(box => {
    const chars = [...box.querySelectorAll('.ch')];
    let timers = [];
    box.addEventListener('mouseenter', () => { timers.forEach(clearTimeout); timers = chars.map((c, i) => setTimeout(() => c.classList.add('is-hot'), i * 18)); });
    box.addEventListener('mouseleave', () => { timers.forEach(clearTimeout); timers = chars.map((c, i) => setTimeout(() => c.classList.remove('is-hot'), i * 12)); });
  });

  /* 6. 上へ戻る */
  document.querySelectorAll('[data-totop]').forEach(b => b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })));

  /* 7. なめらかスクロール（Lenis があれば）。Lenis を後から（defer で）読むページでは、読み終えたときに始める */
  let lenisOn = false;
  const startLenis = () => {
    if (lenisOn || !window.Lenis || reduce) return;
    lenisOn = true;
    const lenis = new window.Lenis({ lerp: 0.12, wheelMultiplier: 1 });
    lenis.on('scroll', onScroll);
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  };
  startLenis();
  if (!lenisOn) window.addEventListener('load', startLenis);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  /* 動きの準備ができた印（ページ側で、動かないときに中身を隠さないために使う） */
  document.documentElement.classList.add('g-ready');
})();
