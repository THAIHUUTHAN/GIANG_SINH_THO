/* =====================================================================
 *  FX — hệ thống hạt dùng chung (vẽ trên canvas #fx phủ toàn màn hình)
 *    FX.sparkle(x, y, n, opts) : hạt lấp lánh hình sao 4 cánh + chấm sáng
 *    FX.hearts(x, y, n)        : tim nhỏ bay lên
 *    FX.confetti(x, y)         : pháo giấy lúc mở hộp quà
 * ===================================================================== */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];

  const cv = document.getElementById('fx');
  const ctx = cv.getContext('2d');
  let W = 0;
  let H = 0;
  let dpr = 1;
  let ps = [];
  let running = false;
  let last = 0;

  function resize() {
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    W = global.innerWidth;
    H = global.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  global.addEventListener('resize', resize);

  function add(list) {
    // giới hạn số hạt để máy yếu vẫn mượt
    ps.push(...list);
    if (ps.length > 700) ps.splice(0, ps.length - 700);
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function star4(r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rr = i % 2 === 0 ? r : r * 0.26;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  function heart(s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
    ctx.fill();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    ps = ps.filter(p => (p.t += dt) < p.life);
    for (const p of ps) {
      p.vy += p.g * dt;
      p.vx *= 1 - p.drag * dt;
      p.vy *= 1 - p.drag * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const k = p.t / p.life;
      const tw = p.tw ? 0.55 + 0.45 * Math.sin(p.t * p.tw + p.ph) : 1;
      const a = Math.max(0, Math.min(1, (1 - k * k) * tw));
      if (a <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.shadowColor = p.glowC || p.c;
      ctx.shadowBlur = p.glow * dpr;
      const s = p.s * (p.kind === 'star' ? 1 - 0.55 * k : 1 - 0.3 * k);
      if (p.kind === 'star') star4(s);
      else if (p.kind === 'dot') {
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, TAU);
        ctx.fill();
      } else if (p.kind === 'heart') heart(s);
      else {
        ctx.font = `${p.s}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.ch, 0, 0);
      }
      ctx.restore();
    }
    if (ps.length) requestAnimationFrame(loop);
    else {
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }

  const SPARK_COLORS = ['#fff7dc', '#ffe08a', '#ffd25a', '#ffffff', '#ffc2cf', '#ff9db0'];

  function sparkle(x, y, n, opts) {
    opts = opts || {};
    const N = n || 16;
    const power = opts.power || 1;
    const list = [];
    for (let i = 0; i < N; i++) {
      const a = rand(0, TAU);
      const v = rand(60, 230) * power;
      const isStar = Math.random() < 0.62;
      list.push({
        kind: isStar ? 'star' : 'dot',
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 40 * power,
        g: 120,
        drag: 2.2,
        rot: rand(0, TAU),
        vr: rand(-3, 3),
        s: isStar ? rand(4, 9) * (opts.size || 1) : rand(1.2, 2.6) * (opts.size || 1),
        c: pick(opts.colors || SPARK_COLORS),
        glow: isStar ? 12 : 8,
        tw: rand(14, 26),
        ph: rand(0, TAU),
        t: 0,
        life: rand(0.6, 1.15) * (opts.life || 1),
      });
    }
    add(list);
  }

  function hearts(x, y, n) {
    const list = [];
    for (let i = 0; i < (n || 6); i++) {
      list.push({
        kind: 'heart',
        x: x + rand(-14, 14),
        y: y + rand(-6, 6),
        vx: rand(-70, 70),
        vy: rand(-220, -120),
        g: 90,
        drag: 1.4,
        rot: rand(-0.4, 0.4),
        vr: rand(-1.2, 1.2),
        s: rand(6, 11),
        c: pick(['#ff6f86', '#ff9db0', '#e8434f', '#ffc2cf']),
        glow: 10,
        tw: 0,
        ph: 0,
        t: 0,
        life: rand(0.9, 1.4),
      });
    }
    add(list);
  }

  function confetti(x, y) {
    const colors = ['#ff4d5e', '#ffc94a', '#4cd47a', '#fff6e0', '#ff7ab8', '#5b8cff'];
    const chars = '*+♥o.x*#@';
    const list = [];
    for (let i = 0; i < 160; i++) {
      const a = rand(0, TAU);
      const v = rand(180, 800);
      list.push({
        kind: 'glyph',
        ch: pick(chars),
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 260,
        g: 700,
        drag: 1.2,
        rot: 0,
        vr: 0,
        s: rand(12, 28),
        c: pick(colors),
        glow: 10,
        tw: 0,
        ph: 0,
        t: 0,
        life: rand(1.2, 2.3),
      });
    }
    add(list);
    sparkle(x, y, 40, { power: 2.4, size: 1.4, life: 1.3 });
  }

  global.FX = { sparkle, hearts, confetti };
})(window);
