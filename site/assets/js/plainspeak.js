/* ============================================================================
   plainspeak.js - says the same thing, in English.

   The classical layer is accurate but unreadable unless you already know what
   a dusthana or a karaka is. This module takes the same computed facts and
   writes them the way one person explains something to another: what is going
   on, why the chart says so, and what to actually do. The Sanskrit version
   still exists underneath for anyone who wants it.

   Nothing here invents a claim. Every sentence is a translation of a value
   that jyotish.js / kundli.js / forecast.js already computed.
============================================================================ */
(function (root) {
  'use strict';

  var A = root.Astro, K = root.Kundli, D = root.VData;

  /* ---------- vocabulary ------------------------------------------------ */

  // what each house is actually about, in words people use
  var HOUSE_LONG = ['',
    'you yourself — your body, your temperament, the way you come across',
    'the money you keep and the family you speak for',
    'courage, siblings and the short hops of ordinary life',
    'home, your mother, and peace of mind',
    'children, romance, study and anything you make',
    'daily grind — workload, health, debts and rivals',
    'marriage and every close partnership, business ones included',
    'upheaval, other people\'s money, and what you inherit',
    'luck, belief, your father, and long journeys',
    'your career and your standing in public',
    'income, gains, and the people who bring them',
    'costs, sleep, foreign places, and what you have to let go of'
  ];
  var HOUSE_SHORT = ['', 'yourself', 'money', 'courage and siblings', 'home',
    'children and creativity', 'daily workload and health', 'marriage',
    'upheaval and shared money', 'luck and belief', 'career',
    'income and gains', 'costs and letting go'];

  var PLANET = {
    Sun:     { n:'the Sun',  role:'confidence, authority and your father' },
    Moon:    { n:'the Moon', role:'your mind, your moods and your mother' },
    Mars:    { n:'Mars',     role:'drive, courage and appetite for a fight' },
    Mercury: { n:'Mercury',  role:'thinking, speech, trade and paperwork' },
    Jupiter: { n:'Jupiter',  role:'growth, luck, teachers and good faith' },
    Venus:   { n:'Venus',    role:'love, comfort, beauty and easy money' },
    Saturn:  { n:'Saturn',   role:'discipline, delay, and work that pays slowly' },
    Rahu:    { n:'Rahu',     role:'obsession, shortcuts and sudden change' },
    Ketu:    { n:'Ketu',     role:'detachment, and the things you quietly drop' }
  };

  var DIG_LONG = {
    'Exalted':        'as strong as it can possibly be there',
    'Moolatrikona':   'very comfortable there',
    'Own sign':       'on home ground there',
    "Friend's sign":  'comfortable there',
    'Neutral sign':   'neither helped nor hindered there',
    "Enemy's sign":   'uncomfortable there — it has to work harder for the same result',
    'Debilitated':    'at its weakest there — it delivers late, and only if you push'
  };
  var DIG_SHORT = {
    'Exalted':'very strong', 'Moolatrikona':'strong', 'Own sign':'strong',
    "Friend's sign":'comfortable', 'Neutral sign':'average',
    "Enemy's sign":'strained', 'Debilitated':'weak'
  };

  function houseTypeLine(h) {
    if ([1,4,7,10].indexOf(h) >= 0)
      return 'That is one of the four load-bearing parts of a chart, so there is real structure holding it up.';
    if ([5,9].indexOf(h) >= 0)
      return 'That is one of the two lucky parts of a chart — help here tends to arrive without you forcing it.';
    if ([6,8,12].indexOf(h) >= 0)
      return 'That is one of the three difficult parts of a chart. Progress is real but it costs more than it should, and it rarely arrives on schedule.';
    if (h === 11) return 'That is the house of gains, so results do land — just slowly.';
    return 'That is a supporting part of the chart: steady rather than dramatic.';
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  // drop the capital when a connective now runs in front of the sentence
  function lowerFirst(s, doIt) { return doIt ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function pct(x) { return Math.round(x * 100) + '%'; }

  var SUBJECT = {
    career: 'your working life', money: 'your money', love: 'your marriage and close partnerships',
    education: 'your studies', health: 'your health', travel: 'moving or going abroad',
    family: 'your home and family', timing: 'the decision you are weighing'
  };

  /* ---------- the explanation ------------------------------------------- */

  function explain(chart, dom, jdNow, band, tl, cons) {
    var house = dom.houses[0];
    var h = chart.houses[house - 1];
    var lord = chart.byName[h.lord];
    var L = PLANET[lord.name];
    var subject = SUBJECT[dom.id] || 'this';
    // name the area every time: the narrative has just been talking about a
    // DIFFERENT part of the chart (where the ruler sits), so 'this part'
    // would be ambiguous exactly where clarity matters most
    var area = 'your ' + HOUSE_SHORT[house] + ' area';

    /* --- narrative: three sentences, no jargon --- */
    var narrative = [];
    // phrased so the planet is the subject: some area names are plural
    // ("your marriage and close partnerships") and would break agreement
    narrative.push('In your chart, ' + L.n + ' is the planet in charge of ' + subject +
      ' — ' + L.role + '.');

    // a strong planet in a hard house, or a weak one in a good house, needs a
    // connective or the two halves read as a contradiction
    var strong = lord.dignity.score > 0, weak = lord.dignity.score < 0;
    var hardHouse = [6,8,12].indexOf(lord.house) >= 0;
    var goodHouse = [1,4,5,7,9,10].indexOf(lord.house) >= 0;
    // only bridge when the two halves genuinely pull against each other
    var joiner = (strong && hardHouse) ? 'Even so, ' : (weak && goodHouse) ? 'In its favour, ' : '';
    narrative.push(cap(L.n) + ' sits in the part of your chart that governs ' +
      HOUSE_SHORT[lord.house] + ', and it is ' + DIG_LONG[lord.dignity.label] + '. ' +
      joiner + lowerFirst(houseTypeLine(lord.house), !!joiner));

    var d = K.dashaAt(chart.dasha, jdNow);
    if (d) {
      var M = PLANET[d.maha.lord], Aa = d.antar ? PLANET[d.antar.lord] : null;
      var ae = d.antar ? A.fromJD(d.antar.end) : null;
      var s = 'Life runs in long chapters, each named after a planet. You are in a ' + M.n +
        ' chapter' + (Aa ? ', and inside it a shorter ' + Aa.n + ' phase that lasts until ' +
        monthYear(ae) : '') + '.';
      var owns = (h.lord === d.maha.lord) || (d.antar && h.lord === d.antar.lord);
      if (owns) s += ' Since that same planet runs ' + subject + ', this whole stretch is genuinely about it — not a passing mood.';
      else s += ' Neither planet has much to do with ' + subject + ' directly, so this area is moving in the background while something else takes the foreground.';
      narrative.push(s);
    }

    /* --- why: plain bullets, each signed so the UI can colour it --- */
    var why = [];

    h.occupants.forEach(function (o) {
      var P = PLANET[o.name];
      var good = D.GRAHAS[o.name].nature === 'Benefic';
      why.push({ w: good ? 1 : -1,
        t: cap(P.n) + ' — ' + P.role + ' — sits directly in ' + area + ', ' +
           DIG_LONG[o.dignity.label] + '. ' +
           (good ? 'That is a helpful presence.' : 'That adds friction you will actually feel.') });
    });
    if (!h.occupants.length) {
      why.push({ w: 0, t: 'No planet sits in ' + area + ', so ' + L.n +
        ' carries the whole story by itself.' });
    }

    var ben = h.aspecting.filter(function (p) { return D.GRAHAS[p.name].nature === 'Benefic'; });
    var mal = h.aspecting.filter(function (p) { return D.GRAHAS[p.name].nature === 'Malefic'; });
    if (ben.length) {
      why.push({ w: 1, t: nameList(ben) + ' ' + (ben.length > 1 ? 'watch' : 'watches') +
        ' over ' + area + ' from elsewhere in the chart — quiet protection you tend not to notice until you need it.' });
    }
    if (mal.length) {
      why.push({ w: -1, t: nameList(mal) + ' also ' + (mal.length > 1 ? 'press' : 'presses') +
        ' on ' + area + ' from elsewhere in the chart. The pressure you feel here is real, not imagined.' });
    }

    if (chart.deep) {
      var bindu = chart.deep.av.sav[h.sign];
      why.push({ w: bindu >= 30 ? 1 : bindu <= 25 ? -1 : 0,
        t: 'On the support scale, ' + area + ' scores ' + bindu + ' out of 56, where 28 is average. ' +
           (bindu >= 30 ? 'Above average, so when a good planet passes through here it actually pays off.'
            : bindu <= 25 ? 'Below average, so this area needs a stronger push than most people\'s to move at all.'
            : 'About average, so outcomes here track your effort rather than luck.') });

      var vargottama = chart.deep.vargottama.indexOf(lord.name) >= 0;
      var d9 = root.Jyotish.VARGAS.D9(lord.lon);
      var d9dig = K.dignityOf(lord.name, d9 * 30 + 15);
      why.push({ w: vargottama ? 1 : (d9dig.score > 0 ? 1 : -1),
        t: 'There is a second chart astrologers check to see whether a promise actually matures. ' +
           (vargottama
             ? cap(L.n) + ' holds the same position in both. That is the strongest confirmation a placement can get — what this promises, it delivers.'
             : 'In it, ' + L.n + ' is ' + DIG_SHORT[d9dig.label] + '. ' +
               (d9dig.score > 0 ? 'So this holds up over time, and tends to improve in the second half of life.'
                                : 'So early promise here needs deliberate maintenance — it does not hold by itself.')) });

      var sb = chart.deep.bala[lord.name];
      if (sb) {
        why.push({ w: sb.ratio >= 1 ? 1 : -1,
          t: 'Measured overall, ' + L.n + ' is running at ' + pct(sb.ratio) +
             ' of the strength its class needs. ' +
             (sb.ratio >= 1 ? 'It is strong enough to act on its own.'
                            : 'It is short of that, so it depends on good timing rather than acting under its own steam.') });
      }
    }

    // live transits, in plain words
    ['Jupiter','Saturn'].forEach(function (name) {
      var sign = K.signOf(A.siderealLongitude(name, jdNow));
      var rel = K.houseFrom(h.sign, sign);
      if (rel !== 1) return;
      why.push({ w: name === 'Jupiter' ? 1 : -1,
        t: cap(PLANET[name].n) + ' is passing through ' + area + ' right now. ' +
           (name === 'Jupiter'
             ? 'That is the clearest single reason to move rather than wait — it does not stay long.'
             : 'That slows everything down, but whatever survives it tends to be permanent.') });
    });

    var satSign = K.signOf(A.siderealLongitude('Saturn', jdNow));
    var fromMoon = K.houseFrom(chart.moonSign, satSign);
    if ([12,1,2].indexOf(fromMoon) >= 0) {
      why.push({ w: -1, t: 'You are in the seven-and-a-half year stretch of Saturn that Indian families call Sade Sati. ' +
        'It is not a curse. It is a clear-out: what was never really yours gets taken away, and what is left is solid.' });
    }

    if (chart.deep) {
      chart.deep.doshas.forEach(function (x) {
        if (x.key.indexOf('manglik') === 0 && (dom.id === 'love' || dom.id === 'family')) {
          why.push({ w: x.severity === 'mitigated' ? 0 : -1,
            t: 'Your chart carries what people call Manglik. In plain terms it means Mars sits where it ' +
               'pushes heat and impatience into close relationships. ' +
               (x.severity === 'mitigated'
                 ? 'In your case the classical conditions that cancel it are present, so it is mild.'
                 : 'Nothing in your chart cancels it, so the traditional advice is to match with someone whose chart has the same placement.') });
        }
      });
    }

    /* --- what to do --- */
    var doing = [];
    var win = tl.best[0] || tl.soonest;
    if (win) {
      doing.push('Aim at ' + win.from + ' – ' + win.to + '. If you can choose when to act, act then; ' +
        'the strongest point inside it is around ' + win.peak + '.');
    }
    if (tl.avoid[0]) {
      doing.push('Do not sign, commit or launch anything you cannot reverse between ' +
        tl.avoid[0].from + ' and ' + tl.avoid[0].to + '. Use that stretch to prepare instead.');
    }

    var involved = [lord.name].concat(dom.karakas);
    var weakest = involved.reduce(function (acc, n) {
      var p = chart.byName[n];
      return (!acc || p.dignity.score < acc.dignity.score) ? p : acc;
    }, null);
    if (weakest) {
      doing.push('The weak link here is ' + PLANET[weakest.name].n + '. ' +
        root.Reading.REMEDIES[weakest.name] +
        ' Treat that as a habit worth building, not a ritual — it is aimed at the part of your life that is actually under strain.');
    }
    if (cons.direction === 'split') {
      doing.push('The methods genuinely disagree on this one. That is a real result, not a failure: ' +
        'it means the outcome is more in your hands than usual, so decide on the practical merits.');
    }

    return { narrative: narrative, why: why, doing: doing };

    function nameList(arr) {
      return arr.map(function (p) { return cap(PLANET[p.name].n); }).join(' and ');
    }
  }

  /* ---------- the month, in English ------------------------------------- */

  var VERDICT_MONTH = {
    strong:  'a strong month for you',
    favor:   'a good month for you',
    mixed:   'a mixed month — some of it helps, some of it pushes back',
    caution: 'a month to move carefully in',
    hard:    'a demanding month'
  };

  function monthPlain(chart, mo, jdNow) {
    var lines = [], doing = [];

    lines.push(mo.month + ' looks like ' + (VERDICT_MONTH[mo.verdict.key] || 'a mixed month') + '.');

    // which of the two slow planets is helping and which is pressing
    var GOOD = { Jupiter:[2,5,7,9,11], Saturn:[3,6,11] };
    var helping = [], pressing = [];
    ['Jupiter','Saturn'].forEach(function (name) {
      var sign = K.signOf(A.siderealLongitude(name, jdNow));
      var rel = K.houseFrom(chart.moonSign, sign);
      (GOOD[name].indexOf(rel) >= 0 ? helping : pressing).push(PLANET[name].n);
    });
    if (helping.length) {
      lines.push(cap(helping.join(' and ')) + ' ' + (helping.length > 1 ? 'are' : 'is') +
        ' working in your favour — that is where the month gives.');
    }
    if (pressing.length) {
      lines.push(cap(pressing.join(' and ')) + ' ' + (pressing.length > 1 ? 'are' : 'is') +
        ' pressing on you — expect the friction to come from ' +
        (pressing.indexOf('Saturn') >= 0 ? 'delay, workload and people who make you wait'
                                         : 'overreach and saying yes to too much') + '.');
    }

    // the Moon's fortnight, without naming it
    lines.push('The Moon is ' + (mo.panchang.paksha === 'Shukla' ? 'filling out' : 'thinning') +
      ' at the moment, which traditionally favours ' +
      (mo.panchang.paksha === 'Shukla' ? 'starting things and asking for what you want'
                                       : 'finishing, clearing and letting go') + '.');

    // Chinese, in one plain line
    var rel = K.animalRelation(mo.natalChinese.animalIdx, mo.chinese.animalIdx);
    var CN = { trine:'a naturally supportive pairing', harmony:'a quietly supportive pairing',
               clash:'a clashing pairing, so expect movement and disruption this year',
               po:'a slightly corrosive pairing, where small things wear at you',
               same:'your own sign year, which is powerful but self-conscious',
               neutral:'a neutral pairing' };
    lines.push('You were born in the year of the ' + mo.natalChinese.animal.n + '. This is the year of the ' +
      mo.chinese.animal.n + ' — ' + (CN[rel.key] || 'a neutral pairing') + '.');

    // days, which is the genuinely actionable part
    var bd = mo.days.best.map(function (d) { return d.day; });
    var wd = mo.days.worst.map(function (d) { return d.day; });
    if (bd.length) {
      doing.push('Your strongest days this month are the ' + listNums(bd) +
        '. Put anything that needs to go well — an interview, a conversation, a signature — on one of those.');
    }
    if (wd.length) {
      doing.push('The ' + listNums(wd) + ' are your flat days. Nothing terrible, but do not start anything ' +
        'on them and do not force a decision.');
    }
    if (mo.layers.some(function (l) { return /retrograde/i.test(l.text); })) {
      doing.push('Mercury is running backwards this month, so re-read contracts, re-confirm travel, ' +
        'and expect messages to be misread. It is a month for checking, not for launching.');
    }
    return { lines: lines, doing: doing };

    function listNums(a) {
      var s = a.map(function (n) { return ordDay(n); });
      return s.length > 1 ? s.slice(0, -1).join(', ') + ' and ' + s[s.length - 1] : s[0];
    }
  }

  function ordDay(n) {
    if (n % 10 === 1 && n !== 11) return n + 'st';
    if (n % 10 === 2 && n !== 12) return n + 'nd';
    if (n % 10 === 3 && n !== 13) return n + 'rd';
    return n + 'th';
  }

  function monthYear(o) {
    var M = ['January','February','March','April','May','June','July','August',
             'September','October','November','December'];
    return M[o.m - 1] + ' ' + o.y;
  }

  root.Plainspeak = {
    explain: explain, monthPlain: monthPlain, PLANET: PLANET, HOUSE_LONG: HOUSE_LONG,
    HOUSE_SHORT: HOUSE_SHORT, DIG_LONG: DIG_LONG, DIG_SHORT: DIG_SHORT
  };
})(window);
