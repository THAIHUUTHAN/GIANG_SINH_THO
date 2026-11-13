/* =====================================================================
 *  ASCII Christmas Tree — vẽ cây thông bằng ký tự trên <canvas>
 *
 *  Cây là một hình nón 3D xoay quanh trục đứng, nhìn hơi từ trên xuống,
 *  được chiếu lên lưới ký tự. Cây được "dựng" theo từng giai đoạn:
 *    1. build    — vòng sáng trắng dựng thân cây từ dưới lên
 *    2. garland  — dải sáng quét từ trên xuống, để lại kim tuyến vàng
 *    3. baubles  — quả châu đỏ lần lượt xuất hiện
 *    4. gifts    — hộp quà rơi xuống gốc cây
 *    5. star     — ngôi sao trên đỉnh lóe sáng
 *    6. lights   — đèn nhấp nháy + dòng chữ MERRY CHRISTMAS
 * ===================================================================== */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;

  /* ---------- thời gian từng giai đoạn (giây) ---------- */
  const PH = {
    build0: 0.4, build1: 4.6,
    sweep0: 4.9, sweep1: 7.1,
    baub0: 7.0, baub1: 8.6,
    gift0: 8.4,
    star0: 9.5,
    light0: 10.0,
    msg: 10.6,
  };

  /* ---------- bảng màu ---------- */
  const RED = '#ff4d5e';
  const GOLD = '#ffc94a';
  const GREEN = '#4cd47a';
  const LIGHT_COLORS = ['#ffc94a', '#fff6e0', '#ff4d5e', '#5b8cff', '#ff8a3d', '#ffc94a', '#ff7ab8', '#fff6e0'];
  const LIGHT_CHARS = 'o@*0%O&';
  const RAMP = ['.:-~^\'', '=+~vx^', 'xov%*&W', '%&#@W0#'];
  const GARLAND = '~=@*#~=';
  const GREEN_LV = 7;
  const GREENS = [0, 1].map(v =>
    Array.from({ length: GREEN_LV }, (_, i) => {
      const k = i / (GREEN_LV - 1);
      return v === 0
        ? `hsl(134, 62%, ${(15 + k * 38).toFixed(1)}%)`
        : `hsl(104, 50%, ${(14 + k * 34).toFixed(1)}%)`;
    })
  );
  const GOLDS = Array.from({ length: 5 }, (_, i) => `hsl(${42 + i * 2}, 100%, ${46 + i * 7}%)`);
  const WHITES = ['#c9d3e6', '#e9eef8', '#ffffff'];
  const SKY = Array.from({ length: 5 }, (_, i) => `rgba(215, 225, 255, ${(0.14 + i * 0.18).toFixed(2)})`);
  const GROUND = Array.from({ length: 5 }, (_, i) => `rgba(150, 162, 195, ${(0.13 + i * 0.07).toFixed(3)})`);
  const GIFT_STYLES = {
    blue: { body: ['#24449f', '#2f55d4', '#3f6fff', '#6f96ff'], ribbon: '#f4f1e8', chars: '%#@&x+' },
    red: { body: ['#9c1a28', '#c9283a', '#ff4d5e', '#ff7a86'], ribbon: '#ffe0e4', chars: '%#x=+&X' },
    red2: { body: ['#8f1624', '#c4243a', '#f0425a', '#ff7a86'], ribbon: '#ffd25a', chars: '#%x+=&' },
  };
  const STAR_ART = [
    '     *     ',
    '    /#\\    ',
    '*##@@@@@##*',
    "  '#@@@#'  ",
    "  /#' '#\\  ",
  ];

  /* hash xác định -> [0, 1) */
  function hash(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(((c | 0) + 0x9e3779b9) | 0, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  const pick = (s, k) => s[Math.min(s.length - 1, (k * s.length) | 0)];
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

  class AsciiTree {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = Object.assign(
        {
          message: 'MERRY CHRISTMAS',
          subtitle: '',
          font: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
          fps: 30,
          onStats: null,
        },
        opts || {}
      );
      this.msg = this.opts.message.split('').join(' ');
      this.t = 0;
      this.rot = 0;
      this.running = false;
      this.frames = 0;
      this.fpsT = 0;
      this.stats = { rotation: 0, lights: 0, letters: 0, fps: 0, stage: 'init' };
      this._loop = this._loop.bind(this);
      this.resize();
    }

    /* ---------- kích thước & bố cục ---------- */
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      this.dpr = dpr;
      this.w = w;
      this.h = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      const ctx = this.ctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.font = `100px ${this.opts.font}`;
      const ratio = ctx.measureText('M').width / 100 || 0.6;
      const lineK = 1.16;
      const ROWS_TARGET = 48;
      const COLS_MIN = 64;
      const fontPx = Math.max(4.5, Math.min(h / ROWS_TARGET / lineK, w / COLS_MIN / ratio));
      this.fontPx = fontPx;
      this.fontStr = `${fontPx.toFixed(2)}px ${this.opts.font}`;
      this.cw = fontPx * ratio;
      this.ch = fontPx * lineK;
      this.cols = Math.max(10, Math.floor(w / this.cw));
      this.rows = Math.max(24, Math.floor(h / this.ch));
      this.ox = (w - this.cols * this.cw) / 2;
      this.oy = (h - this.rows * this.ch) / 2;
      this.yPad = (this.ch - fontPx) / 2;
      this.occ = new Uint8Array(this.cols * this.rows);
      this._layout();
      if (!this.running) this._frame();
    }

    radiusAt(y) {
      const t = (y - this.treeTop) / this.Ht;
      return this.Rb * (0.03 + 0.97 * t);
    }

    _layout() {
      const R = this.rows;
      const C = this.cols;
      const cx = (this.cx = C / 2);
      this.horizon = Math.round(R * 0.55);
      this.msgRow = R - 3;
      this.subRow = R - 1;
      this.starRow = Math.max(1, Math.round(R * 0.03));
      this.treeTop = this.starRow + 3;
      this.treeBase = Math.round(R * 0.82);
      this.Ht = this.treeBase - this.treeTop;
      const aspect = (this.aspect = this.ch / this.cw);
      this.Rb = Math.min(this.Ht * aspect * 0.4, C / 2 - 7);
      this.tiltK = 0.22 / aspect; // hàng lệch / cột bán kính: vòng tròn ngang -> elip
      const baseTilt = Math.round(this.Rb * this.tiltK);
      this.groundRow = this.treeBase + baseTilt;

      /* hộp quà */
      const giftH = w => Math.max(3, Math.round((w / aspect) * 1.05));
      const clampX = (x, w) => Math.max(1, Math.min(C - w - 1, x));
      const mk = (style, x, w, bottom, delay, hk) => {
        const h = Math.round(giftH(w) * (hk || 1));
        return { style, w, h, x0: clampX(Math.round(x), w), top: bottom - h + 1, delay };
      };
      const gw = Math.max(7, Math.round(this.Rb * 0.42));
      const frontBottom = Math.min(this.msgRow - 2, this.groundRow + 1);
      this.gifts = [
        mk('blue', cx - this.Rb * 1.18, gw, this.groundRow - 1, 0, 1.6),
        mk('red', cx + this.Rb * 0.74, gw, this.groundRow - 1, 0.3, 1.35),
        mk('red2', cx + this.Rb * 0.02, Math.max(6, gw - 2), frontBottom, 0.6, 1.15),
      ];

      /* quả châu: vị trí cố định trên bề mặt nón (xoay theo cây) */
      const N = Math.max(10, Math.min(34, Math.round(this.Ht * 0.55)));
      this.baubles = Array.from({ length: N }, (_, i) => {
        const t = 0.14 + 0.82 * hash(i, 3, 81);
        const k = hash(i, 4, 81);
        return {
          t,
          a0: hash(i, 1, 81) * TAU,
          big: t > 0.3,
          gold: k > 0.86,
          appear: PH.baub0 + hash(i, 2, 81) * (PH.baub1 - PH.baub0),
        };
      });

      /* bầu trời sao (cố định vị trí) */
      this.stars = [];
      for (let row = 0; row < R; row++) {
        const dens = row < this.horizon ? 0.05 : 0.008;
        for (let c = 0; c < C; c++) {
          if (hash(c, row, 31) > dens) continue;
          this.stars.push({ c, row, ch: pick('+++*.*·', hash(c, row, 32)), ph: hash(c, row, 33) * TAU, sp: 0.6 + hash(c, row, 34) * 2.2 });
        }
      }

      /* mặt sàn kẻ ô */
      this.ground = [];
      for (let row = this.horizon; row < R; row++) {
        const d = (row - this.horizon + 1) / (R - this.horizon);
        const lv = Math.min(4, Math.floor(d * 4.5));
        for (let c = 0; c < C; c++) {
          let ch = '';
          if ((row - this.horizon) % 2 === 0) ch = c % 2 === 0 ? '-' : '';
          else ch = (c + row) % 4 === 0 ? '.' : '';
          if (ch) this.ground.push({ c, row, ch, lv });
        }
      }

      /* tuyết rơi trong khung */
      const n = Math.round(C * 0.18);
      this.snow = Array.from({ length: n }, (_, i) => ({
        x: hash(i, 1, 51) * C,
        y: hash(i, 2, 51) * R,
        v: 1.5 + hash(i, 3, 51) * 3.5,
        sw: hash(i, 4, 51) * TAU,
        ch: pick('*..+*', hash(i, 5, 51)),
      }));
    }

    /* ---------- vòng lặp ---------- */
    start() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this._loop);
    }
    stop() {
      this.running = false;
    }
    _loop(now) {
      if (!this.running) return;
      requestAnimationFrame(this._loop);
      const dt = now - this.last;
      if (dt < 1000 / this.opts.fps - 3) return;
      this.last = now;
      const step = Math.min(dt, 100) / 1000;
      this.t += step;
      this.rot += step * 0.45;
      for (const s of this.snow) {
        s.y += s.v * step;
        s.x += Math.sin(this.t * 0.8 + s.sw) * step * 0.8;
        if (s.y >= this.rows) {
          s.y = -1;
          s.x = Math.random() * this.cols;
        }
      }
      this._frame();

      this.frames++;
      this.fpsT += dt;
      if (this.fpsT >= 500) {
        this.stats.fps = Math.round((this.frames * 1000) / this.fpsT);
        this.frames = 0;
        this.fpsT = 0;
        if (this.opts.onStats) this.opts.onStats(this.stats);
      }
    }

    /* ---------- vẽ một khung hình ---------- */
    _frame() {
      const ctx = this.ctx;
      const T = this.t;
      const C = this.cols;
      const R = this.rows;
      const cx = this.cx;
      const occ = this.occ;
      occ.fill(0);
      const buckets = new Map();
      const glow = [];
      let letters = 0;
      let lights = 0;

      const take = (c, r) => {
        if (c < 0 || c >= C || r < 0 || r >= R) return false;
        const i = r * C + c;
        if (occ[i]) return false;
        occ[i] = 1;
        return true;
      };
      const put = (color, ch, c, r) => {
        if (!take(c, r)) return;
        let b = buckets.get(color);
        if (!b) buckets.set(color, (b = []));
        b.push(ch, c, r);
        letters++;
      };
      const putGlow = (color, ch, c, r, a, blur) => {
        if (a <= 0.01 || !take(c, r)) return;
        glow.push(ch, c, r, color, a, blur);
        letters++;
      };

      const k01 = (a, b) => clamp01((T - a) / (b - a));
      const build = k01(PH.build0, PH.build1);
      const buildFrom = this.treeBase - build * (this.Ht + 0.5);
      const sweep = k01(PH.sweep0, PH.sweep1);
      const sweeping = sweep > 0 && sweep < 1;
      const sweepY = this.treeTop - 1 + sweep * (this.Ht + 3);
      const lightK = k01(PH.light0, PH.light0 + 1.2);

      this.stats.stage =
        T < PH.build0 ? 'init' : build < 1 ? `build ${Math.round(build * 100)}%` : T < PH.sweep1 ? 'garland' : T < PH.gift0 ? 'baubles' : T < PH.star0 ? 'gifts' : T < PH.light0 ? 'star' : 'lights ✓';

      /* 1. dòng chữ MERRY CHRISTMAS */
      if (T > PH.msg) {
        const msg = this.msg;
        const shown = Math.min(msg.length, ((T - PH.msg) * 10) | 0);
        const x0 = Math.round(cx - msg.length / 2);
        const tints = [RED, GOLD, GREEN];
        for (let i = 0; i < shown; i++) {
          const ch = msg[i];
          if (ch === ' ') continue;
          const tint = tints[((i >> 1) + ((T * 1.5) | 0)) % 3];
          putGlow(tint, ch, x0 + i, this.msgRow, Math.min(1, 0.85 + 0.25 * Math.sin(T * 5 + i)), this.fontPx * 0.8);
        }
        const sub = this.opts.subtitle;
        if (sub && shown >= msg.length && this.subRow < R && this.subRow > this.msgRow) {
          const a = Math.min(1, (T - PH.msg - msg.length / 10) / 1.5);
          const sx = Math.round(cx - sub.length / 2);
          for (let i = 0; i < sub.length; i++) if (sub[i] !== ' ') putGlow('#c9b98f', sub[i], sx + i, this.subRow, a * 0.75, 0);
        }
      }

      /* 2. ngôi sao: lóe trắng rồi chuyển vàng, có tia sáng */
      if (T > PH.star0) {
        const st = T - PH.star0;
        const flash = Math.max(0, 1 - st / 0.6); // 1 -> 0
        const a = Math.min(1, st / 0.25) * (0.85 + 0.15 * Math.sin(T * 3));
        const sx = Math.round(cx - 5.5);
        STAR_ART.forEach((line, dy) => {
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === ' ') continue;
            const color = flash > 0.35 ? '#ffffff' : ch === '@' ? '#fff4c2' : ch === '#' ? '#ffd25a' : '#ffb62e';
            putGlow(color, ch, sx + i, this.starRow + dy, a, this.fontPx * (1.3 + flash * 2));
          }
        });
        const scx = sx + 5;
        const scy = this.starRow + 2;
        const RAYS = [[0, -1, '|'], [1, 0, '-'], [-1, 0, '-'], [2, -1, '/'], [-2, -1, '\\'], [2, 1, '\\'], [-2, 1, '/']];
        const len = 5 + Math.round(flash * 10);
        for (const [dx, dy, ch] of RAYS) {
          for (let d = 1; d <= len; d++) {
            const c = scx + dx * (d + (dx && !dy ? 5 : 1));
            const r = scy + dy * (d + (dy && !dx ? 2 : 0));
            const fall = 1 - d / (len + 1);
            const al = (0.16 + 0.1 * Math.sin(T * 2.2 - d * 0.7)) * fall + flash * fall * 0.9;
            putGlow(flash > 0.2 ? '#ffffff' : '#ffd98a', ch, c, r, al, flash * this.fontPx);
          }
        }
      }

      /* 3. hộp quà rơi xuống */
      for (const g of this.gifts) {
        const k = k01(PH.gift0 + g.delay, PH.gift0 + g.delay + 0.4);
        if (k <= 0) continue;
        const drop = Math.round((1 - k) * (1 - k) * 6);
        this._gift(g, T, put, drop);
      }

      /* 4. quả châu */
      for (const b of this.baubles) {
        if (T < b.appear) continue;
        const y = this.treeTop + b.t * this.Ht;
        const r = this.radiusAt(y);
        const a = b.a0 + this.rot;
        const nx = Math.sin(a);
        const nz = Math.cos(a);
        if (nz < 0.12) continue;
        const col = Math.round(cx + r * nx * 0.9 - 0.5);
        const row = Math.round(y + nz * r * this.tiltK);
        const pop = T - b.appear < 0.18;
        const base = b.gold ? ['#fff0b8', '#ffc94a', '#e09a1c'] : ['#ffb3bc', '#ff3b4f', '#c81e33'];
        const shade = 0.55 + 0.45 * Math.max(0, -0.5 * nx + 0.86 * nz);
        const cells = b.big
          ? [[-1, 0, '&', 0], [0, 0, '@', 1], [1, 0, '0', 1], [-1, 1, '0', 1], [0, 1, '#', 1], [1, 1, '&', 2]]
          : [[0, 0, '@', 0], [1, 0, '0', 1]];
        for (const [dx, dy, ch, lv] of cells) {
          const color = pop ? '#ffffff' : base[lv];
          putGlow(color, ch, col + dx, row + dy, shade, this.fontPx * (pop ? 1.5 : 0.45));
        }
      }

      /* 4b. dải lấp lánh xoắn quanh cây (phần phía trước vẽ trước để che cây) */
      const swirlK = k01(PH.star0, PH.star0 + 1.6);
      const swirlBack = [];
      if (swirlK > 0) {
        const N = 84;
        const COLORS = ['#ffd25a', '#fff6e0', '#ffb3c6', '#ffe9a8'];
        for (let i = 0; i < N; i++) {
          const stream = i % 2;
          for (let j = 0; j < 4; j++) {
            const u = (((i / N + T * 0.055 - j * 0.005) % 1) + 1) % 1; // tiến độ từ gốc lên ngọn
            const y = this.treeBase + 1 - u * (this.Ht + 2);
            const r = this.radiusAt(Math.max(this.treeTop, y)) + 2.6 + (1 - u) * 2.2;
            const a = stream * Math.PI + u * TAU * 3 - T * 0.85;
            const nz = Math.cos(a);
            const col = Math.round(cx + r * Math.sin(a) - 0.5);
            const row = Math.round(y + nz * r * this.tiltK);
            const ends = Math.min(1, u / 0.08, (1 - u) / 0.08);
            const al = swirlK * ends * (0.4 + 0.6 * (0.5 + 0.5 * nz)) * (j === 0 ? 1 : 0.7 - j * 0.15);
            const ch = j === 0 ? (i % 4 === 0 ? '@' : '*') : j === 1 ? '+' : '.';
            const color = COLORS[(i >> 1) % COLORS.length];
            const item = [color, ch, col, row, al, j === 0 ? this.fontPx * 1.1 : this.fontPx * 0.5];
            if (nz > 0) putGlow(...item);
            else swirlBack.push(item);
          }
        }
      }

      /* 5. tuyết rơi phía trước */
      for (const s of this.snow) {
        const r = Math.floor(s.y);
        if (r >= this.msgRow - 1) continue;
        put('rgba(235, 242, 255, 0.5)', s.ch, Math.floor(s.x), r);
      }

      /* 6. vòng sáng dựng cây (mặt cắt + viền) */
      if (build > 0 && build < 1) {
        const y0 = Math.max(this.treeTop, buildFrom);
        const r0 = this.radiusAt(y0);
        const tl = r0 * this.tiltK;
        const n = Math.max(16, Math.ceil(TAU * r0 * 1.6));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          const c = Math.floor(cx + r0 * Math.sin(a));
          const rr = y0 + Math.cos(a) * tl;
          const ch = hash(i, (T * 12) | 0, 91) < 0.25 ? '=' : '#';
          putGlow(WHITES[2], ch, c, Math.round(rr), 0.95, this.fontPx * 0.9);
          if (Math.cos(a) > 0.2) putGlow(WHITES[1], '#', c, Math.round(rr) + 1, 0.8, this.fontPx * 0.6);
        }
        // mặt cắt bên trong
        for (let c = Math.ceil(cx - r0); c < cx + r0; c++) {
          const nx = (c + 0.5 - cx) / r0;
          if (Math.abs(nx) >= 1) continue;
          const nz = Math.sqrt(1 - nx * nx);
          for (let row = Math.round(y0 - nz * tl) + 1; row < Math.round(y0 + nz * tl); row++) {
            put(GREENS[0][2 + ((hash(c, row, 92) * 3) | 0)], pick('xv%&*', hash(c, row, 93)), c, row);
          }
        }
      }

      /* 7. bề mặt cây (hình nón 3D xoay) */
      const yStart = Math.max(this.treeTop, Math.ceil(buildFrom * 2) / 2);
      for (let y = yStart; y <= this.treeBase; y += 0.5) {
        const t = (y - this.treeTop) / this.Ht;
        const r = this.radiusAt(y);
        const tilt = r * this.tiltK;
        const yi = Math.round(y * 2);
        const bins = Math.max(10, Math.round(TAU * r * 0.8));
        const gwid = 0.045 + 0.35 / (TAU * r);
        const c0 = Math.ceil(cx - r - 0.5);
        const c1 = Math.floor(cx + r - 0.5);
        for (let c = c0; c <= c1; c++) {
          const nx = (c + 0.5 - cx) / r;
          if (nx < -1 || nx > 1) continue;
          const nz = Math.sqrt(1 - nx * nx);
          const row = Math.round(y + nz * tilt);
          let ang = Math.atan2(nx, nz) + this.rot;
          ang = ((ang % TAU) + TAU) % TAU;
          const bin = Math.floor((ang / TAU) * bins);
          // mép răng cưa
          if (Math.abs(nx) > 0.86 && hash(bin, yi, 9) < 0.45) continue;
          const lam = Math.max(0, -0.5 * nx + 0.86 * nz);
          const b = (0.32 + 0.68 * lam) * (0.72 + 0.28 * hash(bin, yi, 2));

          // dải sáng đang quét
          if (sweeping && Math.abs(y - sweepY) < 0.9) {
            put(WHITES[(b * 2.99) | 0], hash(c, yi, (T * 15) | 0) < 0.5 ? '=' : '#', c, row);
            continue;
          }
          // kim tuyến vàng xoắn quanh cây
          if (t > 0.05 && y < sweepY - 0.9) {
            const sp = (ang / TAU + t * 4.5) % 1;
            if (Math.abs(sp - 0.5) < gwid) {
              put(GOLDS[Math.min(4, (b * 5) | 0)], pick(GARLAND, hash(bin, yi, 8)), c, row);
              continue;
            }
          }
          // đèn nhấp nháy
          if (lightK > 0 && t > 0.04 && hash(bin, yi, 1) < 0.06) {
            const k = hash(bin, yi, 5);
            const color = LIGHT_COLORS[(k * LIGHT_COLORS.length) | 0];
            const tw = 0.5 + 0.5 * Math.sin(T * (1.5 + k * 3) + k * 40);
            putGlow(color, pick(LIGHT_CHARS, hash(bin, yi, 6)), c, row, lightK * (0.35 + 0.65 * tw) * (0.6 + 0.4 * lam), this.fontPx * 0.9);
            lights++;
            continue;
          }
          // lá thông
          const set = RAMP[Math.min(3, (b * 4) | 0)];
          let ch = pick(set, hash(bin, yi, 3));
          const fk = (T * 4) | 0;
          if (hash(c, row, fk) < 0.025) ch = pick(set, hash(c, row, fk + 7));
          put(GREENS[hash(bin, yi, 4) < 0.3 ? 1 : 0][Math.min(GREEN_LV - 1, (b * GREEN_LV) | 0)], ch, c, row);
        }
      }

      /* 7b. dải xoắn phía sau cây (chỉ hiện ở chỗ trống) */
      for (const it of swirlBack) putGlow(...it);

      /* 7c. đốm lấp lánh nhấp nháy quanh tán cây */
      const popK = k01(PH.build1, PH.build1 + 1.5);
      if (popK > 0) {
        const FR = '.+*+.';
        for (let i = 0; i < 30; i++) {
          const per = 1.6 + hash(i, 1, 141) * 1.8;
          const tt = T + hash(i, 2, 141) * per;
          const cyc = Math.floor(tt / per);
          const lt = (tt - cyc * per) / 0.75;
          if (lt >= 1) continue;
          const yy = this.treeTop + 2 + hash(i, cyc, 142) * (this.Ht - 1);
          const side = hash(i, cyc, 143) < 0.5 ? -1 : 1;
          const col = Math.round(cx + side * (this.radiusAt(yy) + 1.5 + hash(i, cyc, 144) * 5) - 0.5);
          const color = hash(i, cyc, 145) < 0.6 ? '#ffe9a8' : '#ffffff';
          putGlow(color, FR[Math.min(4, (lt * 5) | 0)], col, Math.round(yy), popK * (1 - Math.abs(lt - 0.5)), this.fontPx * 1.2);
        }
      }

      /* 7d. sao băng thỉnh thoảng vụt qua bầu trời */
      if (T > PH.star0) {
        const P = 6.5;
        const cyc = Math.floor(T / P);
        const lt = T - cyc * P;
        if (lt < 1.1) {
          const x0 = C * (0.08 + 0.5 * hash(cyc, 1, 151));
          const y0 = 1 + this.horizon * 0.35 * hash(cyc, 2, 151);
          const v = 38;
          const hx = x0 + lt * v * 2;
          const hy = y0 + lt * v * 0.5;
          const fade = Math.min(1, lt / 0.15, (1.1 - lt) / 0.3);
          for (let j = 0; j < 9; j++) {
            const c = Math.round(hx - j * 2);
            const r = Math.round(hy - j * 0.5);
            if (r >= this.horizon) continue;
            putGlow(j === 0 ? '#ffffff' : '#cfe0ff', j === 0 ? '*' : j < 4 ? '-' : '.', c, r, fade * (1 - j / 9), j === 0 ? this.fontPx * 1.4 : 0);
          }
        }
      }

      /* 8. mặt sàn */
      for (const g of this.ground) put(GROUND[g.lv], g.ch, g.c, g.row);

      /* 9. bầu trời sao */
      for (const s of this.stars) {
        const a = 0.5 + 0.5 * Math.sin(T * s.sp + s.ph);
        put(SKY[Math.min(4, (a * 5) | 0)], s.ch, s.c, s.row);
      }

      /* ---------- vẽ ra canvas ---------- */
      ctx.clearRect(0, 0, this.w, this.h);
      if (build > 0) {
        const gx = this.ox + cx * this.cw;
        const gy = this.oy + (this.treeTop + this.Ht * 0.62) * this.ch;
        const rad = Math.max(10, this.Rb * this.cw * 1.55);
        const pulse = (0.85 + 0.15 * Math.sin(T * 1.3)) * Math.min(1, build * 1.2);
        const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
        grd.addColorStop(0, `rgba(255, 196, 92, ${(0.22 * pulse).toFixed(3)})`);
        grd.addColorStop(0.45, `rgba(255, 120, 90, ${(0.09 * pulse).toFixed(3)})`);
        grd.addColorStop(1, 'rgba(255, 120, 90, 0)');
        ctx.fillStyle = grd;
        ctx.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
        // vũng sáng dưới gốc
        const fy = this.oy + (this.groundRow + 1) * this.ch;
        ctx.save();
        ctx.translate(gx, fy);
        ctx.scale(1, 0.22);
        const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, rad * 1.1);
        g2.addColorStop(0, `rgba(255, 210, 120, ${(0.14 * pulse).toFixed(3)})`);
        g2.addColorStop(1, 'rgba(255, 210, 120, 0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(0, 0, rad * 1.1, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.font = this.fontStr;
      ctx.textBaseline = 'top';
      const { ox, oy, cw, yPad } = this;
      const chh = this.ch;
      for (const [color, arr] of buckets) {
        ctx.fillStyle = color;
        for (let i = 0; i < arr.length; i += 3) ctx.fillText(arr[i], ox + arr[i + 1] * cw, oy + arr[i + 2] * chh + yPad);
      }
      ctx.save();
      for (let i = 0; i < glow.length; i += 6) {
        const color = glow[i + 3];
        ctx.globalAlpha = Math.max(0, Math.min(1, glow[i + 4]));
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow[i + 5] * this.dpr;
        ctx.fillText(glow[i], ox + glow[i + 1] * cw, oy + glow[i + 2] * chh + yPad);
      }
      ctx.restore();

      this.stats.rotation = ((this.rot * 180) / Math.PI) % 360;
      this.stats.lights = lights;
      this.stats.letters = letters;
    }

    _gift(g, T, put, drop) {
      const st = GIFT_STYLES[g.style];
      const mid = (g.w - 1) / 2;
      const midR = Math.floor(g.h * 0.4);
      const top = g.top - drop;
      const bc = Math.round(g.x0 + mid);
      put(st.ribbon, '@', bc - 1, top - 1);
      put(st.ribbon, '&', bc, top - 1);
      put(st.ribbon, '@', bc + 1, top - 1);
      const slow = (T * 1.2) | 0;
      for (let r = 0; r < g.h; r++) {
        const row = top + r;
        for (let c = 0; c < g.w; c++) {
          const col = g.x0 + c;
          const ribV = Math.abs(c - mid) < 0.75;
          const ribH = r === midR;
          if (ribV || ribH) {
            put(st.ribbon, ribV && ribH ? '#' : ribV ? 'X' : '=', col, row);
            continue;
          }
          const edge = c === 0 || c === g.w - 1 || r === g.h - 1;
          const k = hash(col, row, slow + g.w * 97);
          let lv = edge ? (hash(col, row, 71) < 0.5 ? 0 : 1) : 1 + ((hash(col, row, 72) * (st.body.length - 1)) | 0);
          if (r === 0) lv = st.body.length - 1;
          put(st.body[Math.min(st.body.length - 1, lv)], pick(st.chars, k), col, row);
        }
      }
    }
  }

  AsciiTree.FINALE = PH.msg + 2.2; // thời điểm cây dựng xong hoàn toàn (giây)
  global.AsciiTree = AsciiTree;
})(window);
