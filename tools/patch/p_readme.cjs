const fs=require('fs');const f='README.md';let s=fs.readFileSync(f,'utf8');
function rep(a,b){ if(s.indexOf(a)<0) throw new Error('missing: '+a.slice(0,60)); s=s.replace(a,b); }
rep(`# Jyotish Darpan

A single-page Vedic astrology site that computes a real kundli in the browser, answers up to
three questions from that chart, and gives a monthly reading built from the Hindu panchang,
the Chinese sexagenary cycle and the Western calendar together.`,
`# Jyotish Darpan

A single-page Vedic astrology site that computes a real kundli in the browser, answers up to
three questions from that chart, and gives a monthly reading built from the Hindu panchang,
the Chinese sexagenary cycle and the Western calendar together. It is laid out as one long
scrolling journey through a sky that moves with the visitor.`);

rep(`## What it actually computes`,
`## The journey

The page is a single scroll, in chapters, over a sky that responds to the visitor
(\`assets/js/immersive.js\`):

- **Landing** — a verse for the day from one of the world's scriptures (Vedas, Upanishads,
  Gita, Yoga Sutras, Tirukkural, Dhammapada, Jain sutras, Guru Granth Sahib, Tao Te Ching,
  Analects, I Ching, Tanakh, Psalms, Mishnah, Gospels, Quran, Hadith, Rumi, Saadi, Avesta,
  Bahá'í writings, Japanese proverbs — \`quotes.js\`). The daily verse is the same for everyone
  that day (hashed from the date); "Another verse" draws at random.
- **Begin** — the birth form. A small wheel draws the sky live as the date, time and place
  are typed, so the visitor sees their Moon, Sun and rising sign before casting.
- **Overview → Today → Chart → Sky → Ask → Month → Numbers → Western → Chinese → Lenses**,
  each a numbered chapter with a "Next" at its foot, tiles on the overview, a rail of dots
  on the left (desktop) or a scrolling dock at the bottom (phone) that tracks the scroll,
  and a progress bar along the top.
- **Farewell** — a recap of the questions asked and their verdicts, then a closing verse
  chosen by theme from the life areas asked about and how each was answered (a cautious
  answer on love draws patience; a favourable one on career draws effort and beginnings).

The sky itself: three star layers that drift with the pointer on desktop, with the phone's
tilt (gyroscope) on mobile, and with the scroll position everywhere; a faint zodiac wheel
behind the page that turns as you scroll and carries the natal planets once a chart exists;
a large chapter glyph that drifts at a different rate from the text; and content that
reveals as it enters the viewport. Everything honours \`prefers-reduced-motion\`.

**Today** is a horoscope measured from the visitor's own Moon: the transiting Moon's house
from the natal Moon (chandra bala), the day's star counted from the birth star (tara bala),
tithi and paksha, the weekday lord's friendship with the Moon lord, the numerological
personal day, the Chinese day pillar against the birth animal, and the Moon's house from the
Sun sign for the newspaper reading. A seven-day strip scores the week ahead the same way,
each day read at sunrise over the birth place.

**Sky** is star alignment: a wheel with the birth planets on the inner ring and tonight's on
the outer, the rising sign marked, and any transiting planet within 3° of a natal one joined
by a line and explained in plain words; then the slow planets from the Moon, and a table of
where every planet is tonight.

## What it actually computes`);

rep(`  assets/js/reading.js    question engine and monthly reading
  assets/js/app.js        interface`,
`  assets/js/reading.js    question engine and monthly reading
  assets/js/quotes.js     verses from the world's scriptures, daily and farewell selection
  assets/js/immersive.js  the moving sky, chapters, rail, reveals, progress
  assets/js/app.js        interface: form, chart, today, alignment wheel, questions, month`);
fs.writeFileSync(f,s);console.log('readme ok');
