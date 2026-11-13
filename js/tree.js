/* =====================================================================
 *  ASCII Christmas Tree — vẽ cây thông bằng ký tự trên <canvas>
 *  Cây là một hình nón 3D xoay quanh trục đứng, được chiếu lên lưới ký tự.
 * ===================================================================== */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;

  /* ---------- bảng màu ---------- */
  const RED = '#ff4d5e';
  const GOLD = '#ffc94a';
  const GREEN = '#4cd47a';
  const LIGHT_COLORS = ['#ff4d5e', '#ffc94a', '#5b8cff', '#ff8a3d', '#ff7ab8', '#fff6e0', '#ffc94a', '#ff4d5e', '#4ad9ff'];
  const LIGHT_CHARS = 'o@*0%O&';
  const RAMP = ['.:-~^\'', '=+~vx^', 'xov%*&W', '%&#@W0#'];
  const GARLAND = '~=~*~-';
  const GREEN_LV = 7;
  const GREENS = [0, 1].map(v =>
    Array.from({ length: GREEN_LV }, (_, i) => {
      const k = i / (GREEN_LV - 1);
      return v === 0
        ? `hsl(138, 58%, ${(14 + k * 40).toFixed(1)}%)`
        : `hsl(100, 46%, ${(13 + k * 36).toFixed(1)}%)`;
    })
  );
  const GOLDS = Array.from({ length: 5 }, (_, i) => `hsla(43, 100%, ${48 + i * 6}%, ${(0.35 + i * 0.15).toFixed(2)})`);
  const SKY = Array.from({ length: 5 }, (_, i) => `rgba(200, 215, 255, ${(0.12 + i * 0.17).toFixed(2)})`);
  const GROUND = Array.from({ length: 5 }, (_, i) => `rgba(140, 155, 195, ${(0.10 + i * 0.075).toFixed(3)})`);
  const TRUNK = ['#6e3a22', '#8f4b2c', '#ad5f37'];
  const GIFT_STYLES = [
    { body: ['#24449f', '#2f55d4', '#3f6fff', '#6f96ff'], ribbon: '#ffd25a', chars: '%#@&x+' },
    { body: ['#9c1a28', '#c9283a', '#ff4d5e', '#ff7a86'], ribbon: '#ffd25a', chars: '%#x=+&' },
    { body: ['#18703a', '#25964e', '#3cc46c'], ribbon: '#ff4d5e', chars: '#%x+=' },
  ];
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
      this.stats = { rotation: 0, lights: 0, letters: 0, fps: 0 };
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
      const ROWS_TARGET = 56;
      const COLS_MIN = 62;
      const fontPx = Math.max(4.5, Math.min(h / ROWS_TARGET / lineK, w / COLS_MIN / ratio));
      this.fontPx = fontPx;
      this.fontStr = `${fontPx.toFixed(2)}px ${this.opts.font}`;
      this.cw = fontPx * ratio;
      this.ch = fontPx * lineK;
      this.cols = Math.max(10, Math.floor(w / this.cw));
      this.rows = Math.max(20, Math.floor(h / this.ch));
      this.ox = (w - this.cols * this.cw) / 2;
      this.oy = (h - this.rows * this.ch) / 2;
      this.yPad = (this.ch - fontPx) / 2;
      this.occ = new Uint8Array(this.cols * this.rows);
      this._layout();
      if (!this.running) this._frame();
    }

    _layout() {
      const R = this.rows;
      const C = this.cols;
      this.cx = C / 2;
      this.msgRow = R - 4;
      this.subRow = R - 2;
      this.treeBase = Math.round(R * 0.73);
      this.starRow = Math.max(1, Math.round(R * 0.05));
      this.treeTop = this.starRow + 4;
      this.Ht = this.treeBase - this.treeTop;
      const aspect = this.ch / this.cw;
      this.aspect = aspect;
      this.Rb = Math.min(this.Ht * aspect * 0.41, C / 2 - 3);

      // bán kính từng hàng: hình nón có các tầng cành
      this.radius = [];
      for (let row = this.treeTop; row <= this.treeBase; row++) {
        const t = (row - this.treeTop) / this.Ht;
        const local = (t * 6) % 1;
        let r = this.Rb * (0.04 + 0.96 * t) * (0.84 + 0.16 * Math.pow(local, 0.7));
        r += (hash(row, 7, 0) - 0.5) * 1.1;
        this.radius[row] = Math.max(0.6, r);
      }

      // thân cây
      this.trunkW = Math.max(2, Math.round(this.Rb * 0.14));

      // hộp quà dưới gốc
      const gw = Math.max(7, Math.round(this.Rb * 0.5));
      const gh = Math.max(4, Math.round(gw / aspect * 1.05));
      const bottom = this.treeBase + 3;
      const cx = this.cx;
      const clampX = (x, w) => Math.max(1, Math.min(C - w - 1, x));
      this.gifts = [
        { style: 0, w: gw, h: gh, x0: clampX(Math.round(cx - this.Rb - gw * 0.35), gw), top: bottom - gh + 1 },
        { style: 1, w: gw - 1, h: gh - 1, x0: clampX(Math.round(cx + this.Rb - gw * 0.7), gw - 1), top: bottom - gh + 2 },
        { style: 2, w: Math.max(5, gw - 4), h: Math.max(3, gh - 2), x0: clampX(Math.round(cx + this.Rb + gw * 0.05), Math.max(5, gw - 4)), top: bottom - Math.max(3, gh - 2) + 1 },
      ];

      // các ngôi sao nền (cố định vị trí)
      this.stars = [];
      for (let row = 0; row < this.treeBase; row++) {
        for (let c = 0; c < C; c++) {
          const k = hash(c, row, 31);
          if (k > 0.034) continue;
          const rr = this.radius[row];
          if (rr !== undefined && Math.abs(c + 0.5 - cx) < rr + 2) continue;
          this.stars.push({ c, row, ch: pick('++..*·+', hash(c, row, 32)), ph: hash(c, row, 33) * TAU, sp: 0.6 + hash(c, row, 34) * 2.2 });
        }
      }

      // mặt đất
      this.ground = [];
      const g0 = this.treeBase + 1;
      for (let row = g0; row < R; row++) {
        const d = (row - g0 + 1) / (R - g0);
        for (let c = 0; c < C; c++) {
          const ex = (c + 0.5 - cx) / (this.Rb * 1.25);
          const ey = (row - (this.treeBase + 2)) / 2.6;
          const shadow = ex * ex + ey * ey < 1;
          const dens = (shadow ? 0.08 : 0.2) + 0.38 * d;
          if (hash(c, row, 21) > dens) continue;
          this.ground.push({ c, row, ch: pick('..--_:.,-', hash(c, row, 22)), lv: Math.min(4, (d * 3 + hash(c, row, 23) * 2) | 0) });
        }
      }

      // tuyết rơi trong khung
      const n = Math.round(C * 0.22);
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
      this._update(step);
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
    _update(dt) {
      for (const s of this.snow) {
        s.y += s.v * dt;
        s.x += Math.sin(this.t * 0.8 + s.sw) * dt * 0.8;
        if (s.y >= this.rows) {
          s.y = -1;
          s.x = Math.random() * this.cols;
        }
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
        if (!take(c, r)) return;
        glow.push(ch, c, r, color, a, blur);
        letters++;
      };

      // tiến trình "in" cảnh từ trên xuống
      const p = Math.min(1, Math.max(0, (T - 0.2) / 3.2));
      const rev = -1 + p * (R + 2);

      /* 1. dòng chữ MERRY CHRISTMAS */
      const T_MSG = 3.5;
      if (T > T_MSG) {
        const msg = this.msg;
        const shown = Math.min(msg.length, ((T - T_MSG) * 10) | 0);
        const x0 = Math.round(cx - msg.length / 2);
        const tints = [RED, GOLD, GREEN];
        for (let i = 0; i < shown; i++) {
          const ch = msg[i];
          if (ch === ' ') continue;
          const tint = tints[((i >> 1) + ((T * 1.5) | 0)) % 3];
          putGlow(tint, ch, x0 + i, this.msgRow, Math.min(1, 0.85 + 0.25 * Math.sin(T * 5 + i)), this.fontPx * 0.8);
        }
        const sub = this.opts.subtitle;
        if (sub && shown >= msg.length && this.subRow < R) {
          const a = Math.min(1, (T - T_MSG - msg.length / 10) / 1.5);
          const sx = Math.round(cx - sub.length / 2);
          for (let i = 0; i < sub.length; i++) {
            if (sub[i] !== ' ') putGlow('#c9b98f', sub[i], sx + i, this.subRow, a * 0.75, 0);
          }
        }
      }

      /* 2. ngôi sao đỉnh cây */
      if (T > 0.1) {
        const a = Math.min(1, T / 0.8) * (0.82 + 0.18 * Math.sin(T * 3));
        const sx = Math.round(cx - 5.5);
        STAR_ART.forEach((line, dy) => {
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === ' ') continue;
            const color = ch === '@' ? '#fff4c2' : ch === '#' ? '#ffd25a' : '#ffb62e';
            putGlow(color, ch, sx + i, this.starRow + dy, a, this.fontPx * 1.4);
          }
        });
        // tia sáng hai bên
        const sr = this.starRow + 2;
        for (let d = 0; d < 6; d++) {
          const k = 0.5 + 0.5 * Math.sin(T * 2.4 - d * 0.9);
          const al = (1 - d / 6) * k * 0.6 * Math.min(1, T / 1.2);
          putGlow('#ffcf6a', '-', sx - 2 - d * 2, sr, al, 0);
          putGlow('#ffcf6a', '-', sx + 12 + d * 2, sr, al, 0);
        }
        for (let d = 1; d <= 2; d++) {
          if (this.starRow - d >= 0) putGlow('#ffcf6a', ':', sx + 5, this.starRow - d, 0.4 * (1 - d / 3) * (0.5 + 0.5 * Math.sin(T * 2 - d)), 0);
        }
      }

      /* 3. hộp quà */
      for (const g of this.gifts) this._gift(g, T, put, rev);

      /* 4. thân cây */
      for (let row = this.treeBase + 1; row <= this.treeBase + 3; row++) {
        if (row > rev) break;
        for (let c = Math.round(cx - this.trunkW); c < Math.round(cx + this.trunkW); c++) {
          const k = hash(c, row, ((T * 2) | 0) + 61);
          put(TRUNK[(hash(c, row, 62) * 3) | 0], pick('#%=x+#', k), c, row);
        }
      }

      /* 5. tuyết rơi phía trước cây */
      if (p > 0.3) {
        for (const s of this.snow) {
          const c = Math.floor(s.x);
          const r = Math.floor(s.y);
          if (r >= this.msgRow - 1) continue;
          put('rgba(235, 242, 255, 0.55)', s.ch, c, r);
        }
      }

      /* 6. thân cây thông (hình nón 3D xoay) */
      for (let row = this.treeTop; row <= this.treeBase; row++) {
        if (row > rev) break;
        const r = this.radius[row];
        const tRow = (row - this.treeTop) / this.Ht;
        const bins = Math.max(10, Math.round(TAU * r * 0.8));
        const gw = 2.2 / this.Ht / 2 + 0.6 / (TAU * r);
        const c0 = Math.ceil(cx - r - 0.5);
        const c1 = Math.floor(cx + r - 0.5);
        for (let c = c0; c <= c1; c++) {
          const nx = (c + 0.5 - cx) / r;
          if (nx < -1 || nx > 1) continue;
          const nz = Math.sqrt(1 - nx * nx);
          let ang = Math.atan2(nx, nz) + this.rot;
          ang = ((ang % TAU) + TAU) % TAU;
          const bin = Math.floor((ang / TAU) * bins);
          const lam = Math.max(0, -0.55 * nx + 0.83 * nz);
          let b = (0.3 + 0.7 * lam) * (0.72 + 0.28 * hash(bin, row, 2));

          // đèn nhấp nháy
          const hv = hash(bin, row, 1);
          if (hv < 0.08 && tRow > 0.05) {
            const k = hash(bin, row, 5);
            const color = LIGHT_COLORS[(k * LIGHT_COLORS.length) | 0];
            const tw = 0.5 + 0.5 * Math.sin(T * (1.5 + k * 3) + k * 40);
            const a = (0.35 + 0.65 * tw) * (0.6 + 0.4 * lam);
            putGlow(color, pick(LIGHT_CHARS, hash(bin, row, 6)), c, row, a, this.fontPx * 0.9);
            lights++;
            continue;
          }

          // dây kim tuyến xoắn
          const sp = (ang / TAU + tRow * 2.2) % 1;
          if (Math.abs(sp - 0.5) < gw && tRow > 0.08) {
            put(GOLDS[Math.min(4, (b * 5) | 0)], pick(GARLAND, hash(bin, row, 8)), c, row);
            continue;
          }

          // lá thông
          const lvl = Math.min(3, (b * 4) | 0);
          const set = RAMP[lvl];
          let ch = pick(set, hash(bin, row, 3));
          const fk = (T * 4) | 0;
          if (hash(c, row, fk) < 0.025) ch = pick(set, hash(c, row, fk + 7));
          const variant = hash(bin, row, 4) < 0.3 ? 1 : 0;
          put(GREENS[variant][Math.min(GREEN_LV - 1, (b * GREEN_LV) | 0)], ch, c, row);
        }
      }

      /* 7. vệt quét lúc cây đang hiện ra */
      if (p < 1) {
        const row = Math.floor(rev) + 1;
        const rr = this.radius[row] !== undefined ? this.radius[row] : this.Rb * 0.9;
        const fk = (T * 20) | 0;
        for (let c = Math.ceil(cx - rr); c < cx + rr; c++) {
          if (hash(c, row, fk) < 0.5) put(hash(c, row, fk + 1) < 0.5 ? '#fff3c4' : '#ffc94a', pick('*+x#@%', hash(c, row, fk + 2)), c, row);
        }
      }

      /* 8. mặt đất */
      const gk = (T * 2) | 0;
      for (const g of this.ground) {
        if (g.row > rev) continue;
        if (hash(g.c, g.row, gk) < 0.008) put('rgba(255, 255, 255, 0.8)', '*', g.c, g.row);
        else put(GROUND[g.lv], g.ch, g.c, g.row);
      }

      /* 9. bầu trời sao */
      for (const s of this.stars) {
        const a = 0.5 + 0.5 * Math.sin(T * s.sp + s.ph);
        put(SKY[Math.min(4, (a * 5) | 0)], s.ch, s.c, s.row);
      }

      /* ---------- vẽ ra canvas ---------- */
      ctx.clearRect(0, 0, this.w, this.h);
      ctx.font = this.fontStr;
      ctx.textBaseline = 'top';
      const { ox, oy, cw, yPad } = this;
      const ch = this.ch;
      for (const [color, arr] of buckets) {
        ctx.fillStyle = color;
        for (let i = 0; i < arr.length; i += 3) ctx.fillText(arr[i], ox + arr[i + 1] * cw, oy + arr[i + 2] * ch + yPad);
      }
      ctx.save();
      for (let i = 0; i < glow.length; i += 6) {
        const color = glow[i + 3];
        ctx.globalAlpha = Math.max(0, Math.min(1, glow[i + 4]));
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow[i + 5] * this.dpr;
        ctx.fillText(glow[i], ox + glow[i + 1] * cw, oy + glow[i + 2] * ch + yPad);
      }
      ctx.restore();

      const deg = ((this.rot * 180) / Math.PI) % 360;
      this.stats.rotation = deg;
      this.stats.lights = lights;
      this.stats.letters = letters;
    }

    _gift(g, T, put, rev) {
      const st = GIFT_STYLES[g.style];
      const mid = (g.w - 1) / 2;
      const midR = Math.floor(g.h * 0.4);
      // nơ
      const br = g.top - 1;
      if (br <= rev) {
        const bc = Math.round(g.x0 + mid);
        put(st.ribbon, '@', bc - 1, br);
        put(st.ribbon, '&', bc, br);
        put(st.ribbon, '@', bc + 1, br);
      }
      const slow = (T * 1.2) | 0;
      for (let r = 0; r < g.h; r++) {
        const row = g.top + r;
        if (row > rev) continue;
        for (let c = 0; c < g.w; c++) {
          const col = g.x0 + c;
          const ribV = Math.abs(c - mid) < 0.75;
          const ribH = r === midR;
          if (ribV || ribH) {
            put(st.ribbon, ribV && ribH ? '#' : ribV ? '|' : '=', col, row);
            continue;
          }
          const edge = c === 0 || c === g.w - 1 || r === g.h - 1;
          const k = hash(col, row, slow + g.style * 97);
          let lv = edge ? (hash(col, row, 71) < 0.5 ? 0 : 1) : 1 + ((hash(col, row, 72) * (st.body.length - 1)) | 0);
          if (r === 0) lv = st.body.length - 1;
          put(st.body[Math.min(st.body.length - 1, lv)], pick(st.chars, k), col, row);
        }
      }
    }
  }

  global.AsciiTree = AsciiTree;
})(window);
