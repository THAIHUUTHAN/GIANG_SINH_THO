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
    const SRC = { main: m.main || '', gallery: m.gallery || '' };
    // MỘT trình phát duy nhất: iPhone chỉ cho phát âm thanh trên trình phát đã được "mở khoá"
    // bằng một lần chạm. Khi chuyển bài, chỉ đổi file trên chính trình phát này.
    const el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    try { el.volume = vol; } catch (e) { /* iOS: âm lượng do nút cứng điều khiển */ }
    const pos = { main: 0, gallery: 0 }; // nhớ đoạn đang nghe dở của mỗi bài
    const failed = { main: !SRC.main, gallery: !SRC.gallery };
    const failCbs = [];
    const btn = $('#musicBtn');
    let track = null; // bài đang phát
    let want = null; // bài cần phát theo vị trí cuộn
    let muted = false;
    let busy = false;
    let started = false;

    // đọc trước thời lượng bài phần ảnh (chỉ đọc thông tin, không phát)
    let galDur = NaN;
    if (SRC.gallery) {
      const probe = new Audio();
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => (galDur = probe.duration);
      probe.src = SRC.gallery;
    }

    const setVol = v => {
      try { el.volume = Math.max(0, Math.min(1, v)); } catch (e) { /* bỏ qua */ }
    };
    function fade(to, ms) {
      return new Promise(res => {
        const from = el.volume;
        const t0 = performance.now();
        (function f(now) {
          const k = Math.max(0, Math.min(1, (now - t0) / ms));
          setVol(from + (to - from) * k);
          if (k < 1) requestAnimationFrame(f);
          else res();
        })(t0);
      });
    }

    function setTrack(name) {
      if (track) pos[track] = el.currentTime || 0;
      track = name;
      const seekTo = pos[name];
      if (seekTo) el.addEventListener('loadedmetadata', () => { try { el.currentTime = seekTo; } catch (e) { /* bỏ qua */ } }, { once: true });
      el.src = SRC[name];
      el.muted = muted;
      return el.play();
    }

    function start() {
      started = true;
      btn.hidden = failed.main && failed.gallery;
      const first = !failed.main ? 'main' : !failed.gallery ? 'gallery' : null;
      if (!first) return;
      want = first;
      // gọi play() ngay trong lúc chạm để iPhone "mở khoá" trình phát
      setTrack(first).catch(() => {
        failed[first] = true;
        toast(`♪ Chưa phát được nhạc — hãy kiểm tra file "${SRC[first]}"`, 7000);
        if (first === 'gallery') failCbs.forEach(f => f());
      });
    }

    async function process() {
      if (busy || !started) return;
      busy = true;
      while (want && want !== track && !failed[want]) {
        const name = want;
        if (!el.paused) await fade(0, 900);
        try {
          setVol(0);
          await setTrack(name);
          await fade(vol, 1200);
        } catch (e) {
          failed[name] = true;
          if (name === 'gallery') failCbs.forEach(f => f());
          const back = name === 'gallery' ? 'main' : 'gallery';
          if (!failed[back]) {
            try { await setTrack(back); } catch (e2) { /* bỏ qua */ }
          }
          setVol(vol);
        }
      }
      busy = false;
    }

    function switchTo(name) {
      want = name;
      process();
    }

    function toggle() {
      muted = !muted;
      el.muted = muted;
      if (!muted && el.paused && track) el.play().catch(() => {});
      btn.textContent = muted ? '♪ nhạc: tắt' : '♪ nhạc: bật';
      btn.classList.toggle('off', muted);
    }
    btn.addEventListener('click', toggle);

    return {
      start,
      switchTo,
      // thời điểm đang phát của bài phần ảnh (null nếu bài đó chưa phát)
      galleryTime: () => (track === 'gallery' && !failed.gallery ? el.currentTime : null),
      galleryDuration: () => (isFinite(galDur) ? galDur : track === 'gallery' && isFinite(el.duration) ? el.duration : NaN),
      galleryFailed: () => failed.gallery,
      onGalleryFail: f => failCbs.push(f),
    };
  })();

  /* ---------------------------------------------------------------
   *  Hiệu ứng pháo giấy khi mở quà
   * ------------------------------------------------------------- */
  // pháo giấy khi mở quà (xem js/fx.js)
  function burst(x, y) {
    if (window.FX) window.FX.confetti(x, y);
    if (window.Bunnies) window.Bunnies.party();
  }

  /* ---------------------------------------------------------------
   *  2. CÂY THÔNG + CODE + LỜI CHÚC
   * ------------------------------------------------------------- */
  let tree = null;

  function initTree() {
    tree = new window.AsciiTree($('#tree'), {
      message: cfg.treeMessage || 'MERRY CHRISTMAS',
      subtitle: cfg.treeSubtitle || '',
    });
    tree.start();
    // chỉ chạy khi nhìn thấy để tiết kiệm pin
    new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? tree.start() : tree.stop()))).observe($('#treeStage'));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => tree.resize());
  }

  async function typeWish() {
    const body = $('#wishBody');
    await typeInto($('#wishText'), cfg.wish || '', cfg.typingSpeed || 60, {
      onChar() {
        body.scrollTop = body.scrollHeight;
      },
    });
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
    // lời dạng gõ chữ (dùng khi không có LRC, hoặc dự phòng khi nhạc phần ảnh không phát được)
    const lyrics = lrcLines.length ? lrcLines.map(l => l.text).filter(Boolean) : (cfg.lyrics || []).filter(l => l != null);
    const host = $('#memories');
    if (!photos.length) {
      $('#gallery').querySelector('.gallery-head').insertAdjacentHTML('beforeend', '<p class="sub">(chưa có ảnh — thêm ảnh trong js/config.js)</p>');
    }
    const per = cfg.linesPerPhoto > 0 ? cfg.linesPerPhoto : Math.max(1, Math.ceil(lyrics.length / Math.max(1, photos.length)));

    photos.forEach((ph, i) => {
      const side = i % 2 === 0 ? 'left' : 'right';
      const n = String(i + 1).padStart(2, '0');
      let lines = lyrics.slice(i * per, (i + 1) * per);
      if (i === photos.length - 1) lines = lyrics.slice(i * per); // dòng thừa dồn vào ảnh cuối
      if (!lyrics.length) lines = ['Santa tell me…', '(lời bài hát sẽ chạy ở đây)'];

      const art = document.createElement('article');
      art.className = `memory ${side}`;
      art.innerHTML = `
        <figure class="frame">
          <div class="win-bar">
            <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="win-status dim">${esc(ph.date || '')}</span>
          </div>
          <div class="frame-img"></div>
          ${ph.caption ? `<figcaption>${esc(ph.caption)}</figcaption>` : ''}
        </figure>
        <div class="node" aria-hidden="true">*</div>
        <div class="lyrics"></div>`;
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

    if (synced) {
      startKaraoke(lrcLines);
      const fallback = () => {
        if (!synced) return;
        synced = false; // nhạc phần ảnh không phát được → chuyển sang lời gõ chữ
        document.querySelectorAll('.memory.in').forEach(typeLyrics);
      };
      if (Music.galleryFailed()) fallback();
      else Music.onGalleryFail(fallback);
    }

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

  function startKaraoke(lines) {
    const memories = Array.from(document.querySelectorAll('.memory'));
    if (!memories.length) return;
    const k = document.createElement('div');
    k.className = 'karaoke';
    k.innerHTML = '<p class="k-prev"></p><p class="k-cur"><span class="k-sung"></span><span class="k-rest"></span></p><p class="k-next"></p>';
    const elPrev = k.querySelector('.k-prev');
    const elSung = k.querySelector('.k-sung');
    const elRest = k.querySelector('.k-rest');
    const elNext = k.querySelector('.k-next');
    const NOTE = '♪ ♪ ♪';
    let box = null;
    let lastIdx = -2;
    let lastCut = -1;

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
      if (!synced) {
        k.remove();
        return;
      }
      requestAnimationFrame(tick);
      if (++frame % 2) return; // ~30 lần/giây là đủ khớp
      const t = Music.galleryTime();
      const g = $('#gallery').getBoundingClientRect();
      if (t == null || g.bottom < 0 || g.top > window.innerHeight) return;
      const b = activeBox();
      if (b) moveTo(b);
      if (!box) return;

      let idx = -1;
      for (let i = 0; i < lines.length && lines[i].t <= t; i++) idx = i;
      const cur = lines[idx];
      const next = lines[idx + 1];

      if (idx !== lastIdx) {
        lastIdx = idx;
        lastCut = -1;
        elPrev.textContent = idx > 0 ? lines[idx - 1].text || NOTE : '';
        elNext.textContent = next ? next.text || NOTE : '';
        k.classList.toggle('k-wait', idx < 0);
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
    let pos = 0;
    let last = 0;
    let speed = 40;
    let expected = -1; // vị trí do chính trang tự cuộn tới
    let userUntil = 0; // nhường cho người xem đến thời điểm này
    let touching = false;
    const maxY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const yieldToUser = ms => (userUntil = Math.max(userUntil, performance.now() + ms));
    const userBusy = () => touching || performance.now() < userUntil;

    // người xem lăn chuột / vuốt / kéo thanh cuộn: tạm nhường, rồi cuộn tiếp từ vị trí mới
    window.addEventListener('wheel', () => yieldToUser(450), { passive: true });
    window.addEventListener('touchstart', () => (touching = true), { passive: true });
    const touchEnd = () => {
      touching = false;
      yieldToUser(600);
    };
    window.addEventListener('touchend', touchEnd, { passive: true });
    window.addEventListener('touchcancel', touchEnd, { passive: true });
    window.addEventListener('keydown', e => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'Home', 'End'].includes(e.code)) yieldToUser(600);
    });
    window.addEventListener(
      'scroll',
      () => {
        // cuộn không phải do trang tự làm (vd. quán tính khi vuốt, kéo thanh cuộn) → nhường thêm chút
        if (expected < 0 || Math.abs(window.scrollY - expected) > 3) yieldToUser(300);
      },
      { passive: true }
    );

    function go(y) {
      expected = y;
      window.scrollTo(0, y);
    }

    function tick(now) {
      if (!active) return;
      requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (userBusy()) {
        pos = window.scrollY;
        expected = -1;
        return;
      }
      pos = Math.min(maxY(), pos + speed * dt);
      const y = Math.round(pos);
      if (Math.abs(y - window.scrollY) >= 1) go(y);
    }

    function ease(target, ms) {
      return new Promise(resolve => {
        const from = window.scrollY;
        const dist = target - from;
        if (dist <= 0) return resolve();
        const t0 = performance.now();
        (function f(now) {
          if (!active || userBusy()) return resolve();
          const k = Math.max(0, Math.min(1, (now - t0) / ms));
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          go(Math.round(from + dist * e));
          if (k < 1) requestAnimationFrame(f);
          else resolve();
        })(t0);
      });
    }

    async function run(target, spd) {
      speed = spd;
      active = true;
      await ease(target, 2600);
      if (!active) return;
      pos = window.scrollY;
      last = performance.now();
      requestAnimationFrame(tick);
    }
    function stop() {
      active = false;
      expected = -1;
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
    const dur = Music.galleryDuration();
    if (as.matchSong !== false && isFinite(dur) && dur > 30) {
      // cuộn hết phần ảnh vừa đúng lúc bài hát kết thúc
      const dist = document.documentElement.scrollHeight - window.innerHeight - $('#gallery').offsetTop;
      speed = Math.max(18, Math.min(90, dist / (dur - 4)));
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
