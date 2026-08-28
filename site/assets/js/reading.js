/* ============================================================================
   reading.js - turns a chart into language.
   Every sentence below is assembled from that person's actual placements:
   house lord, its dignity and bhava, occupants, drishti, the running dasha,
   and live transits. Nothing here is a generic sun-sign paragraph.
============================================================================ */
(function (root) {
  'use strict';

  var A = root.Astro, K = root.Kundli, D = root.VData;

  var ORD = ['', '1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'];
  var MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

  function rashi(i) { return D.RASHIS[i]; }
  function isBenefic(p) { return D.GRAHAS[p].nature === 'Benefic'; }
  function isMalefic(p) { return D.GRAHAS[p].nature === 'Malefic'; }

  // dignity labels read as nouns; this turns them into something a sentence
  // can actually use after "is".
  var DIGNITY_PHRASE = {
    'Exalted':'exalted', 'Debilitated':'debilitated', 'Moolatrikona':'in moolatrikona',
    'Own sign':'in its own sign', "Friend's sign":"in a friend's sign",
    "Enemy's sign":"in an enemy's sign", 'Neutral sign':'in a neutral sign'
  };
  function dig(p) { return DIGNITY_PHRASE[p.dignity.label] || p.dignity.label.toLowerCase(); }

  /* gochara: houses from the natal Moon where each transit is supportive */
  var GOCHARA_GOOD = {
    Sun:[3,6,10,11], Moon:[1,3,6,7,10,11], Mars:[3,6,11],
    Mercury:[2,4,6,8,10,11], Jupiter:[2,5,7,9,11], Venus:[1,2,3,4,5,8,9,11,12],
    Saturn:[3,6,11], Rahu:[3,6,11], Ketu:[3,6,11]
  };

  var REMEDIES = {
    Sun:     'Offer water to the rising sun on Sundays and speak to your father or a mentor you have been avoiding.',
    Moon:    'Keep Monday evenings quiet, drink more water, and call your mother or the person who raised you.',
    Mars:    'Burn the excess physically - Tuesday exercise, not Tuesday arguments. Give blood or donate red lentils.',
    Mercury: 'Write things down on Wednesdays. Feed green fodder to a cow, or simply keep one promise you made casually.',
    Jupiter: 'Thursdays: learn something with no use, feed someone, and take advice from a person older than you.',
    Venus:   'Fridays are for beauty and repair - mend one relationship, and stop postponing rest and pleasure.',
    Saturn:  'Saturdays: do the unglamorous work first. Serve someone who cannot repay you. Discipline is the remedy.',
    Rahu:    'Cut the compulsive input - the scrolling, the shortcut, the second opinion. Keep one boundary for 40 days.',
    Ketu:    'Simplify. Give away what you have not used in a year, and sit in silence for ten minutes daily.'
  };

  /* ---------- house-strength evaluation --------------------------------- */

  function evaluateHouse(chart, houseNum, karakas, jdNow) {
    var h = chart.houses[houseNum - 1];
    var lord = chart.byName[h.lord];
    var ev = [], score = 0;

    // 1. the lord's own dignity
    score += lord.dignity.score * 1.2;
    ev.push({
      w: lord.dignity.score,
      t: 'Your ' + ORD[houseNum] + ' house is ' + h.rashi.n + ' (' + h.rashi.w + '), ruled by ' +
         D.GRAHAS[lord.name].dev + '. That ruler sits in your ' + ORD[lord.house] + ' house in ' +
         rashi(lord.sign).n + ', ' + dig(lord) + (lord.retro ? ' and retrograde' : '') + '.'
    });

    // 2. where the lord landed
    var lp = lord.house, hs = 0, ht = '';
    if ([1,4,7,10].indexOf(lp) >= 0) { hs = 0.8; ht = 'a kendra - a pillar house, so the matter has real structural support'; }
    else if ([5,9].indexOf(lp) >= 0) { hs = 1.0; ht = 'a trikona - the luckiest placement, grace arrives here without you forcing it'; }
    else if ([6,8,12].indexOf(lp) >= 0) { hs = -1.0; ht = 'a dusthana - progress here is real but costly, and rarely arrives on schedule'; }
    else if (lp === 11) { hs = 0.6; ht = 'the house of gains - outcomes tend to materialise, though slowly'; }
    else { hs = 0.3; ht = 'a supporting house - steady rather than spectacular'; }
    score += hs;
    ev.push({ w: hs, t: 'The ' + ORD[lp] + ' is ' + ht + '.' });

    // 3. who is sitting in the house
    h.occupants.forEach(function (o) {
      var w = isBenefic(o.name) ? 0.6 : -0.5;
      if (o.dignity.score >= 1.5) w += 0.5; else if (o.dignity.score <= -2) w -= 0.5;
      score += w;
      ev.push({
        w: w,
        t: D.GRAHAS[o.name].dev + ' occupies this house directly (' + dig(o) +
           '), colouring it with ' + D.GRAHAS[o.name].karaka.split(',')[0] + '.'
      });
    });
    if (!h.occupants.length) {
      ev.push({ w: 0, t: 'No graha sits in this house, so its ruler carries the whole story alone.' });
    }

    // 4. drishti falling on the house
    var benAsp = h.aspecting.filter(function (p) { return isBenefic(p.name); });
    var malAsp = h.aspecting.filter(function (p) { return isMalefic(p.name); });
    if (benAsp.length) {
      score += 0.4 * benAsp.length;
      ev.push({ w: 0.4 * benAsp.length, t: benAsp.map(function (p) { return D.GRAHAS[p.name].dev; }).join(' and ') +
        ' cast' + (benAsp.length > 1 ? '' : 's') + ' drishti here - protection you will not notice until you need it.' });
    }
    if (malAsp.length) {
      score -= 0.35 * malAsp.length;
      ev.push({ w: -0.35 * malAsp.length, t: malAsp.map(function (p) { return D.GRAHAS[p.name].dev; }).join(' and ') +
        ' aspect' + (malAsp.length > 1 ? '' : 's') + ' this house - the pressure you feel here is genuine, not imagined.' });
    }

    // 5. the natural significators
    karakas.forEach(function (kn) {
      var kp = chart.byName[kn];
      var w = kp.dignity.score * 0.6;
      score += w;
      ev.push({
        w: w,
        t: D.GRAHAS[kn].dev + ', the natural karaka for this matter, is ' + dig(kp) +
           ' in ' + rashi(kp.sign).n + ' in your ' + ORD[kp.house] + '.'
      });
    });

    return { house: h, lord: lord, score: score, evidence: ev };
  }

  /* ---------- dasha relevance -------------------------------------------- */

  function dashaLayer(chart, houseNum, karakas, jdNow) {
    var d = K.dashaAt(chart.dasha, jdNow);
    if (!d) return { score: 0, text: 'The Vimshottari sequence runs past the range this chart covers.', d: null };

    var h = chart.houses[houseNum - 1];
    var rel = function (lordName) {
      var p = chart.byName[lordName];
      var tags = [];
      if (h.lord === lordName) tags.push('rules this very house');
      if (p.house === houseNum) tags.push('sits in it');
      if (karakas.indexOf(lordName) >= 0) tags.push('is its natural karaka');
      if (h.aspecting.some(function (x) { return x.name === lordName; })) tags.push('aspects it');
      return tags;
    };

    var mTags = rel(d.maha.lord), aTags = d.antar ? rel(d.antar.lord) : [];
    var score = 0, bits = [];

    var mp = chart.byName[d.maha.lord];
    bits.push('You are running the ' + D.GRAHAS[d.maha.lord].dev + ' mahadasha' +
      (d.antar ? ', with ' + D.GRAHAS[d.antar.lord].dev + ' as the antardasha' : '') + '.');

    if (mTags.length) {
      score += mp.dignity.score * 0.9 + 0.5;
      bits.push(D.GRAHAS[d.maha.lord].dev + ' ' + mTags.join(' and ') +
        ', so this entire period is structurally about this question - not a passing phase.');
    } else {
      bits.push(D.GRAHAS[d.maha.lord].dev + ' has no direct rulership here, so this area moves in the background of a larger chapter.');
    }
    if (d.antar && aTags.length) {
      var ap = chart.byName[d.antar.lord];
      score += ap.dignity.score * 0.7 + 0.4;
      bits.push('The running ' + D.GRAHAS[d.antar.lord].dev + ' sub-period ' + aTags.join(' and ') +
        ' - which is why the matter is live for you right now rather than a year ago.');
    }
    return { score: score, text: bits.join(' '), d: d };
  }

  /* ---------- live transits ---------------------------------------------- */

  function transitLayer(chart, houseNum, jdNow) {
    var score = 0, bits = [];
    ['Jupiter','Saturn','Rahu'].forEach(function (name) {
      var lon = A.siderealLongitude(name, jdNow);
      var sign = K.signOf(lon);
      var hFromLagna = K.houseFrom(chart.lagnaSign, sign);
      var hits = hFromLagna === houseNum;
      var aspects = K.aspectsCast(name).some(function (n) {
        return ((hFromLagna + n - 2) % 12) + 1 === houseNum;
      });
      if (!hits && !aspects) return;
      var w = (name === 'Jupiter') ? (hits ? 0.9 : 0.5)
            : (name === 'Saturn') ? (hits ? -0.5 : -0.3)
            : (hits ? -0.4 : -0.2);
      score += w;
      bits.push(D.GRAHAS[name].dev + ' is transiting ' + rashi(sign).n + ', ' +
        (hits ? 'right through' : 'casting drishti on') + ' this house' +
        (name === 'Jupiter' ? ' - an opening window, and the clearest reason to act rather than wait.'
         : name === 'Saturn' ? ' - which slows the timeline but makes whatever survives permanent.'
         : ' - expect the unconventional route to work better than the official one.'));
    });

    // Sade Sati / dhaiya from the natal Moon
    var satSign = K.signOf(A.siderealLongitude('Saturn', jdNow));
    var fromMoon = K.houseFrom(chart.moonSign, satSign);
    var sade = null;
    if ([12,1,2].indexOf(fromMoon) >= 0) {
      sade = fromMoon === 12 ? 'the rising phase' : fromMoon === 1 ? 'the peak phase' : 'the closing phase';
      score -= 0.6;
      bits.push('Shani is in the ' + ORD[fromMoon] + ' from your natal Moon - you are in ' + sade +
        ' of Sade Sati. It is not a curse; it is a stripping-back. What is not truly yours is being removed.');
    } else if ([4,8].indexOf(fromMoon) >= 0) {
      score -= 0.35;
      bits.push('Shani sits ' + ORD[fromMoon] + ' from your natal Moon - the Dhaiya, a shorter two-and-a-half-year squeeze on energy and confidence.');
    }
    if (!bits.length) {
      bits.push('No slow-moving graha is touching this house at the moment, so the matter runs on its natal strength alone - what you see now is the baseline, not a passing phase.');
    }
    return { score: score, text: bits.join(' '), sade: sade, satFromMoon: fromMoon };
  }

  /* ---------- verdict banding -------------------------------------------- */

  function band(score) {
    if (score >= 2.2)  return { key:'strong',   label:'Strongly favourable', cls:'v-favor' };
    if (score >= 0.6)  return { key:'favor',    label:'Favourable',          cls:'v-favor' };
    if (score >= -0.6) return { key:'mixed',    label:'Mixed',               cls:'v-neutral' };
    if (score >= -2.2) return { key:'caution',  label:'Needs caution',       cls:'v-caution' };
    return { key:'hard', label:'Challenging', cls:'v-caution' };
  }

  var OPENERS = {
    career: {
      strong:'The chart is unambiguous here: your work life is built to rise, and this is a period to push rather than protect.',
      favor:'Your work is supported. Not effortlessly - but the structure is sound and effort converts.',
      mixed:'Your career carries genuine talent and a genuine drag, roughly in balance. Outcome depends on which one you feed.',
      caution:'Work is where your chart asks for patience. Progress is real, but it is earned late and rarely acknowledged on time.',
      hard:'This is the hard ground of your chart. Recognition comes, but only well after the effort - and never from the direction you expect.'
    },
    money: {
      strong:'Wealth is a strength in this chart. Money finds you through more than one channel, and it stays.',
      favor:'Your resources are steady and building. The gains are unspectacular and reliable - which is how wealth is actually made.',
      mixed:'Money comes and money goes here in almost equal measure. Your chart rewards systems, not windfalls.',
      caution:'The chart asks you to be conservative with money for now. Income is workable; retention is the weak link.',
      hard:'Finances are the pressure point. Avoid leverage and lending in this phase - your chart repays caution generously.'
    },
    love: {
      strong:'Partnership is one of the strongest things in your chart. You are built to be met, and you will be.',
      favor:'Love is well-supported here. The relationship that lasts arrives through ordinary life, not drama.',
      mixed:'Your seventh house holds both warmth and difficulty. Whether it becomes union or repetition depends on what you stop tolerating.',
      caution:'Relationships ask for maturity from you before they give ease. Expect delay before, not instead of, arrival.',
      hard:'This is where your chart demands the most growth. Partnership is possible, but only after you stop trying to earn it.'
    },
    education: {
      strong:'Learning is a natural gift here - your mind is the best asset the chart contains.',
      favor:'Studies are supported. Consistency beats intensity for you, and results land where you expect them.',
      mixed:'Your intelligence is not in doubt; your focus is. The chart rewards structure far more than ability here.',
      caution:'Education carries obstacles - interruptions, changed plans, a longer route. It does complete; it just does not go straight.',
      hard:'The academic path is stony in this chart. The knowledge arrives, but through unconventional means rather than institutions.'
    },
    health: {
      strong:'Vitality is a genuine strength. Your constitution recovers faster than most.',
      favor:'Health is well-placed. The main risk to it is neglect rather than weakness.',
      mixed:'Your energy runs hot and cold. The chart points to nervous and digestive strain more than anything structural.',
      caution:'The chart asks you to take the body seriously now rather than later. Small disciplines prevent large corrections.',
      hard:'Health needs active management in this period - sleep, food and stress in that order. This is prevention, not prophecy.'
    },
    travel: {
      strong:'Distance agrees with you. Foreign ground is where this chart genuinely opens.',
      favor:'Movement is supported. A change of place changes your luck more than a change of effort would.',
      mixed:'Travel gives and takes here in equal measure. Go for a reason, not to escape one.',
      caution:'Relocation carries friction in this phase - paperwork, delay, a false start before the real one.',
      hard:'The chart resists forced relocation right now. When it opens, it will open suddenly and without your pushing.'
    },
    family: {
      strong:'Home is your foundation and your fortune. What you build there radiates into everything else.',
      favor:'Domestic life is supported. Family is a source of strength rather than obligation for you.',
      mixed:'Home holds both comfort and a long-running knot. The chart favours honesty over harmony here.',
      caution:'Family asks patience of you now. Do not force resolution - hold the relationship and let time do the work.',
      hard:'Domestic ground is where your chart carries its old weight. Distance, sometimes physical, is not failure here.'
    },
    timing: {
      strong:'The timing is with you. This is one of those rare windows where acting early beats acting perfectly.',
      favor:'The window is open. Not wide, and not forever - but open. Move deliberately in the next few months.',
      mixed:'The timing is genuinely balanced, which usually means: begin small, reversibly, and let the result decide.',
      caution:'The chart says wait, but not idly. Prepare now, commit later - the conditions change in your favour.',
      hard:'This is not the moment to commit. Everything you set up now will need redoing. Build quietly instead.'
    }
  };

  /* ---------- the answer -------------------------------------------------- */

  function detectDomain(text) {
    if (!text) return null;
    var t = ' ' + text.toLowerCase().replace(/[^a-z ]/g, ' ') + ' ';
    var best = null, bestHits = 0;
    D.DOMAINS.forEach(function (dom) {
      var hits = 0;
      dom.keywords.forEach(function (k) { if (t.indexOf(' ' + k) >= 0) hits++; });
      if (hits > bestHits) { bestHits = hits; best = dom; }
    });
    return bestHits > 0 ? best : null;
  }

  /* ---- classical depth layer: navamsa, ashtakavarga, shadbala, doshas ---- */

  function depthLayer(chart, houseNum, karakas) {
    var J = root.Jyotish;
    if (!J || !chart.deep) return { score: 0, bits: [] };
    var bits = [], score = 0;
    var h = chart.houses[houseNum - 1];
    var lord = chart.byName[h.lord];

    // 1. how the house lord survives into the navamsa
    var d9 = J.VARGAS.D9(lord.lon);
    var d9dig = K.dignityOf(lord.name, d9 * 30 + 15);
    var isVarg = chart.deep.vargottama.indexOf(lord.name) >= 0;
    if (isVarg) {
      score += 1.0;
      bits.push({ w: 1.0, t: D.GRAHAS[lord.name].dev + ' is vargottama - it holds the same rashi in ' +
        'both your D-1 and D-9. Whatever this house promises, it actually delivers; vargottama is the ' +
        'single clearest sign that a placement is not merely cosmetic.' });
    } else {
      var w = d9dig.score * 0.5;
      score += w;
      bits.push({ w: w, t: 'In the Navamsa (D-9), the chart that shows whether a promise matures, ' +
        D.GRAHAS[lord.name].dev + ' moves to ' + rashi(d9).n + ' - ' + d9dig.label.toLowerCase() +
        '. ' + (d9dig.score > 0
          ? 'It strengthens after marriage and in the second half of life.'
          : 'It weakens in the D-9, so early promise here needs deliberate maintenance to hold.') });
    }

    // 2. ashtakavarga bindus in this house's sign
    var bindus = chart.deep.av.sav[h.sign];
    var bw = (bindus - 28) * 0.12;
    score += bw;
    bits.push({ w: bw, t: 'Sarvashtakavarga gives this house ' + bindus + ' bindus out of a possible 56. ' +
      (bindus >= 30 ? 'Above 28 is a supported house - transits through it tend to produce results.'
       : bindus >= 25 ? 'That is around the average of 28, so outcomes here track your effort rather than luck.'
       : 'Below 25 bindus is a thin house - it needs stronger transits than most people to move.') });

    // 3. shadbala of the lord
    var sb = chart.deep.bala[lord.name];
    if (sb) {
      var rw = (sb.ratio - 1) * 0.7;
      score += rw;
      bits.push({ w: rw, t: D.GRAHAS[lord.name].dev + ' has ' + sb.rupas.toFixed(2) +
        ' rupas of Shadbala against the ' + (sb.required / 60).toFixed(2) + ' its class requires - ' +
        (sb.ratio >= 1 ? 'above the threshold, so it can act on its own initiative.'
                       : 'below the threshold, so it depends on transits and dasha to be effective.') });
    }
    return { score: score, bits: bits };
  }

  function doshaLayer(chart, domId) {
    if (!chart.deep) return { score: 0, bits: [] };
    var relevant = { love: ['manglik','kaalsarpa'], family: ['manglik','pitra'],
                     career: ['sadesati','kaalsarpa'], money: ['sadesati','kaalsarpa'],
                     health: ['sadesati','dhaiya'], timing: ['sadesati','kaalsarpa'],
                     travel: ['kaalsarpa'], education: ['kaalsarpa','dhaiya'] }[domId] || [];
    var bits = [], score = 0;
    chart.deep.doshas.forEach(function (d) {
      var key = d.key.replace('-partial', '');
      if (relevant.indexOf(key) < 0) return;
      var w = d.severity === 'high' ? -0.9 : d.severity === 'moderate' ? -0.5
            : d.severity === 'mitigated' ? -0.15 : -0.25;
      score += w;
      bits.push({ w: w, t: d.name + ': ' + d.t });
    });
    return { score: score, bits: bits };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* Band a score already normalised to -1..+1 */
  function bandNorm(v) {
    if (v >= 0.45)  return { key:'strong',  label:'Strongly favourable', cls:'v-favor' };
    if (v >= 0.15)  return { key:'favor',   label:'Favourable',          cls:'v-favor' };
    if (v >= -0.15) return { key:'mixed',   label:'Mixed',               cls:'v-neutral' };
    if (v >= -0.45) return { key:'caution', label:'Needs caution',       cls:'v-caution' };
    return { key:'hard', label:'Challenging', cls:'v-caution' };
  }

  function answerQuestion(chart, domainId, questionText, jdNow) {
    var dom = D.DOMAINS.filter(function (x) { return x.id === domainId; })[0];
    var detected = detectDomain(questionText);
    var usedDetection = false;
    if (!dom && detected) { dom = detected; usedDetection = true; }
    if (!dom) dom = D.DOMAINS[7];

    var primary = evaluateHouse(chart, dom.houses[0], dom.karakas, jdNow);
    var support = dom.houses.slice(1).map(function (hn) {
      return evaluateHouse(chart, hn, [], jdNow);
    });
    var dash = dashaLayer(chart, dom.houses[0], dom.karakas, jdNow);
    var tran = transitLayer(chart, dom.houses[0], jdNow);
    var deep = depthLayer(chart, dom.houses[0], dom.karakas);
    var dsh = doshaLayer(chart, dom.id);

    var total = primary.score + dash.score + tran.score + deep.score + dsh.score +
      support.reduce(function (s, x) { return s + x.score * 0.3; }, 0);

    /* One combined verdict, not two competing ones. The detailed Parashari
       working and the independent multi-system vote are weighted equally, so
       the headline sentence and the badge can never contradict each other. */
    var F = root.Forecast;
    var tl = F ? F.timeline(chart, dom, jdNow, 72) : null;
    var cons = F ? F.consensus(chart, dom, jdNow) : null;
    var detailNorm = clamp(total / 3, -1, 1);
    var combined = cons ? (detailNorm * 0.5 + cons.merged * 0.5) : detailNorm;
    var b = cons ? bandNorm(combined) : band(total);
    var summary = (F && tl && cons)
      ? { plain: F.plain(dom, b, tl, cons), timeline: tl, consensus: cons,
          combined: combined, detailScore: total }
      : null;

    // weakest planet in the picture drives the remedy
    var involved = [primary.lord.name].concat(dom.karakas)
      .concat(primary.house.occupants.map(function (o) { return o.name; }));
    var weakest = involved.reduce(function (acc, n) {
      var p = chart.byName[n];
      return (!acc || p.dignity.score < acc.dignity.score) ? p : acc;
    }, null);

    return {
      domain: dom, usedDetection: usedDetection, question: questionText || '',
      verdict: b, score: total,
      summary: summary,
      opener: OPENERS[dom.id][b.key],
      evidence: primary.evidence.filter(function (e) { return e.t; }),
      depth: deep.bits, doshaBits: dsh.bits,
      supportText: supportSentence(chart, dom, support),
      dashaText: dash.text, transitText: tran.text,
      timing: timingSentence(chart, dash.d, jdNow),
      remedy: weakest ? { planet: weakest.name, text: REMEDIES[weakest.name] } : null
    };
  }

  function supportSentence(chart, dom, support) {
    if (!support.length) return '';
    return support.map(function (s) {
      return 'Your ' + ORD[s.house.num] + ' (' + s.house.rashi.n + ') supports this and is ruled by ' +
        D.GRAHAS[s.lord.name].dev + ' from the ' + ORD[s.lord.house] + ', ' + dig(s.lord) + '.';
    }).join(' ');
  }

  function timingSentence(chart, d, jdNow) {
    if (!d || !d.antar) return 'Timing cannot be narrowed without a firmer dasha window.';
    var end = A.fromJD(d.antar.end);
    var mEnd = A.fromJD(d.maha.end);
    var next = d.antarList.filter(function (s) { return s.start >= d.antar.end; })[0];
    var s = 'The current ' + D.GRAHAS[d.antar.lord].dev + ' sub-period runs to ' +
      MONTH_NAMES[end.m - 1] + ' ' + end.y + '. ';
    if (next) {
      s += 'After that ' + D.GRAHAS[next.lord].dev + ' takes over, which shifts the texture of this matter noticeably. ';
    }
    s += 'The wider ' + D.GRAHAS[d.maha.lord].dev + ' chapter closes in ' + mEnd.y + '.';
    return s;
  }

  /* ---------- monthly prediction ------------------------------------------ */

  function monthlyReading(chart, jdNow) {
    var now = A.fromJD(jdNow);
    var monthStart = A.toJD(now.y, now.m, 1);
    var daysInMonth = new Date(Date.UTC(now.y, now.m, 0)).getUTCDate();
    var monthEnd = A.toJD(now.y, now.m, daysInMonth, 23, 59);

    var pan = K.panchang(jdNow, chart.birth.tz);
    var score = 0, layers = [];

    /* --- layer 1: Vedic gochara from the natal Moon --- */
    var gocharaBits = [];
    ['Jupiter','Saturn','Rahu','Sun'].forEach(function (name) {
      var sign = K.signOf(A.siderealLongitude(name, jdNow));
      var h = K.houseFrom(chart.moonSign, sign);
      var good = GOCHARA_GOOD[name].indexOf(h) >= 0;
      var w = (name === 'Jupiter' ? 1.1 : name === 'Saturn' ? 0.9 : 0.55) * (good ? 1 : -1);
      score += w;
      gocharaBits.push(D.GRAHAS[name].dev + ' transits ' + rashi(sign).n + ', the ' + ORD[h] +
        ' from your Chandra rashi - ' + (good ? 'a supportive gochara' : 'an unsupportive gochara') + '.');
    });
    var tran = transitLayer(chart, 1, jdNow);

    // Ashtakavarga weights the same transit differently for different people
    if (chart.deep) {
      var jupSign = K.signOf(A.siderealLongitude('Jupiter', jdNow));
      var satSign = K.signOf(A.siderealLongitude('Saturn', jdNow));
      var jb = chart.deep.av.sav[jupSign], sb2 = chart.deep.av.sav[satSign];
      score += (jb - 28) * 0.09 + (sb2 - 28) * 0.06;
      gocharaBits.push('In your Sarvashtakavarga, ' + rashi(jupSign).n + ' carries ' + jb +
        ' bindus and ' + rashi(satSign).n + ' carries ' + sb2 + ' (28 is average). ' +
        'The same transit lands differently on different charts, and this is the number that says how.');
    }

    layers.push({
      key:'vedic', title:'Vedic sky', icon:'🕉',
      text: gocharaBits.join(' ') + (tran.sade ? ' ' + tran.text : '')
    });

    var dash = K.dashaAt(chart.dasha, jdNow);
    if (dash) {
      var mp = chart.byName[dash.maha.lord], ap = dash.antar ? chart.byName[dash.antar.lord] : null;
      score += mp.dignity.score * 0.5 + (ap ? ap.dignity.score * 0.4 : 0);
      layers.push({
        key:'dasha', title:'Your running dasha', icon:'⧗',
        text:'This month falls inside your ' + D.GRAHAS[dash.maha.lord].dev + ' mahadasha' +
          (ap ? ' and ' + D.GRAHAS[ap.name].dev + ' antardasha' : '') + '. ' +
          D.GRAHAS[dash.maha.lord].dev + ' is ' + dig(mp) + ' in your ' + ORD[mp.house] +
          (ap ? ', and ' + D.GRAHAS[ap.name].dev + ' is ' + dig(ap) + ' in your ' + ORD[ap.house] : '') +
          ' - that pairing is the real background music of the month.'
      });
    }

    /* --- layer 2: Hindu calendar --- */
    var nextNew = A.fromJD(pan.nextNew + chart.birth.tz / 24);
    var nextFull = A.fromJD(pan.nextFull + chart.birth.tz / 24);
    layers.push({
      key:'hindu', title:'Hindu calendar', icon:'☾',
      text:'You are in ' + pan.monthName + ' maasa, ' + pan.paksha + ' paksha, ' + pan.tithiName +
        ' tithi, under ' + pan.nakName + ' nakshatra and ' + pan.yogaName + ' yoga. The ritu is ' +
        pan.ritu.n + ' (' + pan.ritu.w + '). Vikram Samvat ' + pan.vikram + ', Shaka ' + pan.shaka +
        '. The coming Purnima falls on ' + fmtShort(nextFull) + ' and the Amavasya on ' + fmtShort(nextNew) +
        ' - the two hinges of the month.'
    });

    /* --- layer 3: Chinese --- */
    var natalCn = K.chinesePillars(chart.birth.y, chart.birth.m, chart.birth.d,
                                   chart.birth.hh, chart.birth.mm, chart.birth.tz);
    var nowCn = K.chinesePillars(now.y, now.m, now.d, 12, 0, chart.birth.tz);
    var rel = K.animalRelation(natalCn.animalIdx, nowCn.animalIdx);
    var mrel = K.animalRelation(natalCn.animalIdx, nowCn.monthBranchIdx);
    score += rel.score + mrel.score * 0.5;
    layers.push({
      key:'chinese', title:'Chinese zodiac', icon:'龍',
      text:'You were born in the year of the ' + natalCn.element.n + ' ' + natalCn.animal.n +
        ' (' + natalCn.polarity + '). ' + natalCn.animal.t + '. We are currently in the ' +
        nowCn.element.n + ' ' + nowCn.animal.n + ' year - against your ' + natalCn.animal.n +
        ' that is ' + rel.t + '. This solar month belongs to the ' + nowCn.monthAnimal.n +
        ', which against your sign reads as ' + mrel.t + '. The year element, ' + nowCn.element.n +
        ', favours ' + nowCn.element.t + '.'
    });

    /* --- layer 4: Western / English calendar --- */
    var sunTrop = A.tropicalLongitude('Sun', jdNow);
    var westSign = K.signOf(sunTrop);
    var mercRetro = A.isRetrograde('Mercury', jdNow);
    var westHouse = K.houseFrom(chart.lagnaSign, K.signOf(A.siderealLongitude('Sun', jdNow)));
    score += mercRetro ? -0.5 : 0.2;
    layers.push({
      key:'west', title:'Western transits', icon:'☉',
      text:'Through ' + MONTH_NAMES[now.m - 1] + ' ' + now.y + ' the tropical Sun moves through ' +
        rashi(westSign).w + ', lighting your ' + ORD[westHouse] + ' house sidereally - so ' +
        houseTheme(westHouse) + ' is where your visible energy goes this month. The Moon stands at ' +
        Math.round(pan.illum * 100) + '% illumination, in its ' + pan.phaseName + ' phase. ' +
        (mercRetro
          ? 'Budh is retrograde: re-check contracts, travel bookings and anything you sign in haste.'
          : 'Budh is direct, so communication, paperwork and negotiation run clean this month.')
    });

    var b = band(score / 2.2);

    return {
      month: MONTH_NAMES[now.m - 1] + ' ' + now.y,
      y: now.y, mNum: now.m, daysInMonth: daysInMonth,
      firstWeekday: ((Math.floor(monthStart + 0.5) % 7) + 7 + 1) % 7,
      verdict: b, score: score,
      panchang: pan, chinese: nowCn, natalChinese: natalCn,
      layers: layers,
      synthesis: synthesise(chart, b, pan, nowCn, natalCn, rel, dash),
      days: dayGrid(chart, monthStart, daysInMonth, now)
    };
  }

  var HOUSE_THEMES = ['','self and body','money and speech','courage and siblings','home and mother',
    'creativity and children','work, health and rivals','partnership','upheaval and inheritance',
    'fortune and belief','career and standing','gains and networks','costs, sleep and letting go'];
  function houseTheme(h) { return HOUSE_THEMES[h]; }

  function fmtShort(d) { return d.d + ' ' + MONTH_NAMES[d.m - 1].slice(0, 3); }

  function synthesise(chart, b, pan, nowCn, natalCn, rel, dash) {
    var parts = [];
    parts.push('Three calendars agree on the shape of this month more than they disagree.');
    if (b.key === 'strong' || b.key === 'favor') {
      parts.push('The Vedic gochara is broadly with you, the ' + nowCn.animal.n + ' year is ' +
        (rel.score > 0 ? 'friendly to' : 'neutral toward') + ' your ' + natalCn.animal.n +
        ', and the lunar month of ' + pan.monthName + ' supports beginnings in its Shukla half.');
      parts.push('Act in the first half of the lunar fortnight, put the important conversation in a Sampat or Mitra window from the list below, and do not wait for perfect conditions - they are already good enough.');
    } else if (b.key === 'mixed') {
      parts.push('The Vedic and Chinese readings pull in different directions this month, which is why it may feel like effort without traction.');
      parts.push('Use the favourable dates below deliberately rather than working evenly across the month - concentration beats consistency here.');
    } else {
      parts.push('The transits are asking for consolidation rather than expansion, and the ' + nowCn.animal.n +
        ' year ' + (rel.score < 0
          ? 'sits at an awkward angle to your ' + natalCn.animal.n
          : rel.score > 0.8
            ? 'is at least friendly to your ' + natalCn.animal.n + ', which softens it'
            : 'is neutral toward your ' + natalCn.animal.n + ', so it neither helps nor hinders') + '.');
      parts.push('Protect what exists, close what is finished, and postpone launches to a stronger window. Nothing here is permanent - Shani and Guru both move on.');
    }
    if (dash) {
      parts.push('Underneath all of it, the ' + D.GRAHAS[dash.maha.lord].dev + ' mahadasha keeps setting the theme, and that is a multi-year current, not a monthly one.');
    }
    return parts.join(' ');
  }

  /* ---------- per-day scoring for the month -------------------------------- */

  function dayGrid(chart, monthStartJD, daysInMonth, now) {
    var out = [];
    for (var i = 0; i < daysInMonth; i++) {
      var jd = monthStartJD + i + (9 - chart.birth.tz) / 24;   // ~09:00 local
      var p = K.panchang(jd, chart.birth.tz);
      var s = 0, notes = [];

      var tara = K.taraBala(chart.moonNak, p.nak);
      s += tara.info.good ? 1.5 : (tara.info.n === 'Vadha' ? -1.5 : tara.info.n === 'Janma' ? -0.8 : -1.1);
      notes.push(tara.info.n);

      var cb = K.chandraBala(chart.moonSign, p.moonSign);
      s += cb.good ? 1.0 : -0.8;

      var tn = p.tithiNum;
      if ([4, 9, 14].indexOf(tn) >= 0) { s -= 0.8; notes.push('Rikta tithi'); }
      else if (tn === 11) { s += 0.3; notes.push('Ekadashi'); }
      else if ([5, 10, 13].indexOf(tn) >= 0) s += 0.4;
      if (p.tithiName === 'Purnima') { s -= 0.2; notes.push('Purnima'); }
      if (p.tithiName === 'Amavasya') { s -= 0.4; notes.push('Amavasya'); }
      s += (p.paksha === 'Shukla') ? 0.3 : -0.2;

      var moonLord = rashi(chart.moonSign).lord;
      var r = K.relation(moonLord, p.vara.lord);
      if (r === 'friend' || r === 'own') s += 0.3; else if (r === 'enemy') s -= 0.3;

      out.push({
        day: i + 1, jd: jd, score: s,
        tara: tara.info, chandra: cb, panchang: p, notes: notes,
        isToday: (i + 1) === now.d
      });
    }
    var sorted = out.slice().sort(function (a, b) { return b.score - a.score; });
    return {
      all: out,
      best: sorted.slice(0, 5).sort(function (a, b) { return a.day - b.day; }),
      worst: sorted.slice(-3).sort(function (a, b) { return a.day - b.day; })
    };
  }

  root.Reading = {
    answerQuestion: answerQuestion, detectDomain: detectDomain,
    monthlyReading: monthlyReading, band: band, evaluateHouse: evaluateHouse,
    ORD: ORD, MONTH_NAMES: MONTH_NAMES, REMEDIES: REMEDIES, houseTheme: houseTheme
  };
})(window);
