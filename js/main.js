/* =====================================================================
 *  Luồng chính: hộp quà → cây thông + nhạc + lời chúc → cuộn xuống ảnh
 * ===================================================================== */
(function () {
  'use strict';

  const cfg = window.CARD_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const wait = ms => new Promise(res => setTimeout(res, ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TO = cfg.to || 'Thỏ iu';
  const FROM = cfg.from || 'Cún';

  /* ---------------------------------------------------------------
   *  Thông báo nhỏ
   * ------------------------------------------------------------- */
  let toastTimer = 0;
  function toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || 5000);
  }

  /* ---------------------------------------------------------------
   *  Hiệu ứng gõ chữ
   * ------------------------------------------------------------- */
  function typeInto(el, text, speed, opts) {
    opts = opts || {};
    const chars = Array.from(String(text).normalize('NFC'));
    const node = document.createTextNode('');
    el.appendChild(node);
    let i = 0;
    return new Promise(resolve => {
      (function step() {
        if (i >= chars.length) return resolve();
        const ch = chars[i++];
        node.data += ch;
        if (opts.onChar) opts.onChar(ch);
        let d = speed;
        if (opts.pauses !== false) {
          if (ch === '\n') d = speed * 5;
          else if (/[.!?…]/.test(ch)) d = speed * 5;
          else if (/[,;:]/.test(ch)) d = speed * 3;
        }
        setTimeout(step, d);
      })();
    });
  }

  /* ---------------------------------------------------------------
   *  Nền trời
   * ------------------------------------------------------------- */
  const sky = new window.Sky($('#sky'));
  sky.start();

  /* ---------------------------------------------------------------
   *  1. HỘP QUÀ
   * ------------------------------------------------------------- */
  const GIFT_LID = [
    '    .-~~-.    .-~~-.',
    '   (      \\  /      )',
    "     '-.__ \\/ __.-'",
    '.----------##----------.',
    '|==========##==========|',
    "'----------##----------'",
  ];
  const GIFT_BODY = [
    ' |+ + + + +##+ + + + +|',
    ' | + + + + ## + + + + |',
    ' |+ + + + +##+ + + + +|',
    ' | + + + + ## + + + + |',
    ' |+ + + + +##+ + + + +|',
    " '---------##---------'",
  ];
  function colorGift(lines, part) {
    return lines
      .map((line, li) =>
        Array.from(line)
          .map(ch => {
            if (ch === ' ') return ' ';
            let cls;
            if (part === 'lid' && li < 3) cls = 'g-bow';
            else if (ch === '#') cls = 'g-rib';
            else if (ch === '=') cls = 'g-lid';
            else if (ch === '+') cls = 'g-dot';
            else cls = 'g-edge';
            return `<span class="${cls}">${esc(ch)}</span>`;
          })
          .join('')
      )
      .join('\n');
  }
  $('.gift-lid').innerHTML = colorGift(GIFT_LID, 'lid');
  $('.gift-body').innerHTML = colorGift(GIFT_BODY, 'body');

  // dòng chữ "Gửi đến Thỏ iu của Cún"
  (async function typeIntro() {
    const tpl = cfg.intro || 'Gửi đến {to} của {from}';
    const parts = tpl.split(/(\{to\}|\{from\})/).filter(Boolean);
    const host = $('#introText');
    await wait(500);
    for (const part of parts) {
      let el = host;
      let text = part;
      if (part === '{to}' || part === '{from}') {
        el = document.createElement('span');
        el.className = part === '{to}' ? 'hl-to' : 'hl-from';
        host.appendChild(el);
        text = part === '{to}' ? TO : FROM;
      }
      await typeInto(el, text, 75, { pauses: false });
    }
  })();

  /* ---------------------------------------------------------------
   *  Nhạc
   * ------------------------------------------------------------- */
  const Music = (function () {
    const m = cfg.music || {};
    const vol = typeof m.volume === 'number' ? m.volume : 0.8;
    const make = src => {
      if (!src) return null;
      const a = new Audio();
      a.loop = true;
      a.preload = 'auto';
      a.volume = vol;
      a.ok = true;
      a.addEventListener('error', () => (a.ok = false));
      a.src = src;
      return a;
    };
    const main = make(m.main);
    const gal = make(m.gallery);
    const btn = $('#musicBtn');
    let current = null;
    let muted = false;
    let fadeId = 0;

    function start() {
      // "mở khoá" bài thứ hai trong cùng thao tác chạm (yêu cầu của iOS/Safari)
      if (gal) {
        gal.muted = true;
        const pr = gal.play();
        if (pr)
          pr.then(() => {
            if (current !== gal) {
              gal.pause();
              gal.currentTime = 0;
            }
            gal.muted = muted;
          }).catch(() => (gal.muted = muted));
      }
      if (main) {
        current = main;
        main.play().catch(() => {
          main.ok = false;
          toast(`♪ Chưa phát được nhạc — hãy thêm file "${m.main}"`, 7000);
        });
      }
      btn.hidden = !main && !gal;
    }

    function switchTo(which) {
      const next = which === 'gallery' ? gal : main;
      if (!next || next === current || next.ok === false || !current) return;
      const prev = current;
      current = next;
      const id = ++fadeId;
      next.volume = 0;
      next.muted = muted;
      next
        .play()
        .then(() => {
          const t0 = performance.now();
          const D = 1800;
          (function fade(now) {
            if (id !== fadeId) return;
            const k = Math.max(0, Math.min(1, (now - t0) / D));
            next.volume = vol * k;
            prev.volume = vol * (1 - k);
            if (k < 1) requestAnimationFrame(fade);
            else {
              prev.pause();
              prev.volume = vol;
            }
          })(t0);
        })
        .catch(() => {
          next.ok = false;
          next.volume = vol;
          current = prev;
        });
    }

    function toggle() {
      muted = !muted;
      [main, gal].forEach(a => a && (a.muted = muted));
      if (!muted && current && current.paused) current.play().catch(() => {});
      btn.textContent = muted ? '♪ nhạc: tắt' : '♪ nhạc: bật';
      btn.classList.toggle('off', muted);
    }
    btn.addEventListener('click', toggle);

    return { start, switchTo, galleryAudio: () => (gal && gal.ok !== false ? gal : null) };
  })();

  /* ---------------------------------------------------------------
   *  Hiệu ứng pháo giấy khi mở quà
   * ------------------------------------------------------------- */
  function burst(x, y) {
    const cv = $('#fx');
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#ff4d5e', '#ffc94a', '#4cd47a', '#fff6e0', '#ff7ab8', '#5b8cff'];
    const chars = '*+♥o.x*#@';
    const N = 170;
    const ps = Array.from({ length: N }, () => {
      const a = Math.random() * Math.PI * 2;
      const v = 180 + Math.random() * 620;
      return {
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 260,
        ch: chars[(Math.random() * chars.length) | 0],
        c: colors[(Math.random() * colors.length) | 0],
        s: 12 + Math.random() * 16,
        life: 1.2 + Math.random() * 1.1,
        r: Math.random() * 6,
      };
    });
    let last = performance.now();
    let t = 0;
    (function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of ps) {
        if (t > p.life) continue;
        alive++;
        p.vy += 700 * dt;
        p.vx *= 1 - 1.2 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = Math.max(0, 1 - t / p.life);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 10 * dpr;
        ctx.font = `${p.s}px "JetBrains Mono", monospace`;
        ctx.fillText(p.ch, p.x, p.y);
      }
      if (alive) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    })(last);
  }

  /* ---------------------------------------------------------------
   *  2. CÂY THÔNG + CODE + LỜI CHÚC
   * ------------------------------------------------------------- */
  let tree = null;

  function initTree() {
    tree = new window.AsciiTree($('#tree'), {
      message: cfg.treeMessage || 'MERRY CHRISTMAS',
      subtitle: cfg.treeSubtitle || '',
      onStats(s) {
        $('#stStage').textContent = s.stage;
        $('#stRot').textContent = s.rotation.toFixed(2) + '°';
        $('#stLights').textContent = s.lights;
        $('#stLetters').textContent = s.letters.toLocaleString('en-US');
        $('#fps').textContent = s.fps;
      },
    });
    tree.start();
    // chỉ chạy khi nhìn thấy để tiết kiệm pin
    new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? tree.start() : tree.stop()))).observe($('#treeStage'));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => tree.resize());
  }

  const CODE = `// christmas_tree.js — ${FROM} viết tặng ${TO} ♥
const RAMP = [".:-~^", "=+~vx^", "xov%*&W", "%&#@W0"];
const LIGHTS = [RED, GOLD, BLUE, ORANGE, PINK, SNOW];
const MESSAGE = "M E R R Y   C H R I S T M A S";

function radius(row) {
  const t = (row - TOP) / HEIGHT;
  const tier = (t * 6) % 1;
  return BASE_R * (0.04 + 0.96 * t) * (0.84 + 0.16 * tier ** 0.7);
}

function frame(t, dt) {
  rotation += dt * 0.45;
  for (let row = TOP; row <= BASE; row++) {
    const r = radius(row);
    for (let col = cx - r; col <= cx + r; col++) {
      const nx = (col - cx) / r;
      const nz = Math.sqrt(1 - nx * nx);
      const angle = Math.atan2(nx, nz) + rotation;
      const light = Math.max(0, -0.55 * nx + 0.83 * nz);
      if (hash(angle, row) < 0.07) {
        put(col, row, pick("o@*0%O"), LIGHTS[k], twinkle(t));
        info.lights++;
        continue;
      }
      put(col, row, pick(RAMP[level(light)]), green(light));
    }
  }
  drawStar(t);
  drawGifts(t);
  const shown = Math.min(MESSAGE.length, (t - T_MSG) * 10 | 0);
  for (const [i, ch] of [...MESSAGE.slice(0, shown)].entries()) {
    if (ch !== " ") {
      const tint = [RED, GOLD, GREEN][((i >> 1) + (t * 1.5 | 0)) % 3];
      put(x0 + i, MSG_ROW, ch, tint, 0.85 + 0.25 * Math.sin(t * 5 + i));
    }
  }
  info.letters = count(char => char !== " ");
  return info;
}

// window
const TITLE = "ASCII Christmas Tree";
const FOR = "${TO}";
const HINT = "Merry Christmas · ${FROM} ♥ ${TO}";
requestAnimationFrame(loop);`;

  function highlight(line) {
    const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|\b(const|let|function|for|if|return|continue|of|new)\b|\b([A-Z][A-Z0-9_]+)\b|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\()/g;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index));
      const cls = m[1] ? 'c-com' : m[2] ? 'c-str' : m[3] ? 'c-kw' : m[4] ? 'c-const' : m[5] ? 'c-num' : 'c-fn';
      out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = re.lastIndex;
    }
    return out + esc(line.slice(last));
  }

  function initCode() {
    const pre = $('#code');
    const pane = $('#codePane');
    const lines = CODE.split('\n');
    pre.innerHTML = lines.map((l, i) => `<span class="ln" data-n="${i + 1}">${highlight(l) || ' '}</span>`).join('');
    const els = Array.from(pre.children);
    const steps = els.filter((el, i) => lines[i].trim() && !lines[i].trim().startsWith('//'));
    let k = 0;
    let prev = null;
    function step() {
      const el = steps[k % steps.length];
      if (prev) prev.classList.remove('cur');
      el.classList.add('cur');
      prev = el;
      pane.scrollTo({ top: el.offsetTop - pane.clientHeight / 2 + el.offsetHeight / 2, behavior: k % steps.length === 0 ? 'auto' : 'smooth' });
      k++;
    }
    step();
    setInterval(step, 560);
  }

  async function typeWish() {
    const body = $('#wishBody');
    const status = $('#wishStatus');
    status.textContent = 'typing…';
    await typeInto($('#wishText'), cfg.wish || '', cfg.typingSpeed || 60, {
      onChar() {
        body.scrollTop = body.scrollHeight;
      },
    });
    status.textContent = 'saved ✓';
    status.classList.remove('dim');
    status.classList.add('done');
    $('#wishEof').classList.add('show');
    await wait(400);
    body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
  }

  /* ---------------------------------------------------------------
   *  3. ẢNH KỶ NIỆM + LỜI BÀI HÁT
   * ------------------------------------------------------------- */
  function buildGallery() {
    const photos = (cfg.photos || []).filter(Boolean);
    const lrcLines = parseLRC(cfg.lrc);
    synced = lrcLines.length > 0 && !!(cfg.music && cfg.music.gallery);
    // có LRC nhưng không có nhạc phần ảnh → dùng lời trong LRC theo kiểu gõ chữ
    const lyrics = lrcLines.length && !synced ? lrcLines.map(l => l.text).filter(Boolean) : (cfg.lyrics || []).filter(l => l != null);
    const host = $('#memories');
    if (!photos.length) {
      $('#gallery').querySelector('.gallery-head').insertAdjacentHTML('beforeend', '<p class="sub">(chưa có ảnh — thêm ảnh trong js/config.js)</p>');
    }
    const per = cfg.linesPerPhoto > 0 ? cfg.linesPerPhoto : Math.max(1, Math.ceil(lyrics.length / Math.max(1, photos.length)));

    photos.forEach((ph, i) => {
      const side = i % 2 === 0 ? 'left' : 'right';
      const n = String(i + 1).padStart(2, '0');
      const fileName = (ph.video || ph.src || '').split('/').pop() || `anh_${n}.jpg`;
      let lines = lyrics.slice(i * per, (i + 1) * per);
      if (i === photos.length - 1) lines = lyrics.slice(i * per); // dòng thừa dồn vào ảnh cuối
      if (!lyrics.length) lines = ['Santa tell me…', '(lời bài hát sẽ chạy ở đây)'];
      const hashStr = (0x1f3a9c + i * 0x2b7e15).toString(16).slice(0, 7);

      const art = document.createElement('article');
      art.className = `memory ${side}`;
      art.innerHTML = `
        <figure class="frame">
          <div class="win-bar">
            <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="win-title">${esc(fileName)}</span>
            <span class="win-status dim">${esc(ph.date || 'commit ' + hashStr)}</span>
          </div>
          <div class="frame-img"></div>
          ${ph.caption ? `<figcaption>${esc(ph.caption)}</figcaption>` : ''}
        </figure>
        <div class="node" aria-hidden="true">*</div>
        <div class="lyrics">
          <p class="lbl">♪ santa_tell_me.lrc · ${n}</p>
        </div>`;
      const imgHost = art.querySelector('.frame-img');
      const placeholder = () => {
        imgHost.innerHTML = `<div class="ph"><b>[ ảnh kỷ niệm #${n} ]</b><span>${esc(ph.src || 'assets/photos/' + n + '.jpg')}</span></div>`;
      };
      if (ph.video) {
        // video: tự chạy, không tiếng (để không đè nhạc nền), lặp lại, phát ngay trong trang trên iPhone
        const v = document.createElement('video');
        v.src = ph.video;
        if (ph.poster) v.poster = ph.poster;
        v.muted = true;
        v.defaultMuted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.setAttribute('muted', '');
        v.preload = 'metadata';
        v.setAttribute('aria-label', ph.caption || `Video kỷ niệm ${i + 1}`);
        v.onerror = placeholder;
        imgHost.appendChild(v);
        art._video = v;
      } else if (ph.src) {
        const img = new Image();
        img.alt = ph.caption || `Kỷ niệm ${i + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = placeholder;
        img.src = ph.src;
        imgHost.appendChild(img);
      } else placeholder();

      art._lines = lines;
      host.appendChild(art);
    });

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          e.target.classList.add('in');
          if (!synced) typeLyrics(e.target);
        });
      },
      { threshold: 0.3, rootMargin: '0px 0px -8% 0px' }
    );
    host.querySelectorAll('.memory').forEach(el => io.observe(el));

    // video chỉ phát khi đang nhìn thấy
    const vio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const v = e.target._video;
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      });
    }, { threshold: 0.25 });
    host.querySelectorAll('.memory').forEach(el => el._video && vio.observe(el));

    if (synced) startKaraoke(lrcLines);

    const end = cfg.ending || {};
    $('#endTitle').textContent = end.title || `Merry Christmas, ${TO}`;
    $('#endMsg').textContent = end.message || '';
    $('#endSign').textContent = end.sign || `— ${FROM}`;
  }

  /* ---------------------------------------------------------------
   *  Lời chạy khớp nhạc (LRC / karaoke)
   * ------------------------------------------------------------- */
  let synced = false;

  function parseLRC(text) {
    const out = [];
    let offset = 0;
    String(text || '')
      .split(/\r?\n/)
      .forEach(raw => {
        const off = raw.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/i);
        if (off) {
          offset = Number(off[1]) / 1000;
          return;
        }
        const re = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g;
        const times = [];
        let m;
        let last = -1;
        while ((m = re.exec(raw))) {
          times.push(Number(m[1]) * 60 + parseFloat(m[2].replace(':', '.')));
          last = re.lastIndex;
        }
        if (!times.length) return;
        const txt = raw.slice(last).trim();
        times.forEach(t => out.push({ t, text: txt }));
      });
    out.sort((a, b) => a.t - b.t);
    out.forEach(l => (l.t = Math.max(0, l.t - offset))); // offset dương = lời hiện sớm hơn
    return out;
  }

  const fmtTime = s => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = (s % 60).toFixed(2).padStart(5, '0');
    return `${mm}:${ss}`;
  };

  function startKaraoke(lines) {
    const memories = Array.from(document.querySelectorAll('.memory'));
    if (!memories.length) return;
    const k = document.createElement('div');
    k.className = 'karaoke';
    k.innerHTML = '<p class="k-time"></p><p class="k-prev"></p><p class="k-cur"><span class="k-sung"></span><span class="k-rest"></span></p><p class="k-next"></p>';
    const elTime = k.querySelector('.k-time');
    const elPrev = k.querySelector('.k-prev');
    const elSung = k.querySelector('.k-sung');
    const elRest = k.querySelector('.k-rest');
    const elNext = k.querySelector('.k-next');
    const NOTE = '♪ ♪ ♪';
    let box = null;
    let lastIdx = -2;
    let lastCut = -1;
    let lastTimeTxt = '';

    // ô lời gần giữa màn hình nhất
    function activeBox() {
      const mid = window.innerHeight / 2;
      let best = null;
      let bestD = Infinity;
      for (const m of memories) {
        const r = m.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = m;
        }
      }
      return best && best.querySelector('.lyrics');
    }

    function moveTo(b) {
      if (b === box) return;
      box = b;
      k.classList.remove('show');
      b.appendChild(k);
      void k.offsetWidth; // khởi động lại hiệu ứng hiện dần
      k.classList.add('show');
    }

    let frame = 0;
    (function tick() {
      requestAnimationFrame(tick);
      if (++frame % 2) return; // ~30 lần/giây là đủ khớp
      const audio = Music.galleryAudio();
      const g = $('#gallery').getBoundingClientRect();
      if (!audio || g.bottom < 0 || g.top > window.innerHeight) return;
      const b = activeBox();
      if (b) moveTo(b);
      if (!box) return;

      const t = audio.currentTime;
      const timeTxt = `[${fmtTime(t)}] ${audio.paused ? '❚❚' : '▶'}`;
      if (timeTxt !== lastTimeTxt) elTime.textContent = lastTimeTxt = timeTxt;

      let idx = -1;
      for (let i = 0; i < lines.length && lines[i].t <= t; i++) idx = i;
      const cur = lines[idx];
      const next = lines[idx + 1];

      if (idx !== lastIdx) {
        lastIdx = idx;
        lastCut = -1;
        elPrev.textContent = idx > 0 ? lines[idx - 1].text || NOTE : '';
        elNext.textContent = next ? next.text || NOTE : '';
        k.classList.toggle('intro', idx < 0);
      }

      const text = cur ? cur.text || NOTE : '♪ …';
      const chars = Array.from(text);
      let cut = chars.length;
      if (cur && cur.text) {
        // chữ sáng dần theo thời gian của dòng (đến 85% thời lượng, tối đa ~6 giây)
        const span = Math.min(6, Math.max(0.6, ((next ? next.t : cur.t + 4) - cur.t) * 0.85));
        cut = Math.ceil(Math.min(1, (t - cur.t) / span) * chars.length);
      }
      if (cut !== lastCut) {
        lastCut = cut;
        elSung.textContent = chars.slice(0, cut).join('');
        elRest.textContent = chars.slice(cut).join('');
      }
    })();
  }

  async function typeLyrics(art) {
    const box = art.querySelector('.lyrics');
    await wait(700);
    for (const line of art._lines) {
      const p = document.createElement('p');
      p.className = 'ly typing';
      p.innerHTML = '<span class="note">♪</span>';
      const span = document.createElement('span');
      p.appendChild(span);
      box.appendChild(p);
      await typeInto(span, line, 38, { pauses: false });
      p.classList.remove('typing');
      p.classList.add('done');
      await wait(420);
    }
  }

  /* ---------------------------------------------------------------
   *  Tự động cuộn chậm
   * ------------------------------------------------------------- */
  const AutoScroll = (function () {
    let active = false;
    let paused = false;
    let pos = 0;
    let last = 0;
    let speed = 40;
    let idle = 0;
    const maxY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    function tick(now) {
      if (!active) return;
      requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (paused) return;
      pos += speed * dt;
      if (pos >= maxY()) {
        window.scrollTo(0, maxY());
        active = false;
        return;
      }
      window.scrollTo(0, Math.round(pos));
    }

    function ease(target, ms) {
      return new Promise(resolve => {
        const from = window.scrollY;
        const dist = target - from;
        if (dist <= 0) return resolve();
        const t0 = performance.now();
        (function f(now) {
          if (paused) return resolve();
          const k = Math.min(1, (now - t0) / ms);
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          window.scrollTo(0, Math.round(from + dist * e));
          if (k < 1) requestAnimationFrame(f);
          else resolve();
        })(t0);
      });
    }

    function interact() {
      if (!active) return;
      paused = true;
      clearTimeout(idle);
      idle = setTimeout(() => {
        pos = window.scrollY;
        last = performance.now();
        paused = false;
      }, 6000);
    }
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(ev => window.addEventListener(ev, interact, { passive: true }));

    async function run(target, spd) {
      speed = spd;
      active = true;
      paused = false;
      await ease(target, 2600);
      if (!active) return;
      pos = window.scrollY;
      last = performance.now();
      requestAnimationFrame(tick);
    }
    function stop() {
      active = false;
      clearTimeout(idle);
    }
    return { run, stop };
  })();

  /* ---------------------------------------------------------------
   *  Đổi nhạc theo vị trí cuộn
   * ------------------------------------------------------------- */
  function watchSections() {
    new IntersectionObserver(
      es => es.forEach(e => Music.switchTo(e.intersectionRatio >= 0.35 ? 'main' : 'gallery')),
      { threshold: [0, 0.35, 0.6] }
    ).observe($('#hero'));
  }

  /* ---------------------------------------------------------------
   *  MỞ QUÀ
   * ------------------------------------------------------------- */
  let opened = false;
  async function openGift() {
    if (opened) return;
    opened = true;
    const gift = $('#gift');
    gift.classList.add('open');
    Music.start();
    const r = gift.getBoundingClientRect();
    setTimeout(() => burst(r.left + r.width / 2, r.top + r.height * 0.4), 240);

    await wait(950);
    $('#intro').classList.add('leave');
    const card = $('#card');
    card.hidden = false;
    document.body.classList.remove('locked');
    window.scrollTo(0, 0);
    await new Promise(requestAnimationFrame);
    card.classList.add('show');
    initTree();
    initCode();
    buildGallery();
    watchSections();
    setTimeout(() => ($('#intro').style.display = 'none'), 900);

    await wait(2600);
    await typeWish();
    const as = cfg.autoScroll || {};
    await wait(as.delay != null ? as.delay : 2500);
    // chờ cây dựng xong hoàn toàn rồi mới cuộn xuống
    while (tree && tree.t < (window.AsciiTree.FINALE || 0)) await wait(250);
    let speed = as.speed || 42;
    const ga = Music.galleryAudio();
    if (as.matchSong !== false && ga && isFinite(ga.duration) && ga.duration > 30) {
      // cuộn hết phần ảnh vừa đúng lúc bài hát kết thúc
      const dist = document.documentElement.scrollHeight - window.innerHeight - $('#gallery').offsetTop;
      speed = Math.max(18, Math.min(90, dist / (ga.duration - 4)));
    }
    AutoScroll.run($('#gallery').offsetTop, speed);
  }
  $('#gift').addEventListener('click', openGift);

  $('#replay').addEventListener('click', () => {
    AutoScroll.stop();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------------------------------------------------------------
   *  Thay đổi kích thước
   * ------------------------------------------------------------- */
  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      sky.resize();
      if (tree) tree.resize();
    }, 150);
  });
})();
