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
  var fPlace = $('fPlace'), suggest = $('suggest'), chosenCity = null;

  function searchCities(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    var starts = [], contains = [];
    for (var i = 0; i < D.CITIES.length; i++) {
      var c = D.CITIES[i], n = c[0].toLowerCase();
      if (n.indexOf(q) === 0) starts.push(c);
      else if (n.indexOf(q) > 0 || c[1].toLowerCase().indexOf(q) === 0) contains.push(c);
      if (starts.length >= 8) break;
    }
    return starts.concat(contains).slice(0, 8);
  }

  function renderSuggest(list) {
    if (!list.length) { suggest.hidden = true; return; }
    suggest.innerHTML = list.map(function (c, i) {
      return '<button type="button" data-i="' + i + '">' + esc(c[0]) +
             '<small>' + esc(c[1]) + ' · UTC' + (c[4] >= 0 ? '+' : '') + c[4] + '</small></button>';
    }).join('');
    suggest.hidden = false;
    Array.prototype.forEach.call(suggest.children, function (btn) {
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault();
        pickCity(list[+btn.dataset.i]);
      });
    });
  }

  function pickCity(c) {
    chosenCity = c;
    fPlace.value = c[0] + ', ' + c[1];
    $('fLat').value = c[2];
    $('fLon').value = c[3];
    $('fTz').value = (c[4] >= 0 ? '+' : '') + c[4];
    suggest.hidden = true;
  }

  fPlace.addEventListener('input', function () {
    chosenCity = null;
    renderSuggest(searchCities(fPlace.value));
  });
  fPlace.addEventListener('blur', function () {
    setTimeout(function () { suggest.hidden = true; }, 120);
  });

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
    var chart = K.buildChart(birth);
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
    renderAsk(chart);
    renderSky(chart);
    show('viewChart');
    setTimeout(function () { renderMonth(chart); }, 60);
  }

  function show(id) {
    ['viewChart','viewAsk','viewMonth','viewSky'].forEach(function (v) {
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
    h.push('<div class="sub-block"><b>Your daśā</b>' + a.dashaText + '</div>');
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

    function pc(k, v) { return '<div><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div>'; }
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
      launch(b);
    } catch (e) {}
  })();
})();
