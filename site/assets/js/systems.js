/* ============================================================================
   systems.js - the non-Vedic systems, each from the same birth moment:
     - Western (tropical) chart: signs, element and modality balance, aspects
     - Chinese Four Pillars (BaZi): year, month, day and HOUR pillar
     - Ayurvedic constitution from the birth nakshatra's nadi
============================================================================ */
(function (root) {
  'use strict';

  var A = root.Astro, K = root.Kundli, D = root.VData;

  /* ---------- Western ------------------------------------------------ */

  var WEST_SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio',
                    'Sagittarius','Capricorn','Aquarius','Pisces'];
  var ELEMENT = ['Fire','Earth','Air','Water'];
  var MODALITY = ['Cardinal','Fixed','Mutable'];
  var ASPECT_DEFS = [
    { name:'conjunction', angle:0,   orb:8, tone:'blend' },
    { name:'sextile',     angle:60,  orb:5, tone:'easy' },
    { name:'square',      angle:90,  orb:7, tone:'tense' },
    { name:'trine',       angle:120, orb:7, tone:'easy' },
    { name:'opposition',  angle:180, orb:8, tone:'tense' }
  ];
  var ELEMENT_T = {
    Fire:  'runs on enthusiasm and momentum; loses interest when things slow down',
    Earth: 'trusts what is practical and proven; suspicious of anything that cannot be measured',
    Air:   'lives in ideas and conversation; needs to talk something through to know what it thinks',
    Water: 'feels first and reasons later; reads a room before a word is said'
  };
  var MOD_T = {
    Cardinal: 'starts things', Fixed: 'sustains things', Mutable: 'adapts things'
  };

  function western(chart) {
    var ayan = chart.ayanamsa;
    var bodies = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
    var pos = {};
    bodies.forEach(function (b) {
      var lon = A.norm360(chart.byName[b].lon + ayan);
      pos[b] = { lon: lon, sign: Math.floor(lon / 30), deg: lon % 30 };
    });
    var ascLon = A.norm360(chart.ascLon + ayan);
    pos.Ascendant = { lon: ascLon, sign: Math.floor(ascLon / 30), deg: ascLon % 30 };

    // element and modality balance across Sun, Moon, Asc and the five planets
    var el = { Fire:0, Earth:0, Air:0, Water:0 }, mo = { Cardinal:0, Fixed:0, Mutable:0 };
    var weight = { Sun:2, Moon:2, Ascendant:2 };
    Object.keys(pos).forEach(function (b) {
      var w = weight[b] || 1;
      el[ELEMENT[pos[b].sign % 4]] += w;
      mo[MODALITY[pos[b].sign % 3]] += w;
    });
    var domEl = Object.keys(el).sort(function (a, b) { return el[b] - el[a]; });
    var domMo = Object.keys(mo).sort(function (a, b) { return mo[b] - mo[a]; });

    // natal aspects between the personal points
    var pts = ['Sun','Moon','Ascendant','Mercury','Venus','Mars','Jupiter','Saturn'];
    var aspects = [];
    for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) {
      var sep = Math.abs(A.norm180(pos[pts[i]].lon - pos[pts[j]].lon));
      ASPECT_DEFS.forEach(function (def) {
        var orb = Math.abs(sep - def.angle);
        var lim = def.orb + ((pts[i] === 'Sun' || pts[i] === 'Moon' || pts[j] === 'Sun' || pts[j] === 'Moon') ? 1 : 0);
        if (orb <= lim) aspects.push({ a: pts[i], b: pts[j], name: def.name, tone: def.tone, orb: orb });
      });
    }
    aspects.sort(function (a, b) { return a.orb - b.orb; });

    return {
      pos: pos, signs: WEST_SIGNS,
      sun: WEST_SIGNS[pos.Sun.sign], moon: WEST_SIGNS[pos.Moon.sign], rising: WEST_SIGNS[pos.Ascendant.sign],
      elements: el, modalities: mo,
      dominantElement: domEl[0], weakestElement: domEl[3],
      dominantModality: domMo[0],
      elementText: ELEMENT_T[domEl[0]], modalityText: MOD_T[domMo[0]],
      aspects: aspects.slice(0, 8)
    };
  }

  /* ---------- Chinese Four Pillars ----------------------------------- */

  var HOUR_NAMES = ['Zi (Rat)','Chou (Ox)','Yin (Tiger)','Mao (Rabbit)','Chen (Dragon)','Si (Snake)',
                    'Wu (Horse)','Wei (Goat)','Shen (Monkey)','You (Rooster)','Xu (Dog)','Hai (Pig)'];
  var STEM_EL = ['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
  var STEM_POL = ['Yang','Yin','Yang','Yin','Yang','Yin','Yang','Yin','Yang','Yin'];
  var BRANCH_EL = ['Water','Earth','Wood','Wood','Earth','Fire','Fire','Earth','Metal','Metal','Earth','Water'];

  function fourPillars(birth) {
    var base = K.chinesePillars(birth.y, birth.m, birth.d, birth.hh, birth.mm, birth.tz);

    // hour branch: 23:00-00:59 is Zi, then two-hour blocks
    var hb = Math.floor(((birth.hh + 1) % 24) / 2);
    // hour stem from the day stem: the Five Rats rule
    var dayStemIdx = D.CN_STEMS.indexOf(base.dayStem);
    var hs = ((dayStemIdx % 5) * 2 + hb) % 10;

    var pillars = [
      { key:'year',  label:'Year',  stem: base.stem, branch: D.CN_ANIMALS[base.animalIdx].n,
        stemEl: STEM_EL[D.CN_STEMS.indexOf(base.stem)], pol: STEM_POL[D.CN_STEMS.indexOf(base.stem)],
        branchEl: BRANCH_EL[base.animalIdx], animal: D.CN_ANIMALS[base.animalIdx],
        means: 'ancestry, early environment, how the world first met you' },
      { key:'month', label:'Month', stem: '-', branch: base.monthAnimal.n,
        branchEl: BRANCH_EL[base.monthBranchIdx], animal: base.monthAnimal,
        means: 'parents, upbringing, working life' },
      { key:'day',   label:'Day',   stem: base.dayStem, branch: base.dayAnimal.n,
        stemEl: STEM_EL[dayStemIdx], pol: STEM_POL[dayStemIdx],
        branchEl: BRANCH_EL[base.dayBranchIdx], animal: base.dayAnimal,
        means: 'you yourself, and your marriage - the day stem is the Day Master' },
      { key:'hour',  label:'Hour',  stem: D.CN_STEMS[hs], branch: HOUR_NAMES[hb].split(' ')[1].replace(/[()]/g, ''),
        stemEl: STEM_EL[hs], pol: STEM_POL[hs], branchEl: BRANCH_EL[hb], animal: D.CN_ANIMALS[hb],
        hourName: HOUR_NAMES[hb],
        means: 'children, later life, your inner private self' }
    ];

    // element count across the eight characters (month stem omitted: it
    // needs the solar month index which we approximate, so it is not counted)
    var count = { Wood:0, Fire:0, Earth:0, Metal:0, Water:0 };
    pillars.forEach(function (p) {
      if (p.stemEl) count[p.stemEl]++;
      count[p.branchEl]++;
    });
    var order = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; });
    var missing = order.filter(function (k) { return count[k] === 0; });

    return {
      pillars: pillars, base: base, dayMaster: STEM_EL[dayStemIdx] + ' ' + STEM_POL[dayStemIdx],
      dayMasterText: DAY_MASTER[STEM_EL[dayStemIdx]],
      elementCount: count, strongest: order[0], missing: missing, hourBranch: hb
    };
  }

  var DAY_MASTER = {
    Wood:  'grows toward the light: idealistic, upward, needs room and gets tangled when boxed in',
    Fire:  'gives light and warmth: expressive, quick, magnetic, burns out if not fed',
    Earth: 'holds and nourishes: steady, trustworthy, slow to move and slow to leave',
    Metal: 'cuts and refines: precise, principled, sharp with words, hard to bend',
    Water: 'finds the way through: adaptable, deep, persuasive, hard to pin down'
  };

  /* ---------- Ayurveda ------------------------------------------------ */

  var DOSHA = {
    Vata: {
      n:'Vata', el:'air and space',
      body:'light frame, variable appetite, quick mind, cold hands, irregular sleep',
      strain:'anxiety, insomnia, dryness, scattered attention',
      eat:'warm, moist, cooked food; oils and ghee; sweet, sour and salty tastes; avoid raw, cold and dry',
      do:'routine above everything - same bedtime, same mealtimes; warm oil massage; slow steady exercise',
      avoid:'skipping meals, cold drinks, over-stimulation, too much travel'
    },
    Pitta: {
      n:'Pitta', el:'fire and water',
      body:'medium build, strong appetite, sharp intellect, runs warm, sweats easily',
      strain:'irritability, inflammation, acidity, burnout from over-work',
      eat:'cool and mildly spiced food; sweet fruit, greens, cucumber, coconut; avoid chilli, fried and sour',
      do:'cool down deliberately - swim, walk at dusk, moonlight; leave work at work',
      avoid:'midday sun, skipping lunch, competition for its own sake, alcohol'
    },
    Kapha: {
      n:'Kapha', el:'earth and water',
      body:'solid frame, steady energy, slow digestion, deep sleep, calm temperament',
      strain:'lethargy, weight gain, congestion, holding on too long',
      eat:'light, warm, spiced food; pungent, bitter and astringent tastes; less dairy, sugar and oil',
      do:'vigorous morning exercise before 10; variety and challenge; wake early',
      avoid:'naps, heavy breakfasts, routine that has become inertia'
    }
  };

  function ayurveda(chart) {
    var nadi = root.Jyotish.avakhada(chart).nadi;          // "Adi (Vata)" etc.
    var key = /Vata/.test(nadi) ? 'Vata' : /Pitta/.test(nadi) ? 'Pitta' : 'Kapha';
    var moonEl = ['Fire','Earth','Air','Water'][chart.moonSign % 4];
    // a secondary dosha from the Moon sign's element
    var second = moonEl === 'Fire' ? 'Pitta' : moonEl === 'Air' ? 'Vata' : moonEl === 'Water' ? 'Kapha' : 'Kapha';
    if (second === key) second = null;
    return { primary: DOSHA[key], secondary: second ? DOSHA[second] : null, nadi: nadi };
  }

  root.Systems = { western: western, fourPillars: fourPillars, ayurveda: ayurveda,
                   WEST_SIGNS: WEST_SIGNS, ELEMENT: ELEMENT, MODALITY: MODALITY, DOSHA: DOSHA };
})(window);
