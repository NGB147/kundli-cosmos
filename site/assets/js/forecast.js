/* ============================================================================
   forecast.js - the part a person actually reads first.

   Three jobs:
     1. timeline()  - scan the coming years month by month and return real
                      date windows, not vague "soon".
     2. consensus() - run the question through every system independently
                      (Parashari, dasha, ashtakavarga, navamsa, Western
                      transits, Chinese, numerology) and report where they
                      agree and where they do not.
     3. plain()     - one sentence, in ordinary English, with a date in it.
============================================================================ */
(function (root) {
  'use strict';

  var A = root.Astro, K = root.Kundli, D = root.VData;
  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmtMY(jd) { var d = A.fromJD(jd); return SHORT[d.m - 1] + ' ' + d.y; }
  function fmtLong(jd) { var d = A.fromJD(jd); return MONTHS[d.m - 1] + ' ' + d.y; }

  /* ---------------------------------------------------------------------
     How strongly a given graha speaks for a given life area in this chart.
  --------------------------------------------------------------------- */
  function lordRelevance(chart, lordName, dom) {
    var house = dom.houses[0];
    var h = chart.houses[house - 1];
    var p = chart.byName[lordName];
    if (!p) return 0;
    var base = 0;
    if (h.lord === lordName) base = 1.0;
    else if (p.house === house) base = 0.8;
    else if (dom.karakas.indexOf(lordName) >= 0) base = 0.6;
    else if (h.aspecting.some(function (x) { return x.name === lordName; })) base = 0.4;
    else if (dom.houses.indexOf(p.house) >= 0) base = 0.3;
    else return 0;
    // a debilitated ruler still rules, but it delivers less
    return base * clamp(0.5 + p.dignity.score / 4, 0.1, 1.5);
  }

  /* ---------------------------------------------------------------------
     1. TIMELINE - month-by-month scan producing dated windows
  --------------------------------------------------------------------- */

  // transit of a slow graha judged from the house in question
  var TRANSIT_GOOD = { Jupiter: [1,2,5,7,9,11], Saturn: [3,6,11], Rahu: [3,6,11] };

  function monthScore(chart, dom, jd) {
    var house = dom.houses[0];
    var targetSign = chart.houses[house - 1].sign;
    var s = 0;

    var d = K.dashaAt(chart.dasha, jd);
    if (d) {
      s += lordRelevance(chart, d.maha.lord, dom) * 1.0;
      // the antardasha sets the theme, the pratyantardasha fires the event
      if (d.antar) s += lordRelevance(chart, d.antar.lord, dom) * 1.5;
      if (d.praty) s += lordRelevance(chart, d.praty.lord, dom) * 1.2;
    }

    ['Jupiter','Saturn'].forEach(function (name) {
      var sign = K.signOf(A.siderealLongitude(name, jd));
      var rel = K.houseFrom(targetSign, sign);
      var good = TRANSIT_GOOD[name].indexOf(rel) >= 0;
      var w = name === 'Jupiter' ? 0.8 : 0.5;
      s += good ? w : -w * 0.7;
      if (chart.deep) s += (chart.deep.av.sav[sign] - 28) * (name === 'Jupiter' ? 0.035 : 0.02);
    });

    return s;
  }

  /* Scan `months` months ahead, return the strongest and weakest runs. */
  function timeline(chart, dom, jdNow, months) {
    months = months || 72;
    var pts = [];
    for (var i = 0; i < months; i++) {
      var jd = jdNow + i * 30.4368;
      pts.push({ i: i, jd: jd, score: monthScore(chart, dom, jd) });
    }
    var vals = pts.map(function (p) { return p.score; });
    var mean = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    var sd = Math.sqrt(vals.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / vals.length) || 1;

    function runs(pred) {
      var out = [], cur = null;
      pts.forEach(function (p) {
        if (pred(p)) { if (!cur) cur = { from: p, to: p, peak: p }; else { cur.to = p; if (p.score > cur.peak.score) cur.peak = p; } }
        else if (cur) { out.push(cur); cur = null; }
      });
      if (cur) out.push(cur);
      return out;
    }

    var hi = runs(function (p) { return p.score >= mean + 0.45 * sd; })
      .filter(function (r) { return r.to.i - r.from.i >= 1; })
      .sort(function (a, b) { return b.peak.score - a.peak.score; });

    var lo = runs(function (p) { return p.score <= mean - 0.55 * sd; })
      .filter(function (r) { return r.to.i - r.from.i >= 1; })
      .sort(function (a, b) { return a.peak.score - b.peak.score; });

    // the weakest point inside a low run, not the strongest
    lo.forEach(function (r) {
      var worst = r.from;
      pts.slice(r.from.i, r.to.i + 1).forEach(function (p) { if (p.score < worst.score) worst = p; });
      r.peak = worst;
    });

    return {
      points: pts, mean: mean, sd: sd,
      best: hi.slice(0, 2).map(function (r, i) { var o = fmtRun(r); o.strongest = (i === 0); return o; })
              .sort(function (a, b) { return a.monthsAway - b.monthsAway; }),
      avoid: lo.slice(0, 1).map(fmtRun),
      soonest: hi.length ? fmtRun(hi.slice().sort(function (a, b) { return a.from.i - b.from.i; })[0]) : null
    };

    function fmtRun(r) {
      return {
        fromJD: r.from.jd, toJD: r.to.jd, peakJD: r.peak.jd,
        from: fmtMY(r.from.jd), to: fmtMY(r.to.jd),
        peak: fmtLong(r.peak.jd),
        monthsAway: r.from.i, length: r.to.i - r.from.i + 1
      };
    }
  }

  /* ---------------------------------------------------------------------
     2. CONSENSUS - every system judged separately, then merged
  --------------------------------------------------------------------- */

  function lifePath(birth) {
    var digits = String(birth.y) + String(birth.m) + String(birth.d);
    var n = digits.split('').reduce(function (a, c) { return a + (+c); }, 0);
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n).split('').reduce(function (a, c) { return a + (+c); }, 0);
    }
    return n;
  }
  var PATH_AFFINITY = {
    career:[1,8,22], money:[4,8], love:[2,6], education:[3,7,11],
    health:[6,7], travel:[5], family:[6,2], timing:[1,8]
  };

  function westernScore(chart, jdNow) {
    var ayan = A.ayanamsa(chart.jd);
    var natal = {
      Sun: A.norm360(chart.sunLon + ayan),
      Moon: A.norm360(chart.moonLon + ayan),
      Asc: A.norm360(chart.ascLon + ayan)
    };
    var ASPECTS = [[0,1],[60,0.6],[90,-0.9],[120,1],[180,-0.7]];
    var s = 0, hits = [];
    ['Jupiter','Saturn'].forEach(function (t) {
      var lon = A.tropicalLongitude(t, jdNow);
      Object.keys(natal).forEach(function (pt) {
        var sep = Math.abs(A.norm180(lon - natal[pt]));
        ASPECTS.forEach(function (asp) {
          if (Math.abs(sep - asp[0]) <= 6) {
            var v = asp[1] * (t === 'Jupiter' ? 1 : 0.7) * (t === 'Saturn' && asp[1] > 0 ? 0.5 : 1);
            s += v;
            hits.push(t + (asp[0] === 0 ? ' conjunct ' : asp[0] === 120 ? ' trine ' :
                     asp[0] === 60 ? ' sextile ' : asp[0] === 90 ? ' square ' : ' opposite ') + pt);
          }
        });
      });
    });
    return { score: s, hits: hits };
  }

  function consensus(chart, dom, jdNow) {
    var sys = [];
    var house = dom.houses[0];
    var h = chart.houses[house - 1];
    var lord = chart.byName[h.lord];

    // --- 1. Parashari natal strength ---
    var natal = lord.dignity.score * 1.2 +
      ([1,4,7,10].indexOf(lord.house) >= 0 ? 0.8 : [5,9].indexOf(lord.house) >= 0 ? 1.0 :
       [6,8,12].indexOf(lord.house) >= 0 ? -1.0 : 0.3);
    sys.push({ key:'parashari', name:'Your birth chart', sanskrit:'Parashari', weight:0.95,
      raw: natal, norm: clamp(natal / 2.5, -1, 1),
      note: D.GRAHAS[lord.name].dev + ' rules the ' + ord(house) + ' from the ' + ord(lord.house) + '.' });

    // --- 2. Vimshottari dasha ---
    var d = K.dashaAt(chart.dasha, jdNow);
    var dv = 0, dnote = 'no active period';
    if (d) {
      dv = lordRelevance(chart, d.maha.lord, dom) + (d.antar ? lordRelevance(chart, d.antar.lord, dom) * 1.3 : 0);
      dv = dv * 2 - 0.6;
      dnote = D.GRAHAS[d.maha.lord].dev + '/' + D.GRAHAS[d.antar.lord].dev + ' running now.';
    }
    sys.push({ key:'dasha', name:'The life-chapter you are in', sanskrit:'Vimshottari dasha', weight:0.95,
      raw: dv, norm: clamp(dv / 2, -1, 1), note: dnote });

    // --- 3. Ashtakavarga ---
    if (chart.deep) {
      var bindu = chart.deep.av.sav[h.sign];
      sys.push({ key:'av', name:'Support score for this area', sanskrit:'Ashtakavarga', weight:0.7,
        raw: bindu, norm: clamp((bindu - 28) / 8, -1, 1),
        note: bindu + ' bindus in this house (28 is average).' });

      // --- 4. Navamsa ---
      var d9 = root.Jyotish.VARGAS.D9(lord.lon);
      var d9d = K.dignityOf(lord.name, d9 * 30 + 15);
      var varg = chart.deep.vargottama.indexOf(lord.name) >= 0;
      var nv = varg ? 1.6 : d9d.score;
      sys.push({ key:'navamsa', name:'Does it hold up over time', sanskrit:'Navamsa D-9', weight:0.8,
        raw: nv, norm: clamp(nv / 2, -1, 1),
        note: varg ? D.GRAHAS[lord.name].dev + ' is vargottama.'
                   : D.GRAHAS[lord.name].dev + ' is ' + d9d.label.toLowerCase() + ' in the D-9.' });

      // --- 5. Shadbala ---
      var sb = chart.deep.bala[lord.name];
      if (sb) {
        sys.push({ key:'bala', name:'Strength of the ruling planet', sanskrit:'Shadbala', weight:0.6,
          raw: sb.ratio, norm: clamp((sb.ratio - 1) * 2, -1, 1),
          note: D.GRAHAS[lord.name].dev + ' at ' + sb.ratio.toFixed(2) + ' of its required strength.' });
      }
    }

    // --- 6. Western transits ---
    var w = westernScore(chart, jdNow);
    sys.push({ key:'western', name:'Western astrology', sanskrit:'transits', weight:0.5,
      raw: w.score, norm: clamp(w.score / 1.6, -1, 1),
      note: w.hits.length ? w.hits.slice(0, 2).join(', ') + '.' : 'no major transit within orb.' });

    // --- 7. Chinese zodiac ---
    var natalCn = K.chinesePillars(chart.birth.y, chart.birth.m, chart.birth.d,
                                   chart.birth.hh, chart.birth.mm, chart.birth.tz);
    var nowD = A.fromJD(jdNow);
    var nowCn = K.chinesePillars(nowD.y, nowD.m, nowD.d, 12, 0, chart.birth.tz);
    var rel = K.animalRelation(natalCn.animalIdx, nowCn.animalIdx);
    sys.push({ key:'chinese', name:'Chinese zodiac', sanskrit:'', weight:0.3,
      raw: rel.score, norm: clamp(rel.score / 1.5, -1, 1),
      note: nowCn.animal.n + ' year against your ' + natalCn.animal.n + ': ' + rel.key + '.' });

    // --- 8. Numerology ---
    var lp = lifePath(chart.birth);
    var affin = (PATH_AFFINITY[dom.id] || []).indexOf(lp) >= 0;
    sys.push({ key:'numerology', name:'Numerology', sanskrit:'', weight:0.2,
      raw: affin ? 0.6 : 0.05, norm: affin ? 0.6 : 0.05,
      note: 'Life path ' + lp + (affin ? ', which suits this area.' : ', neutral for this area.') });

    var wsum = sys.reduce(function (a, s) { return a + s.weight; }, 0);
    var merged = sys.reduce(function (a, s) { return a + s.weight * s.norm; }, 0) / wsum;

    var pos = sys.filter(function (s) { return s.norm > 0.15; }).length;
    var neg = sys.filter(function (s) { return s.norm < -0.15; }).length;
    var neu = sys.length - pos - neg;
    var majority = pos > neg ? pos : neg;
    var agreement = majority / sys.length;

    return {
      systems: sys, merged: merged, pos: pos, neg: neg, neutral: neu,
      agreement: agreement,
      direction: merged > 0.12 ? 'positive' : merged < -0.12 ? 'negative' : 'split',
      confidence: agreement >= 0.7 ? 'high' : agreement >= 0.5 ? 'moderate' : 'low'
    };
  }

  /* ---------------------------------------------------------------------
     3. PLAIN - the sentence at the top
  --------------------------------------------------------------------- */

  var SUBJECT = {
    career: 'a real move at work',
    money:  'a genuine gain in money',
    love:   'marriage or a settled relationship',
    education: 'the result you are studying for',
    health: 'steady improvement in health',
    travel: 'the move abroad or the relocation',
    family: 'things settling at home',
    timing: 'the right moment to commit'
  };

  var WORD = {
    strong:  'Yes',
    favor:   'Likely yes',
    mixed:   'Depends on timing',
    caution: 'Not yet',
    hard:    'Not in this phase'
  };

  function plain(dom, band, tl, cons) {
    var subject = SUBJECT[dom.id] || 'this';
    var word = WORD[band.key];
    var win = tl.best[0] || tl.soonest;
    var lines = [];

    if (win) {
      var soon = win.monthsAway <= 2;
      if (band.key === 'strong' || band.key === 'favor') {
        lines.push(word + ' — ' + subject + ' is best supported ' +
          (soon ? 'right now and through ' + win.to : 'between ' + win.from + ' and ' + win.to) +
          ', strongest around ' + win.peak + '.');
      } else if (band.key === 'mixed') {
        lines.push(word + '. The chart does not settle this on its own, but the window that ' +
          'favours ' + subject + ' runs ' + win.from + ' to ' + win.to + ', peaking ' + win.peak + '.');
      } else {
        // in a weak area the "best" window is only the least difficult one,
        // and saying otherwise would overpromise
        lines.push(word + '. The most workable stretch is ' + win.from + ' to ' + win.to +
          ', easiest around ' + win.peak + ' — though this area stays demanding throughout, ' +
          'so treat that as the moment to try, not a guarantee.');
      }
    } else {
      lines.push(word + '. No standout window shows up in the next six years for ' + subject +
        ' — which usually means progress here is steady rather than event-driven.');
    }

    if (tl.avoid.length) {
      lines.push('Weakest stretch: ' + tl.avoid[0].from + ' to ' + tl.avoid[0].to +
        '. Avoid committing anything irreversible then.');
    }

    if (cons.direction === 'split') {
      lines.push('The systems disagree: ' + cons.pos + ' point yes, ' + cons.neg + ' point no, ' +
        cons.neutral + ' are neutral. Genuinely open — here your own judgement should outweigh the chart.');
    } else {
      var agree = cons.pos > cons.neg ? cons.pos : cons.neg;
      lines.push(agree + ' of the ' + cons.systems.length + ' systems agree (' + cons.direction +
        '), so confidence is ' + cons.confidence + '.');
    }

    return { word: word, lines: lines, window: win, confidence: cons.confidence };
  }

  function ord(n) {
    return ['','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'][n] || n;
  }

  root.Forecast = {
    timeline: timeline, consensus: consensus, plain: plain,
    lordRelevance: lordRelevance, monthScore: monthScore, lifePath: lifePath,
    fmtMY: fmtMY, fmtLong: fmtLong
  };
})(window);
