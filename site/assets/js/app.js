/* ============================================================================
   app.js - interface: the star field, the gate, the chart, the three
   questions, the monthly reading and the rashi sky.
============================================================================ */
(function () {
  'use strict';

  var A = window.Astro, K = window.Kundli, R = window.Reading, D = window.VData;
  var $ = function (id) { return document.getElementById(id); };
  var ORD = R.ORD, MONTHS = R.MONTH_NAMES;
  var ABBR = { Sun:'Su', Moon:'Mo', Mars:'Ma', Mercury:'Me', Jupiter:'Ju',
               Venus:'Ve', Saturn:'Sa', Rahu:'Ra', Ketu:'Ke' };

  var state = { chart:null, answers:[null,null,null], month:null };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c];
    });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(o) { return o.d + ' ' + MONTHS[o.m - 1] + ' ' + o.y; }

  /* =========================================================================
     1. star field
  ========================================================================= */
  function makeField(cid, count, sizeMul, speed) {
    var cv = $(cid), ctx = cv.getContext('2d'), W, H, stars = [], dpr;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    return function (t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i], a = Math.max(0, s.b + Math.sin(t * s.sp + s.tw) * 0.32);
        ctx.fillStyle = s.h === 'g' ? 'rgba(245,208,111,' + a + ')'
                      : s.h === 'p' ? 'rgba(180,150,255,' + a + ')'
                      : 'rgba(234,230,255,' + a + ')';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
        if (s.r > 1.3 * dpr) {
          ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.18) + ')';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.6, 0, 6.283); ctx.fill();
        }
      }
    };
  }

  var drawFar = makeField('cFar', 90, 1.0, 0.02),
      drawMid = makeField('cMid', 58, 1.5, 0.03),
      drawNear = makeField('cNear', 32, 2.2, 0.045);

  var starFar = $('starFar'), starMid = $('starMid'), starNear = $('starNear'),
      nebula = $('nebula'), core = $('galaxyCore'), cwrap = $('constellations');

  var px = 0, py = 0, rx = 0, ry = 0, tick = 0;
  var LIMX = function () { return window.innerWidth * 0.32; };
  var LIMY = function () { return window.innerHeight * 0.32; };
  function clamp(v, m) { return Math.max(-m, Math.min(m, v)); }

  function loop() {
    tick++;
    drawFar(tick); drawMid(tick); drawNear(tick);
    rx += (clamp(px, LIMX()) - rx) * 0.12;
    ry += (clamp(py, LIMY()) - ry) * 0.12;
    starFar.style.transform  = 'translate3d(' + rx * 0.28 + 'px,' + ry * 0.28 + 'px,0)';
    nebula.style.transform   = 'translate3d(' + rx * 0.5 + 'px,' + ry * 0.5 + 'px,0)';
    core.style.transform     = 'translate(-50%,-50%) translate3d(' + rx * 0.4 + 'px,' + ry * 0.4 + 'px,0)';
    starMid.style.transform  = 'translate3d(' + rx * 0.6 + 'px,' + ry * 0.6 + 'px,0)';
    starNear.style.transform = 'translate3d(' + rx * 0.9 + 'px,' + ry * 0.9 + 'px,0)';
    if (cwrap) cwrap.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    requestAnimationFrame(loop);
  }
  loop();

  function shoot() {
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

  /* =========================================================================
     2. the gate
  ========================================================================= */
  var fPlace = $('fPlace'), suggest = $('suggest');
  var pickedIsIndia = false;

  /* ---- the gazetteer -------------------------------------------------
     Tier 1: GeoIN.TOP, ~2600 Indian places of real size, already in memory.
     Tier 2: 557,135 places sharded under /geo/, fetched only when the first
     tier cannot satisfy the query. India is covered down to village level. */

  var manifest = null, manifestPending = null, shardCache = {};

  function norm(s) {
    s = String(s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[^a-z0-9]+/g, '');
  }

  // parse one gazetteer line into the shared result shape
  function parseIN(line) {
    var f = line.split('\t');
    var st = window.GeoIN.STATES[+f[1]] || '';
    var dt = window.GeoIN.DISTS[+f[2]] || '';
    var where = dt && dt !== f[0] ? dt + ', ' + st : st;
    return {
      name: f[0], where: where + (st ? ', India' : 'India'),
      lat: +f[3] / 10000, lon: +f[4] / 10000, pop: +f[5] || 0, india: true
    };
  }

  var TOP_ROWS = null;
  function topRows() {
    if (!TOP_ROWS) TOP_ROWS = window.GeoIN.TOP.split('\n');
    return TOP_ROWS;
  }

  function loadManifest() {
    if (manifest) return Promise.resolve(manifest);
    if (manifestPending) return manifestPending;
    manifestPending = fetch('geo/manifest.txt')
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) {
        manifest = {};
        t.split('\n').forEach(function (p) { if (p) manifest[p] = 1; });
        return manifest;
      })
      .catch(function () { manifest = {}; return manifest; });
    return manifestPending;
  }

  function shardFor(key) {
    for (var L = 6; L >= 3; L--) {
      var p = (key + '______').slice(0, L);
      if (manifest[p]) return p;
    }
    return null;
  }

  function loadShard(p) {
    if (shardCache[p]) return Promise.resolve(shardCache[p]);
    // shard files carry an "s" prefix so names like "con"/"aux"/"nul" are not
    // Windows reserved device names at build time
    return fetch('geo/s' + p + '.txt')
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) {
        shardCache[p] = t ? t.split('\n') : [];
        return shardCache[p];
      })
      .catch(function () { shardCache[p] = []; return shardCache[p]; });
  }

  function rank(rows, key, parse) {
    var starts = [], inside = [];
    for (var i = 0; i < rows.length; i++) {
      var rec = parse(rows[i]);
      var n = norm(rec.name);
      if (n.indexOf(key) === 0) starts.push(rec);
      else if (n.indexOf(key) > 0) inside.push(rec);
      if (starts.length > 400) break;
    }
    var byPop = function (a, b) { return b.pop - a.pop; };
    return starts.sort(byPop).concat(inside.sort(byPop));
  }

  function searchWorld(key) {
    return rank(D.CITIES, key, function (c) {
      return { name: c[0], where: c[1], lat: c[2], lon: c[3], tz: c[4], india: false, pop: 1 };
    });
  }

  var searchSeq = 0;
  function runSearch(raw) {
    var key = norm(raw);
    if (key.length < 2) { suggest.hidden = true; return; }
    var seq = ++searchSeq;

    var local = rank(topRows(), key, parseIN).concat(searchWorld(key));
    render(local, local.length < 8 && key.length >= 3);

    // reach for the full gazetteer only when the inline tier is thin
    if (key.length < 3 || local.length >= 8) return;
    loadManifest().then(function () {
      var p = shardFor(key);
      if (!p || seq !== searchSeq) return;
      return loadShard(p).then(function (rows) {
        if (seq !== searchSeq) return;
        var seen = {};
        local.forEach(function (r) { seen[norm(r.name) + r.lat.toFixed(2)] = 1; });
        var extra = rank(rows, key, parseIN).filter(function (r) {
          var k = norm(r.name) + r.lat.toFixed(2);
          if (seen[k]) return false;
          seen[k] = 1; return true;
        });
        render(local.concat(extra), false);
      });
    });
  }

  function render(list, searching) {
    if (!list.length && !searching) {
      suggest.innerHTML = '<button type="button" disabled class="none">' +
        'No match. Type latitude and longitude below instead.</button>';
      suggest.hidden = false;
      return;
    }
    var shown = list.slice(0, 10);
    suggest.innerHTML = shown.map(function (c, i) {
      return '<button type="button" data-i="' + i + '">' + esc(c.name) +
             '<small>' + esc(c.where) + (c.pop > 1000 ? ' · pop ' + fmtPop(c.pop) : '') + '</small></button>';
    }).join('') + (searching
      ? '<button type="button" disabled class="none">searching all 557,135 Indian places…</button>'
      : '');
    suggest.hidden = false;
    Array.prototype.forEach.call(suggest.children, function (btn) {
      if (btn.disabled) return;
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault();
        pickPlace(shown[+btn.dataset.i]);
      });
    });
  }

  function fmtPop(n) {
    if (n >= 10000000) return (n / 10000000).toFixed(1) + ' Cr';
    if (n >= 100000) return (n / 100000).toFixed(1) + ' L';
    if (n >= 1000) return Math.round(n / 1000) + 'k';
    return String(n);
  }

  function pickPlace(c) {
    fPlace.value = c.name + ', ' + c.where;
    $('fLat').value = c.lat.toFixed(4);
    $('fLon').value = c.lon.toFixed(4);
    pickedIsIndia = !!c.india;
    if (c.india) applyIndiaTz();
    else $('fTz').value = (c.tz >= 0 ? '+' : '') + c.tz;
    suggest.hidden = true;
  }

  /* India's offset depends on the birth DATE, not just the place:
     +5:21:10 before 1906, +6:30 in the wartime years, +5:30 otherwise. */
  function applyIndiaTz() {
    if (!pickedIsIndia) return;
    var dv = $('fDate').value;
    if (!dv) { $('fTz').value = '+5.5'; return; }
    var p = dv.split('-');
    var off = A.indiaOffset(+p[0], +p[1], +p[2]);
    $('fTz').value = (off >= 0 ? '+' : '') + (Math.round(off * 10000) / 10000);
    var note = $('tzNote');
    if (note) {
      note.textContent = Math.abs(off - 5.5) < 1e-9 ? '' :
        (off === 6.5
          ? 'India ran on UTC+6:30 during the war years — offset set automatically.'
          : 'Before 1906 India kept Madras Mean Time, UTC+5:21:10 — offset set automatically.');
    }
  }

  fPlace.addEventListener('input', function () { runSearch(fPlace.value); });
  fPlace.addEventListener('focus', function () { loadManifest(); });
  fPlace.addEventListener('blur', function () {
    setTimeout(function () { suggest.hidden = true; }, 140);
  });
  $('fDate').addEventListener('change', applyIndiaTz);

  $('fNoTime').addEventListener('change', function () {
    var on = this.checked;
    $('fTime').disabled = on;
    if (on) $('fTime').value = '12:00';
  });

  function parseNum(v) {
    var n = parseFloat(String(v).replace(/[^0-9.+-]/g, ''));
    return isFinite(n) ? n : null;
  }

  $('birthForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('gateErr');
    err.textContent = '';

    var dv = $('fDate').value;
    if (!dv) { err.textContent = 'Please give your date of birth.'; return; }
    var dp = dv.split('-');
    var y = +dp[0], m = +dp[1], d = +dp[2];
    if (y < 1900 || y > 2035) { err.textContent = 'This engine is accurate for births from 1900 to 2035.'; return; }

    var noTime = $('fNoTime').checked;
    var tv = ($('fTime').value || '12:00').split(':');
    var hh = +tv[0], mm = +tv[1];
    if (!isFinite(hh) || !isFinite(mm)) { hh = 12; mm = 0; }

    var lat = parseNum($('fLat').value), lon = parseNum($('fLon').value);
    if (lat === null || lon === null) {
      err.textContent = 'Pick a birth city from the list, or type latitude and longitude yourself.'; return;
    }
    if (lat < -90 || lat > 90) { err.textContent = 'Latitude must be between -90 and 90.'; return; }
    if (lon < -180 || lon > 180) { err.textContent = 'Longitude must be between -180 and 180.'; return; }
    if (Math.abs(lat) > 66.5) { err.textContent = 'Above the polar circles the ascendant is undefined for parts of the year. Please use a nearby lower-latitude place.'; return; }

    var tz = parseNum($('fTz').value);
    if (tz === null || tz < -12 || tz > 14) { err.textContent = 'UTC offset must be between -12 and +14 (India is +5.5).'; return; }

    var birth = {
      name: ($('fName').value || '').trim() || 'Traveller',
      y:y, m:m, d:d, hh:hh, mm:mm, tz:tz, lat:lat, lon:lon,
      place: fPlace.value.trim() || (lat.toFixed(2) + ', ' + lon.toFixed(2)),
      india: pickedIsIndia,
      timeKnown: !noTime
    };
    try { localStorage.setItem('jd.birth', JSON.stringify(birth)); } catch (e2) {}
    launch(birth);
  });

  $('btnEdit').addEventListener('click', function () {
    $('shell').hidden = true;
    $('gate').hidden = false;
    $('gate').style.opacity = '1';
    document.body.style.overflow = '';
  });

  /* =========================================================================
     3. launching
  ========================================================================= */
  function nowJD() {
    var n = new Date();
    return A.toJD(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(),
                  n.getUTCHours(), n.getUTCMinutes(), 0);
  }

  function launch(birth) {
    var chart = K.attachDeep(K.buildChart(birth), nowJD());
    state.chart = chart;
    state.answers = [null, null, null];
    state.month = null;

    $('gate').style.opacity = '0';
    setTimeout(function () { $('gate').hidden = true; }, 500);
    $('shell').hidden = false;

    $('whoName').textContent = birth.name;
    $('whoSub').textContent = D.RASHIS[chart.moonSign].n + ' rashi · ' +
      D.NAKSHATRAS[chart.moonNak].n + ' · ' + fmtDate({ y:birth.y, m:birth.m, d:birth.d });

    renderChart(chart);
    renderDeep(chart);
    renderVargaView(chart);
    renderAsk(chart);
    renderSky(chart);
    show('viewChart');
    setTimeout(function () { renderMonth(chart); }, 60);
  }

  function show(id) {
    ['viewChart','viewVarga','viewAsk','viewMonth','viewSky'].forEach(function (v) {
      $(v).hidden = (v !== id);
    });
    Array.prototype.forEach.call($('nav').children, function (b) {
      b.classList.toggle('on', b.dataset.view === id);
    });
  }
  Array.prototype.forEach.call($('nav').children, function (b) {
    b.addEventListener('click', function () { show(b.dataset.view); });
  });

  /* =========================================================================
     4. the kundli view
  ========================================================================= */
  var HOUSE_POLY = [
    '200,0 300,100 200,200 100,100',
    '0,0 200,0 100,100',
    '0,0 100,100 0,200',
    '0,200 100,100 200,200 100,300',
    '0,200 100,300 0,400',
    '0,400 100,300 200,400',
    '200,400 100,300 200,200 300,300',
    '200,400 300,300 400,400',
    '400,400 300,300 400,200',
    '400,200 300,300 200,200 300,100',
    '400,200 300,100 400,0',
    '400,0 300,100 200,0'
  ];
  var HOUSE_ANCHOR = [
    [200,112],[100,42],[42,100],[100,200],[42,300],[100,362],
    [200,292],[300,362],[358,300],[300,200],[358,100],[300,42]
  ];

  function renderChart(chart) {
    var svg = ['<svg class="kundli" viewBox="-4 -4 408 408" role="img" aria-label="North Indian rashi chart">'];
    svg.push('<rect class="frame" x="0" y="0" width="400" height="400" rx="6"/>');

    for (var i = 0; i < 12; i++) {
      var h = chart.houses[i], a = HOUSE_ANCHOR[i];
      svg.push('<polygon class="cell' + (i === 0 ? ' lagna' : '') + '" points="' + HOUSE_POLY[i] + '"/>');
      svg.push('<text class="hn" x="' + a[0] + '" y="' + (a[1] - 20) + '" text-anchor="middle">' +
               (h.sign + 1) + '</text>');
      var occ = h.occupants;
      var top = a[1] - (occ.length - 1) * 6.5 + 4;
      for (var j = 0; j < occ.length; j++) {
        // the nodes are always retrograde, so only true retrogrades are marked
        var isR = occ[j].retro && occ[j].name !== 'Rahu' && occ[j].name !== 'Ketu';
        svg.push('<text class="pl' + (isR ? ' retro' : '') + '" x="' + a[0] +
                 '" y="' + (top + j * 13) + '" text-anchor="middle">' +
                 ABBR[occ[j].name] + '</text>');
      }
    }
    svg.push('</svg>');
    $('chartHost').innerHTML = svg.join('');

    $('timeWarn').innerHTML = chart.timeKnown ? '' :
      '<div class="card" style="border-color:rgba(255,158,203,.45)"><h4>Birth time not given</h4>' +
      '<p>The chart above is cast for 12:00 noon. Your Moon sign, nakshatra and daśā are still close to right, ' +
      'but the <b>lagna and every house position can be wrong by several signs</b> — the ascendant moves a full ' +
      'rāśi roughly every two hours. Treat the house-based readings as provisional until you find your birth time.</p></div>';

    var lagna = D.RASHIS[chart.lagnaSign], moon = D.RASHIS[chart.moonSign],
        sun = D.RASHIS[chart.sunSign], nak = D.NAKSHATRAS[chart.moonNak];
    $('big3').innerHTML =
      cell('Lagna (ascendant)', lagna.n, lagna.w + ' · ' + chart.lagnaDeg) +
      cell('Chandra rāśi (Moon)', moon.n, moon.w + ' · your true "rashi"') +
      cell('Nakṣatra', nak.n, 'Pāda ' + chart.moonPada + ' · lord ' + D.GRAHAS[nak.lord].dev);

    function cell(k, v, s) {
      return '<div><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) +
             '</div><div class="s">' + esc(s) + '</div></div>';
    }

    // graha table
    var rows = ['<tr><th>Graha</th><th>Rāśi</th><th>Deg</th><th>Bhāva</th><th>Nakṣatra</th><th>Dignity</th></tr>'];
    chart.planets.forEach(function (p) {
      var cls = p.dignity.score > 0.5 ? 'd-up' : p.dignity.score < -0.5 ? 'd-dn' : 'd-mid';
      rows.push('<tr><td class="g"><b>' + p.sym + '</b>' + esc(p.dev) +
        (p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' ? ' <span class="r">℞</span>' : '') + '</td>' +
        '<td>' + esc(D.RASHIS[p.sign].n) + '</td>' +
        '<td>' + p.degText + '</td>' +
        '<td>' + p.house + '</td>' +
        '<td>' + esc(D.NAKSHATRAS[p.nak].n) + ' ' + p.pada + '</td>' +
        '<td class="dg ' + cls + '">' + esc(p.dignity.label) + '</td></tr>');
    });
    $('grahaTable').innerHTML = rows.join('');

    renderDasha(chart);
    renderChartNotes(chart);
  }

  /* ---- Avakhada chakra, yogas, doshas --------------------------------- */
  function renderDeep(chart) {
    var dp = chart.deep;
    if (!dp) return;
    var av = dp.avakhada;
    function kv(k, v) { return '<div><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div>'; }

    $('avakhada').innerHTML = '<div class="pan-grid">' +
      kv('Varna', av.varna) + kv('Vashya', av.vashya) +
      kv('Yoni', av.yoni) + kv('Gana', av.gana) +
      kv('Nadi', av.nadi) + kv('Tatva', av.tatva) +
      kv('Nakshatra lord', D.GRAHAS[av.nakshatraLord].dev) +
      kv('Rashi lord', D.GRAHAS[av.rashiLord].dev) +
      kv('Nama akshara', av.syllable) +
      kv('Vargottama', dp.vargottama.length
          ? dp.vargottama.map(function (n) { return D.GRAHAS[n].dev; }).join(', ') : 'none') +
      '</div><p class="foot lead-left">These are the traditional matching attributes, the same ones ' +
      'a pandit reads off before Guna Milan. Nama akshara is the syllable your name would classically ' +
      'begin with, from ' + esc(D.NAKSHATRAS[chart.moonNak].n) + ' pada ' + chart.moonPada + '.</p>';

    var extras = [];
    if (dp.combust.length) {
      extras.push('<div class="card"><h4>Combust (asta)</h4><p>' +
        dp.combust.map(function (c) {
          return D.GRAHAS[c.name].dev + ' is ' + (c.deep ? 'deeply ' : '') + 'combust, ' +
            c.sep.toFixed(1) + ' degrees from the Sun (limit ' + c.limit + ')';
        }).join('; ') + '. A combust graha still rules its houses, but it acts through the Sun: its ' +
        'results arrive via authority, the father, or your own reputation rather than independently.</p></div>');
    }
    if (dp.war.length) {
      extras.push('<div class="card"><h4>Graha yuddha (planetary war)</h4><p>' +
        dp.war.map(function (w) {
          return D.GRAHAS[w.winner].dev + ' defeats ' + D.GRAHAS[w.loser].dev + ' by ' + w.sep.toFixed(2) + ' degrees';
        }).join('; ') + '. The defeated graha gives its results weakly for life.</p></div>');
    }

    $('yogaHost').innerHTML = (dp.yogas.length
      ? dp.yogas.map(function (y) {
          return '<div class="card yoga ' + y.tier + '"><h4>' + esc(y.name) +
            ' <span class="tier">' + y.tier + '</span></h4><p>' + esc(y.t) + '</p></div>';
        }).join('')
      : '<div class="card"><p>No yoga from the standard classical set is formed in this chart. That is ' +
        'common and not a deficiency: most charts run on house lords and dasha rather than named yogas.</p></div>')
      + extras.join('');

    $('doshaHost').innerHTML = dp.doshas.length
      ? dp.doshas.map(function (d) {
          var dates = '';
          if (d.dates && d.dates.start && d.dates.end) {
            var a = A.fromJD(d.dates.start), b = A.fromJD(d.dates.end);
            dates = '<p class="dosha-dates">Window: ' + MONTHS[a.m - 1] + ' ' + a.y +
                    ' to ' + MONTHS[b.m - 1] + ' ' + b.y + '</p>';
          }
          return '<div class="card dosha ' + d.severity + '"><h4>' + esc(d.name) +
            ' <span class="tier">' + d.severity + '</span></h4><p>' + esc(d.t) + '</p>' + dates + '</div>';
        }).join('')
      : '<div class="card"><p>None of Manglik, Kaal Sarpa, Sade Sati, Dhaiya or the Pitra indication ' +
        'is present in this chart right now.</p></div>';
  }

  /* ---- vargas, ashtakavarga, shadbala --------------------------------- */
  var currentVarga = 'D9';

  function renderVargaView(chart) {
    var J = window.Jyotish, dp = chart.deep;
    $('vargaPick').innerHTML = J.VARGA_META.map(function (v) {
      return '<button type="button" class="chip' + (v[0] === currentVarga ? ' on' : '') +
             '" data-v="' + v[0] + '">' + v[0] + '</button>';
    }).join('');
    Array.prototype.forEach.call($('vargaPick').children, function (b) {
      b.addEventListener('click', function () {
        currentVarga = b.dataset.v;
        Array.prototype.forEach.call($('vargaPick').children, function (x) {
          x.classList.toggle('on', x.dataset.v === currentVarga);
        });
        drawVarga(chart);
      });
    });
    drawVarga(chart);

    var av = dp.av;
    var rows = ['<tr><th>Rashi</th>' + J.SEVEN.map(function (p) {
      return '<th>' + D.GRAHAS[p].sym + '</th>'; }).join('') + '<th>SAV</th></tr>'];
    for (var i = 0; i < 12; i++) {
      var sign = (chart.lagnaSign + i) % 12;
      var sav = av.sav[sign];
      rows.push('<tr><td class="g">' + (i + 1) + ' &middot; ' + esc(D.RASHIS[sign].n) + '</td>' +
        J.SEVEN.map(function (p) { return '<td>' + av.bav[p][sign] + '</td>'; }).join('') +
        '<td class="sav ' + (sav >= 30 ? 'hi' : sav <= 25 ? 'lo' : '') + '">' + sav + '</td></tr>');
    }
    $('avHost').innerHTML =
      '<p class="lede sm">Bindus counted house by house from your lagna. The SAV column is the one ' +
      'that matters: 28 is average, above 30 marks a house where transits actually produce results, ' +
      'below 25 a house that stays hard work.</p>' +
      '<div class="tscroll"><table class="grahas av-table">' + rows.join('') + '</table></div>' +
      '<p class="foot lead-left">Column totals are the classical 48 / 49 / 39 / 54 / 56 / 52 / 39, summing to 337.</p>';

    var bala = dp.bala;
    var max = Math.max.apply(null, J.SEVEN.map(function (p) { return bala[p].ratio; }));
    $('balaHost').innerHTML =
      '<p class="lede sm">Six-fold strength against the minimum each graha needs. Above 1.00 it can ' +
      'act on its own; below, it waits for a dasha or transit to carry it.</p>' +
      J.SEVEN.map(function (p) {
        var b = bala[p];
        return '<div class="bala-row"><span class="bn">' + D.GRAHAS[p].sym + ' ' + esc(D.GRAHAS[p].dev) + '</span>' +
          '<span class="btrack"><i style="width:' + Math.min(100, b.ratio / Math.max(max, 1.2) * 100).toFixed(1) +
          '%;background:' + D.GRAHAS[p].color + '"></i></span>' +
          '<span class="bv ' + (b.ratio >= 1 ? 'ok' : 'under') + '">' + b.ratio.toFixed(2) + '</span></div>';
      }).join('') +
      '<p class="foot lead-left">Sthana, Dig, Kala, Cheshta and Naisargika components are computed. ' +
      'Drik bala is omitted: it is the component authorities disagree on most, and a wrong number ' +
      'would be worse than an absent one.</p>';
  }

  function drawVarga(chart) {
    var J = window.Jyotish;
    var meta = J.VARGA_META.filter(function (m) { return m[0] === currentVarga; })[0];
    var vc = J.vargaChart(chart, currentVarga);
    var byHouse = {};
    vc.planets.forEach(function (p) { (byHouse[p.house] = byHouse[p.house] || []).push(p); });
    var svg = ['<svg class="kundli" viewBox="-4 -4 408 408" role="img" aria-label="' + currentVarga +
               ' chart"><rect class="frame" x="0" y="0" width="400" height="400" rx="6"/>'];
    for (var i = 0; i < 12; i++) {
      var sign = (vc.lagnaSign + i) % 12, a = HOUSE_ANCHOR[i];
      svg.push('<polygon class="cell' + (i === 0 ? ' lagna' : '') + '" points="' + HOUSE_POLY[i] + '"/>');
      svg.push('<text class="hn" x="' + a[0] + '" y="' + (a[1] - 20) + '" text-anchor="middle">' + (sign + 1) + '</text>');
      var occ = byHouse[i + 1] || [];
      var top = a[1] - (occ.length - 1) * 6.5 + 4;
      for (var j = 0; j < occ.length; j++) {
        svg.push('<text class="pl" x="' + a[0] + '" y="' + (top + j * 13) +
                 '" text-anchor="middle">' + ABBR[occ[j].name] + '</text>');
      }
    }
    svg.push('</svg>');
    $('vargaHost').innerHTML = svg.join('');
    $('vargaNote').innerHTML = '<div class="card"><h4>' + esc(meta[0] + ' · ' + meta[1]) +
      '</h4><p>Read for ' + esc(meta[2]) + '. The lagna of this varga falls in ' +
      esc(D.RASHIS[vc.lagnaSign].n) + '.' +
      (currentVarga === 'D9' && chart.deep.vargottama.length
        ? ' Vargottama here: ' + chart.deep.vargottama.map(function (n) { return D.GRAHAS[n].dev; }).join(', ') +
          ' — the same rashi in D-1 and D-9, the strongest confirmation a placement can get.'
        : '') + '</p></div>';
  }

  function renderDasha(chart) {
    var jd = nowJD(), cur = K.dashaAt(chart.dasha, jd);
    var seq = chart.dasha.sequence.slice(0, 9);
    var total = seq[seq.length - 1].end - seq[0].start;
    var bar = seq.map(function (s) {
      return '<i style="width:' + ((s.end - s.start) / total * 100).toFixed(2) + '%;background:' +
             D.GRAHAS[s.lord].color + ';opacity:' + (cur && s.lord === cur.maha.lord ? 1 : 0.4) + '"></i>';
    }).join('');

    var list = seq.map(function (s) {
      var a = A.fromJD(s.start), b = A.fromJD(s.end);
      var isNow = cur && s.start === cur.maha.start;
      return '<div class="' + (isNow ? 'now' : '') + '"><b>' + esc(D.GRAHAS[s.lord].dev) + '</b> · ' +
             a.y + '–' + b.y + (isNow ? '  ◀ running now' : '') + '</div>';
    }).join('');

    var head = '';
    if (cur) {
      var ae = A.fromJD(cur.antar.end);
      head = '<div class="card"><h4>Where you are right now</h4><p>' +
        '<b style="color:var(--gold);font-weight:400">' + esc(D.GRAHAS[cur.maha.lord].dev) + ' mahādaśā</b> → ' +
        esc(D.GRAHAS[cur.antar.lord].dev) + ' antardaśā, running until ' +
        MONTHS[ae.m - 1] + ' ' + ae.y + '. ' +
        'At birth you had ' + chart.dasha.balanceYears.toFixed(1) + ' years of ' +
        esc(D.GRAHAS[chart.dasha.firstLord].dev) + ' remaining, counted from ' +
        esc(D.NAKSHATRAS[chart.moonNak].n) + '.</p></div>';
    }
    $('dashaHost').innerHTML = head + '<div class="dasha-bar">' + bar + '</div><div class="dasha-list">' + list + '</div>';
  }

  function renderChartNotes(chart) {
    var notes = [];
    var strong = chart.planets.filter(function (p) { return p.dignity.score >= 1.5; });
    var weak = chart.planets.filter(function (p) { return p.dignity.score <= -2; });

    if (strong.length) {
      notes.push([strong.length > 1 ? 'Your strongest grahas' : 'Your strongest graha',
        strong.map(function (p) {
          return D.GRAHAS[p.name].dev + ' (' + p.dignity.label.toLowerCase() + ' in ' +
            D.RASHIS[p.sign].n + ', ' + ORD[p.house] + ' house)';
        }).join(', ') + '. ' + (strong.length > 1 ? 'These carry ' : 'This carries ') +
        strong.map(function (p) { return D.GRAHAS[p.name].karaka.split(',')[0]; }).join(' and ') +
        ' with unusual ease — ' + (strong.length > 1 ? 'they are' : 'it is') +
        ' what you should lean on when a decision is genuinely hard.']);
    }
    if (weak.length) {
      notes.push(['Where the chart asks for work',
        weak.map(function (p) {
          return D.GRAHAS[p.name].dev + ' is debilitated in ' + D.RASHIS[p.sign].n +
            ' in your ' + ORD[p.house];
        }).join('; ') + '. Debilitation is not doom — it is a placement that matures late and rewards ' +
        'deliberate effort rather than instinct.']);
    }

    var lagnaLord = chart.byName[D.RASHIS[chart.lagnaSign].lord];
    notes.push(['Your lagna lord',
      D.GRAHAS[lagnaLord.name].dev + ' rules your ' + D.RASHIS[chart.lagnaSign].n + ' lagna and sits in the ' +
      ORD[lagnaLord.house] + ' house in ' + D.RASHIS[lagnaLord.sign].n + ', ' +
      lagnaLord.dignity.label.toLowerCase() + '. In Jyotiṣa this single placement says more about the ' +
      'direction of a life than the sun sign does — it points your vitality at ' +
      R.houseTheme(lagnaLord.house) + '.']);

    var yogaBits = [];
    chart.planets.forEach(function (p) {
      if (p.name === 'Rahu' || p.name === 'Ketu') return;
      if ([1,4,7,10].indexOf(p.house) >= 0 && p.dignity.score >= 1.5) {
        yogaBits.push(D.GRAHAS[p.name].dev + ' forms a Pañca-Mahāpuruṣa-type strength — ' +
          p.dignity.label.toLowerCase() + ' in a kendra');
      }
    });
    if (yogaBits.length) notes.push(['A notable yoga', yogaBits.join('; ') + '.']);

    $('chartNotes').innerHTML = notes.map(function (n) {
      return '<div class="card"><h4>' + esc(n[0]) + '</h4><p>' + n[1] + '</p></div>';
    }).join('');
  }

  /* =========================================================================
     5. ask
  ========================================================================= */
  function renderAsk(chart) {
    var host = $('qHost');
    host.innerHTML = [0,1,2].map(function (i) {
      return '<div class="qslot" data-slot="' + i + '">' +
        '<div class="qh"><span class="n">Question ' + (i + 1) + ' of 3</span>' +
        '<span class="pill v-neutral" data-status>Unasked</span></div>' +
        '<div class="chips" data-chips>' +
          D.DOMAINS.map(function (d) {
            return '<button type="button" class="chip" data-dom="' + d.id + '">' +
                   '<span class="i">' + d.icon + '</span>' + esc(d.label) + '</button>';
          }).join('') +
        '</div>' +
        '<textarea data-text placeholder="Ask it the way you would ask a person — “should I take the offer in Pune?”, “when will things settle at home?”"></textarea>' +
        '<button type="button" class="btn" data-go>Reveal the reading</button>' +
        '<div data-answer></div>' +
      '</div>';
    }).join('');

    Array.prototype.forEach.call(host.querySelectorAll('.qslot'), function (slot) {
      var idx = +slot.dataset.slot;
      slot.querySelectorAll('[data-dom]').forEach(function (chip) {
        chip.addEventListener('click', function () {
          var was = chip.classList.contains('on');
          slot.querySelectorAll('[data-dom]').forEach(function (c) { c.classList.remove('on'); });
          if (!was) chip.classList.add('on');
        });
      });
      slot.querySelector('[data-go]').addEventListener('click', function () {
        ask(chart, slot, idx);
      });
    });
    updateCount();
  }

  function updateCount() {
    var used = state.answers.filter(Boolean).length;
    $('qCount').textContent = used === 0 ? 'Three questions available'
      : used >= 3 ? 'All three questions used'
      : (3 - used) + ' question' + (3 - used === 1 ? '' : 's') + ' remaining';
  }

  function ask(chart, slot, idx) {
    var sel = slot.querySelector('[data-dom].on');
    var text = slot.querySelector('[data-text]').value.trim();
    if (!sel && !text) {
      slot.querySelector('[data-answer]').innerHTML =
        '<p class="err">Pick an area of life, or type your question — either one is enough.</p>';
      return;
    }
    var ans = R.answerQuestion(chart, sel ? sel.dataset.dom : null, text, nowJD());
    state.answers[idx] = ans;

    var st = slot.querySelector('[data-status]');
    st.textContent = ans.verdict.label;
    st.className = 'pill ' + ans.verdict.cls;

    // reflect a detected domain back onto the chips
    if (ans.usedDetection) {
      slot.querySelectorAll('[data-dom]').forEach(function (c) {
        c.classList.toggle('on', c.dataset.dom === ans.domain.id);
      });
    }

    slot.querySelector('[data-answer]').innerHTML = answerHTML(ans);
    slot.querySelector('[data-go]').textContent = 'Ask this one differently';
    updateCount();
    setTimeout(function () {
      slot.querySelector('[data-answer]').scrollIntoView({ behavior:'smooth', block:'nearest' });
    }, 60);
  }

  function answerHTML(a) {
    var h = ['<div class="answer">'];
    h.push('<div class="ahead"><span class="dm">' + a.domain.icon + ' ' + esc(a.domain.label) + '</span>' +
           '<span class="pill ' + a.verdict.cls + '">' + a.verdict.label + '</span></div>');
    if (a.question) {
      h.push('<div class="sub-block"><b>You asked</b>“' + esc(a.question) + '”' +
        (a.usedDetection ? ' — read against ' + esc(a.domain.subject) + '.' : '') + '</div>');
    }
    h.push('<p class="op">' + esc(a.opener) + '</p>');
    h.push('<ul>' + a.evidence.map(function (e) {
      var cls = e.w > 0.2 ? 'pos' : e.w < -0.2 ? 'neg' : '';
      return '<li class="' + cls + '">' + e.t + '</li>';
    }).join('') + '</ul>');
    if (a.supportText) h.push('<div class="sub-block"><b>Supporting houses</b>' + a.supportText + '</div>');
    if (a.depth && a.depth.length) {
      h.push('<div class="sub-block"><b>Navamsa, ashtakavarga and bala</b><ul class="tight">' +
        a.depth.map(function (e) {
          return '<li class="' + (e.w > 0.2 ? 'pos' : e.w < -0.2 ? 'neg' : '') + '">' + esc(e.t) + '</li>';
        }).join('') + '</ul></div>');
    }
    if (a.doshaBits && a.doshaBits.length) {
      h.push('<div class="sub-block"><b>Dosha bearing on this</b><ul class="tight">' +
        a.doshaBits.map(function (e) { return '<li class="neg">' + esc(e.t) + '</li>'; }).join('') + '</ul></div>');
    }
    h.push('<div class="sub-block"><b>Your dasha</b>' + a.dashaText + '</div>');
    h.push('<div class="sub-block"><b>Transits right now</b>' + a.transitText + '</div>');
    h.push('<div class="sub-block"><b>Timing</b>' + a.timing + '</div>');
    if (a.remedy) {
      h.push('<div class="sub-block"><b>Upāya · the weak link is ' + esc(D.GRAHAS[a.remedy.planet].dev) +
             '</b>' + esc(a.remedy.text) + '</div>');
    }
    h.push('</div>');
    return h.join('');
  }

  /* =========================================================================
     6. the month
  ========================================================================= */
  function renderMonth(chart) {
    var m = R.monthlyReading(chart, nowJD());
    state.month = m;
    var p = m.panchang;

    var h = [];
    h.push('<div class="verdict-hero"><div class="eyebrow">Your reading for</div>' +
      '<div class="m grad">' + esc(m.month) + '</div>' +
      '<div class="vv"><span class="pill ' + m.verdict.cls + '">' + m.verdict.label + '</span></div>' +
      '<p class="sy">' + esc(m.synthesis) + '</p></div>');

    h.push('<div class="section-h">The three calendars</div>');
    m.layers.forEach(function (l) {
      h.push('<div class="layer-card"><div class="lh"><span class="ic">' + l.icon + '</span>' +
        '<span class="ti">' + esc(l.title) + '</span></div><p>' + esc(l.text) + '</p></div>');
    });

    h.push('<div class="section-h">Today’s pañcāṅga</div>');
    h.push('<div class="pan-grid">' +
      pc('Tithi', p.paksha + ' ' + p.tithiName) +
      pc('Nakṣatra', p.nakName) +
      pc('Yoga', p.yogaName) +
      pc('Karaṇa', p.karanaName) +
      pc('Vāra', p.vara.n + ' (' + p.vara.w + ')') +
      pc('Māsa', p.monthName + ' · ' + p.ritu.n) +
      pc('Vikram Samvat', String(p.vikram)) +
      pc('Śaka Samvat', String(p.shaka)) +
      '</div>');

    h.push('<div class="section-h">Chinese pillars</div>');
    h.push('<div class="pan-grid">' +
      pc('Your year pillar', m.natalChinese.element.n + ' ' + m.natalChinese.animal.n) +
      pc('Your day animal', m.natalChinese.dayAnimal.n) +
      pc('Current year', m.chinese.element.n + ' ' + m.chinese.animal.n) +
      pc('Current solar month', m.chinese.monthAnimal.n) +
      '</div>');

    h.push('<div class="section-h">' + esc(m.month) + ' day by day</div>');
    h.push('<p class="lede" style="font-size:16px;margin-bottom:14px">Scored from your own Moon: ' +
      'tārā bala (the count from ' + esc(D.NAKSHATRAS[chart.moonNak].n) + '), candra bala, the tithi, ' +
      'and whether the weekday lord is friendly to ' + esc(D.GRAHAS[D.RASHIS[chart.moonSign].lord].dev) + '.</p>');
    h.push(dayGridHTML(m));

    h.push('<div class="daylist"><div class="section-h">Best windows</div>' +
      m.days.best.map(dayLine(m)).join('') + '</div>');
    h.push('<div class="daylist"><div class="section-h">Keep these quiet</div>' +
      m.days.worst.map(dayLine(m)).join('') + '</div>');

    h.push('<p class="foot">Pañcāṅga is computed for your birth-place time zone.<br>' +
      'Tithi and nakṣatra shown are for the current moment, not sunrise.</p>');

    $('monthHost').innerHTML = h.join('');
    renderMuhurtas(chart);

    function pc(k, v) { return '<div><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div>'; }
  }

  function renderMuhurtas(chart) {
    var now = new Date();
    // Today's timings belong to today's clock, not the birth-era one: a 1943
    // birth is cast on UTC+6:30, but this morning's sunrise is still +5:30.
    var todayTz = chart.birth.india
      ? A.indiaOffset(now.getFullYear(), now.getMonth() + 1, now.getDate())
      : chart.birth.tz;
    var mu = window.Jyotish.muhurtas(now.getFullYear(), now.getMonth() + 1, now.getDate(),
                                     chart.birth.lat, chart.birth.lon, todayTz);
    if (!mu) { $('muhurtaHead').hidden = true; $('muhurtaHost').innerHTML = ''; return; }
    $('muhurtaHead').hidden = false;
    var tz = todayTz;
    function hm(jd) { var d = A.fromJD(jd + tz / 24); return pad2(d.h) + ':' + pad2(d.mi); }
    function span(s) { return hm(s.start) + ' – ' + hm(s.end); }
    function kv(k, v) { return '<div><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div></div>'; }
    $('muhurtaHost').innerHTML = '<div class="pan-grid">' +
      kv('Sunrise', hm(mu.sunrise)) + kv('Sunset', hm(mu.sunset)) +
      kv('Rahu kaal', span(mu.rahuKaal)) + kv('Yamaganda', span(mu.yamaganda)) +
      kv('Gulika kaal', span(mu.gulika)) +
      kv('Abhijit', mu.abhijit.valid ? span(mu.abhijit) : 'not observed on Wednesday') +
      '</div><p class="foot lead-left">Computed for your birth place (' + esc(chart.birth.place) +
      ') and its time zone. Rahu kaal, Yamaganda and Gulika are the eighth-parts of the day ' +
      'traditionally avoided for beginnings; Abhijit is the reliably auspicious window near local noon.</p>';
  }

  function dayLine(m) { return function (d) {
    return '<div class="dl"><span class="dn">' + d.day + ' ' + MONTHS[m.mNum - 1].slice(0,3) + '</span>' +
      '<span><em>' + esc(d.tara.n) + '</em> — ' + esc(d.tara.t) + '. ' +
      esc(d.panchang.paksha + ' ' + d.panchang.tithiName + ', ' + d.panchang.nakName) + '.</span></div>';
  }; }

  function dayGridHTML(m) {
    var days = m.days.all;
    var best = m.days.best.map(function (d) { return d.day; });
    var worst = m.days.worst.map(function (d) { return d.day; });
    var first = m.firstWeekday;
    var out = ['<div class="daygrid">'];
    ['S','M','T','W','T','F','S'].forEach(function (x) { out.push('<div class="dh">' + x + '</div>'); });
    for (var i = 0; i < first; i++) out.push('<div class="dd blank"></div>');
    days.forEach(function (d) {
      var cls = best.indexOf(d.day) >= 0 ? ' good' : worst.indexOf(d.day) >= 0 ? ' bad' : '';
      out.push('<div class="dd' + cls + (d.isToday ? ' today' : '') + '" title="' +
        esc(d.tara.n) + '">' + d.day + '<span class="dot"></span></div>');
    });
    out.push('</div>');
    return out.join('');
  }

  /* =========================================================================
     7. the sky
  ========================================================================= */
  var SKY_POS = [[14,20],[38,12],[64,18],[86,30],[16,48],[42,56],
                 [68,50],[88,62],[18,74],[44,82],[70,80],[90,90]];

  function renderSky(chart) {
    cwrap.innerHTML = '';
    D.RASHIS.forEach(function (z, i) {
      var el = document.createElement('div');
      el.className = 'sign' + (i === chart.lagnaSign ? ' me' : '') + (i === chart.moonSign ? ' moon' : '');
      el.style.left = SKY_POS[i][0] + '%';
      el.style.top = SKY_POS[i][1] + '%';
      el.innerHTML = '<span class="halo"></span><span class="glyph">' + z.g + '</span>' +
                     '<span class="lbl">' + esc(z.n) + '</span>';
      el.addEventListener('click', function (e) { e.stopPropagation(); openRashi(i); });
      cwrap.appendChild(el);
    });
    $('skyLegend').innerHTML = 'gold = your lagna (' + esc(D.RASHIS[chart.lagnaSign].n) +
      ') · cyan = your Moon (' + esc(D.RASHIS[chart.moonSign].n) + ')';
  }

  // drag only inside the sky view
  var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  function dragStart(x, y) {
    if ($('viewSky').hidden || $('sheet').classList.contains('open')) return;
    dragging = true; sx = x; sy = y; ox = px; oy = py;
  }
  function dragMove(x, y) {
    if (!dragging) return;
    px = clamp(ox + (x - sx), LIMX());
    py = clamp(oy + (y - sy), LIMY());
  }
  var sky = $('skyView');
  sky.addEventListener('touchstart', function (e) { dragStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive:true });
  sky.addEventListener('touchmove', function (e) { dragMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive:true });
  sky.addEventListener('touchend', function () { dragging = false; });
  sky.addEventListener('mousedown', function (e) { dragStart(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function (e) { dragMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', function () { dragging = false; });

  function openRashi(i) {
    var z = D.RASHIS[i], chart = state.chart;
    var house = K.houseFrom(chart.lagnaSign, i);
    var occ = chart.planets.filter(function (p) { return p.sign === i; });
    var roles = [];
    if (i === chart.lagnaSign) roles.push('your lagna');
    if (i === chart.moonSign) roles.push('your Chandra rāśi');
    if (i === chart.sunSign) roles.push('your Sūrya rāśi');

    var h = ['<div class="grip"></div>'];
    h.push('<div class="p-glyph">' + z.g + '</div>');
    h.push('<div class="p-name grad">' + esc(z.n) + '</div>');
    h.push('<div class="p-dev">' + z.dev + ' · ' + esc(z.w) + '</div>');
    h.push('<p class="p-tag">' + esc(z.tag) + '</p>');
    h.push('<div class="mini">' + z.traits.map(function (t) {
      return '<span class="pill">' + esc(t) + '</span>';
    }).join('') + '</div>');

    h.push('<div class="card" style="margin-top:22px;border-color:var(--gold-dim)">' +
      '<h4>In your chart</h4><p>' +
      (roles.length ? '<b style="color:var(--gold);font-weight:400">This is ' + roles.join(' and ') + '.</b> ' : '') +
      esc(z.n) + ' falls in your <b>' + ORD[house] + ' house</b> — ' + R.houseTheme(house) + '. ' +
      (occ.length
        ? 'You have ' + occ.map(function (p) {
            return D.GRAHAS[p.name].dev + ' (' + p.dignity.label.toLowerCase() + ')';
          }).join(', ') + ' placed here.'
        : 'No graha of yours sits here, so it works through its lord, ' +
          D.GRAHAS[z.lord].dev + ', in your ' + ORD[chart.byName[z.lord].house] + '.') +
      '</p></div>');

    h.push('<div class="section-h">The essence</div><p class="lede">' + esc(z.essence) + '</p>');
    h.push('<div class="pan-grid" style="margin-top:20px">' +
      ['Ruler', D.GRAHAS[z.lord].dev + ' (' + z.lord + ')', 'Element', z.el,
       'Quality', z.q, 'Polarity', z.sex]
      .reduce(function (acc, v, idx, arr) {
        if (idx % 2) acc.push('<div><div class="k">' + esc(arr[idx-1]) + '</div><div class="v">' + esc(v) + '</div></div>');
        return acc;
      }, []).join('') + '</div>');

    $('sheetBody').innerHTML = h.join('');
    $('sheet').classList.add('open');
    $('sheet').scrollTop = 0;
  }
  $('sheetClose').addEventListener('click', function () { $('sheet').classList.remove('open'); });

  /* =========================================================================
     8. save
  ========================================================================= */
  $('btnPrint').addEventListener('click', function () {
    var c = state.chart;
    if (!c) return;
    var L = [];
    L.push('JYOTISH DARPAN — ' + c.birth.name);
    L.push('Born ' + fmtDate(c.birth) + ' at ' + pad2(c.birth.hh) + ':' + pad2(c.birth.mm) +
           ' (UTC' + (c.birth.tz >= 0 ? '+' : '') + c.birth.tz + '), ' + c.birth.place);
    if (!c.timeKnown) L.push('*** Birth time unknown — cast for noon; lagna and houses unreliable. ***');
    L.push('Ayanamsa (Lahiri): ' + c.ayanamsa.toFixed(4) + '°');
    L.push('');
    L.push('Lagna: ' + D.RASHIS[c.lagnaSign].n + ' ' + c.lagnaDeg);
    L.push('Moon rashi: ' + D.RASHIS[c.moonSign].n + '   Nakshatra: ' +
           D.NAKSHATRAS[c.moonNak].n + ' pada ' + c.moonPada);
    L.push('');
    L.push('GRAHAS');
    c.planets.forEach(function (p) {
      L.push('  ' + (p.dev + '        ').slice(0, 9) +
             (D.RASHIS[p.sign].n + '           ').slice(0, 12) +
             (p.degText + '        ').slice(0, 9) +
             'H' + (p.house + '  ').slice(0, 3) +
             (D.NAKSHATRAS[p.nak].n + ' ' + p.pada + '                ').slice(0, 20) +
             p.dignity.label + (p.retro ? '  (R)' : ''));
    });
    var cur = K.dashaAt(c.dasha, nowJD());
    if (cur) {
      var ae = A.fromJD(cur.antar.end);
      L.push('');
      L.push('DASHA: ' + D.GRAHAS[cur.maha.lord].dev + ' mahadasha / ' +
             D.GRAHAS[cur.antar.lord].dev + ' antardasha until ' + MONTHS[ae.m - 1] + ' ' + ae.y);
    }
    state.answers.forEach(function (a, i) {
      if (!a) return;
      L.push('');
      L.push('QUESTION ' + (i + 1) + ' — ' + a.domain.label + ' — ' + a.verdict.label);
      if (a.question) L.push('  "' + a.question + '"');
      L.push('  ' + a.opener);
      a.evidence.forEach(function (e) { L.push('   - ' + e.t.replace(/<[^>]+>/g, '')); });
      L.push('  Dasha: ' + a.dashaText);
      L.push('  Transits: ' + a.transitText);
      L.push('  Timing: ' + a.timing);
      if (a.remedy) L.push('  Upaya: ' + a.remedy.text);
    });
    if (state.month) {
      L.push('');
      L.push('MONTH — ' + state.month.month + ' — ' + state.month.verdict.label);
      L.push('  ' + state.month.synthesis);
      state.month.layers.forEach(function (l) { L.push('  [' + l.title + '] ' + l.text); });
      L.push('  Best days: ' + state.month.days.best.map(function (d) { return d.day; }).join(', '));
      L.push('  Quiet days: ' + state.month.days.worst.map(function (d) { return d.day; }).join(', '));
    }
    L.push('');
    L.push('Computed in-browser. For reflection, not medical, legal or financial advice.');

    var blob = new Blob([L.join('\r\n')], { type:'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a2 = document.createElement('a');
    a2.href = url;
    a2.download = 'kundli-' + c.birth.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.txt';
    document.body.appendChild(a2); a2.click(); a2.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  });

  /* =========================================================================
     9. restore
  ========================================================================= */
  (function restore() {
    var raw;
    try { raw = localStorage.getItem('jd.birth'); } catch (e) { return; }
    if (!raw) return;
    try {
      var b = JSON.parse(raw);
      $('fName').value = b.name === 'Traveller' ? '' : b.name;
      $('fDate').value = b.y + '-' + pad2(b.m) + '-' + pad2(b.d);
      $('fTime').value = pad2(b.hh) + ':' + pad2(b.mm);
      $('fTz').value = (b.tz >= 0 ? '+' : '') + b.tz;
      $('fLat').value = b.lat; $('fLon').value = b.lon;
      fPlace.value = b.place || '';
      if (!b.timeKnown) { $('fNoTime').checked = true; $('fTime').disabled = true; }
      pickedIsIndia = !!b.india;
      launch(b);
    } catch (e) {}
  })();
})();
