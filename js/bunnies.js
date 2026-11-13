/* =====================================================================
 *  Thỏ trang trí màn hình mở quà
 *  - Thỏ vẽ bằng SVG, nét viền kiểu bút sáp, tai hồng, má hồng, khăn đỏ
 *  - Nhiều chú to nhỏ đặt chồng lên nhau ở các góc, vài chú "ló" từ mép màn hình
 *  - Chạm vào màn hình: toả hạt lấp lánh; chạm vào thỏ: thỏ nhún + tim bay lên
 * ===================================================================== */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);

  /* ---------- bộ lọc tạo nét bút sáp (dùng chung) ---------- */
  const DEFS = `
<svg class="bn-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
  <defs>
    <filter id="bnCrayon" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="1" seed="3" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.95" result="ga"/>
      <feComposite in="d" in2="ga" operator="in"/>
    </filter>
    <filter id="bnBrush" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05 0.7" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="5" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.55" result="ga"/>
      <feComposite in="d" in2="ga" operator="in"/>
    </filter>
    <filter id="bnSoft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.8"/>
    </filter>
    <linearGradient id="bnTail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b84a4c"/>
      <stop offset="0.7" stop-color="#b84a4c" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#b84a4c" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
</svg>`;

  /* ---------- một chú thỏ ---------- */
  function bunnySVG() {
    return `
<svg viewBox="-12 -12 224 260" class="bn-svg" aria-hidden="true" focusable="false">
  <g class="bn-sticker" fill="#fff8f1" stroke="#fff8f1" stroke-width="22" stroke-linejoin="round" stroke-linecap="round">
    <path d="M46 184 C26 182 20 150 34 136 C40 129 48 126 56 127 C50 100 46 58 62 38 C74 22 96 24 100 46 C104 28 128 20 140 36 C152 54 150 100 146 127 C156 125 166 130 170 140 C182 156 176 182 156 186 Z"/>
    <path d="M30 168 C70 178 130 178 174 166 L176 196 C132 205 70 205 30 196 Z"/>
    <path d="M34 190 L66 192 L64 226 C56 233 44 231 37 224 Z"/>
  </g>
  <path class="bn-head" d="M46 184 C26 182 20 150 34 136 C40 129 48 126 56 127 C50 100 46 58 62 38 C74 22 96 24 100 46 C104 28 128 20 140 36 C152 54 150 100 146 127 C156 125 166 130 170 140 C182 156 176 182 156 186 Z" fill="#fffdfb"/>
  <g filter="url(#bnSoft)" opacity="0.95">
    <ellipse cx="77" cy="80" rx="9" ry="23" fill="#f6c3c6" transform="rotate(-5 77 80)"/>
    <ellipse cx="124" cy="80" rx="9" ry="23" fill="#f6c3c6" transform="rotate(5 124 80)"/>
    <ellipse cx="54" cy="160" rx="13" ry="7" fill="#f3aeb4"/>
    <ellipse cx="148" cy="160" rx="13" ry="7" fill="#f3aeb4"/>
  </g>
  <g filter="url(#bnCrayon)" fill="none" stroke="#1d1b1b" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M46 184 C26 182 20 150 34 136 C40 129 48 126 56 127 C50 100 46 58 62 38 C74 22 96 24 100 46 C101 60 100 76 100 90"/>
    <path d="M101 50 C104 28 128 20 140 36 C152 54 150 100 146 127 C156 125 166 130 170 140 C182 156 176 182 156 186"/>
  </g>
  <g class="bn-eyes" filter="url(#bnCrayon)" fill="#1d1b1b">
    <ellipse cx="84" cy="150" rx="4.6" ry="8"/>
    <ellipse cx="118" cy="150" rx="4.6" ry="8"/>
  </g>
  <g filter="url(#bnBrush)">
    <path d="M30 168 C70 178 130 178 174 166 L176 196 C132 205 70 205 30 196 Z" fill="#b84a4c"/>
    <path d="M34 190 L66 192 L64 226 C56 233 44 231 37 224 Z" fill="url(#bnTail)"/>
  </g>
</svg>`;
  }

  function makeBunny(cls, tilt, delay) {
    const el = document.createElement('div');
    el.className = `bunny ${cls}`;
    el.style.setProperty('--tilt', `${tilt}deg`);
    el.style.setProperty('--d', `${delay}s`);
    el.innerHTML = `<div class="bunny-bob"><div class="bunny-jump">${bunnySVG()}</div></div>`;
    return el;
  }

  /* ---------- bày trí: to nhỏ, chồng lên nhau ---------- */
  const LAYOUT = [
    // [lớp vị trí, góc nghiêng, độ trễ nhún]
    ['b-sm-l', -16, 0.9],
    ['b-big-l', -6, 0],
    ['b-mid-l', 9, 0.5],
    ['b-big-r', 5, 0.3],
    ['b-sm-r', -11, 1.1],
    ['b-peek-r', -90, 0.7],
    ['b-peek-t', 180, 1.4],
    ['b-tiny t1', -14, 0.2],
    ['b-tiny t2', 12, 1.0],
    ['b-tiny t3', 8, 1.6],
    ['b-tiny t4', -9, 0.6],
    ['b-tiny t5', 16, 1.3],
  ];

  function boing(b) {
    const j = b.querySelector('.bunny-jump');
    j.classList.remove('boing');
    void j.offsetWidth;
    j.classList.add('boing');
  }

  function init() {
    const intro = $('#intro');
    const layer = $('#bunnies');
    if (!intro || !layer) return;
    document.body.insertAdjacentHTML('afterbegin', DEFS);
    LAYOUT.forEach(([cls, tilt, d]) => layer.appendChild(makeBunny(cls, tilt, d)));

    // chú thỏ nhỏ ló sau góc hộp quà
    const gift = $('#gift');
    if (gift) {
      const gb = document.createElement('span');
      gb.className = 'gift-bunny';
      gb.setAttribute('aria-hidden', 'true');
      gb.innerHTML = `<span class="bunny-jump">${bunnySVG()}</span>`;
      gift.insertBefore(gb, gift.firstChild);
    }

    const FX = global.FX;
    // chạm: toả hạt lấp lánh; chạm thỏ: thỏ nhún + tim
    intro.addEventListener('pointerdown', e => {
      if (!FX) return;
      const b = e.target.closest('.bunny');
      if (b) {
        boing(b);
        FX.sparkle(e.clientX, e.clientY, 26, { power: 1.4 });
        FX.hearts(e.clientX, e.clientY - 10, 5);
      } else if (!e.target.closest('#gift')) {
        FX.sparkle(e.clientX, e.clientY, 16);
      }
    });
    // kéo / vuốt: vệt lấp lánh
    let lastTrail = 0;
    intro.addEventListener('pointermove', e => {
      if (!FX || !(e.buttons || e.pointerType === 'touch')) return;
      const now = performance.now();
      if (now - lastTrail < 35) return;
      lastTrail = now;
      FX.sparkle(e.clientX, e.clientY, 3, { power: 0.4, life: 0.8 });
    });
    // rê chuột ngang qua thỏ (máy tính): nhún nhẹ
    layer.addEventListener('pointerover', e => {
      const b = e.target.closest('.bunny');
      if (b && e.pointerType === 'mouse') boing(b);
    });
  }

  // khi mở quà: tất cả thỏ cùng nhảy
  function party() {
    document.querySelectorAll('#bunnies .bunny').forEach((b, i) => setTimeout(() => boing(b), i * 40));
  }

  global.Bunnies = { party, svg: bunnySVG };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
