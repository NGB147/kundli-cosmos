/* ============================================================================
   astro.js - compact geocentric ephemeris for the browser
   Sun & Moon: Meeus, Astronomical Algorithms (ch. 25 & 47, truncated series)
   Planets:    JPL approximate Keplerian elements, valid ~1800-2050
   Sidereal:   Lahiri (Chitrapaksha) ayanamsa
   No dependencies. All angles in degrees unless noted.
============================================================================ */
(function (root) {
  'use strict';

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function norm180(x) { x = norm360(x); return x > 180 ? x - 360 : x; }
  function sind(d) { return Math.sin(d * D2R); }
  function cosd(d) { return Math.cos(d * D2R); }
  function tand(d) { return Math.tan(d * D2R); }

  /* ---------- time ---------------------------------------------------- */

  // Calendar date (UT) -> Julian Day. Gregorian only (site is 1900+).
  function toJD(y, m, d, h, mi, s) {
    h = h || 0; mi = mi || 0; s = s || 0;
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) +
           d + B - 1524.5 + (h + mi / 60 + s / 3600) / 24;
  }

  function fromJD(jd) {
    var z = Math.floor(jd + 0.5), f = jd + 0.5 - z;
    var A = z;
    if (z >= 2299161) {
      var alpha = Math.floor((z - 1867216.25) / 36524.25);
      A = z + 1 + alpha - Math.floor(alpha / 4);
    }
    var B = A + 1524, C = Math.floor((B - 122.1) / 365.25),
        D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
    var day = B - D - Math.floor(30.6001 * E) + f;
    var month = E < 14 ? E - 1 : E - 13;
    var year = month > 2 ? C - 4716 : C - 4715;
    var di = Math.floor(day), frac = day - di, hours = frac * 24;
    return {
      y: year, m: month, d: di,
      h: Math.floor(hours),
      mi: Math.floor((hours - Math.floor(hours)) * 60)
    };
  }

  // Local civil date/time + UTC offset (hours, e.g. 5.5) -> JD
  function localToJD(y, m, d, hh, mm, tzHours) {
    return toJD(y, m, d, hh, mm, 0) - tzHours / 24;
  }

  function centuries(jd) { return (jd - 2451545.0) / 36525.0; }

  /* ---------- obliquity & nutation ------------------------------------ */

  function meanObliquity(T) {
    return 23.439291111 - 0.0130041667 * T - 1.6667e-7 * T * T + 5.02778e-7 * T * T * T;
  }

  function nutationLon(T) { // arcseconds -> degrees
    var Om = 125.04452 - 1934.136261 * T;
    var L  = 280.4665 + 36000.7698 * T;
    var Lm = 218.3165 + 481267.8813 * T;
    return (-17.20 * sind(Om) - 1.32 * sind(2 * L) -
              0.23 * sind(2 * Lm) + 0.21 * sind(2 * Om)) / 3600;
  }

  /* ---------- ayanamsa (Lahiri / Chitrapaksha) ------------------------- */
  // Fitted to the published Lahiri series; < 0.01 deg over 1900-2100.
  function ayanamsa(jd) {
    var T = centuries(jd);
    return 23.85304 + 1.396420 * T + 0.0000309 * T * T;
  }

  /* ---------- Sun (Meeus ch. 25) --------------------------------------- */

  function sunLongitude(jd) {
    var T = centuries(jd);
    var L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    var M  = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    var C  = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(M) +
             (0.019993 - 0.000101 * T) * sind(2 * M) +
              0.000289 * sind(3 * M);
    var Om = 125.04 - 1934.136 * T;
    return norm360(L0 + C - 0.00569 - 0.00478 * sind(Om));
  }

  /* ---------- Moon (Meeus ch. 47, 35 leading terms) --------------------- */

  // [D, M, Mprime, F, coefficient in 1e-6 degrees]
  var MOON_TERMS = [
    [0,0,1,0, 6288774],[2,0,-1,0, 1274027],[2,0,0,0, 658314],[0,0,2,0, 213618],
    [0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,  58793],[2,-1,-1,0, 57066],
    [2,0,1,0,   53322],[2,-1,0,0,  45758],[0,1,-1,0,-40923],[1,0,0,0, -34720],
    [0,1,1,0,  -30383],[2,0,0,-2,  15327],[0,0,1,2, -12528],[0,0,1,-2, 10980],
    [4,0,-1,0,  10675],[0,0,3,0,   10034],[4,0,-2,0,   8548],[2,1,-1,0, -7888],
    [2,1,0,0,   -6766],[1,0,-1,0,  -5163],[1,1,0,0,    4987],[2,-1,1,0,  4036],
    [2,0,2,0,    3994],[4,0,0,0,    3861],[2,0,-3,0,   3665],[0,1,-2,0, -2689],
    [2,0,-1,2,  -2602],[2,-1,-2,0,  2390],[1,0,1,0,   -2348],[2,-2,0,0,  2236],
    [0,1,2,0,   -2120],[0,2,0,0,   -2069],[2,-2,-1,0,  2048]
  ];

  function moonLongitude(jd) {
    var T = centuries(jd), T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    var Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000);
    var D  = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000);
    var M  = norm360(357.5291092 +  35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000);
    var Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000);
    var F  = norm360( 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000);
    var E  = 1 - 0.002516 * T - 0.0000074 * T2;

    var sum = 0;
    for (var i = 0; i < MOON_TERMS.length; i++) {
      var t = MOON_TERMS[i];
      var arg = t[0] * D + t[1] * M + t[2] * Mp + t[3] * F;
      var coef = t[4];
      var am = Math.abs(t[1]);
      if (am === 1) coef *= E; else if (am === 2) coef *= E * E;
      sum += coef * sind(arg);
    }
    var A1 = norm360(119.75 + 131.849 * T);
    var A2 = norm360(53.09 + 479264.290 * T);
    sum += 3958 * sind(A1) + 1962 * sind(Lp - F) + 318 * sind(A2);

    return norm360(Lp + sum / 1000000 + nutationLon(T));
  }

  // Mean ascending node = Rahu (Vedic standard uses the mean node)
  function rahuLongitude(jd) {
    var T = centuries(jd);
    return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T +
                   T * T * T / 467441 - T * T * T * T / 60616000);
  }

  /* ---------- Planets (JPL approximate elements) ------------------------ */

  // a, e, I, L, longPeri, longNode  +  per-century rates
  var PLANETS = {
    Mercury: [ 0.38709927, 0.20563593, 7.00497902, 252.25032350,  77.45779628,  48.33076593,
               0.00000037, 0.00001906,-0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    Venus:   [ 0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718,  76.67984255,
               0.00000390,-0.00004107,-0.00078890,  58517.81538729, 0.00268329, -0.27769418],
    Earth:   [ 1.00000261, 0.01671123,-0.00001531, 100.46457166, 102.93768193,   0.0,
               0.00000562,-0.00004392,-0.01294668,  35999.37244981, 0.32327364,  0.0],
    Mars:    [ 1.52371034, 0.09339410, 1.84969142,  -4.55343205, -23.94362959,  49.55953891,
               0.00001847, 0.00007882,-0.00813131,  19140.30268499, 0.44441088, -0.29257343],
    Jupiter: [ 5.20288700, 0.04838624, 1.30439695,  34.39644051,  14.72847983, 100.47390909,
              -0.00011607,-0.00013253,-0.00183714,   3034.74612775, 0.21252668,  0.20469106],
    Saturn:  [ 9.53667594, 0.05386179, 2.48599187,  49.95424423,  92.59887831, 113.66242448,
              -0.00125060,-0.00050991, 0.00193609,   1222.49362201,-0.41897216, -0.28867794]
  };

  function heliocentric(name, T) {
    var p = PLANETS[name];
    var a = p[0] + p[6] * T,
        e = p[1] + p[7] * T,
        I = p[2] + p[8] * T,
        L = p[3] + p[9] * T,
        wb = p[4] + p[10] * T,
        Om = p[5] + p[11] * T;
    var w = wb - Om;
    var M = norm180(L - wb);

    // Kepler, Newton-Raphson (degrees)
    var estar = e * R2D, E = M + estar * sind(M);
    for (var k = 0; k < 12; k++) {
      var dM = M - (E - estar * sind(E));
      var dE = dM / (1 - e * cosd(E));
      E += dE;
      if (Math.abs(dE) < 1e-9) break;
    }
    var xp = a * (cosd(E) - e);
    var yp = a * Math.sqrt(1 - e * e) * sind(E);

    var cw = cosd(w), sw = sind(w), cO = cosd(Om), sO = sind(Om), cI = cosd(I), sI = sind(I);
    return {
      x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
      y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
      z: (sw * sI) * xp + (cw * sI) * yp
    };
  }

  // Geocentric ecliptic longitude of date (tropical)
  function planetLongitude(name, jd) {
    var T = centuries(jd);
    var p = heliocentric(name, T), e = heliocentric('Earth', T);
    var dx = p.x - e.x, dy = p.y - e.y;
    var lonJ2000 = norm360(Math.atan2(dy, dx) * R2D);
    var precession = 1.396971 * T + 0.0003086 * T * T; // J2000 ecliptic -> ecliptic of date
    return norm360(lonJ2000 + precession);
  }

  /* ---------- unified longitude accessor -------------------------------- */

  var BODY_ORDER = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];

  function tropicalLongitude(body, jd) {
    switch (body) {
      case 'Sun':  return sunLongitude(jd);
      case 'Moon': return moonLongitude(jd);
      case 'Rahu': return rahuLongitude(jd);
      case 'Ketu': return norm360(rahuLongitude(jd) + 180);
      default:     return planetLongitude(body, jd);
    }
  }

  function siderealLongitude(body, jd) {
    return norm360(tropicalLongitude(body, jd) - ayanamsa(jd));
  }

  // Rahu/Ketu are always retrograde; others compared across one day.
  function isRetrograde(body, jd) {
    if (body === 'Rahu' || body === 'Ketu') return true;
    if (body === 'Sun' || body === 'Moon') return false;
    var a = tropicalLongitude(body, jd - 0.5), b = tropicalLongitude(body, jd + 0.5);
    return norm180(b - a) < 0;
  }

  function dailySpeed(body, jd) {
    var a = tropicalLongitude(body, jd - 0.5), b = tropicalLongitude(body, jd + 0.5);
    return norm180(b - a);
  }

  /* ---------- sidereal time & ascendant --------------------------------- */

  function gmst(jd) {
    var T = centuries(jd);
    return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) +
                   0.000387933 * T * T - T * T * T / 38710000);
  }

  // Tropical ascendant for a JD, geographic latitude and east-positive longitude
  function ascendantTropical(jd, latDeg, lonEastDeg) {
    var lst = norm360(gmst(jd) + lonEastDeg);          // RAMC in degrees
    var eps = meanObliquity(centuries(jd));
    var y = cosd(lst);
    var x = -(sind(lst) * cosd(eps) + tand(latDeg) * sind(eps));
    return norm360(Math.atan2(y, x) * R2D);
  }

  function ascendantSidereal(jd, latDeg, lonEastDeg) {
    return norm360(ascendantTropical(jd, latDeg, lonEastDeg) - ayanamsa(jd));
  }

  // Midheaven (10th cusp), tropical
  function midheavenTropical(jd, lonEastDeg) {
    var lst = norm360(gmst(jd) + lonEastDeg);
    var eps = meanObliquity(centuries(jd));
    return norm360(Math.atan2(sind(lst), cosd(lst) * cosd(eps)) * R2D);
  }

  /* ---------- event solvers (new moon, solstice) ------------------------ */

  // Solve f(jd) == 0 by bisection on a bracketed interval.
  function bisect(f, lo, hi, tol) {
    var flo = f(lo), fhi = f(hi), mid, fm;
    if (flo * fhi > 0) return null;
    for (var i = 0; i < 60; i++) {
      mid = (lo + hi) / 2; fm = f(mid);
      if (Math.abs(hi - lo) < (tol || 1e-5)) break;
      if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }

  // Signed elongation, wrapped to (-180, 180]. It rises through 0 at the new
  // moon and wraps at +/-180 at the full moon, so only the ASCENDING crossing
  // marks conjunction.
  function elong(t) { return norm180(moonLongitude(t) - sunLongitude(t)); }
  function opp(t) { return norm180(moonLongitude(t) - sunLongitude(t) - 180); }

  // Most recent new moon at or before jd
  function lastNewMoon(jd) {
    var t = jd;
    for (var i = 0; i < 130; i++) {           // step back in quarter days
      var a = t - 0.25;
      if (elong(a) < 0 && elong(t) >= 0) {
        var r = bisect(elong, a, t, 1e-5);
        if (r !== null) return r;
      }
      t = a;
    }
    return jd - 15;
  }

  function nextNewMoon(jd) {
    var t = jd;
    for (var i = 0; i < 140; i++) {
      var b = t + 0.25;
      if (elong(t) < 0 && elong(b) >= 0) {
        var r = bisect(elong, t, b, 1e-5);
        if (r !== null) return r;
      }
      t = b;
    }
    return jd + 30;
  }

  function nextFullMoon(jd) {
    var t = jd;
    for (var i = 0; i < 140; i++) {
      var b = t + 0.25;
      if (opp(t) < 0 && opp(b) >= 0) {
        var r = bisect(opp, t, b, 1e-5);
        if (r !== null) return r;
      }
      t = b;
    }
    return jd + 30;
  }

  // December solstice of a given year (Sun tropical longitude = 270)
  function decemberSolstice(year) {
    var f = function (t) { return norm180(sunLongitude(t) - 270); };
    var lo = toJD(year, 12, 18), hi = toJD(year, 12, 26);
    var r = bisect(f, lo, hi, 1e-5);
    return r === null ? toJD(year, 12, 21, 12) : r;
  }

  root.Astro = {
    D2R: D2R, R2D: R2D,
    norm360: norm360, norm180: norm180, sind: sind, cosd: cosd, tand: tand,
    toJD: toJD, fromJD: fromJD, localToJD: localToJD, centuries: centuries,
    meanObliquity: meanObliquity, ayanamsa: ayanamsa,
    sunLongitude: sunLongitude, moonLongitude: moonLongitude, rahuLongitude: rahuLongitude,
    planetLongitude: planetLongitude,
    tropicalLongitude: tropicalLongitude, siderealLongitude: siderealLongitude,
    isRetrograde: isRetrograde, dailySpeed: dailySpeed,
    gmst: gmst, ascendantTropical: ascendantTropical, ascendantSidereal: ascendantSidereal,
    midheavenTropical: midheavenTropical,
    bisect: bisect, lastNewMoon: lastNewMoon, nextNewMoon: nextNewMoon,
    nextFullMoon: nextFullMoon, decemberSolstice: decemberSolstice,
    BODY_ORDER: BODY_ORDER
  };
})(window);
