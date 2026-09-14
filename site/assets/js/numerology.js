/* ============================================================================
   numerology.js - Pythagorean core numbers, Chaldean name number, the
   Lo Shu grid, the Feng Shui Kua number, and personal cycles.

   Inputs it needs beyond the birth date:
     - full name AT BIRTH  (Expression, Soul Urge, Personality, Karmic
                            Lessons, Hidden Passion - all read the birth name)
     - name used NOW        (Chaldean number and the "current name" energy;
                            optional, falls back to the birth name)
     - gender               (only for the Kua number, which is defined
                            differently for men and women; optional)

   Every number below is a deterministic function of those inputs.
============================================================================ */
(function (root) {
  'use strict';

  var A = root.Astro, K = root.Kundli;

  /* ---------- letter tables --------------------------------------------- */

  // Pythagorean: A=1 ... I=9, then repeat
  function pyth(ch) {
    var c = ch.toUpperCase().charCodeAt(0);
    if (c < 65 || c > 90) return 0;
    return ((c - 65) % 9) + 1;
  }
  // Chaldean: sound-based values, no letter is 9
  var CHALD = { A:1,B:2,C:3,D:4,E:5,F:8,G:3,H:5,I:1,J:1,K:2,L:3,M:4,N:5,O:7,P:8,
                Q:1,R:2,S:3,T:4,U:6,V:6,W:6,X:5,Y:1,Z:7 };
  function chald(ch) { return CHALD[ch.toUpperCase()] || 0; }

  var MASTERS = [11, 22, 33];

  function digitSum(n) {
    return String(Math.abs(n)).split('').reduce(function (a, c) { return a + (+c); }, 0);
  }
  // reduce to a single digit, keeping master numbers
  function reduce(n, keepMasters) {
    if (keepMasters === undefined) keepMasters = true;
    while (n > 9 && !(keepMasters && MASTERS.indexOf(n) >= 0)) n = digitSum(n);
    return n;
  }
  function reduceHard(n) { return reduce(n, false); }

  /* Y is a vowel when it is not next to another vowel ("Yash" -> Y is a
     consonant, "Lynn" -> Y is a vowel). Good enough for Indian and Western
     names alike, and it is the rule most numerologists actually use. */
  function isVowel(word, i) {
    var ch = word[i].toUpperCase();
    if ('AEIOU'.indexOf(ch) >= 0) return true;
    if (ch !== 'Y') return false;
    var prev = i > 0 ? word[i - 1].toUpperCase() : '', next = i < word.length - 1 ? word[i + 1].toUpperCase() : '';
    return 'AEIOU'.indexOf(prev) < 0 && 'AEIOU'.indexOf(next) < 0;
  }

  function cleanName(name) {
    return String(name || '').toUpperCase().replace(/[^A-Z\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  }

  /* ---------- the core numbers ------------------------------------------- */

  function nameNumber(words, filter) {
    // each word reduced on its own, then the reductions summed: the
    // traditional method, and it changes the answer versus a flat sum
    var raw = 0, perWord = [];
    words.forEach(function (w) {
      var s = 0;
      for (var i = 0; i < w.length; i++) if (filter(w, i)) s += pyth(w[i]);
      perWord.push(reduce(s));
      raw += s;
    });
    var total = perWord.reduce(function (a, b) { return a + b; }, 0);
    return { value: reduce(total), raw: raw, perWord: perWord };
  }

  function karmicDebt(rawValues) {
    var debts = [];
    rawValues.forEach(function (v) {
      if ([13, 14, 16, 19].indexOf(v) >= 0 && debts.indexOf(v) < 0) debts.push(v);
    });
    return debts;
  }

  function core(birth, fullName, usedName, nowDate) {
    var words = cleanName(fullName || birth.name);
    var usedWords = cleanName(usedName || fullName || birth.name);

    var m = reduce(birth.m), d = reduce(birth.d), y = reduce(birth.y);
    var lifePathRaw = m + d + y;
    var lifePath = reduce(lifePathRaw);
    var birthday = reduce(birth.d);

    var expression = nameNumber(words, function () { return true; });
    var soul = nameNumber(words, isVowel);
    var personality = nameNumber(words, function (w, i) { return !isVowel(w, i); });
    var maturity = reduce(lifePath + expression.value);

    // karmic lessons: which of 1-9 never appear in the birth name
    var counts = {};
    for (var n = 1; n <= 9; n++) counts[n] = 0;
    words.join('').split('').forEach(function (ch) { var v = pyth(ch); if (v) counts[v]++; });
    var lessons = [], hidden = 1, hiddenCount = -1;
    for (n = 1; n <= 9; n++) {
      if (!counts[n]) lessons.push(n);
      if (counts[n] > hiddenCount) { hiddenCount = counts[n]; hidden = n; }
    }

    // challenges and pinnacles: always hard-reduced, masters do not apply
    var mm = reduceHard(birth.m), dd = reduceHard(birth.d), yy = reduceHard(birth.y);
    var ch1 = Math.abs(mm - dd), ch2 = Math.abs(dd - yy);
    var challenges = [ch1, ch2, Math.abs(ch1 - ch2), Math.abs(mm - yy)];
    var p1 = reduce(mm + dd), p2 = reduce(dd + yy);
    var pinnacles = [p1, p2, reduce(p1 + p2), reduce(mm + yy)];
    var firstEnd = 36 - reduceHard(lifePath);
    var pinnacleAges = [[0, firstEnd], [firstEnd + 1, firstEnd + 9],
                        [firstEnd + 10, firstEnd + 18], [firstEnd + 19, 200]];

    // personal cycles for "now"
    var py = reduce(reduce(birth.m) + reduce(birth.d) + reduce(nowDate.y));
    var pm = reduce(py + reduce(nowDate.m));
    var pd = reduce(pm + reduce(nowDate.d));
    var age = nowDate.y - birth.y - ((nowDate.m < birth.m || (nowDate.m === birth.m && nowDate.d < birth.d)) ? 1 : 0);
    var pinnacleNow = 0;
    for (n = 0; n < 4; n++) if (age >= pinnacleAges[n][0] && age <= pinnacleAges[n][1]) pinnacleNow = n;

    // Chaldean, on the name in use, compound and reduced
    var chaldRaw = 0;
    usedWords.join('').split('').forEach(function (c) { chaldRaw += chald(c); });
    var chaldCompound = chaldRaw;
    while (chaldCompound > 52) chaldCompound = digitSum(chaldCompound);   // compound stays two digits
    var chaldSingle = reduceHard(chaldRaw);

    return {
      words: words, usedWords: usedWords,
      lifePath: lifePath, lifePathRaw: lifePathRaw, birthday: birthday,
      expression: expression.value, soulUrge: soul.value, personality: personality.value,
      maturity: maturity,
      karmicDebt: karmicDebt([lifePathRaw, expression.raw, soul.raw, personality.raw, birth.d]),
      lessons: lessons, hiddenPassion: hidden, letterCounts: counts,
      challenges: challenges, pinnacles: pinnacles, pinnacleAges: pinnacleAges, pinnacleNow: pinnacleNow,
      personalYear: py, personalMonth: pm, personalDay: pd, age: age,
      chaldean: { compound: chaldCompound, single: chaldSingle, raw: chaldRaw },
      loShu: loShu(birth),
      lucky: LUCKY[reduceHard(lifePath)]
    };
  }

  /* ---------- Lo Shu grid ------------------------------------------------ */
  // digits of DDMMYYYY placed on the 3x3 magic square; zeros are ignored
  var LOSHU_POS = { 4:[0,0], 9:[0,1], 2:[0,2], 3:[1,0], 5:[1,1], 7:[1,2], 8:[2,0], 1:[2,1], 6:[2,2] };
  var ARROWS = [
    { cells:[4,9,2], name:'Arrow of Intellect',    t:'thinks clearly and remembers well' },
    { cells:[3,5,7], name:'Arrow of Emotion',      t:'feels things deeply and shows it' },
    { cells:[8,1,6], name:'Arrow of Practicality', t:'gets things done, hands-on' },
    { cells:[4,3,8], name:'Arrow of Planning',     t:'plans ahead and follows through' },
    { cells:[9,5,1], name:'Arrow of Will',         t:'strong will, hard to deflect' },
    { cells:[2,7,6], name:'Arrow of Action',       t:'acts fast, sometimes before thinking' },
    { cells:[4,5,6], name:'Arrow of Determination',t:'persists where others give up' },
    { cells:[2,5,8], name:'Arrow of Balance',      t:'stays steady under pressure' }
  ];
  function loShu(birth) {
    var digits = (String(birth.d).padStart(2, '0') + String(birth.m).padStart(2, '0') + birth.y).split('');
    var count = {};
    for (var n = 1; n <= 9; n++) count[n] = 0;
    digits.forEach(function (c) { if (+c) count[+c]++; });
    var full = ARROWS.filter(function (a) { return a.cells.every(function (c) { return count[c] > 0; }); });
    var empty = ARROWS.filter(function (a) { return a.cells.every(function (c) { return count[c] === 0; }); });
    var grid = [[0,0,0],[0,0,0],[0,0,0]];
    Object.keys(LOSHU_POS).forEach(function (k) { var p = LOSHU_POS[k]; grid[p[0]][p[1]] = count[k]; });
    return { count: count, grid: grid, arrows: full, missingArrows: empty,
             missing: Object.keys(count).filter(function (k) { return !count[k]; }).map(Number) };
  }

  /* ---------- Kua number ------------------------------------------------- */
  function kua(birth, gender) {
    // the Chinese year, not the calendar year
    var cny = K.chineseNewYear(birth.y);
    var jd = A.localToJD(birth.y, birth.m, birth.d, birth.hh || 12, birth.mm || 0, birth.tz || 5.5);
    var year = jd >= cny ? birth.y : birth.y - 1;
    var s = reduceHard(digitSum(year));
    var g = (gender || '').toLowerCase();
    if (g !== 'male' && g !== 'female') return null;
    var k;
    if (g === 'male') { k = (year >= 2000 ? 9 : 10) - s; if (k === 0) k = 9; if (k === 5) k = 2; }
    else { k = reduceHard((year >= 2000 ? 6 : 5) + s); if (k === 5) k = 8; }
    var east = [1, 3, 4, 9].indexOf(k) >= 0;
    var DIRS = {
      1:['South-East','East','South','North'], 2:['North-East','West','North-West','South-West'],
      3:['South','North','South-East','East'], 4:['North','South','East','South-East'],
      6:['West','North-East','South-West','North-West'], 7:['North-West','South-West','North-East','West'],
      8:['South-West','North-West','West','North-East'], 9:['East','South-East','North','South']
    };
    return { number: k, group: east ? 'East' : 'West', year: year, dirs: DIRS[k],
             labels: ['Wealth (Sheng Chi)', 'Health (Tien Yi)', 'Love (Nien Yen)', 'Growth (Fu Wei)'] };
  }

  /* ---------- meanings --------------------------------------------------- */

  var MEAN = {
    // 0 only arises from a degenerate name - no vowels, or no consonants
    0:  { key:'not formed',     t:'This number cannot be formed from the name as given: it has no consonants, or no vowels. Check the spelling of the birth name.' },
    1:  { key:'the initiator',  t:'Made to start things and to lead. Independent, sometimes to the point of not asking for help you need.' },
    2:  { key:'the diplomat',   t:'Reads people, keeps the peace, works best beside someone. The cost is taking things personally.' },
    3:  { key:'the communicator',t:'Expressive, creative, good company. The work is finishing what you start.' },
    4:  { key:'the builder',    t:'Practical, dependable, in it for the long haul. Rigid when tired; needs to let plans bend.' },
    5:  { key:'the explorer',   t:'Needs change, movement and freedom. Restless in routine, brilliant in a crisis.' },
    6:  { key:'the caretaker',  t:'Responsible, family-first, drawn to fixing things for people. Watch for carrying what is not yours.' },
    7:  { key:'the analyst',    t:'Private, questioning, at home in ideas. Needs solitude to think and can mistake it for isolation.' },
    8:  { key:'the executive',  t:'Ambitious, organised, comfortable with money and authority. The lesson is what power is for.' },
    9:  { key:'the humanitarian',t:'Generous, wide-angled, drawn to causes bigger than yourself. Endings come often and teach the most.' },
    11: { key:'the intuitive',  t:'A 2 turned up loud: highly sensitive, insightful, often ahead of the room. Nervous energy needs grounding.' },
    22: { key:'the master builder', t:'A 4 with a bigger blueprint: capable of building things that outlast you, if the anxiety of scale is managed.' },
    33: { key:'the master teacher', t:'A 6 with the volume up: service and care on a large scale. Rare, and demanding to live.' }
  };
  var LUCKY = {
    1:{ nums:[1,10,19,28], day:'Sunday',    color:'gold, orange' },
    2:{ nums:[2,11,20,29], day:'Monday',    color:'white, cream, green' },
    3:{ nums:[3,12,21,30], day:'Thursday',  color:'yellow, purple' },
    4:{ nums:[4,13,22,31], day:'Sunday',    color:'blue, grey' },
    5:{ nums:[5,14,23],    day:'Wednesday', color:'green, light grey' },
    6:{ nums:[6,15,24],    day:'Friday',    color:'blue, pink' },
    7:{ nums:[7,16,25],    day:'Monday',    color:'green, pale yellow' },
    8:{ nums:[8,17,26],    day:'Saturday',  color:'dark blue, black' },
    9:{ nums:[9,18,27],    day:'Tuesday',   color:'red, crimson' }
  };
  var PERSONAL_YEAR = {
    1:'a year to begin - plant, launch, start the thing',
    2:'a year to wait and build alliances - patience pays, force does not',
    3:'a year to express and expand socially - say yes to visibility',
    4:'a year of work and foundations - unglamorous and necessary',
    5:'a year of change and movement - expect the unexpected, travel, shifts',
    6:'a year of home, duty and relationships - people need you',
    7:'a year to study, rest and reflect - the inner work year',
    8:'a year of money, power and results - what you built pays out or is judged',
    9:'a year of completion and letting go - clear the decks before the next cycle',
    11:'an 11 year - heightened intuition; treat it as a loud 2',
    22:'a 22 year - build big; treat it as a loud 4'
  };
  var CHALLENGE = {
    0:'no fixed challenge - the lesson changes with circumstance',
    1:'learning to stand on your own without becoming defiant',
    2:'learning not to be crushed by other people\'s opinions',
    3:'learning to express yourself instead of scattering or hiding',
    4:'learning discipline without becoming rigid',
    5:'learning freedom without recklessness',
    6:'learning to care without controlling',
    7:'learning to trust what cannot be proven',
    8:'learning a right relationship with money and power'
  };
  var TAROT_MAJOR = ['The Fool','The Magician','The High Priestess','The Empress','The Emperor',
    'The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune',
    'Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star',
    'The Moon','The Sun','Judgement','The World'];
  var TAROT_KEY = ['beginnings, leap of faith','will, skill, making it happen','intuition, what is not said',
    'abundance, nurture, creation','structure, authority, order','tradition, teaching, belonging',
    'choice, union, values','drive, victory through control','courage, patience, inner strength',
    'solitude, search, wisdom','cycles, luck, turning points','fairness, cause and effect',
    'surrender, a new angle','endings that make room','balance, blending, moderation',
    'attachment, appetite, what binds','sudden collapse, then clarity','hope, healing, guidance',
    'illusion, fear, the unconscious','joy, vitality, success','reckoning, calling, renewal',
    'completion, wholeness, arrival'];

  /* Tarot birth cards (the Greer method): MM + DD + first two of YYYY +
     last two of YYYY, digits summed; over 22 sums again; 22 is the Fool. */
  function tarotBirthCards(birth) {
    var yy = String(birth.y).padStart(4, '0');
    var sum = birth.m + birth.d + (+yy.slice(0, 2)) + (+yy.slice(2));
    var n = sum;
    while (n > 22) n = digitSum(n);
    var cards = [];
    var first = n === 22 ? 0 : n;
    cards.push(first);
    var second = digitSum(first);
    if (second !== first && first > 9) cards.push(second);
    // 19 -> 10 -> 1 gives a three-card set
    if (second > 9) { var third = digitSum(second); if (third !== second) cards.push(third); }
    return cards.map(function (i) { return { n: i, name: TAROT_MAJOR[i], key: TAROT_KEY[i] }; });
  }

  root.Numerology = {
    core: core, kua: kua, loShu: loShu, tarotBirthCards: tarotBirthCards,
    reduce: reduce, reduceHard: reduceHard, pyth: pyth, chald: chald, isVowel: isVowel,
    MEAN: MEAN, LUCKY: LUCKY, PERSONAL_YEAR: PERSONAL_YEAR, CHALLENGE: CHALLENGE,
    TAROT_MAJOR: TAROT_MAJOR, TAROT_KEY: TAROT_KEY, ARROWS: ARROWS
  };
})(window);
