/* ============================================================================
   immersive.js - the sky that moves with you.

   Three star layers drift with the pointer, the phone's tilt and the scroll
   position; a faint zodiac wheel turns as you scroll; every chapter reveals
   itself as it enters the viewport; a rail on the left (desktop) or a dock at
   the bottom (phone) tracks where you are and lets you jump. Nothing in here
   knows anything about astrology - app.js renders content, this file makes
   the page feel like a journey through it.
============================================================================ */
(function (root) {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var fine = mq('(hover: hover) and (pointer: fine)');
  function clamp(v, m) { return Math.max(-m, Math.min(m, v)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* =========================================================================
     1. star field - each layer is a canvas 1.6x the viewport; stars wrap
        vertically so the scroll parallax never runs out of sky
  ========================================================================= */
  function makeField(cid, count, sizeMul, speed) {
    var cv = $(cid), ctx = cv.getContext('2d'), W, H, stars = [], dpr;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = window.innerWidth * 1.6, h = window.innerHeight * 1.6;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      W = cv.width; H = cv.height;
      build();
    }
    function build() {
      stars = [];
      var n = Math.max(20, Math.floor(count * (W * H) / (1440 * 900 * dpr * dpr)));
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: (Math.random() * sizeMul + 0.3) * dpr,
          b: Math.random() * 0.55 + 0.35,
          tw: Math.random() * 6.28, sp: Math.random() * speed + 0.006,
          h: Math.random() < 0.14 ? 'g' : (Math.random() < 0.18 ? 'p' : 'w')
        });
      }
    }
    size();
    window.addEventListener('resize', size);
    return function (t, offY) {
      ctx.clearRect(0, 0, W, H);
      var off = (offY * dpr) % H;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i], a = Math.max(0, s.b + Math.sin(t * s.sp + s.tw) * 0.32);
        var y = s.y - off; if (y < 0) y += H; else if (y >= H) y -= H;
        ctx.fillStyle = s.h === 'g' ? 'rgba(247,214,117,' + a + ')'
                      : s.h === 'p' ? 'rgba(150,120,210,' + (a * 0.85) + ')'
                      : 'rgba(242,242,247,' + a + ')';
        ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.283); ctx.fill();
        if (s.r > 1.3 * dpr) {
          ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.18) + ')';
          ctx.beginPath(); ctx.arc(s.x, y, s.r * 2.6, 0, 6.283); ctx.fill();
        }
      }
    };
  }

  var drawFar = makeField('cFar', 90, 1.0, 0.02),
      drawMid = makeField('cMid', 58, 1.5, 0.03),
      drawNear = makeField('cNear', 32, 2.2, 0.045);

  var starFar = $('starFar'), starMid = $('starMid'), starNear = $('starNear'),
      nebula = $('nebula'), core = $('galaxyCore'), wheelBg = $('wheelBg'),
      progress = $('progress').firstElementChild;

  /* =========================================================================
     2. the pointer, or the phone's tilt
  ========================================================================= */
  var px = 0, py = 0, rx = 0, ry = 0;
  var LIMX = function () { return window.innerWidth * 0.32; };
  var LIMY = function () { return window.innerHeight * 0.32; };

  if (fine) {
    window.addEventListener('mousemove', function (e) {
      px = (e.clientX - window.innerWidth / 2) * 0.5;
      py = (e.clientY - window.innerHeight / 2) * 0.5;
    }, { passive: true });
  }

  var gyroBound = false;
  function onOrient(e) {
    if (e.gamma == null || e.beta == null) return;
    var g = clamp(e.gamma, 28), b = clamp(e.beta - 40, 28);
    px = g / 28 * LIMX() * 0.8;
    py = b / 28 * LIMY() * 0.8;
  }
  function bindGyro() {
    if (gyroBound) return;
    gyroBound = true;
    window.addEventListener('deviceorientation', onOrient, { passive: true });
  }
  /* iOS needs a user gesture to grant motion access; Android does not. */
  function requestMotion() {
    if (fine || reduce || !window.DeviceOrientationEvent) return;
    var DOE = window.DeviceOrientationEvent;
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then(function (s) { if (s === 'granted') bindGyro(); }).catch(function () {});
    } else bindGyro();
  }
  if (!fine && !reduce && window.DeviceOrientationEvent &&
      typeof window.DeviceOrientationEvent.requestPermission !== 'function') bindGyro();

  /* =========================================================================
     3. the background zodiac wheel
  ========================================================================= */
  var SIGN_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  function pt(lon, r) {
    var a = (180 - lon) * Math.PI / 180;
    return [200 + r * Math.cos(a), 200 - r * Math.sin(a)];
  }
  function buildWheelBg() {
    var o = ['<svg viewBox="0 0 400 400" aria-hidden="true">'];
    o.push('<circle class="o" cx="200" cy="200" r="197"/><circle class="o" cx="200" cy="200" r="152"/>' +
           '<circle class="o" cx="200" cy="200" r="120"/>');
    for (var i = 0; i < 12; i++) {
      var a = pt(i * 30, 152), b = pt(i * 30, 197);
      o.push('<line class="sp" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>');
      var g = pt(i * 30 + 15, 174);
      o.push('<text x="' + g[0] + '" y="' + g[1] + '">' + SIGN_GLYPHS[i] + '</text>');
    }
    for (var d = 0; d < 360; d += 5) {
      var len = d % 30 === 0 ? 0 : d % 10 === 0 ? 7 : 4;
      if (!len) continue;
      var p1 = pt(d, 152), p2 = pt(d, 152 - len);
      o.push('<line class="tk" x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '"/>');
    }
    o.push('<g id="wheelBgPlanets"></g></svg>');
    wheelBg.innerHTML = o.join('');
  }
  buildWheelBg();

  /* app.js hands over the natal planets once a chart exists */
  function setSky(list) {
    var g = $('wheelBgPlanets'); if (!g) return;
    g.innerHTML = (list || []).map(function (p) {
      var q = pt(p.lon, 136);
      return '<circle class="pm" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="4" fill="' + p.color + '"/>';
    }).join('');
  }

  /* =========================================================================
     4. chapters: numbering, rail, dock, next-links, journey tiles
  ========================================================================= */
  var sections = [], navSections = [], active = -1;

  function build() {
    var list = Array.prototype.slice.call(document.querySelectorAll('#journey > section.chapter'));
    sections = list.map(function (el) {
      return {
        el: el, id: el.id, title: el.dataset.title || el.id, glyph: el.dataset.glyph || '✦',
        desc: el.dataset.desc || '', nav: el.dataset.nav !== 'no',
        intro: el.classList.contains('landing') || el.classList.contains('hero')
      };
    });
    navSections = sections.filter(function (s) { return s.nav; });

    var numbered = sections.filter(function (s) { return !s.intro; });
    numbered.forEach(function (s, i) {
      s.num = pad2(i + 1);
      var el = s.el.querySelector('.ch-num');
      if (el) el.textContent = s.num + ' / ' + pad2(numbered.length);
    });

    $('railItems').innerHTML = navSections.map(function (s) {
      return '<button type="button" data-go="' + s.id + '" title="' + s.title + '">' +
             '<i class="dot"></i><span class="lbl">' + s.title + '</span></button>';
    }).join('');
    $('dockItems').innerHTML = navSections.map(function (s) {
      return '<button type="button" data-go="' + s.id + '"><span class="g">' + s.glyph +
             '</span><span class="t">' + s.title + '</span></button>';
    }).join('');

    // "Next" at the foot of every chapter that has a body
    sections.forEach(function (s, i) {
      var body = s.el.querySelector('.ch-body'), next = sections[i + 1];
      if (!body || !next || body.querySelector('.ch-next')) return;
      var d = document.createElement('div');
      d.className = 'ch-next';
      d.innerHTML = '<button type="button" class="next-ch" data-go="' + next.id + '">' +
        '<span class="k">' + next.glyph + '</span><span class="t">Next · ' + next.title + '</span>' +
        '<span class="d">' + next.desc + '</span></button>';
      body.appendChild(d);
    });

    var tiles = $('journeyTiles');
    if (tiles) {
      tiles.innerHTML = sections.filter(function (s) { return !s.intro && s.id !== 'chOverview'; })
        .map(function (s) {
          return '<button type="button" class="tile tilt" data-go="' + s.id + '"><span class="g">' + s.glyph +
                 '</span><span class="t">' + s.title + '</span><span class="d">' + s.desc + '</span></button>';
        }).join('');
    }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-go]') : null;
    if (b) { e.preventDefault(); goTo(b.dataset.go); }
  });

  /* Our own eased scroll: native smooth scrolling is inconsistent across
     browsers over a page this long, and some embedded browsers ignore it.
     Any wheel, touch or key press hands control straight back to the user. */
  var scrollAnim = null;
  function cancelScroll() { if (scrollAnim) { clearTimeout(scrollAnim); scrollAnim = null; } }
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, cancelScroll, { passive: true });
  });
  function goTo(id, instant) {
    var el = $(id); if (!el) return;
    var from = window.scrollY || window.pageYOffset || 0;
    var top = el.getBoundingClientRect().top + from - (el.classList.contains('landing') ? 0 : 58);
    var maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    top = Math.max(0, Math.min(top, maxTop));
    cancelScroll();
    if (instant || reduce) { window.scrollTo(0, top); spy(); return; }
    var dist = top - from;
    if (Math.abs(dist) < 2) return;
    // a timer, not requestAnimationFrame: frames pause in a hidden or
    // occluded tab, and the jump must still complete
    var dur = Math.min(1300, Math.max(450, Math.abs(dist) * 0.35)), t0 = Date.now();
    (function step() {
      var k = Math.min(1, (Date.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      window.scrollTo(0, from + dist * e);
      if (k < 1) scrollAnim = setTimeout(step, 16); else { scrollAnim = null; spy(); }
    })();
  }

  function setActive(i) {
    active = i;
    var s = sections[i];
    if (!s) return;
    document.body.setAttribute('data-chapter', s.id);
    var tn = $('topNum'), tc = $('topChapter');
    if (tn) tn.textContent = s.num ? s.num + ' · ' : '';
    if (tc) tc.textContent = s.title;

    var navIdx = navSections.indexOf(s);
    // the landing is not in the rail: keep whatever was last lit
    if (navIdx < 0) return;
    Array.prototype.forEach.call($('railItems').children, function (b, j) {
      b.classList.toggle('on', j === navIdx);
      b.classList.toggle('past', j < navIdx);
    });
    var fill = $('railFill');
    if (fill) fill.style.height = (navSections.length > 1 ? navIdx / (navSections.length - 1) * 100 : 0) + '%';

    var dock = $('dockItems');
    Array.prototype.forEach.call(dock.children, function (b, j) {
      b.classList.toggle('on', j === navIdx);
      if (j === navIdx) {
        var left = b.offsetLeft - dock.clientWidth / 2 + b.offsetWidth / 2;
        if (dock.scrollTo) dock.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' });
        else dock.scrollLeft = left;
      }
    });
  }

  function spy() {
    if (!sections.length) return;
    var docH = document.documentElement.scrollHeight - window.innerHeight, sy = window.scrollY || window.pageYOffset || 0;
    progress.style.width = (docH > 0 ? Math.min(100, sy / docH * 100) : 0) + '%';
    var mid = window.innerHeight * 0.42, cur = -1;
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      if (s.el.offsetParent === null) continue;          // hidden while locked
      if (s.el.getBoundingClientRect().top <= mid) cur = i;
    }
    if (cur < 0) cur = 0;
    if (cur !== active) setActive(cur);
  }

  /* =========================================================================
     5. reveal on scroll, counters, tilt
  ========================================================================= */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      countUp(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -5% 0px' }) : null;

  function refresh() {
    document.querySelectorAll('.ch-body').forEach(function (body) {
      Array.prototype.forEach.call(body.children, function (ch) {
        if (!ch.classList.contains('reveal') && !ch.hasAttribute('data-stagger')) ch.classList.add('reveal');
      });
    });
    document.querySelectorAll('[data-stagger]').forEach(function (box) {
      Array.prototype.forEach.call(box.children, function (ch, i) {
        if (ch.classList.contains('reveal')) return;
        ch.classList.add('reveal');
        ch.style.transitionDelay = ((i % 8) * 70) + 'ms';
      });
    });
    var pending = document.querySelectorAll('.reveal:not(.in)');
    if (!io) { pending.forEach(function (el) { el.classList.add('in'); countUp(el); }); return; }
    pending.forEach(function (el) { io.observe(el); });
  }

  function countUp(scope) {
    var els = scope.classList && scope.classList.contains('count') ? [scope]
            : Array.prototype.slice.call(scope.querySelectorAll ? scope.querySelectorAll('.count') : []);
    els.forEach(function (el) {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      var target = el.dataset.n, n = parseFloat(target);
      if (reduce || !isFinite(n) || !window.requestAnimationFrame) { el.textContent = target; return; }
      var t0 = performance.now(), dur = 900;
      (function step(t) {
        var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(n * k);
        if (k < 1) requestAnimationFrame(step); else el.textContent = target;
      })(t0);
    });
  }

  if (fine && !reduce) {
    var tilting = null;
    document.addEventListener('pointermove', function (e) {
      var t = e.target.closest ? e.target.closest('.tilt') : null;
      if (tilting && tilting !== t) { tilting.style.transform = ''; tilting.classList.remove('tilting'); }
      tilting = t;
      if (!t) return;
      var r = t.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      t.classList.add('tilting');
      t.style.transform = 'perspective(720px) rotateX(' + (-y * 6).toFixed(2) + 'deg) rotateY(' +
                          (x * 8).toFixed(2) + 'deg) translateY(-2px)';
    }, { passive: true });
    window.addEventListener('scroll', function () {
      if (tilting) { tilting.style.transform = ''; tilting.classList.remove('tilting'); tilting = null; }
    }, { passive: true });
  }

  /* =========================================================================
     6. the loop
  ========================================================================= */
  var tick = 0, ssm = 0, glyphs = [];
  function collectGlyphs() {
    glyphs = Array.prototype.slice.call(document.querySelectorAll('.chapter .ch-glyph')).map(function (g) {
      return { el: g, sec: g.closest('.chapter') };
    });
  }

  function loop() {
    tick++;
    var sy = window.scrollY || window.pageYOffset || 0;
    ssm += (sy - ssm) * 0.16;
    rx += (clamp(px, LIMX()) - rx) * 0.08;
    ry += (clamp(py, LIMY()) - ry) * 0.08;

    // the star canvases redraw at half rate: twinkle does not need 60fps,
    // and this halves the cost on phones and integrated graphics
    if (tick < 3 || (!reduce && tick % 2 === 0 && !document.hidden)) {
      drawFar(tick, ssm * 0.05); drawMid(tick, ssm * 0.13); drawNear(tick, ssm * 0.24);
    }
    starFar.style.transform  = 'translate3d(' + rx * 0.28 + 'px,' + ry * 0.28 + 'px,0)';
    starMid.style.transform  = 'translate3d(' + rx * 0.6 + 'px,' + ry * 0.6 + 'px,0)';
    starNear.style.transform = 'translate3d(' + rx * 0.9 + 'px,' + ry * 0.9 + 'px,0)';
    var drift = Math.sin(ssm / 2600) * 90;
    nebula.style.transform   = 'translate3d(' + rx * 0.5 + 'px,' + (ry * 0.5 + drift) + 'px,0)';
    core.style.transform     = 'translate(-50%,-50%) translate3d(' + rx * 0.4 + 'px,' + (ry * 0.4 - drift * 0.6) + 'px,0)';
    if (!reduce) wheelBg.style.transform = 'rotate(' + (ssm * 0.022 + tick * 0.006) + 'deg)';

    if (tick % 2 === 0) {
      for (var i = 0; i < glyphs.length; i++) {
        var r = glyphs[i].sec.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
        glyphs[i].el.style.transform = 'translateY(' + (r.top * -0.14).toFixed(1) + 'px)';
      }
    }
    if (tick % 5 === 0) spy();
    requestAnimationFrame(loop);
  }

  /* occasional shooting star */
  function shoot() {
    if (reduce) return;
    var s = document.createElement('div');
    s.className = 'shoot';
    s.style.left = (Math.random() * window.innerWidth * 0.5) + 'px';
    s.style.top = (Math.random() * window.innerHeight * 0.6) + 'px';
    $('universe').appendChild(s);
    if (s.animate) {
      s.animate([{ transform:'rotate(26deg) translateX(0)', opacity:0 },
                 { opacity:1, offset:0.12 },
                 { transform:'rotate(26deg) translateX(360px)', opacity:0 }],
                { duration:1200, easing:'ease-out' });
    }
    setTimeout(function () { s.remove(); }, 1300);
    setTimeout(shoot, 4000 + Math.random() * 8000);
  }
  setTimeout(shoot, 4500);

  var spyPending = false;
  window.addEventListener('scroll', function () {
    if (spyPending) return;
    spyPending = true;
    setTimeout(function () { spyPending = false; spy(); }, 90);
  }, { passive: true });

  function unlock() {
    $('journey').classList.remove('locked');
    document.body.classList.add('cast');
    var cue = $('scrollCue'); if (cue) cue.hidden = false;
    collectGlyphs();
    refresh();
    spy();
  }

  build();
  collectGlyphs();
  refresh();
  loop();

  root.Immersive = {
    refresh: refresh, goTo: goTo, unlock: unlock, setSky: setSky,
    requestMotion: requestMotion, chapters: function () { return sections.slice(); },
    reduced: reduce
  };
})(window);
