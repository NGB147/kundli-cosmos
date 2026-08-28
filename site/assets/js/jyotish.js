/* ============================================================================
   jyotish.js - the classical layers that a real kundli is judged on:
   divisional charts (vargas), combustion and planetary war, Ashtakavarga,
   Shadbala, yogas, doshas, the Avakhada chakra, and day muhurtas.

   Formulae follow Parashara / standard modern practice. Where a rule has
   competing versions the common one is used and named in a comment.
============================================================================ */
(function (root) {
  'use strict';

  var A = root.Astro, K = root.Kundli, D = root.VData;

  var SEVEN = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  function signOf(l) { return Math.floor(A.norm360(l) / 30); }
  function degIn(l) { return A.norm360(l) % 30; }
  function isOdd(sign) { return sign % 2 === 0; }          // Aries(0) is odd/male
  function movable(sign) { return sign % 3 === 0; }        // chara
  function fixed(sign) { return sign % 3 === 1; }          // sthira
  function element(sign) { return sign % 4; }              // 0 fire 1 earth 2 air 3 water

  /* =========================================================================
     1. Divisional charts (vargas)
  ========================================================================= */

  var VARGAS = {
    D1:  function (l) { return signOf(l); },

    // Hora: odd signs Leo then Cancer, even signs Cancer then Leo
    D2:  function (l) {
      var s = signOf(l), h = degIn(l) < 15 ? 0 : 1;
      return isOdd(s) ? (h === 0 ? 4 : 3) : (h === 0 ? 3 : 4);
    },

    // Drekkana: 1st same sign, 2nd 5th from it, 3rd 9th from it
    D3:  function (l) { return (signOf(l) + [0,4,8][Math.floor(degIn(l) / 10)]) % 12; },

    // Chaturthamsa: same, 4th, 7th, 10th
    D4:  function (l) { return (signOf(l) + [0,3,6,9][Math.floor(degIn(l) / 7.5)]) % 12; },

    // Saptamsa: odd from the sign, even from the 7th
    D7:  function (l) {
      var s = signOf(l), start = isOdd(s) ? s : (s + 6) % 12;
      return (start + Math.floor(degIn(l) / (30 / 7))) % 12;
    },

    // Navamsa: continuous 3d20' arcs from Aries - equivalent to the
    // chara/sthira/dwisvabhava rule, and far less error-prone
    D9:  function (l) { return Math.floor(A.norm360(l) / (30 / 9)) % 12; },

    // Dashamsa: odd from the sign, even from the 9th
    D10: function (l) {
      var s = signOf(l), start = isOdd(s) ? s : (s + 8) % 12;
      return (start + Math.floor(degIn(l) / 3)) % 12;
    },

    // Dwadashamsa: always from the sign itself
    D12: function (l) { return (signOf(l) + Math.floor(degIn(l) / 2.5)) % 12; },

    // Shodashamsa: movable Aries, fixed Leo, dual Sagittarius
    D16: function (l) {
      var s = signOf(l), start = movable(s) ? 0 : fixed(s) ? 4 : 8;
      return (start + Math.floor(degIn(l) / 1.875)) % 12;
    },

    // Vimshamsa: movable Aries, fixed Sagittarius, dual Leo
    D20: function (l) {
      var s = signOf(l), start = movable(s) ? 0 : fixed(s) ? 8 : 4;
      return (start + Math.floor(degIn(l) / 1.5)) % 12;
    },

    // Chaturvimshamsa: odd from Leo, even from Cancer
    D24: function (l) {
      var s = signOf(l), start = isOdd(s) ? 4 : 3;
      return (start + Math.floor(degIn(l) / 1.25)) % 12;
    },

    // Bhamsa: fire Aries, earth Cancer, air Libra, water Capricorn
    D27: function (l) {
      var start = [0,3,6,9][element(signOf(l))];
      return (start + Math.floor(degIn(l) / (30 / 27))) % 12;
    },

    // Trimshamsa: unequal Mars/Saturn/Jupiter/Mercury/Venus segments
    D30: function (l) {
      var s = signOf(l), d = degIn(l);
      if (isOdd(s)) {
        if (d < 5)  return 0;   // Mars   - Aries
        if (d < 10) return 10;  // Saturn - Aquarius
        if (d < 18) return 8;   // Jupiter- Sagittarius
        if (d < 25) return 2;   // Mercury- Gemini
        return 6;               // Venus  - Libra
      }
      if (d < 5)  return 1;     // Venus  - Taurus
      if (d < 12) return 5;     // Mercury- Virgo
      if (d < 20) return 11;    // Jupiter- Pisces
      if (d < 25) return 9;     // Saturn - Capricorn
      return 7;                 // Mars   - Scorpio
    },

    // Khavedamsa: odd from Aries, even from Libra
    D40: function (l) {
      var s = signOf(l), start = isOdd(s) ? 0 : 6;
      return (start + Math.floor(degIn(l) / 0.75)) % 12;
    },

    // Akshavedamsa: movable Aries, fixed Leo, dual Sagittarius
    D45: function (l) {
      var s = signOf(l), start = movable(s) ? 0 : fixed(s) ? 4 : 8;
      return (start + Math.floor(degIn(l) / (30 / 45))) % 12;
    },

    // Shashtiamsa: from the sign itself, half-degree steps
    D60: function (l) { return (signOf(l) + Math.floor(degIn(l) * 2)) % 12; }
  };

  var VARGA_META = [
    ['D1','Rasi','the body and the life as lived'],
    ['D2','Hora','wealth and what you can hold'],
    ['D3','Drekkana','siblings, courage, initiative'],
    ['D4','Chaturthamsa','home, land, inner peace'],
    ['D7','Saptamsa','children and creative issue'],
    ['D9','Navamsa','marriage, dharma, the fruit of the chart'],
    ['D10','Dashamsa','career, status, action in the world'],
    ['D12','Dwadashamsa','parents and inheritance'],
    ['D16','Shodashamsa','vehicles, comforts, happiness'],
    ['D20','Vimshamsa','spiritual practice'],
    ['D24','Chaturvimshamsa','learning and education'],
    ['D27','Bhamsa','strengths and weaknesses of the body'],
    ['D30','Trimshamsa','misfortune and moral trial'],
    ['D40','Khavedamsa','maternal legacy'],
    ['D45','Akshavedamsa','paternal legacy'],
    ['D60','Shashtiamsa','the whole of past karma']
  ];

  function vargaChart(chart, key) {
    var fn = VARGAS[key];
    var lagna = fn(chart.ascLon);
    return {
      key: key,
      lagnaSign: lagna,
      planets: chart.planets.map(function (p) {
        var s = fn(p.lon);
        return { name: p.name, sign: s, house: K.houseFrom(lagna, s), retro: p.retro };
      })
    };
  }

  // Vargottama: same sign in D-1 and D-9. A major strengthener.
  function vargottama(chart) {
    return chart.planets.filter(function (p) {
      return VARGAS.D9(p.lon) === p.sign;
    }).map(function (p) { return p.name; });
  }

  /* =========================================================================
     2. Combustion (asta) and planetary war (graha yuddha)
  ========================================================================= */

  // orbs in degrees from the Sun; retrograde values in the second slot
  var COMBUST_ORB = {
    Moon: [12, 12], Mars: [17, 17], Mercury: [14, 12],
    Jupiter: [11, 11], Venus: [10, 8], Saturn: [15, 15]
  };

  function combustion(chart) {
    var sun = chart.byName.Sun, out = [];
    chart.planets.forEach(function (p) {
      var orb = COMBUST_ORB[p.name];
      if (!orb) return;
      var sep = Math.abs(A.norm180(p.lon - sun.lon));
      var lim = p.retro ? orb[1] : orb[0];
      if (sep < lim) {
        out.push({
          name: p.name, sep: sep, limit: lim,
          deep: sep < lim / 3
        });
      }
    });
    return out;
  }

  // two non-luminaries within one degree: the closer to 0 deg longitude wins
  function planetaryWar(chart) {
    var out = [], list = chart.planets.filter(function (p) {
      return ['Mars','Mercury','Jupiter','Venus','Saturn'].indexOf(p.name) >= 0;
    });
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var sep = Math.abs(A.norm180(list[i].lon - list[j].lon));
        if (sep < 1) {
          var winner = list[i].lon < list[j].lon ? list[i] : list[j];
          var loser = winner === list[i] ? list[j] : list[i];
          out.push({ winner: winner.name, loser: loser.name, sep: sep });
        }
      }
    }
    return out;
  }

  /* =========================================================================
     3. Ashtakavarga
  ========================================================================= */
  /* For each planet, the houses (counted from each reference point) in which
     it earns a benefic bindu. Row order: Sun, Moon, Mars, Mercury, Jupiter,
     Venus, Saturn, Lagna. Column totals are the classical 48/49/39/54/56/52/39. */
  var BAV = {
    Sun: {
      Sun:[1,2,4,7,8,9,10,11], Moon:[3,6,10,11], Mars:[1,2,4,7,8,9,10,11],
      Mercury:[3,5,6,9,10,11,12], Jupiter:[5,6,9,11], Venus:[6,7,12],
      Saturn:[1,2,4,7,8,9,10,11], Lagna:[3,4,6,10,11,12]
    },
    Moon: {
      Sun:[3,6,7,8,10,11], Moon:[1,3,6,7,10,11], Mars:[2,3,5,6,9,10,11],
      Mercury:[1,3,4,5,7,8,10,11], Jupiter:[1,2,4,7,8,10,11], Venus:[3,4,5,7,9,10,11],
      Saturn:[3,5,6,11], Lagna:[3,6,10,11]
    },
    Mars: {
      Sun:[3,5,6,10,11], Moon:[3,6,11], Mars:[1,2,4,7,8,10,11],
      Mercury:[3,5,6,11], Jupiter:[6,10,11,12], Venus:[6,8,11,12],
      Saturn:[1,4,7,8,9,10,11], Lagna:[1,3,6,10,11]
    },
    Mercury: {
      Sun:[5,6,9,11,12], Moon:[2,4,6,8,10,11], Mars:[1,2,4,7,8,9,10,11],
      Mercury:[1,3,5,6,9,10,11,12], Jupiter:[6,8,11,12], Venus:[1,2,3,4,5,8,9,11],
      Saturn:[1,2,4,7,8,9,10,11], Lagna:[1,2,4,6,8,10,11]
    },
    Jupiter: {
      Sun:[1,2,3,4,7,8,9,10,11], Moon:[2,5,7,9,11], Mars:[1,2,4,7,8,10,11],
      Mercury:[1,2,4,5,6,9,10,11], Jupiter:[1,2,3,4,7,8,10,11], Venus:[2,5,6,9,10,11],
      Saturn:[3,5,6,12], Lagna:[1,2,4,5,6,7,9,10,11]
    },
    Venus: {
      Sun:[8,11,12], Moon:[1,2,3,4,5,8,9,11,12], Mars:[3,4,6,9,11,12],
      Mercury:[3,5,6,9,11], Jupiter:[5,8,9,10,11], Venus:[1,2,3,4,5,8,9,10,11],
      Saturn:[3,4,5,8,9,10,11], Lagna:[1,2,3,4,5,8,9,11]
    },
    Saturn: {
      Sun:[1,2,4,7,8,10,11], Moon:[3,6,11], Mars:[3,5,6,10,11,12],
      Mercury:[6,8,9,10,11,12], Jupiter:[5,6,11,12], Venus:[6,11,12],
      Saturn:[3,5,6,11], Lagna:[1,3,4,6,10,11]
    }
  };

  function ashtakavarga(chart) {
    var refSign = {};
    SEVEN.forEach(function (n) { refSign[n] = chart.byName[n].sign; });
    refSign.Lagna = chart.lagnaSign;

    var bav = {}, sav = new Array(12).fill(0);
    SEVEN.forEach(function (planet) {
      var row = new Array(12).fill(0);
      Object.keys(BAV[planet]).forEach(function (ref) {
        var from = refSign[ref];
        BAV[planet][ref].forEach(function (h) {
          row[(from + h - 1) % 12] += 1;
        });
      });
      bav[planet] = row;
      for (var i = 0; i < 12; i++) sav[i] += row[i];
    });

    var totals = {};
    SEVEN.forEach(function (p) {
      totals[p] = bav[p].reduce(function (a, b) { return a + b; }, 0);
    });
    return { bav: bav, sav: sav, totals: totals,
             savTotal: sav.reduce(function (a, b) { return a + b; }, 0) };
  }

  /* =========================================================================
     4. Shadbala
     Sthana (uchcha, kendradi, drekkana, oja-yugma), Dig, Kala (paksha,
     nathonnatha, ayana-lite), Cheshta and Naisargika. Drik bala is omitted -
     it is the component with the least agreement between authorities, and
     the interface says so rather than pretending otherwise.
  ========================================================================= */

  var NAISARGIKA = { Sun:60, Moon:51.43, Venus:42.86, Jupiter:34.29,
                     Mercury:25.71, Mars:17.14, Saturn:8.57 };
  // house that gives full Dig bala; the opposite house gives zero
  var DIG_STRONG = { Sun:10, Mars:10, Jupiter:1, Mercury:1, Moon:4, Venus:4, Saturn:7 };
  var REQUIRED = { Sun:390, Moon:360, Mars:300, Mercury:420, Jupiter:390, Venus:330, Saturn:300 };

  function shadbala(chart, pan) {
    var out = {};
    var sunLon = chart.byName.Sun.lon;

    SEVEN.forEach(function (name) {
      var p = chart.byName[name];
      var ex = D.EXALTATION[name];
      var exactExalt = ex[0] * 30 + ex[1];
      var debil = A.norm360(exactExalt + 180);

      // Uchcha: 60 at exaltation degree, 0 at debilitation degree
      var arc = Math.abs(A.norm180(p.lon - debil));
      var uchcha = arc / 3;

      // Kendradi: kendra 60, panapara 30, apoklima 15
      var kendradi = [1,4,7,10].indexOf(p.house) >= 0 ? 60
                   : [2,5,8,11].indexOf(p.house) >= 0 ? 30 : 15;

      // Drekkana: male planets in the 1st third, neuter 2nd, female 3rd
      var third = Math.floor(degIn(p.lon) / 10);
      var gender = ['Sun','Mars','Jupiter'].indexOf(name) >= 0 ? 0
                 : ['Moon','Venus'].indexOf(name) >= 0 ? 2 : 1;
      var drekkana = third === gender ? 15 : 0;

      // Oja-yugma: male planets like odd signs, female planets even
      var oddSign = isOdd(p.sign);
      var likesOdd = ['Sun','Mars','Jupiter','Mercury','Saturn'].indexOf(name) >= 0;
      var oja = (oddSign === likesOdd) ? 15 : 0;

      var sthana = uchcha + kendradi + drekkana + oja;

      // Dig bala: full in its strong house, zero opposite
      var strongHouse = DIG_STRONG[name];
      var hd = Math.abs(A.norm180((p.house - strongHouse) * 30));
      var dig = (180 - hd) / 3;

      // Paksha: benefics gain with the waxing Moon, malefics with the waning
      var elong = A.norm360(chart.byName.Moon.lon - sunLon);
      var waxing = elong <= 180 ? elong : 360 - elong;
      var benefic = D.GRAHAS[name].nature === 'Benefic';
      var paksha = benefic ? waxing / 3 : (180 - waxing) / 3;
      if (name === 'Moon') paksha = waxing / 3;

      // Nathonnatha: Moon/Mars/Saturn are strong at night, Sun/Jupiter/Venus
      // by day, Mercury always. Uses the birth hour from local midnight.
      var hrs = ((chart.birth.hh + chart.birth.mm / 60) + 24) % 24;
      var fromMidnight = Math.abs(12 - hrs);           // 0 at noon, 12 at midnight
      var dayStrength = (12 - fromMidnight) / 12 * 60;
      var nathonnatha = name === 'Mercury' ? 60
        : (['Sun','Jupiter','Venus'].indexOf(name) >= 0 ? dayStrength : 60 - dayStrength);

      var kala = paksha + nathonnatha;

      // Cheshta: retrograde is strongest, combust/fast is weakest
      var cheshta;
      if (name === 'Sun' || name === 'Moon') {
        cheshta = paksha;                       // luminaries use ayana/paksha
      } else {
        var speed = Math.abs(A.dailySpeed(name, chart.jd));
        cheshta = p.retro ? 60 : Math.max(0, 60 - speed * 30);
      }

      var total = sthana + dig + kala + cheshta + NAISARGIKA[name];
      out[name] = {
        sthana: sthana, uchcha: uchcha, kendradi: kendradi,
        dig: dig, kala: kala, cheshta: cheshta, naisargika: NAISARGIKA[name],
        total: total, rupas: total / 60,
        required: REQUIRED[name], ratio: total / REQUIRED[name]
      };
    });
    return out;
  }

  /* =========================================================================
     5. Yogas
  ========================================================================= */

  var MAHAPURUSHA = {
    Mars:'Ruchaka', Mercury:'Bhadra', Jupiter:'Hamsa', Venus:'Malavya', Saturn:'Sasa'
  };

  function yogas(chart) {
    var found = [];
    var by = chart.byName;
    var lagnaLord = D.RASHIS[chart.lagnaSign].lord;
    var moonHouseOf = function (p) { return K.houseFrom(chart.moonSign, p.sign); };

    // --- Pancha Mahapurusha ---
    Object.keys(MAHAPURUSHA).forEach(function (n) {
      var p = by[n];
      var strong = p.dignity.label === 'Exalted' || p.dignity.label === 'Own sign' ||
                   p.dignity.label === 'Moolatrikona';
      if (strong && [1,4,7,10].indexOf(p.house) >= 0) {
        found.push({
          name: MAHAPURUSHA[n] + ' Yoga', tier: 'major',
          t: D.GRAHAS[n].dev + ' is ' + p.dignity.label.toLowerCase() + ' in ' +
             D.RASHIS[p.sign].n + ' and occupies the ' + ordinal(p.house) +
             ', a kendra. This is one of the five Pancha Mahapurusha yogas - it marks a ' +
             'person built around ' + D.GRAHAS[n].karaka.split(',')[0] + ', usually visibly so.'
        });
      }
    });

    // --- Gaja Kesari: Jupiter in a kendra from the Moon ---
    if ([1,4,7,10].indexOf(moonHouseOf(by.Jupiter)) >= 0) {
      found.push({
        name: 'Gaja Kesari Yoga', tier: 'major',
        t: 'Guru sits in the ' + ordinal(moonHouseOf(by.Jupiter)) + ' from your Chandra rashi. ' +
           'Gaja Kesari gives lasting reputation and the kind of intelligence people defer to; ' +
           'its effect is steadiness rather than sudden fortune.'
      });
    }

    // --- Budha-Aditya: Sun and Mercury together ---
    if (by.Sun.house === by.Mercury.house) {
      var comb = Math.abs(A.norm180(by.Sun.lon - by.Mercury.lon)) < 14;
      found.push({
        name: 'Budha-Aditya Yoga', tier: comb ? 'minor' : 'major',
        t: 'Surya and Budh share your ' + ordinal(by.Sun.house) + ' house - sharp intelligence and ' +
           'administrative skill.' + (comb
             ? ' Mercury is combust here, which mutes the yoga: the intelligence is real but ' +
               'under-recognised, and you may not get credit for your own ideas.'
             : ' Mercury is clear of the Sun, so the yoga operates cleanly.')
      });
    }

    // --- Chandra-Mangala: Moon with Mars ---
    if (by.Moon.house === by.Mars.house) {
      found.push({
        name: 'Chandra-Mangala Yoga', tier: 'minor',
        t: 'Chandra and Mangal are joined in your ' + ordinal(by.Moon.house) +
           '. Classically a money yoga - earning through drive and enterprise, though it also ' +
           'makes the emotional temperature run hot.'
      });
    }

    // --- Sunapha / Anapha / Durudhara / Kemadruma ---
    var second = [], twelfth = [];
    chart.planets.forEach(function (p) {
      if (p.name === 'Moon' || p.name === 'Sun' || p.name === 'Rahu' || p.name === 'Ketu') return;
      var h = moonHouseOf(p);
      if (h === 2) second.push(p.name);
      if (h === 12) twelfth.push(p.name);
    });
    if (second.length && twelfth.length) {
      found.push({ name:'Durudhara Yoga', tier:'major',
        t:'Grahas flank your Moon on both sides (' + twelfth.concat(second).map(dev).join(', ') +
          '). Durudhara gives comfort, vehicles and a life that is materially supported from both directions.' });
    } else if (second.length) {
      found.push({ name:'Sunapha Yoga', tier:'minor',
        t:'A graha sits in the 2nd from your Moon - self-earned wealth and a good name in later life.' });
    } else if (twelfth.length) {
      found.push({ name:'Anapha Yoga', tier:'minor',
        t:'A graha sits in the 12th from your Moon - a naturally detached, well-regarded temperament.' });
    } else {
      found.push({ name:'Kemadruma Yoga', tier:'caution',
        t:'No graha occupies the 2nd or 12th from your Moon. Kemadruma describes emotional isolation ' +
          'and support arriving late - it is largely cancelled if benefics aspect the Moon or the Moon ' +
          'sits in a kendra, so read it as a tendency, not a verdict.' });
    }

    // --- Amala: a benefic in the 10th from lagna or Moon ---
    ['Jupiter','Venus','Mercury'].forEach(function (n) {
      if (by[n].house === 10 || moonHouseOf(by[n]) === 10) {
        found.push({ name:'Amala Yoga', tier:'minor',
          t: D.GRAHAS[n].dev + ' occupies the 10th - a spotless reputation, the kind that outlasts the career itself.' });
      }
    });

    // --- Neecha Bhanga: cancellation of debilitation ---
    chart.planets.forEach(function (p) {
      if (p.dignity.label !== 'Debilitated') return;
      var dispositor = by[D.RASHIS[p.sign].lord];
      var exaltLord = by[D.RASHIS[D.EXALTATION[p.name][0]].lord];
      var reasons = [];
      if ([1,4,7,10].indexOf(dispositor.house) >= 0)
        reasons.push('its dispositor ' + D.GRAHAS[dispositor.name].dev + ' sits in a kendra');
      if (exaltLord && [1,4,7,10].indexOf(exaltLord.house) >= 0)
        reasons.push('the lord of its exaltation sign is in a kendra');
      if (reasons.length) {
        found.push({ name:'Neecha Bhanga Raja Yoga (' + D.GRAHAS[p.name].dev + ')', tier:'major',
          t: D.GRAHAS[p.name].dev + ' is debilitated in ' + D.RASHIS[p.sign].n + ', but ' +
             reasons.join(' and ') + '. The debilitation is cancelled and inverted: this is often the ' +
             'placement that produces a late, hard-won rise rather than a weakness.' });
      }
    });

    // --- Raja yoga: a kendra lord linked to a trikona lord ---
    var kendraLords = {}, trikonaLords = {};
    [1,4,7,10].forEach(function (h) { kendraLords[chart.houses[h-1].lord] = h; });
    [1,5,9].forEach(function (h) { trikonaLords[chart.houses[h-1].lord] = h; });
    Object.keys(kendraLords).forEach(function (kl) {
      Object.keys(trikonaLords).forEach(function (tl) {
        if (kl === tl) return;
        var a = by[kl], b = by[tl];
        if (a.house === b.house) {
          found.push({ name:'Raja Yoga', tier:'major',
            t: D.GRAHAS[kl].dev + ' (lord of your ' + ordinal(kendraLords[kl]) + ') and ' +
               D.GRAHAS[tl].dev + ' (lord of your ' + ordinal(trikonaLords[tl]) + ') sit together in the ' +
               ordinal(a.house) + '. A kendra-trikona link is the classical signature of rise in status.' });
        } else if (a.sign === b.house - 1 + chart.lagnaSign) { /* handled below */ }
      });
    });

    // --- Dhana yoga: 2nd and 11th lords connected ---
    var l2 = by[chart.houses[1].lord], l11 = by[chart.houses[10].lord];
    if (l2.house === l11.house && l2.name !== l11.name) {
      found.push({ name:'Dhana Yoga', tier:'major',
        t: D.GRAHAS[l2.name].dev + ' (2nd lord) and ' + D.GRAHAS[l11.name].dev +
           ' (11th lord) are joined in your ' + ordinal(l2.house) +
           '. Income and accumulation are structurally linked in this chart.' });
    }

    // --- Vipreet Raja yoga: a dusthana lord in another dusthana ---
    [6,8,12].forEach(function (h) {
      var lord = by[chart.houses[h-1].lord];
      if ([6,8,12].indexOf(lord.house) >= 0 && lord.house !== h) {
        found.push({ name:'Vipareeta Raja Yoga', tier:'minor',
          t: D.GRAHAS[lord.name].dev + ', lord of your ' + ordinal(h) + ', sits in the ' +
             ordinal(lord.house) + '. Two difficult houses cancelling each other - you tend to gain ' +
             'precisely from the situations that defeat other people.' });
      }
    });

    // --- Shakata: Moon in 6/8/12 from Jupiter ---
    var mFromJ = K.houseFrom(by.Jupiter.sign, chart.moonSign);
    if ([6,8,12].indexOf(mFromJ) >= 0) {
      found.push({ name:'Shakata Yoga', tier:'caution',
        t:'Your Moon lies in the ' + ordinal(mFromJ) + ' from Guru. Fortune arrives in waves rather ' +
          'than a line - the rule is to bank the good phases instead of assuming they continue.' });
    }

    // dedupe by name
    var seen = {};
    return found.filter(function (y) {
      if (seen[y.name]) return false;
      seen[y.name] = 1; return true;
    });

    function dev(n) { return D.GRAHAS[n].dev; }
  }

  /* =========================================================================
     6. Doshas
  ========================================================================= */

  function doshas(chart, jdNow) {
    var out = [];
    var by = chart.byName;

    /* --- Manglik / Kuja dosha --- */
    var marsHouses = {
      lagna: by.Mars.house,
      moon: K.houseFrom(chart.moonSign, by.Mars.sign),
      venus: K.houseFrom(by.Venus.sign, by.Mars.sign)
    };
    var DOSHA_HOUSES = [1,2,4,7,8,12];
    var from = [];
    if (DOSHA_HOUSES.indexOf(marsHouses.lagna) >= 0) from.push('the lagna');
    if (DOSHA_HOUSES.indexOf(marsHouses.moon) >= 0) from.push('the Moon');
    if (DOSHA_HOUSES.indexOf(marsHouses.venus) >= 0) from.push('Venus');

    if (from.length) {
      var cancels = [];
      if (['Own sign','Exalted','Moolatrikona'].indexOf(by.Mars.dignity.label) >= 0)
        cancels.push('Mangal is ' + by.Mars.dignity.label.toLowerCase() + ' in ' + D.RASHIS[by.Mars.sign].n);
      if (by.Mars.sign === 0 || by.Mars.sign === 7 || by.Mars.sign === 9)
        cancels.push('Mangal sits in its own or exaltation rashi, which classical texts treat as cancelling');
      var jupAspects = K.aspectsCast('Jupiter').some(function (n) {
        return ((by.Jupiter.house + n - 2) % 12) + 1 === by.Mars.house;
      });
      if (jupAspects) cancels.push('Guru aspects Mangal, the strongest single cancellation');
      if (by.Mars.house === by.Saturn.house) cancels.push('Shani is joined with Mangal, which blunts it');

      out.push({
        key:'manglik',
        name: from.length >= 2 ? 'Manglik (Kuja) dosha - strong' : 'Manglik (Kuja) dosha - partial',
        severity: cancels.length ? 'mitigated' : (from.length >= 2 ? 'high' : 'moderate'),
        t: 'Mangal falls in the ' + ordinal(marsHouses.lagna) + ' from your lagna, ' +
           ordinal(marsHouses.moon) + ' from the Moon and ' + ordinal(marsHouses.venus) +
           ' from Shukra, which places it in a dosha house counted from ' + from.join(' and ') + '. ' +
           'Manglik describes friction and impatience carried into partnership, not a bar to marriage. ' +
           (cancels.length
             ? 'It is substantially cancelled here: ' + cancels.join('; ') + '.'
             : 'No classical cancellation applies in this chart, so the traditional advice is to match ' +
               'with someone whose chart carries the same placement.')
      });
    }

    /* --- Kaal Sarpa --- */
    var rahu = by.Rahu.lon, ketu = by.Ketu.lon;
    var between = 0, outside = [];
    SEVEN.forEach(function (n) {
      var d = A.norm360(by[n].lon - rahu);
      if (d < A.norm360(ketu - rahu)) between++; else outside.push(n);
    });
    if (outside.length === 0 || outside.length === 7) {
      var KS_NAMES = ['Anant','Kulik','Vasuki','Shankhpal','Padma','Mahapadma',
                      'Takshak','Karkotak','Shankhachur','Ghatak','Vishdhar','Sheshnag'];
      out.push({
        key:'kaalsarpa', name:'Kaal Sarpa dosha - ' + KS_NAMES[by.Rahu.house - 1],
        severity:'high',
        t:'Every graha falls on one side of the Rahu-Ketu axis, with Rahu in your ' +
          ordinal(by.Rahu.house) + '. This is the ' + KS_NAMES[by.Rahu.house - 1] +
          ' variant. In practice it describes a life that feels externally constrained until roughly ' +
          'the middle years, then opens - not a curse, but a delay in autonomy.'
      });
    } else if (outside.length === 1) {
      out.push({
        key:'kaalsarpa-partial', name:'Partial Kaal Sarpa', severity:'moderate',
        t:'All grahas except ' + D.GRAHAS[outside[0]].dev + ' lie on one side of the Rahu-Ketu axis. ' +
          'The pattern is present but broken, which classical texts treat as much milder.'
      });
    }

    /* --- Sade Sati and Dhaiya --- */
    var satSign = signOf(A.siderealLongitude('Saturn', jdNow));
    var fromMoon = K.houseFrom(chart.moonSign, satSign);
    if ([12,1,2].indexOf(fromMoon) >= 0) {
      var phase = fromMoon === 12 ? 'first (rising)' : fromMoon === 1 ? 'second (peak)' : 'third (setting)';
      out.push({
        key:'sadesati', name:'Sade Sati - ' + phase + ' phase', severity:'moderate',
        t:'Shani is transiting ' + D.RASHIS[satSign].n + ', the ' + ordinal(fromMoon) +
          ' from your natal Moon. You are in the ' + phase + ' phase of the seven-and-a-half year ' +
          'Sade Sati. ' + sadeSatiAdvice(fromMoon),
        dates: sadeSatiWindow(chart.moonSign, jdNow)
      });
    } else if ([4,8].indexOf(fromMoon) >= 0) {
      out.push({
        key:'dhaiya', name:'Shani Dhaiya (Kantaka Shani)', severity:'low',
        t:'Shani sits ' + ordinal(fromMoon) + ' from your natal Moon - the two-and-a-half year Dhaiya. ' +
          'Lighter than Sade Sati, but it presses on ' + (fromMoon === 4 ? 'home and peace of mind' : 'health and shared finances') + '.'
      });
    }

    /* --- Pitra dosha (common formulation) --- */
    var ninth = chart.houses[8];
    var ninthHasShadow = ninth.occupants.some(function (p) {
      return p.name === 'Rahu' || p.name === 'Ketu' || p.name === 'Saturn';
    });
    if (ninthHasShadow && ninth.occupants.some(function (p) { return p.name === 'Sun'; })) {
      out.push({
        key:'pitra', name:'Pitra dosha indication', severity:'low',
        t:'Surya shares your 9th house with a shadow graha. The classical reading is unfinished ' +
          'ancestral obligation, and the classical remedy is simply to honour the paternal line - ' +
          'tarpan in Pitru Paksha, and repairing a living family relationship if one is broken.'
      });
    }

    return out;
  }

  function sadeSatiAdvice(h) {
    if (h === 12) return 'The first phase drains resources and sleep - it asks you to cut what you were ' +
      'carrying unnecessarily before the heavier part arrives.';
    if (h === 1) return 'The middle phase is the one people mean when they say Sade Sati: identity, health ' +
      'and confidence are all under review. Nothing false about your self-image survives it.';
    return 'The last phase is the rebuilding one. The pressure eases, and what you kept turns out to be ' +
      'what was actually yours.';
  }

  // scan forward and back for the Saturn ingresses bounding the 12th-2nd window
  function sadeSatiWindow(moonSign, jdNow) {
    var startSign = (moonSign + 11) % 12, endSign = (moonSign + 2) % 12;
    function ingress(target, fromJD, dir) {
      var step = dir * 5, jd = fromJD;
      for (var i = 0; i < 3000; i++) {
        var s = signOf(A.siderealLongitude('Saturn', jd));
        var next = signOf(A.siderealLongitude('Saturn', jd + step));
        if (s !== next && next === target) {
          var lo = Math.min(jd, jd + step), hi = Math.max(jd, jd + step);
          for (var k = 0; k < 40; k++) {
            var mid = (lo + hi) / 2;
            if (signOf(A.siderealLongitude('Saturn', mid)) === target) hi = mid; else lo = mid;
          }
          return (lo + hi) / 2;
        }
        jd += step;
      }
      return null;
    }
    var start = ingress(startSign, jdNow, -1);
    var end = ingress(endSign, jdNow, 1);
    return { start: start, end: end };
  }

  /* =========================================================================
     7. Avakhada chakra
  ========================================================================= */

  var VARNA = ['Kshatriya','Vaishya','Shudra','Brahmin','Kshatriya','Vaishya',
               'Shudra','Brahmin','Kshatriya','Vaishya','Shudra','Brahmin'];
  var TATVA = ['Agni (fire)','Prithvi (earth)','Vayu (air)','Jala (water)'];

  var YONI = [
    ['Horse','M'],['Elephant','M'],['Sheep','F'],['Serpent','M'],['Serpent','F'],['Dog','F'],
    ['Cat','F'],['Sheep','M'],['Cat','M'],['Rat','M'],['Rat','F'],['Cow','M'],
    ['Buffalo','F'],['Tiger','F'],['Buffalo','M'],['Tiger','M'],['Deer','F'],['Deer','M'],
    ['Dog','M'],['Monkey','M'],['Mongoose','F'],['Monkey','F'],['Lion','F'],['Horse','F'],
    ['Lion','M'],['Cow','F'],['Elephant','F']
  ];

  var NADI_ADI = [0,5,6,11,12,17,18,23,24];
  var NADI_MADHYA = [1,4,7,10,13,16,19,22,25];

  var SYLLABLES = [
    ['Chu','Che','Cho','La'],['Li','Lu','Le','Lo'],['A','I','U','E'],['O','Va','Vi','Vu'],
    ['Ve','Vo','Ka','Ki'],['Ku','Gha','Ing','Chha'],['Ke','Ko','Ha','Hi'],['Hu','He','Ho','Da'],
    ['Di','Du','De','Do'],['Ma','Mi','Mu','Me'],['Mo','Ta','Ti','Tu'],['Te','To','Pa','Pi'],
    ['Pu','Sha','Na','Tha'],['Pe','Po','Ra','Ri'],['Ru','Re','Ro','Ta'],['Ti','Tu','Te','To'],
    ['Na','Ni','Nu','Ne'],['No','Ya','Yi','Yu'],['Ye','Yo','Bha','Bhi'],['Bhu','Dha','Pha','Dha'],
    ['Bhe','Bho','Ja','Ji'],['Ju','Je','Jo','Gha'],['Ga','Gi','Gu','Ge'],['Go','Sa','Si','Su'],
    ['Se','So','Da','Di'],['Du','Tha','Jha','Da'],['De','Do','Cha','Chi']
  ];

  function vashya(moonSign, moonDeg) {
    switch (moonSign) {
      case 0: case 1: return 'Chatushpada (quadruped)';
      case 2: case 5: case 6: case 10: return 'Manava (human)';
      case 3: case 11: return 'Jalachara (water-dwelling)';
      case 4: return 'Vanachara (wild)';
      case 7: return 'Keeta (insect)';
      case 8: return moonDeg < 15 ? 'Manava (human)' : 'Chatushpada (quadruped)';
      case 9: return moonDeg < 15 ? 'Chatushpada (quadruped)' : 'Jalachara (water-dwelling)';
    }
    return '-';
  }

  function avakhada(chart) {
    var nak = chart.moonNak, pada = chart.moonPada;
    var nadi = NADI_ADI.indexOf(nak) >= 0 ? 'Adi (Vata)'
             : NADI_MADHYA.indexOf(nak) >= 0 ? 'Madhya (Pitta)' : 'Antya (Kapha)';
    return {
      varna: VARNA[chart.moonSign],
      vashya: vashya(chart.moonSign, degIn(chart.moonLon)),
      yoni: YONI[nak][0] + ' (' + (YONI[nak][1] === 'M' ? 'male' : 'female') + ')',
      gana: D.NAKSHATRAS[nak].gana,
      nadi: nadi,
      tatva: TATVA[element(chart.moonSign)],
      nakshatraLord: D.NAKSHATRAS[nak].lord,
      rashiLord: D.RASHIS[chart.moonSign].lord,
      syllable: SYLLABLES[nak][pada - 1],
      paya: null
    };
  }

  /* =========================================================================
     8. Day muhurtas
  ========================================================================= */
  // eighth-parts of the day, indexed by weekday (0 = Sunday)
  var RAHU_PART   = [8,2,7,5,6,4,3];
  var YAMA_PART   = [5,4,3,2,1,7,6];
  var GULIKA_PART = [7,6,5,4,3,2,1];

  function muhurtas(y, m, d, lat, lon, tz) {
    var rs = A.sunRiseSet(y, m, d, lat, lon, tz);
    if (!rs.rise || !rs.set) return null;
    var dayLen = rs.set - rs.rise, part = dayLen / 8;
    var weekday = ((Math.floor(rs.rise + tz / 24 + 0.5) % 7) + 7 + 1) % 7;

    function seg(idx) {
      return { start: rs.rise + (idx - 1) * part, end: rs.rise + idx * part };
    }
    // Abhijit is the 8th of 15 equal day-muhurtas
    var m15 = dayLen / 15;
    return {
      sunrise: rs.rise, sunset: rs.set, noon: rs.transit,
      dayLength: dayLen, weekday: weekday,
      rahuKaal: seg(RAHU_PART[weekday]),
      yamaganda: seg(YAMA_PART[weekday]),
      gulika: seg(GULIKA_PART[weekday]),
      abhijit: { start: rs.rise + 7 * m15, end: rs.rise + 8 * m15,
                 valid: weekday !== 3 }   // traditionally skipped on Wednesday
    };
  }

  function ordinal(n) {
    return ['','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'][n] || (n + 'th');
  }

  root.Jyotish = {
    VARGAS: VARGAS, VARGA_META: VARGA_META, vargaChart: vargaChart, vargottama: vargottama,
    combustion: combustion, planetaryWar: planetaryWar,
    ashtakavarga: ashtakavarga, BAV: BAV,
    shadbala: shadbala, REQUIRED: REQUIRED,
    yogas: yogas, doshas: doshas, avakhada: avakhada, muhurtas: muhurtas,
    SEVEN: SEVEN, ordinal: ordinal
  };
})(window);
