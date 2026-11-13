/* =====================================================================
 *  Nền trời: sao lấp lánh + tuyết rơi bằng ký tự (phủ toàn trang)
 * ===================================================================== */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const FONT = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  const rand = Math.random;
  const pick = s => s[(rand() * s.length) | 0];

  class Sky {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.t = 0;
      this.running = false;
      this._loop = this._loop.bind(this);
      this.resize(true);
    }

    resize(force) {
      const w = global.innerWidth;
      const h = global.innerHeight;
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const big = force || !this.w || Math.abs(w - this.w) > 2 || Math.abs(h - this.h) > 140;
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!big) return;

      const area = w * h;
      this.stars = Array.from({ length: Math.round(area / 6500) }, () => ({
        x: rand() * w,
        y: rand() * h,
        ch: pick('..+·*.+'),
        ph: rand() * TAU,
        sp: 0.5 + rand() * 1.8,
        a: 0.12 + rand() * 0.45,
      }));
      const n = Math.max(36, Math.min(170, Math.round(area / 11000)));
      this.flakes = Array.from({ length: n }, () => this._flake(true)).sort((a, b) => a.size - b.size);
    }

    _flake(init) {
      const size = pick([9, 11, 11, 13, 16]);
      return {
        x: rand() * this.w,
        y: init ? rand() * this.h : -20 - rand() * 40,
        size,
        vy: 10 + size * 2 + rand() * 14,
        sway: 6 + rand() * 20,
        f: 0.3 + rand() * 1.1,
        ph: rand() * TAU,
        ch: pick('*+.·**'),
        a: 0.2 + (size / 16) * 0.5,
      };
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this._loop);
    }

    _loop(now) {
      if (!this.running) return;
      requestAnimationFrame(this._loop);
      const dt = now - this.last;
      if (dt < 30) return; // ~30 fps là đủ mượt cho nền
      this.last = now;
      const step = Math.min(dt, 100) / 1000;
      this.t += step;
      this._draw(step);
    }

    _draw(dt) {
      const { ctx, w, h, t } = this;
      ctx.clearRect(0, 0, w, h);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      ctx.font = `11px ${FONT}`;
      for (const s of this.stars) {
        const a = s.a * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)));
        ctx.fillStyle = `rgba(205, 220, 255, ${a.toFixed(3)})`;
        ctx.fillText(s.ch, s.x, s.y);
      }

      let size = 0;
      for (let i = 0; i < this.flakes.length; i++) {
        const f = this.flakes[i];
        f.y += f.vy * dt;
        const x = f.x + Math.sin(t * f.f + f.ph) * f.sway;
        if (f.y > h + 20) {
          const nf = this._flake(false);
          nf.size = f.size; // giữ thứ tự kích thước
          this.flakes[i] = nf;
          continue;
        }
        if (f.size !== size) {
          size = f.size;
          ctx.font = `${size}px ${FONT}`;
        }
        ctx.fillStyle = `rgba(240, 245, 255, ${f.a.toFixed(3)})`;
        ctx.fillText(f.ch, x, f.y);
      }
    }
  }

  global.Sky = Sky;
})(window);
