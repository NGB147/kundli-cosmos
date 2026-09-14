/* Regression over quotes.js: every verse well-formed, the daily pick stable
   for a date and spread across the year, and the farewell pick responsive to
   what was asked. */
const fs = require('fs');
const root = {};
new Function('window', fs.readFileSync('site/assets/js/quotes.js', 'utf8'))(root);
const Q = root.Quotes;
let fail = 0;
const bad = (m) => { console.log('FAIL ' + m); fail++; };

/* --- shape --- */
const THEMES = new Set();
Q.ALL.forEach((q, i) => {
  if (!q.t || !q.s || !q.tr || !Array.isArray(q.th) || !q.th.length) return bad('shape at ' + i);
  if (!/[.!?”]$/.test(q.t)) bad('verse ' + i + ' has no end punctuation: ' + q.t);
  if (q.t.length > 220) bad('verse ' + i + ' is too long (' + q.t.length + ' chars)');
  if (/\s\s/.test(q.t) || /\s\s/.test(q.s)) bad('double space at ' + i);
  if (q.t !== q.t.trim()) bad('untrimmed at ' + i);
  q.th.forEach((t) => THEMES.add(t));
});
const texts = Q.ALL.map((q) => q.t);
if (new Set(texts).size !== texts.length) bad('duplicate verse text');

/* every theme the farewell can ask for must be reachable */
const wanted = new Set();
Object.values(Q.THEMES).forEach((d) => ['up', 'down', 'mid'].forEach((k) => d[k].forEach((t) => wanted.add(t))));
[...wanted].forEach((t) => { if (!THEMES.has(t)) bad('theme "' + t + '" is requested but no verse carries it'); });

/* --- the daily verse --- */
const d1 = Q.daily(new Date(2026, 8, 14)), d2 = Q.daily(new Date(2026, 8, 14));
if (d1.idx !== d2.idx) bad('daily verse is not stable within a day');
if (Q.daily(new Date(2026, 8, 15)).idx === d1.idx) bad('daily verse did not change overnight');
const seen = new Set();
for (let i = 0; i < 365; i++) seen.add(Q.daily(new Date(2026, 0, 1 + i)).idx);
if (seen.size < Q.ALL.length * 0.55) bad('daily spread is poor: ' + seen.size + ' of ' + Q.ALL.length + ' in a year');

/* --- random --- */
for (let i = 0; i < 400; i++) if (Q.random(3).idx === 3) bad('random returned the excluded index');

/* --- the farewell --- */
const domains = Object.keys(Q.THEMES);
const verdicts = ['strong', 'favor', 'mixed', 'caution', 'hard'];
const picks = new Set();
domains.forEach((dom) => verdicts.forEach((v) => {
  const a = [{ domainId: dom, verdictKey: v, question: 'q' }];
  const p1 = Q.farewell(a, -1), p2 = Q.farewell(a, -1);
  if (p1.idx !== p2.idx) bad('farewell not deterministic for ' + dom + '/' + v);
  if (!p1.q) return bad('farewell returned nothing for ' + dom + '/' + v);
  picks.add(p1.idx);
  // the pick must actually carry one of the themes the answer called for
  if (!p1.q.th.some((t) => p1.themes.indexOf(t) >= 0)) {
    bad('farewell for ' + dom + '/' + v + ' picked an off-theme verse: ' + p1.q.t);
  }
  if (Q.farewell(a, p1.idx).idx === p1.idx) bad('farewell ignored avoidIdx for ' + dom + '/' + v);
}));
if (picks.size < 12) bad('farewell is not discriminating: only ' + picks.size + ' distinct verses over 40 cases');

/* no questions asked at all still returns something */
if (!Q.farewell([], -1).q) bad('farewell with no answers returned nothing');
if (!Q.farewell(null, -1).q) bad('farewell with null returned nothing');
/* an unknown domain must not crash or produce an empty theme set */
if (!Q.farewell([{ domainId: 'nonsense', verdictKey: 'mixed' }], -1).q) bad('farewell broke on an unknown domain');

/* a cautious answer and a favourable one on the same area should differ */
let differ = 0;
domains.forEach((dom) => {
  const up = Q.farewell([{ domainId: dom, verdictKey: 'strong', question: 'x' }], -1).idx;
  const dn = Q.farewell([{ domainId: dom, verdictKey: 'hard', question: 'x' }], -1).idx;
  if (up !== dn) differ++;
});
if (differ < domains.length - 1) bad('verdict barely changes the farewell: ' + differ + '/' + domains.length);

console.log(fail ? fail + ' FAILURES' : 'quotes: ' + Q.ALL.length + ' verses, ' +
  THEMES.size + ' themes, ' + seen.size + ' used across a year, ' +
  picks.size + ' distinct farewells over 40 cases, ' + differ + '/' + domains.length +
  ' areas change verse with the verdict - all checks pass');
process.exit(fail ? 1 : 0);
