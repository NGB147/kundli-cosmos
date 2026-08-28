/* ============================================================================
   kundli.js - builds the birth chart, dignities, Vimshottari dasha,
   the panchang for any moment, and the Chinese sexagenary pillars.
============================================================================ */
(function (root) {
  'use strict';

  var A = root.Astro, D = root.VData;
  var NAK_ARC = 360 / 27;      // 13 deg 20'
  var PADA_ARC = NAK_ARC / 4;  //  3 deg 20'
  var SIDEREAL_YEAR = 365.25;  // dasha convention

  function signOf(lon) { return Math.floor(A.norm360(lon) / 30); }
  function degInSign(lon) { return A.norm360(lon) % 30; }
  function nakOf(lon) { return Math.floor(A.norm360(lon) / NAK_ARC); }
  function padaOf(lon) { return Math.floor((A.norm360(lon) % NAK_ARC) / PADA_ARC) + 1; }

  function dms(deg) {
    var d = Math.floor(deg), mf = (deg - d) * 60, m = Math.floor(mf);
    return d + '° ' + (m < 10 ? '0' : '') + m + "'";
  }

  // house number 1..12 counted from the lagna sign, whole-sign
  function houseFrom(fromSign, sign) { return ((sign - fromSign + 12) % 12) + 1; }

  /* ---------- dignity ---------------------------------------------------- */

  function relation(planet, other) {
    var r = D.FRIENDS[planet];
    if (!r || planet === other) return 'own';
    if (r.f.indexOf(other) >= 0) return 'friend';
    if (r.e.indexOf(other) >= 0) return 'enemy';
    return 'neutral';
  }

  function dignityOf(planet, lon) {
    var sign = signOf(lon), deg = degInSign(lon);
    var ex = D.EXALTATION[planet];
    if (ex && ex[0] === sign) return { label: 'Exalted', score: 2.0 };
    if (ex && (ex[0] + 6) % 12 === sign) return { label: 'Debilitated', score: -2.0 };
    var mt = D.MOOLATRIKONA[planet];
    if (mt && mt[0] === sign && deg >= mt[1] && deg < mt[2]) return { label: 'Moolatrikona', score: 1.75 };
    if ((D.OWN_SIGNS[planet] || []).indexOf(sign) >= 0) return { label: 'Own sign', score: 1.5 };
    var rel = relation(planet, D.RASHIS[sign].lord);
    if (rel === 'friend') return { label: "Friend's sign", score: 0.75 };
    if (rel === 'enemy') return { label: "Enemy's sign", score: -0.75 };
    return { label: 'Neutral sign', score: 0 };
  }

  /* ---------- aspects (graha drishti) ------------------------------------ */
  // Every graha aspects the 7th from itself. Special: Mars 4 & 8,
  // Jupiter 5 & 9, Saturn 3 & 10, the nodes 5, 7 & 9.
  var SPECIAL_ASPECTS = {
    Mars: [4, 8], Jupiter: [5, 9], Saturn: [3, 10], Rahu: [5, 9], Ketu: [5, 9]
  };

  function aspectsCast(planet) {
    return [7].concat(SPECIAL_ASPECTS[planet] || []);
  }

  /* ---------- the chart -------------------------------------------------- */

  /* birth = { y, m, d, hh, mm, tz, lat, lon, timeKnown, name } */
  function buildChart(birth) {
    var jd = A.localToJD(birth.y, birth.m, birth.d, birth.hh, birth.mm, birth.tz);

    var planets = A.BODY_ORDER.map(function (b) {
      var lon = A.siderealLongitude(b, jd);
      var sign = signOf(lon);
      return {
        name: b, dev: D.GRAHAS[b].dev, sym: D.GRAHAS[b].sym,
        lon: lon, sign: sign, deg: degInSign(lon), degText: dms(degInSign(lon)),
        nak: nakOf(lon), pada: padaOf(lon),
        retro: A.isRetrograde(b, jd),
        dignity: dignityOf(b, lon),
        nature: D.GRAHAS[b].nature
      };
    });

    var moon = planets[1], sun = planets[0];
    var ascLon = A.ascendantSidereal(jd, birth.lat, birth.lon);
    var lagnaSign = signOf(ascLon);

    planets.forEach(function (p) { p.house = houseFrom(lagnaSign, p.sign); });

    // houses 1..12: sign, lord, occupants, aspecting planets
    var houses = [];
    for (var h = 1; h <= 12; h++) {
      var sign = (lagnaSign + h - 1) % 12;
      var lordName = D.RASHIS[sign].lord;
      var occupants = planets.filter(function (p) { return p.house === h; });
      var aspecting = planets.filter(function (p) {
        return aspectsCast(p.name).some(function (n) {
          return ((p.house + n - 2) % 12) + 1 === h;
        });
      });
      houses.push({
        num: h, sign: sign, rashi: D.RASHIS[sign], lord: lordName,
        lordPlanet: planets.filter(function (p) { return p.name === lordName; })[0],
        occupants: occupants, aspecting: aspecting
      });
    }

    return {
      birth: birth, jd: jd,
      ayanamsa: A.ayanamsa(jd),
      ascLon: ascLon, lagnaSign: lagnaSign,
      lagnaDeg: dms(degInSign(ascLon)),
      lagnaNak: nakOf(ascLon), lagnaPada: padaOf(ascLon),
      planets: planets, houses: houses,
      moonSign: moon.sign, moonNak: moon.nak, moonPada: moon.pada, moonLon: moon.lon,
      sunSign: sun.sign, sunLon: sun.lon,
      byName: planets.reduce(function (acc, p) { acc[p.name] = p; return acc; }, {}),
      dasha: vimshottari(moon.lon, jd),
      timeKnown: birth.timeKnown !== false
    };
  }

  /* The classical layers live in jyotish.js, which loads after this file.
     attachDeep() is called once the chart exists so that reading.js can
     score answers against navamsa, ashtakavarga, shadbala and doshas. */
  function attachDeep(chart, jdNow) {
    var J = root.Jyotish;
    if (!J) return chart;
    chart.deep = {
      vargottama: J.vargottama(chart),
      combust: J.combustion(chart),
      war: J.planetaryWar(chart),
      av: J.ashtakavarga(chart),
      bala: J.shadbala(chart),
      yogas: J.yogas(chart),
      doshas: J.doshas(chart, jdNow),
      avakhada: J.avakhada(chart)
    };
    return chart;
  }

  /* ---------- Vimshottari dasha ------------------------------------------ */

  function vimshottari(moonLon, birthJD) {
    var nak = nakOf(moonLon);
    var frac = (A.norm360(moonLon) % NAK_ARC) / NAK_ARC;       // elapsed in nakshatra
    var startIdx = nak % 9;
    var firstLord = D.DASHA_ORDER[startIdx];
    var balance = (1 - frac) * D.DASHA_YEARS[firstLord];

    var seq = [], jd = birthJD - frac * D.DASHA_YEARS[firstLord] * SIDEREAL_YEAR;
    for (var i = 0; i < 12; i++) {
      var lord = D.DASHA_ORDER[(startIdx + i) % 9];
      var yrs = D.DASHA_YEARS[lord];
      seq.push({ lord: lord, years: yrs, start: jd, end: jd + yrs * SIDEREAL_YEAR });
      jd += yrs * SIDEREAL_YEAR;
    }
    return { nak: nak, balanceYears: balance, firstLord: firstLord, sequence: seq };
  }

  function dashaAt(dasha, jd) {
    var maha = null, i;
    for (i = 0; i < dasha.sequence.length; i++) {
      if (jd >= dasha.sequence[i].start && jd < dasha.sequence[i].end) { maha = dasha.sequence[i]; break; }
    }
    if (!maha) return null;

    // antardasha: sub-periods in the same order, starting with the maha lord
    var start = D.DASHA_ORDER.indexOf(maha.lord), t = maha.start, antar = null, list = [];
    for (i = 0; i < 9; i++) {
      var lord = D.DASHA_ORDER[(start + i) % 9];
      var len = maha.years * D.DASHA_YEARS[lord] / 120 * SIDEREAL_YEAR;
      var seg = { lord: lord, start: t, end: t + len };
      list.push(seg);
      if (jd >= seg.start && jd < seg.end) antar = seg;
      t += len;
    }
    return { maha: maha, antar: antar, antarList: list };
  }

  /* ---------- panchang ---------------------------------------------------- */

  function panchang(jd, tz) {
    var sunT = A.tropicalLongitude('Sun', jd), moonT = A.tropicalLongitude('Moon', jd);
    var ayan = A.ayanamsa(jd);
    var sunS = A.norm360(sunT - ayan), moonS = A.norm360(moonT - ayan);

    var elong = A.norm360(moonT - sunT);
    var tithiIdx = Math.floor(elong / 12);                 // 0..29
    var tithiFrac = (elong % 12) / 12;
    var paksha = tithiIdx < 15 ? 'Shukla' : 'Krishna';
    var inPaksha = tithiIdx % 15;                          // 0..14
    var tithiName = inPaksha === 14
      ? (paksha === 'Shukla' ? 'Purnima' : 'Amavasya')
      : D.TITHI_NAMES[inPaksha];

    var karanaIdx = Math.floor(elong / 6) + 1;             // 1..60
    var karanaName;
    if (karanaIdx === 1) karanaName = 'Kimstughna';
    else if (karanaIdx <= 57) karanaName = D.KARANA_MOVABLE[(karanaIdx - 2) % 7];
    else karanaName = D.KARANA_FIXED[karanaIdx - 57];

    var yogaIdx = Math.floor(A.norm360(sunS + moonS) / NAK_ARC);

    var local = A.fromJD(jd + tz / 24);
    var weekday = ((Math.floor(jd + tz / 24 + 0.5) % 7) + 7 + 1) % 7; // 0 = Sunday

    // lunar month is named for the solar sign the preceding new moon fell in
    var nm = A.lastNewMoon(jd);
    var sunSignAtNM = signOf(A.siderealLongitude('Sun', nm));
    var monthIdx = (sunSignAtNM + 1) % 12;

    var ritu = D.RITUS.filter(function (r) { return r.months.indexOf(monthIdx) >= 0; })[0];

    // Vikram/Shaka years roll over at Chaitra Shukla Pratipada (Mar-Apr)
    var beforeChaitra = (local.m <= 3 && monthIdx >= 9);
    var vikram = local.y + (beforeChaitra ? 56 : 57);
    var shaka = local.y - (beforeChaitra ? 79 : 78);

    var illum = (1 - A.cosd(elong)) / 2;

    return {
      jd: jd,
      tithiIdx: tithiIdx, tithiNum: inPaksha + 1, tithiName: tithiName, tithiFrac: tithiFrac,
      paksha: paksha,
      nak: nakOf(moonS), nakName: D.NAKSHATRAS[nakOf(moonS)].n,
      yogaIdx: yogaIdx, yogaName: D.YOGA_NAMES[yogaIdx],
      karanaName: karanaName,
      vara: D.VARA[weekday],
      monthIdx: monthIdx, monthName: D.LUNAR_MONTHS[monthIdx],
      ritu: ritu, vikram: vikram, shaka: shaka,
      sunSign: signOf(sunS), moonSign: signOf(moonS),
      sunLon: sunS, moonLon: moonS,
      illum: illum,
      phaseName: phaseName(elong),
      elong: elong,
      nextNew: A.nextNewMoon(jd), nextFull: A.nextFullMoon(jd)
    };
  }

  function phaseName(elong) {
    if (elong < 12 || elong >= 348) return 'New Moon';
    if (elong < 78)  return 'Waxing Crescent';
    if (elong < 102) return 'First Quarter';
    if (elong < 168) return 'Waxing Gibbous';
    if (elong < 192) return 'Full Moon';
    if (elong < 258) return 'Waning Gibbous';
    if (elong < 282) return 'Last Quarter';
    return 'Waning Crescent';
  }

  /* ---------- Chinese sexagenary ------------------------------------------ */

  // Chinese New Year always falls between 21 Jan and 20 Feb: take the first
  // new moon on or after 20.5 Jan, evaluated in China standard time.
  function chineseNewYear(year) {
    return A.nextNewMoon(A.toJD(year, 1, 20, 12) - 8 / 24);
  }

  function chinesePillars(y, m, d, hh, mm, tz) {
    var jd = A.localToJD(y, m, d, hh, mm, tz);
    var cny = chineseNewYear(y);
    var yearNum = (jd >= cny) ? y : y - 1;

    var aIdx = ((yearNum - 4) % 12 + 12) % 12;
    var sIdx = ((yearNum - 4) % 10 + 10) % 10;
    var elIdx = Math.floor(sIdx / 2);

    // solar month branch: the Tiger month opens at Sun tropical longitude 315
    var sunT = A.tropicalLongitude('Sun', jd);
    var k = Math.floor(A.norm360(sunT - 315) / 30);
    var monthBranch = (k + 2) % 12;

    // day pillar from the continuous 60-day cycle
    var jdn = Math.floor(jd + tz / 24 + 0.5);
    var sx = ((jdn + 49) % 60 + 60) % 60;

    return {
      year: yearNum,
      animal: D.CN_ANIMALS[aIdx], animalIdx: aIdx,
      element: D.CN_ELEMENTS[elIdx],
      polarity: (yearNum % 2 === 0) ? 'Yang' : 'Yin',
      stem: D.CN_STEMS[sIdx], branch: D.CN_BRANCHES[aIdx],
      monthAnimal: D.CN_ANIMALS[monthBranch], monthBranchIdx: monthBranch,
      dayAnimal: D.CN_ANIMALS[sx % 12], dayBranchIdx: sx % 12,
      dayStem: D.CN_STEMS[sx % 10],
      dayElement: D.CN_ELEMENTS[Math.floor((sx % 10) / 2)],
      newYear: cny
    };
  }

  // relationship between two animal indices
  function animalRelation(a, b) {
    if (a === b) return { key: 'same', score: 0.5, t: 'your own sign - a period of self-definition, powerful but self-conscious' };
    if ((a - b + 12) % 12 === 6) return { key: 'clash', score: -1.5, t: 'a direct clash (chong) - expect movement, disruption and forced change' };
    var trine = D.CN_TRINES.filter(function (g) { return g.indexOf(a) >= 0; })[0];
    if (trine && trine.indexOf(b) >= 0) return { key: 'trine', score: 1.5, t: 'a trine ally (san he) - one of the most supportive pairings in the cycle' };
    // six harmonies (liu he)
    if ((a + b) % 12 === 1) return { key: 'harmony', score: 1.2, t: 'a secret-friend harmony (liu he) - quiet, behind-the-scenes support' };
    if ((a - b + 12) % 12 === 3 || (b - a + 12) % 12 === 3) return { key: 'po', score: -0.6, t: 'a destruction angle (po) - small erosions rather than sharp blows, so keep agreements tight' };
    return { key: 'neutral', score: 0.2, t: 'neutral - what you get here is what you build' };
  }

  /* ---------- tara & chandra bala ----------------------------------------- */

  function taraBala(natalNak, transitNak) {
    var count = ((transitNak - natalNak + 27) % 27);
    return { idx: count % 9, info: D.TARA_BALA[count % 9], count: count + 1 };
  }

  function chandraBala(natalMoonSign, transitMoonSign) {
    var n = ((transitMoonSign - natalMoonSign + 12) % 12) + 1;
    var good = [1, 3, 6, 7, 10, 11].indexOf(n) >= 0;
    return { num: n, good: good };
  }

  root.Kundli = {
    signOf: signOf, degInSign: degInSign, nakOf: nakOf, padaOf: padaOf, dms: dms,
    houseFrom: houseFrom, relation: relation, dignityOf: dignityOf,
    aspectsCast: aspectsCast, buildChart: buildChart,
    vimshottari: vimshottari, dashaAt: dashaAt,
    attachDeep: attachDeep,
    panchang: panchang, phaseName: phaseName,
    chineseNewYear: chineseNewYear, chinesePillars: chinesePillars,
    animalRelation: animalRelation, taraBala: taraBala, chandraBala: chandraBala,
    NAK_ARC: NAK_ARC, SIDEREAL_YEAR: SIDEREAL_YEAR
  };
})(window);
