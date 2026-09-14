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

