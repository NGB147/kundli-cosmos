/* ============================================================================
   app.js - interface: the birth form, the chart, today, the alignment
   wheel, the three questions, the month, the other systems, the verse of
   the day and the farewell. The sky itself lives in immersive.js.
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

  var IM = window.Immersive, Q = window.Quotes;

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
    heroPreview();
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
    IM.requestMotion();
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

    var fullName = ($('fFullName').value || '').trim();
    var usedName = ($('fName').value || '').trim();
    if (!fullName && !usedName) { err.textContent = 'Please give at least your name at birth — numerology reads its letters.'; return; }
    var birth = {
      name: usedName || fullName.split(/\s+/)[0] || 'Traveller',
      fullName: fullName || usedName, usedName: usedName,
      gender: $('fGender').value || '',
      y:y, m:m, d:d, hh:hh, mm:mm, tz:tz, lat:lat, lon:lon,
      place: fPlace.value.trim() || (lat.toFixed(2) + ', ' + lon.toFixed(2)),
      india: pickedIsIndia,
      timeKnown: !noTime
    };
    try { localStorage.setItem('jd.birth', JSON.stringify(birth)); } catch (e2) {}
    launch(birth);
  });

  $('btnEdit').addEventListener('click', function () {
    IM.goTo('chBirth');
    setTimeout(function () { try { $('fFullName').focus({ preventScroll: true }); } catch (e) {} }, 700);
  });

  /* =========================================================================
     3. launching
  ========================================================================= */
  function nowJD() {
    var n = new Date();
    return A.toJD(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(),
                  n.getUTCHours(), n.getUTCMinutes(), 0);
  }

  function launch(birth, opts) {
    var chart = K.attachDeep(K.buildChart(birth), nowJD());
    state.chart = chart;
    state.answers = [null, null, null];
    state.month = null;
    IM.unlock();

    $('whoName').textContent = birth.name + ' · ' + D.RASHIS[chart.moonSign].n + ' rashi';

    renderChart(chart);
    renderDeep(chart);
    renderChalit(chart);
    renderVargaView(chart);
    renderAsk(chart);
    renderSky(chart);
    renderSystems(chart);
    renderOverview(chart);
    renderWheel(chart);
    renderHeroSummary(chart);
    renderFarewell();
    IM.setSky(chart.planets.map(function (p) { return { lon: p.lon, color: D.GRAHAS[p.name].color }; }));
    IM.refresh();
    IM.goTo('chOverview', !!(opts && opts.instant));
    setTimeout(function () { renderMonth(chart); IM.refresh(); }, 60);
  }

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

  /* ---- Bhava Chalit: where the houses actually fall ------------------- */
  function renderChalit(chart) {
    var host = $('chalitHost');
    if (!host) return;
    var bc = K.bhavaChalit(chart);
    var rows = ['<tr><th>Bhava</th><th>Madhya (midpoint)</th><th>Spans</th></tr>'];
    for (var i = 0; i < 12; i++) {
      var from = bc.sandhi[(i + 11) % 12], to = bc.sandhi[i];
      rows.push('<tr><td class="g">' + (i + 1) + '</td><td>' +
        esc(D.RASHIS[K.signOf(bc.madhya[i])].n) + ' ' + K.dms(K.degInSign(bc.madhya[i])) + '</td>' +
        '<td>' + esc(D.RASHIS[K.signOf(from)].n) + ' ' + K.dms(K.degInSign(from)) + ' → ' +
        esc(D.RASHIS[K.signOf(to)].n) + ' ' + K.dms(K.degInSign(to)) + '</td></tr>');
    }
    host.innerHTML =
      '<p class="lede sm">The rasi chart above places a graha by its sign. The bhava chalit ' +
      'places it by the real house cusps computed from your ascendant and midheaven. When the two ' +
      'disagree, the promise is read from the rasi chart and the result from the chalit.</p>' +
      (bc.shifted.length
        ? '<div class="card" style="border-color:var(--gold-dim)"><h4>Grahas that change house</h4><p>' +
          bc.shifted.map(function (x) {
            return D.GRAHAS[x.name].dev + ': ' + ORD[x.rasi] + ' in the rasi chart, ' +
                   ORD[x.chalit] + ' by bhava';
          }).join('; ') + '. These are the placements to read carefully — they sit near a cusp, ' +
          'so their results lean toward the chalit house.</p></div>'
        : '<div class="card"><p>No graha changes house between the rasi chart and the bhava chalit. ' +
          'Your chart is unusually clean on this point: every placement reads the same in both.</p></div>') +
      '<div class="tscroll"><table class="grahas">' + rows.join('') + '</table></div>';
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
        '<button type="button" class="btn" data-ask>Reveal the reading</button>' +
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
      slot.querySelector('[data-ask]').addEventListener('click', function () {
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
    var tg = slot.querySelector('[data-toggle]'), bd = slot.querySelector('[data-details]');
    if (tg && bd) {
      tg.addEventListener('click', function () {
        bd.hidden = !bd.hidden;
        tg.textContent = bd.hidden
          ? 'Show the traditional reading (Sanskrit terms)'
          : 'Hide the traditional reading';
      });
    }
    slot.querySelector('[data-ask]').textContent = 'Ask this one differently';
    updateCount();
    renderFarewell();
    setTimeout(function () {
      slot.querySelector('[data-answer]').scrollIntoView({ behavior:'smooth', block:'nearest' });
    }, 60);
  }

  function sysGrid(cons) {
    var out = ['<div class="sysgrid">'];
    cons.systems.forEach(function (y) {
      var pct = Math.abs(y.norm) * 50;
      var bar = y.norm >= 0
        ? '<i class="pos" style="left:50%;width:' + pct.toFixed(1) + '%"></i>'
        : '<i class="neg" style="left:' + (50 - pct).toFixed(1) + '%;width:' + pct.toFixed(1) + '%"></i>';
      out.push('<div class="sysrow"><span class="sname">' + esc(y.name) +
        (y.sanskrit ? '<em>' + esc(y.sanskrit) + '</em>' : '') + '</span>' +
        '<span class="sbar">' + bar + '</span>' +
        '<span class="sysweight">' + y.weight.toFixed(2) + '</span>' +
        '<span class="snote">' + esc(y.note) + '</span></div>');
    });
    out.push('</div><p class="foot lead-left">The bar shows which way each method leans. The number ' +
      'is how much it counts toward the final answer. The Indian chart methods count most, because ' +
      'they use your exact birth minute and place. Chinese zodiac and numerology count least, ' +
      'because they only use your birth date — thousands of people share those.</p>');
    return out.join('');
  }

  function answerHTML(a) {
    var h = ['<div class="answer">'];
    h.push('<div class="ahead"><span class="dm">' + a.domain.icon + ' ' + esc(a.domain.label) + '</span>' +
           '<span class="pill ' + a.verdict.cls + '">' + a.verdict.label + '</span></div>');
    if (a.question) {
      h.push('<div class="sub-block"><b>You asked</b>“' + esc(a.question) + '”' +
        (a.usedDetection ? ' — read against ' + esc(a.domain.subject) + '.' : '') +
        (a.fellBack ? ' <em>I could not tell which area of life this is about, so it is read as a question of timing. Tap an area above for a sharper answer.</em>' : '') + '</div>');
    }

    /* --- the short answer, first, with real dates --- */
    if (a.summary) {
      var sm = a.summary, pl = sm.plain, tl = sm.timeline;
      h.push('<div class="verdict-box">');
      h.push('<div class="vhead"><span class="vword">' + esc(pl.word) + '</span>' +
             '<span class="vconf ' + esc(pl.confidence) + '">' + esc(pl.confidence) + ' confidence</span></div>');
      pl.lines.forEach(function (line, i) {
        h.push('<p' + (i ? ' class="sub"' : '') + '>' + esc(line) + '</p>');
      });
      h.push('<div class="when">');
      if (tl.best[0]) {
        h.push('<div class="w"><div class="k">' + (tl.best[0].strongest ? 'Strongest window' : 'First window') + '</div><div class="v">' +
          esc(tl.best[0].from + ' – ' + tl.best[0].to) + '</div><div class="n">peaks ' +
          esc(tl.best[0].peak) + '</div></div>');
      }
      if (tl.best[1]) {
        h.push('<div class="w"><div class="k">' + (tl.best[1].strongest ? 'Strongest window' : 'Then') + '</div><div class="v">' +
          esc(tl.best[1].from + ' – ' + tl.best[1].to) + '</div><div class="n">peaks ' +
          esc(tl.best[1].peak) + '</div></div>');
      }
      if (tl.avoid[0]) {
        h.push('<div class="w avoid"><div class="k">Hold back</div><div class="v">' +
          esc(tl.avoid[0].from + ' – ' + tl.avoid[0].to) + '</div><div class="n">weakest stretch</div></div>');
      }
      h.push('</div></div>');

      /* --- the same thing, in English --- */
      if (sm.spoken) {
        var sp = sm.spoken;
        h.push('<div class="spoken">');
        h.push('<h5>In plain words</h5>');
        sp.narrative.forEach(function (n) { h.push('<p>' + esc(n) + '</p>'); });

        if (sp.why.length) {
          h.push('<h5>Why the chart says this</h5><ul class="plainlist">');
          sp.why.forEach(function (w) {
            h.push('<li class="' + (w.w > 0 ? 'pos' : w.w < 0 ? 'neg' : '') + '">' + esc(w.t) + '</li>');
          });
          h.push('</ul>');
        }
        if (sp.doing.length) {
          h.push('<h5>What to do about it</h5><ul class="plainlist do">');
          sp.doing.forEach(function (x) { h.push('<li>' + esc(x) + '</li>'); });
          h.push('</ul>');
        }
        h.push('</div>');
      }

      /* --- how each system voted --- */
      h.push('<div class="sub-block"><b>How each method voted</b>' + sysGrid(sm.consensus) + '</div>');

      h.push('<button type="button" class="details-toggle" data-toggle>' +
        'Show the traditional reading (Sanskrit terms)</button>');
      h.push('<div class="details-body" data-details hidden>');
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
    if (a.summary) h.push('</div>');   // close .details-body
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
    var mp = window.Plainspeak ? window.Plainspeak.monthPlain(chart, m, nowJD()) : null;
    h.push('<div class="verdict-hero"><div class="eyebrow">Your reading for</div>' +
      '<div class="m grad">' + esc(m.month) + '</div>' +
      '<div class="vv"><span class="pill ' + m.verdict.cls + '">' + m.verdict.label + '</span></div>' +
      (mp ? '<div class="sy">' + mp.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>' : '') +
      '</div>');
    if (mp && mp.doing.length) {
      h.push('<div class="spoken"><h5>What to do with this month</h5><ul class="plainlist do">' +
        mp.doing.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>');
    }

    h.push('<div class="section-h">The three calendars, in detail</div>');
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
    renderToday(chart, m);
    renderFarewell();

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
    var cwrap = $('constellations');
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
     7b. overview dashboard
  ========================================================================= */
  function renderOverview(chart) {
    var b = chart.birth, jd = nowJD(), now = A.fromJD(jd);
    var N = window.Numerology, S = window.Systems, P = window.Plainspeak;
    var num = N.core(b, b.fullName || b.name, b.usedName || b.fullName || b.name, now);
    var west = S.western(chart), fp = S.fourPillars(b), ay = S.ayurveda(chart);
    var tarot = N.tarotBirthCards(b);
    state.num = num;
    state.sys = { west: west, fp: fp, ay: ay, tarot: tarot };

    var cur = K.dashaAt(chart.dasha, jd);
    var lagna = D.RASHIS[chart.lagnaSign], moon = D.RASHIS[chart.moonSign], sun = D.RASHIS[chart.sunSign];
    function pn(name) { return P.PLANET[name].b || P.PLANET[name].n; }
    function card(k, v, sub, cls) {
      return '<div class="ov' + (cls ? ' ' + cls : '') + '"><div class="k">' + esc(k) + '</div>' +
             '<div class="v">' + esc(v) + '</div>' + (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>';
    }
    var ae = cur ? A.fromJD(cur.antar.end) : null;
    $('ovGrid').innerHTML =
      card('Rising sign', lagna.n, lagna.w + ' · ' + chart.lagnaDeg + (chart.timeKnown ? '' : ' · unverified'), 'gold') +
      card('Moon sign', moon.n, D.NAKSHATRAS[chart.moonNak].n + ' · pada ' + chart.moonPada, 'gold') +
      card('Sun sign', sun.n, 'Western: ' + west.sun) +
      card('Life chapter now', cur ? pn(cur.maha.lord) : '—',
           cur ? 'with ' + pn(cur.antar.lord) + ' until ' + MONTHS[ae.m - 1] + ' ' + ae.y : '') +
      card('Life path', String(num.lifePath), N.MEAN[num.lifePath].key) +
      card('Chinese sign', fp.base.element.n + ' ' + fp.base.animal.n, 'day master ' + fp.dayMaster) +
      card('Birth card', tarot[0].name, tarot[1] ? 'with ' + tarot[1].name : tarot[0].key) +
      card('Constitution', ay.primary.n, ay.primary.el);

    // --- the portrait: plain synthesis across systems ---
    var real = chart.planets.filter(function (p) { return p.name !== 'Rahu' && p.name !== 'Ketu'; })
      .slice().sort(function (a, b2) { return b2.dignity.score - a.dignity.score; });
    var best = real[0], worst = real[real.length - 1];
    var por = [];
    por.push('People meet your ' + lagna.n + ' rising first — ' + lagna.traits.slice(0, 3).join(', ').toLowerCase() +
      '. ' + lagna.tag);
    por.push('Underneath that, your Moon — the mind and its moods — sits in ' + moon.n + '. ' + moon.tag +
      ' That is the part of you that only people close to you see.');
    por.push('Your strongest planet is ' + P.PLANET[best.name].n + ', ' + P.DIG_SHORT[best.dignity.label] +
      ' in your ' + P.HOUSE_SHORT[best.house] + ' area — lean on ' + P.PLANET[best.name].role +
      ' when a decision is hard. The one that asks the most work is ' + P.PLANET[worst.name].n +
      ' (' + P.DIG_SHORT[worst.dignity.label] + '), which governs ' + P.PLANET[worst.name].role + '.');
    por.push('Western astrology reads you as ' + west.dominantElement.toLowerCase() + '-dominant: you ' +
      west.elementText + '. With a ' + west.dominantModality.toLowerCase() + ' emphasis, you are someone who ' +
      west.modalityText + '.');
    por.push('Numerology calls a life path ' + num.lifePath + ' "' + N.MEAN[num.lifePath].key + '": ' +
      N.MEAN[num.lifePath].t);
    $('ovPortrait').innerHTML = '<div class="card portrait">' +
      por.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>';

    // --- where you are now ---
    var nowBits = [];
    if (cur) {
      var owns = [];
      chart.houses.forEach(function (h) { if (h.lord === cur.maha.lord) owns.push(P.HOUSE_SHORT[h.num]); });
      nowBits.push({ k: 'Life chapter', v: pn(cur.maha.lord) + ' chapter, ' + pn(cur.antar.lord) + ' phase',
        t: 'Long chapters are named after planets. This ' + pn(cur.maha.lord) + ' chapter runs ' +
           A.fromJD(cur.maha.start).y + '–' + A.fromJD(cur.maha.end).y +
           (owns.length ? ' and, because ' + P.PLANET[cur.maha.lord].n + ' runs your ' + owns.join(' and ') +
             ' area' + (owns.length > 1 ? 's' : '') + ', that is where its themes land.' : '.') +
           ' The current ' + pn(cur.antar.lord) + ' phase inside it ends ' + MONTHS[ae.m - 1] + ' ' + ae.y + '.' });
    }
    nowBits.push({ k: 'Personal year ' + num.personalYear, v: N.PERSONAL_YEAR[num.personalYear] || '',
      t: 'Numerology runs in nine-year cycles from your birthday. ' + now.y + ' is ' +
         (N.PERSONAL_YEAR[num.personalYear] || 'a transition year') + '. This month is a personal ' +
         num.personalMonth + ', today a personal ' + num.personalDay + '.' });
    var nowCn = K.chinesePillars(now.y, now.m, now.d, 12, 0, b.tz);
    var rel = K.animalRelation(fp.base.animalIdx, nowCn.animalIdx);
    nowBits.push({ k: 'Chinese year', v: nowCn.element.n + ' ' + nowCn.animal.n + ' vs your ' + fp.base.animal.n,
      t: 'This is ' + rel.t + '.' });
    var sade = (chart.deep.doshas || []).filter(function (d) { return d.key === 'sadesati' || d.key === 'dhaiya'; })[0];
    if (sade) nowBits.push({ k: sade.key === 'sadesati' ? 'Saturn’s long pass' : 'Saturn’s short pass',
      v: sade.name.replace(/ - /, ' — '), t: sade.t });
    var pinn = num.pinnacles[num.pinnacleNow], pa = num.pinnacleAges[num.pinnacleNow];
    nowBits.push({ k: 'Pinnacle ' + (num.pinnacleNow + 1) + ' of 4', v: 'number ' + pinn + ' — ' + N.MEAN[pinn].key,
      t: 'Numerology divides a life into four pinnacles. You are in the ' + ['first','second','third','fourth'][num.pinnacleNow] +
         ' (ages ' + pa[0] + (pa[1] >= 200 ? '+' : '–' + pa[1]) + '), whose theme is ' + N.MEAN[pinn].t.toLowerCase() });
    $('ovNow').innerHTML = nowBits.map(function (x) {
      return '<div class="card"><h4>' + esc(x.k) + '</h4><p><b class="gold">' + esc(x.v) + '</b></p><p>' + esc(x.t) + '</p></div>';
    }).join('');
  }

  /* =========================================================================
     7c. the other systems
  ========================================================================= */
  function renderSystems(chart) {
    var b = chart.birth, now = A.fromJD(nowJD());
    var N = window.Numerology, S = window.Systems;
    var num = N.core(b, b.fullName || b.name, b.usedName || b.fullName || b.name, now);
    var west = S.western(chart), fp = S.fourPillars(b), ay = S.ayurveda(chart);
    var tarot = N.tarotBirthCards(b), kua = N.kua(b, b.gender);

    function kv(k, v, sub) {
      return '<div><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div>' +
             (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>';
    }
    function numCard(label, n, from, what) {
      var m = N.MEAN[n] || N.MEAN[N.reduceHard(n)];
      return '<div class="card num"><div class="nh"><span class="big">' + n + '</span>' +
        '<span class="lab"><b>' + esc(label) + '</b><em>' + esc(from) + '</em></span></div>' +
        '<p><b class="gold">' + esc(m.key) + '.</b> ' + esc(m.t) + '</p>' +
        '<p class="what">' + esc(what) + '</p></div>';
    }

    /* ---- numerology ---- */
    var h = [];
    h.push('<p class="lede sm">Read from <b>' + esc(num.words.join(' ')) + '</b> and ' + fmtDate(b) +
      '. Pythagorean letters, master numbers 11, 22 and 33 kept.</p>');
    h.push(numCard('Life path', num.lifePath, 'from your birth date', 'The road you are on — the central lesson and the natural direction of a life. The number most numerologists read first.'));
    h.push(numCard('Expression', num.expression, 'from every letter of your birth name', 'What you are equipped to do — talents and the shape of your work when you are being yourself.'));
    h.push(numCard('Soul urge', num.soulUrge, 'from the vowels', 'What you actually want underneath what you say you want. The private motive.'));
    h.push(numCard('Personality', num.personality, 'from the consonants', 'How you come across before people know you — the outer manner, the first impression.'));
    h.push(numCard('Birthday', num.birthday, 'from the day of the month', 'A specific talent you carry; a minor number, but a precise one.'));
    h.push(numCard('Maturity', num.maturity, 'life path + expression', 'What the second half of life turns toward, usually from your mid-forties on.'));

    h.push('<div class="section-h sub">Cycles and timing</div>');
    h.push('<div class="pan-grid three">' +
      kv('Personal year', String(num.personalYear), N.PERSONAL_YEAR[num.personalYear] || '') +
      kv('Personal month', String(num.personalMonth), 'the year’s theme, this month') +
      kv('Personal day', String(num.personalDay), 'today') + '</div>');
    h.push('<div class="card"><h4>Pinnacles — the four seasons of a life</h4>' +
      num.pinnacles.map(function (p, i) {
        var a = num.pinnacleAges[i];
        return '<p class="' + (i === num.pinnacleNow ? 'now' : '') + '"><b class="gold">' + (i + 1) + '. Ages ' + a[0] +
          (a[1] >= 200 ? '+' : '–' + a[1]) + ' — number ' + p + '</b> (' + esc(N.MEAN[p].key) + ')' +
          (i === num.pinnacleNow ? ' ← you are here' : '') + '</p>';
      }).join('') + '</div>');
    h.push('<div class="card"><h4>Challenges — what each season asks you to learn</h4>' +
      num.challenges.map(function (c, i) {
        return '<p><b class="gold">' + (i + 1) + '.</b> ' + esc(N.CHALLENGE[c] || '') + (i === num.pinnacleNow ? ' ← current' : '') + '</p>';
      }).join('') + '</div>');

    h.push('<div class="section-h sub">The letters of your name</div>');
    h.push('<div class="pan-grid">' +
      kv('Hidden passion', String(num.hiddenPassion), 'the number that appears most in your name: ' + N.MEAN[num.hiddenPassion].key) +
      kv('Karmic lessons', num.lessons.length ? num.lessons.join(', ') : 'none', num.lessons.length ? 'numbers absent from your name — the things life will teach by circumstance' : 'every number is present in your name') +
      kv('Karmic debt', num.karmicDebt.length ? num.karmicDebt.join(', ') : 'none', num.karmicDebt.length ? 'a raw sum hit 13, 14, 16 or 19 — a pattern to be worked through rather than around' : 'no debt numbers in the raw sums') +
      kv('Chaldean name number', num.chaldean.compound + ' → ' + num.chaldean.single, 'from the name you use now (' + esc(num.usedWords.join(' ')) + '); Chaldean values letters by sound') +
      '</div>');

    // Lo Shu grid
    var g = num.loShu;
    h.push('<div class="card"><h4>Lo Shu grid — your birth date on the magic square</h4><div class="loshu">' +
      g.grid.map(function (row, ri) {
        return row.map(function (c, ci) {
          var digit = [[4,9,2],[3,5,7],[8,1,6]][ri][ci];
          return '<div class="cell' + (c ? ' on' : '') + '"><span class="d">' + digit + '</span><span class="c">' +
                 (c ? Array(c + 1).join(digit + ' ').trim() : '·') + '</span></div>';
        }).join('');
      }).join('') + '</div>' +
      (g.arrows.length ? '<p><b class="gold">Full lines:</b> ' + g.arrows.map(function (a) { return a.name + ' (' + a.t + ')'; }).join('; ') + '.</p>' : '') +
      (g.missingArrows.length ? '<p><b class="gold">Empty lines:</b> ' + g.missingArrows.map(function (a) { return a.name.replace('Arrow of ', '') ; }).join(', ') + ' — areas that do not come naturally and are learned.</p>' : '') +
      '<p class="what">Missing numbers: ' + (g.missing.length ? g.missing.join(', ') : 'none') + '. Each digit of your birth date is placed on the square; repeated digits strengthen a cell.</p></div>');

    // Kua
    if (kua) {
      h.push('<div class="card"><h4>Kua number — ' + kua.number + ', ' + kua.group + ' group</h4>' +
        '<p>From the Chinese year ' + kua.year + '. Feng Shui uses this for facing directions:</p>' +
        '<div class="pan-grid">' + kua.dirs.map(function (d, i) { return kv(kua.labels[i], d); }).join('') + '</div></div>');
    } else {
      h.push('<div class="card"><h4>Kua number</h4><p class="what">Not computed — the Kua number is defined differently for men and women, and no gender was given. Add it under Edit if you want it.</p></div>');
    }
    h.push('<div class="pan-grid three">' +
      kv('Lucky numbers', num.lucky.nums.join(', ')) + kv('Lucky day', num.lucky.day) + kv('Colours', num.lucky.color) + '</div>');
    $('numHost').innerHTML = h.join('');

    /* ---- western ---- */
    var w = [];
    w.push('<p class="lede sm">The same sky, measured from the spring equinox instead of the fixed stars — the zodiac you see in newspapers. It sits about ' + chart.ayanamsa.toFixed(0) + '° ahead of the Vedic one, so most signs shift by one.</p>');
    w.push('<div class="pan-grid three">' + kv('Sun', west.sun, 'identity, the conscious self') +
      kv('Moon', west.moon, 'instinct, needs, the private self') + kv('Rising', west.rising, 'the mask, the approach') + '</div>');
    var order = ['Mercury','Venus','Mars','Jupiter','Saturn'];
    w.push('<div class="pan-grid">' + order.map(function (p) {
      return kv(p, west.signs[west.pos[p].sign], west.pos[p].deg.toFixed(0) + '°');
    }).join('') + '</div>');
    var maxEl = Math.max.apply(null, Object.keys(west.elements).map(function (k) { return west.elements[k]; }));
    w.push('<div class="card"><h4>Element balance</h4>' + Object.keys(west.elements).map(function (k) {
      return '<div class="bala-row"><span class="bn">' + k + '</span><span class="btrack"><i style="width:' +
        (west.elements[k] / maxEl * 100).toFixed(0) + '%;background:var(--gold)"></i></span><span class="bv">' + west.elements[k] + '</span></div>';
    }).join('') + '<p class="what">' + esc(west.dominantElement + '-dominant: you ' + west.elementText + '. Weakest is ' + west.weakestElement.toLowerCase() + ' — the mode you have to do on purpose.') + '</p></div>');
    w.push('<div class="card"><h4>Modality</h4><p>' + Object.keys(west.modalities).map(function (k) { return k + ' ' + west.modalities[k]; }).join(' · ') +
      '. ' + esc(west.dominantModality + ' leads: you are someone who ' + west.modalityText + '.') + '</p></div>');
    if (west.aspects.length) {
      w.push('<div class="card"><h4>Closest natal aspects</h4>' + west.aspects.map(function (a) {
        var TONE = { easy: 'flows easily', tense: 'creates friction that drives growth', blend: 'fuses the two' };
        return '<p><b class="gold">' + a.a + ' ' + a.name + ' ' + a.b + '</b> (' + a.orb.toFixed(1) + '° orb) — ' + TONE[a.tone] + '.</p>';
      }).join('') + '</div>');
    }
    $('westHost').innerHTML = w.join('');

    /* ---- four pillars ---- */
    var z = [];
    z.push('<p class="lede sm">Chinese astrology reads four moments at once — year, month, day and hour — each as a heavenly stem (element and polarity) over an earthly branch (the animal). The day stem is you.</p>');
    z.push('<div class="tscroll"><table class="grahas bazi"><tr><th></th>' + fp.pillars.map(function (p) { return '<th>' + p.label + '</th>'; }).join('') + '</tr>' +
      '<tr><td class="g">Stem</td>' + fp.pillars.map(function (p) { return '<td>' + (p.stem !== '-' ? '<b>' + p.stem + '</b><br><small>' + p.stemEl + ' ' + p.pol + '</small>' : '<small class="dim">needs the solar month</small>') + '</td>'; }).join('') + '</tr>' +
      '<tr><td class="g">Branch</td>' + fp.pillars.map(function (p) { return '<td><b>' + p.animal.cn + ' ' + p.branch + '</b><br><small>' + p.branchEl + '</small></td>'; }).join('') + '</tr>' +
      '<tr><td class="g">Means</td>' + fp.pillars.map(function (p) { return '<td><small>' + esc(p.means) + '</small></td>'; }).join('') + '</tr></table></div>');
    z.push('<div class="card"><h4>Day master — ' + fp.dayMaster + '</h4><p>' + esc('The day stem is the self. ' + fp.dayMaster.split(' ')[0] + ' ' + fp.dayMasterText + '.') + '</p>' +
      '<p class="what">Elements across the chart: ' + Object.keys(fp.elementCount).map(function (k) { return k + ' ' + fp.elementCount[k]; }).join(' · ') +
      '. Strongest ' + fp.strongest + (fp.missing.length ? '; missing ' + fp.missing.join(' and ') + ' — the elements you need to bring in through people, places and work' : '') + '.</p>' +
      (chart.timeKnown ? '' : '<p class="what">Birth time was not given, so the hour pillar is unverified.</p>') + '</div>');
    z.push('<div class="pan-grid">' + kv('Hour', fp.pillars[3].hourName, 'the two-hour block you were born in') + kv('Inner animal', fp.pillars[2].branch, 'your day-branch animal — the private self') + '</div>');
    $('baziHost').innerHTML = z.join('');

    /* ---- tarot ---- */
    $('tarotHost').innerHTML = '<p class="lede sm">Your birth date summed the tarot way (month + day + century + year) points to a card of the Major Arcana — a lifelong theme rather than a fortune.</p>' +
      '<div class="tarot-row">' + tarot.map(function (t, i) {
        return '<div class="card tcard"><div class="tn">' + t.n + '</div><div class="tname">' + esc(t.name) + '</div><div class="tkey">' + esc(t.key) + '</div>' +
          '<div class="trole">' + (i === 0 ? 'personality card — how you move through the world' : i === 1 ? 'soul card — what the personality is in service of' : 'shadow / teacher card') + '</div></div>';
      }).join('') + '</div>';

    /* ---- ayurveda ---- */
    var p = ay.primary;
    $('ayurHost').innerHTML = '<p class="lede sm">Jyotisha and Ayurveda share a root: your birth star’s nadi maps to a dosha. ' +
      'This is a starting point for daily habits, not a diagnosis.</p>' +
      '<div class="card"><h4>' + p.n + ' — ' + esc(p.el) + (ay.secondary ? ', with some ' + ay.secondary.n : '') + '</h4>' +
      '<p><b class="gold">Typically:</b> ' + esc(p.body) + '.</p>' +
      '<p><b class="gold">Under strain:</b> ' + esc(p.strain) + '.</p></div>' +
      '<div class="pan-grid"><div><div class="k">Eat</div><div class="s">' + esc(p.eat) + '</div></div>' +
      '<div><div class="k">Do</div><div class="s">' + esc(p.do) + '</div></div>' +
      '<div><div class="k">Avoid</div><div class="s">' + esc(p.avoid) + '</div></div>' +
      '<div><div class="k">From</div><div class="s">' + esc(ay.nadi) + ' nadi, ' + esc(D.NAKSHATRAS[chart.moonNak].n) + ' nakshatra</div></div></div>';
  }

  /* =========================================================================
     8. save
  ========================================================================= */
  function saveReading() {
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
    if (state.num) {
      var nm = state.num;
      L.push('');
      L.push('NUMEROLOGY — ' + nm.words.join(' '));
      L.push('  Life path ' + nm.lifePath + '   Birthday ' + nm.birthday + '   Expression ' + nm.expression +
             '   Soul urge ' + nm.soulUrge + '   Personality ' + nm.personality + '   Maturity ' + nm.maturity);
      L.push('  Personal year ' + nm.personalYear + ' / month ' + nm.personalMonth + ' / day ' + nm.personalDay +
             '   Chaldean ' + nm.chaldean.compound + '/' + nm.chaldean.single);
    }
    if (state.sys) {
      L.push('');
      L.push('WESTERN: Sun ' + state.sys.west.sun + ', Moon ' + state.sys.west.moon + ', Rising ' + state.sys.west.rising +
             ' — ' + state.sys.west.dominantElement + ' / ' + state.sys.west.dominantModality);
      L.push('CHINESE: ' + state.sys.fp.pillars.map(function (p) { return p.label + ' ' + (p.stem !== '-' ? p.stem + ' ' : '') + p.branch; }).join(', ') +
             ' — day master ' + state.sys.fp.dayMaster);
      L.push('TAROT: ' + state.sys.tarot.map(function (t) { return t.name; }).join(' / ') +
             '   AYURVEDA: ' + state.sys.ay.primary.n);
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
  }
  $('btnPrint').addEventListener('click', saveReading);
  $('btnSaveEnd').addEventListener('click', saveReading);

  /* =========================================================================
     8b. the verse of the day, and the farewell chosen from your questions
  ========================================================================= */
  var verseIdx = -1;
  function showVerse(pick, label) {
    var card = $('verseCard');
    card.classList.add('swap');
    setTimeout(function () {
      verseIdx = pick.idx;
      $('verseText').textContent = pick.q.t;
      $('verseSrc').textContent = pick.q.s;
      $('verseTrad').textContent = pick.q.tr;
      $('verseLabel').textContent = label;
      card.classList.remove('swap');
    }, IM.reduced ? 0 : 320);
  }
  (function initVerse() {
    var d = new Date();
    showVerse(Q.daily(d), 'A verse for ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear());
  })();
  $('btnVerse').addEventListener('click', function () { showVerse(Q.random(verseIdx), 'Another verse'); });
  $('btnBegin').addEventListener('click', function () { IM.goTo('chBirth'); });
  $('btnTop').addEventListener('click', function () { IM.goTo('chLanding'); });

  function joinList(a) {
    return a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : (a[0] || '');
  }

  function renderFarewell() {
    var asked = state.answers.filter(Boolean);
    var pick = Q.farewell(asked.map(function (a) {
      return { domainId: a.domain.id, verdictKey: a.verdict.key, question: a.question };
    }), verseIdx);
    $('byeText').textContent = pick.q.t;
    $('byeSrc').textContent = pick.q.s;
    $('byeTrad').textContent = pick.q.tr;
    $('byeWhy').textContent = asked.length
      ? 'Chosen because you asked about ' + joinList(asked.map(function (a) {
          return a.domain.label.toLowerCase() + ' (' + a.verdict.label.toLowerCase() + ')';
        })) + '.'
      : 'You have not asked the chart anything yet. Ask a question in the Ask chapter and this verse ' +
        'will be chosen for it. Until then, one for the road.';

    var recap = state.answers.map(function (a, i) {
      if (!a) return '';
      return '<div class="card recap"><div class="q">' +
        (a.question ? '“' + esc(a.question) + '”' : esc(a.domain.label)) +
        '<small>Question ' + (i + 1) + ' · ' + esc(a.domain.label) + '</small></div>' +
        '<span class="pill ' + a.verdict.cls + '">' + esc(a.verdict.label) + '</span></div>';
    }).join('');
    if (state.month) {
      recap += '<div class="card recap"><div class="q">' + esc(state.month.month) +
        '<small>The month</small></div><span class="pill ' + state.month.verdict.cls + '">' +
        esc(state.month.verdict.label) + '</span></div>';
    }
    $('recapHost').innerHTML = recap || '<div class="card"><p>Nothing asked yet. The chart is patient.</p></div>';
  }

  /* =========================================================================
     8c. the birth form: a live sky as you type, and a summary once cast
  ========================================================================= */
  function renderHeroSummary(chart) {
    var b = chart.birth, el = $('heroSummary');
    el.hidden = false;
    el.textContent = 'Chart cast for ' + b.name + ' · ' + fmtDate(b) +
      (b.timeKnown ? ' ' + pad2(b.hh) + ':' + pad2(b.mm) : ' (time unknown)') + ' · ' + b.place +
      '. Scroll on, or change anything above and cast again.';
  }

  function heroPreview() {
    var host = $('heroWheel'), cap = $('heroCap');
    var dv = $('fDate').value;
    if (!dv) { host.innerHTML = ''; cap.textContent = 'The sky is drawn live as you type your date, time and place.'; return; }
    var dp = dv.split('-'), y = +dp[0], m = +dp[1], d = +dp[2];
    if (!(y >= 1900 && y <= 2035 && m >= 1 && d >= 1)) return;
    var tv = ($('fTime').value || '12:00').split(':'), hh = +tv[0] || 0, mm = +tv[1] || 0;
    var tz = parseNum($('fTz').value); if (tz === null) tz = 5.5;
    var lat = parseNum($('fLat').value), lon = parseNum($('fLon').value);
    var jd = A.localToJD(y, m, d, hh, mm, tz);
    var natal = A.BODY_ORDER.map(function (b) {
      return { name: b, lon: A.siderealLongitude(b, jd), color: D.GRAHAS[b].color, sym: D.GRAHAS[b].sym };
    });
    var asc = (lat !== null && lon !== null && Math.abs(lat) <= 66.5) ? A.ascendantSidereal(jd, lat, lon) : null;
    host.innerHTML = wheelSVG({ natal: natal, transit: [], asc: asc, hits: [], compact: true });
    cap.textContent = 'The sky on ' + d + ' ' + MONTHS[m - 1] + ' ' + y + ' at ' + pad2(hh) + ':' + pad2(mm) +
      ' · Moon in ' + D.RASHIS[K.signOf(natal[1].lon)].n + ' · Sun in ' + D.RASHIS[K.signOf(natal[0].lon)].n +
      (asc !== null ? ' · rising ' + D.RASHIS[K.signOf(asc)].n : ' · add a place for the rising sign');
  }
  ['fDate','fTime','fTz','fLat','fLon'].forEach(function (id) {
    $(id).addEventListener('input', heroPreview);
    $(id).addEventListener('change', heroPreview);
  });

  /* =========================================================================
     8d. the alignment wheel: birth sky inside, tonight's sky outside
  ========================================================================= */
  function wpt(lon, r) {
    var a = (180 - lon) * Math.PI / 180;
    return [(200 + r * Math.cos(a)).toFixed(2), (200 - r * Math.sin(a)).toFixed(2)];
  }
  // planets closer than 7 degrees to a neighbour alternate between two radii
  function spread(list, r1, r2) {
    var sorted = list.slice().sort(function (a, b) { return a.lon - b.lon; });
    var flip = false;
    for (var i = 0; i < sorted.length; i++) {
      if (i > 0) {
        var gap = ((sorted[i].lon - sorted[i - 1].lon) % 360 + 360) % 360;
        flip = gap < 7 ? !flip : false;
      }
      sorted[i].r = flip ? r2 : r1;
    }
    return sorted;
  }
  function wheelSVG(o) {
    var lagnaSign = (o.asc !== null && o.asc !== undefined) ? K.signOf(o.asc) : -1;
    var h = ['<svg class="wheel" viewBox="0 0 400 400" role="img" aria-label="Zodiac wheel">'];
    h.push('<circle class="ring" cx="200" cy="200" r="198"/>');
    h.push('<circle class="band" cx="200" cy="200" r="168"/><circle class="band" cx="200" cy="200" r="140"/>');
    for (var i = 0; i < 12; i++) {
      var a = wpt(i * 30, 140), b = wpt(i * 30, 168);
      if (i === lagnaSign) {
        var p1 = wpt(i * 30, 140), p2 = wpt(i * 30, 168), p3 = wpt(i * 30 + 30, 168), p4 = wpt(i * 30 + 30, 140);
        h.push('<path class="sector lagna" d="M' + p1 + ' L' + p2 + ' A168 168 0 0 0 ' + p3 +
               ' L' + p4 + ' A140 140 0 0 1 ' + p1 + ' Z"/>');
      }
      h.push('<line class="sector" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>');
      var g = wpt(i * 30 + 15, 154);
      h.push('<text class="sg' + (i === lagnaSign ? ' me' : '') + '" x="' + g[0] + '" y="' + g[1] + '">' +
             D.RASHIS[i].g + '</text>');
    }
    if (o.asc !== null && o.asc !== undefined) {
      var e = wpt(o.asc, 140), l = wpt(o.asc, 178);
      h.push('<line class="asc" x1="200" y1="200" x2="' + e[0] + '" y2="' + e[1] + '"/>');
      if (!o.compact) h.push('<text class="asc-l" x="' + l[0] + '" y="' + l[1] + '">AS</text>');
    }
    spread(o.natal, o.compact ? 112 : 118, o.compact ? 92 : 100).forEach(function (p) {
      var q = wpt(p.lon, p.r), t = wpt(p.lon, 140), t2 = wpt(p.lon, 132);
      h.push('<line class="tick" x1="' + t[0] + '" y1="' + t[1] + '" x2="' + t2[0] + '" y2="' + t2[1] + '" stroke="' + p.color + '"/>');
      h.push('<text class="np" x="' + q[0] + '" y="' + q[1] + '" fill="' + p.color + '"><title>' +
             esc(p.name + ' at birth · ' + D.RASHIS[K.signOf(p.lon)].n + ' ' + K.dms(K.degInSign(p.lon))) +
             '</title>' + p.sym + '</text>');
    });
    spread(o.transit || [], 183, 195).forEach(function (p) {
      var q = wpt(p.lon, p.r), t = wpt(p.lon, 168), t2 = wpt(p.lon, 175);
      h.push('<line class="tick" x1="' + t[0] + '" y1="' + t[1] + '" x2="' + t2[0] + '" y2="' + t2[1] + '" stroke="' + p.color + '"/>');
      h.push('<circle class="tr" cx="' + q[0] + '" cy="' + q[1] + '" r="9" stroke="' + p.color + '"/>');
      h.push('<text class="tp" x="' + q[0] + '" y="' + q[1] + '" fill="' + p.color + '"><title>' +
             esc(p.name + ' now · ' + D.RASHIS[K.signOf(p.lon)].n + ' ' + K.dms(K.degInSign(p.lon)) + (p.retro ? ' (retrograde)' : '')) +
             '</title>' + p.sym + '</text>');
    });
    (o.hits || []).forEach(function (hp) {
      var a1 = wpt(hp.a.lon, hp.a.r + 9), b1 = wpt(hp.b.lon, hp.b.r - 10);
      h.push('<line class="hit" x1="' + a1[0] + '" y1="' + a1[1] + '" x2="' + b1[0] + '" y2="' + b1[1] + '"/>');
      var c = wpt(hp.b.lon, hp.b.r);
      h.push('<circle class="hit-g" cx="' + c[0] + '" cy="' + c[1] + '" r="13"/>');
    });
    h.push('</svg>');
    return h.join('');
  }

  var TRANSIT_MOOD = {
    Jupiter: 'expands and protects whatever it touches, so this is a green light for ',
    Venus:   'sweetens whatever it touches, so ease, charm and money lean toward ',
    Mercury: 'sharpens whatever it touches, so talks, paperwork and decisions move quickly around ',
    Sun:     'lights whatever it touches, so people who matter can see ',
    Moon:    'passes over it today, so feelings run high for a day or two around ',
    Mars:    'heats whatever it touches, so there is energy but also friction around ',
    Saturn:  'tests whatever it touches for months, and what survives is permanent in ',
    Rahu:    'bends whatever it touches toward the unusual or the foreign, in ',
    Ketu:    'loosens whatever it touches, so something is quietly being released in '
  };
  var TRANSIT_TONE = { Jupiter:'pos', Venus:'pos', Mercury:'pos', Moon:'pos', Sun:'', Mars:'neg', Saturn:'neg', Rahu:'neg', Ketu:'neg' };

  function renderWheel(chart) {
    var P = window.Plainspeak, jd = nowJD();
    var natal = chart.planets.map(function (p) {
      return { name: p.name, lon: p.lon, color: D.GRAHAS[p.name].color, sym: p.sym };
    });
    var transit = A.BODY_ORDER.map(function (b) {
      return { name: b, lon: A.siderealLongitude(b, jd), color: D.GRAHAS[b].color, sym: D.GRAHAS[b].sym,
               retro: A.isRetrograde(b, jd) && b !== 'Rahu' && b !== 'Ketu' };
    });
    var hits = [];
    transit.forEach(function (t) {
      natal.forEach(function (n) {
        var sep = Math.abs(A.norm180(t.lon - n.lon));
        if (sep <= 3) hits.push({ a: n, b: t, sep: sep });
      });
    });
    hits.sort(function (x, y) { return x.sep - y.sep; });
    $('wheelHost').innerHTML = wheelSVG({ natal: natal, transit: transit, asc: chart.ascLon, hits: hits });

    var items = [];
    hits.forEach(function (hp) {
      var T = hp.b.name, N = hp.a.name, house = chart.byName[N].house;
      var exact = hp.sep < 1 ? 'exactly' : 'within ' + hp.sep.toFixed(1) + '°';
      items.push({
        cls: TRANSIT_TONE[T],
        k: P.PLANET[T].n + ' over your ' + (P.PLANET[N].b || P.PLANET[N].n) + ' · ' + exact,
        t: cap(P.PLANET[T].n) + ' is standing ' + exact + ' on the spot your ' + (P.PLANET[N].b || P.PLANET[N].n) +
           ' held at birth, in your ' + P.HOUSE_SHORT[house] + ' area. It ' + TRANSIT_MOOD[T] +
           P.PLANET[N].role + '.'
      });
    });
    transit.forEach(function (t) {
      if (t.name === 'Moon') return;
      var s = K.signOf(t.lon);
      if (s === chart.moonSign) {
        items.push({ cls: TRANSIT_TONE[t.name], k: P.PLANET[t.name].n + ' in your Moon sign',
          t: cap(P.PLANET[t.name].n) + ' is moving through ' + D.RASHIS[s].n + ', the sign your Moon was born in. ' +
             'Whatever it does, it does to your mood and your sense of home first.' });
      } else if (s === chart.lagnaSign && chart.timeKnown) {
        items.push({ cls: TRANSIT_TONE[t.name], k: P.PLANET[t.name].n + ' in your rising sign',
          t: cap(P.PLANET[t.name].n) + ' is moving through ' + D.RASHIS[s].n + ', your rising sign. ' +
             'It is acting on you directly: your body, your energy and how you come across.' });
      }
    });
    var GOOD = { Jupiter:[2,5,7,9,11], Saturn:[3,6,11] };
    ['Jupiter','Saturn'].forEach(function (name) {
      var t = transit.filter(function (x) { return x.name === name; })[0];
      var hFromMoon = K.houseFrom(chart.moonSign, K.signOf(t.lon));
      var good = GOOD[name].indexOf(hFromMoon) >= 0;
      items.push({ cls: good ? 'pos' : 'neg', k: name + ', ' + ORD[hFromMoon] + ' from your Moon',
        t: name + ' is in ' + D.RASHIS[K.signOf(t.lon)].n + ', the ' + ORD[hFromMoon] + ' sign from your Moon. ' +
           (name === 'Jupiter'
             ? (good ? 'That is one of the places Jupiter helps from: growth, luck and protection reach you this year.'
                     : 'That is not one of the places Jupiter helps from, so its gifts arrive indirectly this year, through other people.')
             : (good ? 'That is one of the places Saturn helps from: hard work pays and rivals fall away this pass.'
                     : 'That is one of the places Saturn presses from: delays and heavier duties, but nothing that lasts beyond the pass.')) });
    });
    $('alignHost').innerHTML = items.slice(0, 7).map(function (x) {
      return '<div class="card' + (x.cls === 'pos' ? ' yoga major' : x.cls === 'neg' ? ' dosha' : '') + '"><h4>' +
             esc(x.k) + '</h4><p>' + esc(x.t) + '</p></div>';
    }).join('') || '<div class="card"><p>No planet tonight is within three degrees of a natal one.</p></div>';

    var rows = ['<tr><th>Graha</th><th>Rāśi</th><th>Deg</th><th>House</th><th>From Moon</th></tr>'];
    transit.forEach(function (t) {
      var s = K.signOf(t.lon);
      rows.push('<tr><td class="g"><b>' + t.sym + '</b>' + esc(D.GRAHAS[t.name].dev) +
        (t.retro ? ' <span class="r">℞</span>' : '') + '</td><td>' + esc(D.RASHIS[s].n) + '</td><td>' +
        K.dms(K.degInSign(t.lon)) + '</td><td>' + K.houseFrom(chart.lagnaSign, s) + '</td><td>' +
        K.houseFrom(chart.moonSign, s) + '</td></tr>');
    });
    $('transitTable').innerHTML = rows.join('');
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* =========================================================================
     8e. today: the horoscope, measured from your own Moon
  ========================================================================= */
  var CHANDRA_TEXT = {
    1: 'it is passing over your own Moon. You feel most like yourself; a good day for anything personal.',
    2: 'money and words need care today. Hold your tongue and your wallet.',
    3: 'energy and courage are up. A day to push, message, ask.',
    4: 'a homebody day. Comfort matters more than progress; do not force the world.',
    5: 'creative but scattered. Not the day for a final decision.',
    6: 'a day for clearing work, beating a problem, winning an argument.',
    7: 'people come toward you. Meetings, partners and dates work.',
    8: 'the low tide of the cycle. Keep it quiet, avoid risks and confrontation.',
    9: 'luck and teachers are near. Travel, study, apply.',
    10: 'you are visible today. Bosses notice; show your work.',
    11: 'gains. Money in, friends around; ask for what you want.',
    12: 'a leaky day. Sleep, spend and lose things; rest and finish rather than start.'
  };
  var PDAY = {
    1: 'begin something', 2: 'cooperate and wait', 3: 'talk, write, be social', 4: 'organise and do the dull work',
    5: 'change something, move', 6: 'look after home and people', 7: 'think, rest, be alone', 8: 'deal with money and business',
    9: 'finish, give, let go'
  };
  var VERDICT_DAY = [[1.8, 'A strong day'], [0.6, 'A good day'], [-0.6, 'An ordinary day'], [-1.8, 'A quiet day'], [-99, 'A day to keep small']];

  function renderToday(chart, m) {
    var rec = m.days.all.filter(function (d) { return d.isToday; })[0];
    var host = $('todayHost');
    if (!rec) { host.innerHTML = ''; return; }
    var p = rec.panchang, now = new Date(), P = window.Plainspeak;
    var verdict = VERDICT_DAY.filter(function (v) { return rec.score >= v[0]; })[0][1];
    var todayTz = chart.birth.india ? A.indiaOffset(now.getFullYear(), now.getMonth() + 1, now.getDate()) : chart.birth.tz;

    var lines = [];
    lines.push('The Moon is in ' + D.RASHIS[p.moonSign].n + ' today, the ' + ORD[rec.chandra.num] +
      ' sign from your own Moon — ' + CHANDRA_TEXT[rec.chandra.num]);
    lines.push('Today’s star is ' + p.nakName + ', which counts as your ' + rec.tara.n + ' star: ' + rec.tara.t + '.');
    var moonLord = D.RASHIS[chart.moonSign].lord, rel = K.relation(moonLord, p.vara.lord);
    lines.push('It is ' + p.paksha + ' ' + p.tithiName + ', with the Moon ' +
      (p.paksha === 'Shukla' ? 'filling' : 'thinning') + '. ' + p.vara.n + ' belongs to ' +
      (P.PLANET[p.vara.lord].b || P.PLANET[p.vara.lord].n) + ', ' +
      (rel === 'friend' || rel === 'own' ? 'a friend of your Moon, so the day runs with you.'
       : rel === 'enemy' ? 'no friend of your Moon, so things take a little longer than they should.'
       : 'neutral to your Moon.'));
    if (state.num) lines.push('Your personal day number is ' + state.num.personalDay + ': a day to ' + PDAY[state.num.personalDay] + '.');
    var cn = K.chinesePillars(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0, todayTz);
    var crel = K.animalRelation(m.natalChinese.animalIdx, cn.dayBranchIdx);
    lines.push('In the Chinese day count this is a ' + cn.dayElement.n + ' ' + cn.dayAnimal.n + ' day. Against your ' +
      m.natalChinese.animal.n + ' that is ' + crel.t + '.');
    var sunHouse = K.houseFrom(chart.sunSign, p.moonSign);
    lines.push('Read from your Sun sign, the way a newspaper column would, the Moon sits in your ' + ORD[sunHouse] +
      ' — so the day’s attention goes to ' + R.houseTheme(sunHouse) + '.');

    var dateStr = now.getDate() + ' ' + MONTHS[now.getMonth()] + ' ' + now.getFullYear();
    function fact(k, v, s) {
      return '<div class="ov"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div>' +
             (s ? '<div class="s">' + esc(s) + '</div>' : '') + '</div>';
    }
    host.innerHTML =
      '<div class="today-hero"><div class="dt">' + esc(p.vara.n + ' · ' + dateStr) + '</div>' +
      '<div class="verdict">' + esc(verdict) + '</div>' +
      lines.map(function (l, i) { return '<p' + (i ? ' class="sub"' : '') + '>' + esc(l) + '</p>'; }).join('') + '</div>' +
      '<div class="today-facts" data-stagger>' +
      fact('Tithi', p.paksha + ' ' + p.tithiName, p.monthName + ' māsa') +
      fact('Nakṣatra', p.nakName, rec.tara.n + ' star for you') +
      fact('Moon sign', D.RASHIS[p.moonSign].n, ORD[rec.chandra.num] + ' from your Moon') +
      fact('Personal day', state.num ? String(state.num.personalDay) : '—', state.num ? PDAY[state.num.personalDay] : '') +
      '</div>';
    renderWeek(chart);
  }

  function renderWeek(chart) {
    var b = chart.birth, today = new Date(), out = [];
    var WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (var i = 0; i < 7; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      var y = d.getFullYear(), mo = d.getMonth() + 1, dd = d.getDate();
      var tz = b.india ? A.indiaOffset(y, mo, dd) : b.tz;
      var rs = A.sunRiseSet(y, mo, dd, b.lat, b.lon, tz);
      var jd = (rs && rs.rise) ? rs.rise : A.toJD(y, mo, dd, 6, 0, 0) - tz / 24;
      var p = K.panchang(jd, tz);
      var tara = K.taraBala(chart.moonNak, p.nak), cb = K.chandraBala(chart.moonSign, p.moonSign);
      var s = (tara.info.good ? 1.5 : (tara.info.n === 'Vadha' ? -1.5 : tara.info.n === 'Janma' ? -0.8 : -1.1)) +
              (cb.good ? 1.0 : -0.8);
      if ([4, 9, 14].indexOf(p.tithiNum) >= 0) s -= 0.8;
      s += (p.paksha === 'Shukla') ? 0.3 : -0.2;
      out.push({ day: dd, wd: WD[d.getDay()], score: s, tara: tara.info, today: i === 0, month: MONTHS[mo - 1].slice(0, 3) });
    }
    var ranked = out.slice().sort(function (a, c) { return c.score - a.score; });
    var best = ranked[0], worst = ranked[ranked.length - 1];
    $('weekHost').innerHTML =
      '<div class="week">' + out.map(function (x) {
        var cls = x.score >= 1.2 ? ' good' : x.score <= -1.2 ? ' bad' : '';
        return '<div class="wd' + cls + (x.today ? ' today' : '') + '" title="' + esc(x.tara.t) + '">' +
               '<div class="n">' + x.wd + '</div><div class="d">' + x.day + '</div><div class="s">' + esc(x.tara.n) + '</div></div>';
      }).join('') + '</div>' +
      '<p class="week-note">Best of the seven: <b class="gold">' + best.wd + ' ' + best.day + ' ' + best.month + '</b> — ' +
      esc(best.tara.t) + '. Quietest: ' + worst.wd + ' ' + worst.day + ' (' + esc(worst.tara.n) + ' star). ' +
      'Gold means the day’s star and Moon both favour you; rose means both push back. ' +
      'Each day is read at sunrise over your birth place, the way a printed pañcāṅga is.</p>';
  }


  /* =========================================================================
     9. restore
  ========================================================================= */
  (function restore() {
    var raw;
    try { raw = localStorage.getItem('jd.birth'); } catch (e) { return; }
    if (!raw) return;
    try {
      var b = JSON.parse(raw);
      $('fFullName').value = b.fullName || (b.name === 'Traveller' ? '' : b.name);
      $('fName').value = b.usedName || '';
      $('fGender').value = b.gender || '';
      $('fDate').value = b.y + '-' + pad2(b.m) + '-' + pad2(b.d);
      $('fTime').value = pad2(b.hh) + ':' + pad2(b.mm);
      $('fTz').value = (b.tz >= 0 ? '+' : '') + b.tz;
      $('fLat').value = b.lat; $('fLon').value = b.lon;
      fPlace.value = b.place || '';
      if (!b.timeKnown) { $('fNoTime').checked = true; $('fTime').disabled = true; }
      pickedIsIndia = !!b.india;
      heroPreview();
      launch(b, { instant: true });
    } catch (e) {}
  })();
})();
