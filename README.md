# Jyotish Darpan

A single-page Vedic astrology site that computes a real kundli in the browser, answers up to
three questions from that chart, and gives a monthly reading built from the Hindu panchang,
the Chinese sexagenary cycle and the Western calendar together. It is laid out as one long
scrolling journey through a sky that moves with the visitor.

No backend, no API keys, no tracking. Every number on the page is calculated from the
visitor's birth details in their own browser, and nothing leaves the device.

## The journey

The page is a single scroll, in chapters, over a sky that responds to the visitor
(`assets/js/immersive.js`):

- **Landing** — a verse for the day from one of the world's scriptures (Vedas, Upanishads,
  Gita, Yoga Sutras, Tirukkural, Dhammapada, Jain sutras, Guru Granth Sahib, Tao Te Ching,
  Analects, I Ching, Tanakh, Psalms, Mishnah, Gospels, Quran, Hadith, Rumi, Saadi, Avesta,
  Bahá'í writings, Japanese proverbs — `quotes.js`). The daily verse is the same for everyone
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
reveals as it enters the viewport. Everything honours `prefers-reduced-motion`.

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

## What it actually computes

**Ephemeris** (`assets/js/astro.js`)
- Sun and Moon from Meeus, *Astronomical Algorithms* (ch. 25; all 59 longitude terms of ch. 47)
- Delta T applied (Espenak & Meeus) so body positions run on Terrestrial Time while
  sidereal time and the ascendant stay on Universal Time
- Mercury–Saturn from JPL's approximate Keplerian elements, solved with Newton–Raphson
- Rahu/Ketu from the mean lunar node
- Sidereal (nirayana) positions via the Lahiri / Chitrapaksha ayanamsa
- Ascendant from local sidereal time, obliquity and geographic latitude
- Bisection solvers for new moon, full moon and the December solstice

**Chart** (`assets/js/kundli.js`)
- Whole-sign houses from the lagna, North Indian D-1 rasi chart
- Dignity: exaltation, debilitation, moolatrikona, own sign, and natural friendship
- Graha drishti including the special aspects of Mars, Jupiter, Saturn and the nodes
- Vimshottari dasha to three levels — mahadasha, antardasha, pratyantardasha
- Panchang read at sunrise, as a panchang is actually defined: tithi, paksha, nakshatra, yoga, karana, vara, lunar month, ritu, Vikram and Shaka samvat
- Chinese year/month/day pillars, with Chinese New Year derived from the actual new moon

**Interpretation** (`assets/js/reading.js`)
- Questions are answered by evaluating the relevant house: its lord's dignity and placement,
  occupants, aspects, natural karakas, the running dasha, and live transits — then banded
  into a verdict with timing and an upaya. The same chart and question always give the
  same answer; there is no randomness anywhere.
- The monthly reading layers Vedic gochara from the natal Moon (including Sade Sati),
  the running dasha, the Hindu lunar month, the Chinese year/month animal relationship
  against the birth animal, and Western transits including Mercury retrograde.
- Per-day scoring uses tara bala counted from the native's own janma nakshatra,
  chandra bala, tithi quality and weekday lordship, producing genuinely personal
  favourable and inauspicious dates.

## Geography

Birth place is resolved against the full GeoNames India gazetteer: **557,135 populated
places**, deduplicated, covering every city, town and village, each tagged with its
district and state so identical village names can be told apart. Served in two tiers:

- **Inline** (`site/assets/js/geo-top.js`, 117 KB) — the 2,600 places of population 5,000+,
  searchable with zero network.
- **Sharded** (`site/geo/`, 4,436 files, 17.5 MB) — everything else, adaptively split by
  name prefix so no shard exceeds ~2,500 entries. Fetched only when the inline tier
  cannot answer the query.

Rebuild the gazetteer from a fresh GeoNames dump with:

```bash
node tools/build-geo.cjs IN.txt admin1CodesASCII.txt admin2Codes.txt
```

India's clock history is applied automatically from the birth date, because getting it
wrong moves the lagna by up to a full rashi:

| Period | Offset |
|---|---|
| before 1 Jan 1906 | +5:21:10 (Madras Mean Time) |
| 1 Oct 1941 - 15 May 1942 | +6:30 |
| 1 Sep 1942 - 15 Oct 1945 | +6:30 |
| otherwise | +5:30 |

## Classical layers

Beyond the D-1 chart, the site computes what an astrologer actually judges a kundli on:

- **16 divisional charts** - D-1, D-2, D-3, D-4, D-7, D-9, D-10, D-12, D-16, D-20, D-24,
  D-27, D-30, D-40, D-45, D-60, with vargottama detection
- **Ashtakavarga** - Bhinnashtakavarga for all seven grahas plus Sarvashtakavarga
- **Shadbala** - Sthana, Dig, Kala, Cheshta and Naisargika components against the
  classical minimum for each graha (Drik bala is deliberately omitted)
- **Combustion (asta)** and **graha yuddha**
- **Yogas** - Pancha Mahapurusha, Gaja Kesari, Budha-Aditya, Chandra-Mangala,
  Sunapha/Anapha/Durudhara/Kemadruma, Amala, Neecha Bhanga, Raja, Dhana,
  Vipareeta Raja, Shakata
- **Doshas** - Manglik with classical cancellations, Kaal Sarpa (all 12 named types plus
  partial), Sade Sati with computed phase dates, Shani Dhaiya, Pitra indication
- **Avakhada chakra** - Varna, Vashya, Yoni, Gana, Nadi, Tatva, nakshatra and rashi lords,
  and the nama akshara
- **Muhurtas** - sunrise, sunset, Rahu kaal, Yamaganda, Gulika and Abhijit

All of it feeds the question engine: an answer is scored against the house lord's navamsa
dignity, the SAV bindus of that house, the lord's Shadbala ratio, and any dosha bearing on
the matter - not just the D-1 placement.

**Houses are computed twice.** The rasi chart uses whole-sign houses (the traditional North
Indian drawing). Alongside it, `bhavaChalit()` computes real Sripati cusps by trisecting
each quadrant between the Ascendant, IC, Descendant and MC, and reports every graha that
changes house between the two. Those near-cusp placements are exactly the ones a careless
chart gets wrong.

## The other systems, from the same birth moment

The form asks for three things beyond date, time and place, because these systems need
them — and it says on the form which system needs what:

| Input | Needed by |
|---|---|
| Full name at birth | Numerology: Expression, Soul Urge, Personality, Karmic Lessons, Hidden Passion all read the letters of the given name |
| Name used now (optional) | Chaldean name number; also how the site addresses you |
| Gender (optional) | The Feng Shui Kua number only, which is defined differently for men and women |

**Numerology** (`numerology.js`) — Pythagorean core numbers with master numbers kept (Life
Path, Birthday, Expression, Soul Urge, Personality, Maturity), Personal Year/Month/Day,
Pinnacles with their age spans and the current one flagged, Challenges, Karmic Debt (13/14/16/19
in the raw sums), Karmic Lessons and Hidden Passion, the Chaldean compound and reduced name
number, the Lo Shu grid with its arrows, Kua number and facing directions, and Tarot birth cards
by the Greer method. Y is a vowel only when it is not next to another vowel. Validated against
hand-worked values.

**Western astrology** (`systems.js`) — tropical Sun, Moon, Rising and the five classical planets,
element and modality balance (Sun, Moon and Rising weighted double), and the closest natal
aspects with orbs.

**Chinese Four Pillars** — year, month, day and now the **hour** pillar, with the hour stem from
the day stem (the Five Rats rule), the Day Master and its element, element counts and missing
elements. The month stem is not shown because it needs the exact solar month, which is
approximated.

**Ayurvedic constitution** — the birth nakshatra's nadi mapped to Vata/Pitta/Kapha, with
eat/do/avoid guidance. Presented as a starting point for habits, not a diagnosis.

**The dashboard** — the Overview tab opens with eight at-a-glance cards (rising, Moon, Sun,
current life chapter, life path, Chinese sign, birth card, constitution), a plain-English
portrait synthesised across systems, a "where you are now" block (dasha, personal year,
Chinese year relation, Saturn passes, current pinnacle), then strengths and cautions. The
Chart tab holds the full classical working; the Systems tab holds everything above.

## Written for a person, not an astrologer

The classical layer is accurate but unreadable unless you already know what a
dusthana or a karaka is. `plainspeak.js` translates the same computed values into
ordinary English, and every answer now reads:

1. **The short answer** - a verdict word, a real date window, a confidence level.
2. **In plain words** - what is going on, in three sentences.
3. **Why the chart says this** - signed bullets, no Sanskrit.
4. **What to do about it** - dates to aim at, dates to avoid, the weak link.
5. **How each method voted** - eight methods with plain labels.
6. *Show the traditional reading* - the Sanskrit version, collapsed, for anyone
   who wants it. Nothing was deleted; it was demoted.

Nothing in the plain layer invents a claim - each sentence is a translation of a
value the classical modules already computed. A regression scans generated text
for 49 technical terms and fails if any reach the plain layer: 1,760 answers, zero
leaks.

## The answer people actually read

Every question now opens with a plain-English verdict and a **real date window**, with the
classical working folded away behind a toggle beneath it.

`forecast.js` does three things:

- **`timeline()`** scans 72 months ahead, scoring each month from the running
  dasha/antardasha, the Jupiter and Saturn transits judged from the house in question, and
  that house's Ashtakavarga bindus. It returns dated windows - "Mar 2028 – Jun 2028, peaks
  March 2028" - plus the weakest stretch to avoid.
- **`consensus()`** runs the same question through eight systems independently (Parashari
  natal, Vimshottari dasha, Ashtakavarga, Navamsa, Shadbala, Western transits, Chinese
  zodiac, numerology), normalises each to -1..+1, and reports where they agree and where
  they do not.
- **`plain()`** writes the sentence.

The badge and the headline are driven by **one** combined number - the detailed Parashari
score and the multi-system vote weighted equally - so they can never contradict each other.
The systems are not weighted equally with each other, and the interface says why: the Vedic
layers derive from the exact birth moment and place, while the Chinese zodiac and numerology
use only the birth date, so thousands of people share them. Where the systems genuinely
split, the reading says so instead of manufacturing a verdict.

## Accuracy

Checked against published values:

| Check | Result |
|---|---|
| Planetary longitudes at J2000.0 | within ~1 arcminute |
| New and full moon times (1999-2025) | exact to the minute (was 1 min late before Delta T) |
| December solstice 2025 | 15:01 UT vs 15:03 UT published |
| Chinese New Year 2000–2027 | all 9 sampled dates exact |
| Holi, Ugadi, Diwali tithi + month | correct, with correct Vikram/Shaka years |
| Ascendant (via sunrise reconstruction) | within the expected 3–7 min refraction offset |
| Sunrise / sunset, six cities | within 1–3 min of published |
| Ashtakavarga column totals | 48/49/39/54/56/52/39, sum 337 — exact |
| Navamsa formula | identical to the chara/sthira rule over 360,000 samples |
| Rahu kaal, Delhi Friday | 10:46–12:22 vs published 10:45–12:20 |
| Place coordinates (GeoNames) | within 1–4 km of published city centres |

Valid for births from 1900 to 2035. Latitudes beyond ±66.5° are rejected because the
ascendant is undefined there for part of the year.

Where the visitor does not know their birth time, the chart is cast for noon and the
interface says plainly that the lagna and all house positions are unreliable.

## Running locally

```bash
node serve.cjs
```

Then open <http://localhost:4173>. `serve.cjs` is a development helper only — the
deployed site is the static contents of `site/`.

## Deploying

`netlify.toml` publishes the `site/` directory. There is no build step.

## Files

```
site/
  index.html
  assets/css/style.css
  assets/js/astro.js      ephemeris, sunrise/sunset, India clock history
  assets/js/data.js       rashis, nakshatras, dignities, panchang names, world cities
  assets/js/geo-top.js    generated: the inline tier of the India gazetteer
  assets/js/kundli.js     chart, dasha, panchang, Chinese pillars
  assets/js/jyotish.js    vargas, ashtakavarga, shadbala, yogas, doshas, muhurtas
  assets/js/reading.js    question engine and monthly reading
  assets/js/quotes.js     verses from the world's scriptures, daily and farewell selection
  assets/js/immersive.js  the moving sky, chapters, rail, reveals, progress
  assets/js/app.js        interface: form, chart, today, alignment wheel, questions, month
  geo/                    generated: 4,436 gazetteer shards + manifest
tools/
  build-geo.cjs           rebuilds both gazetteer tiers from a GeoNames dump
```

## A note on what this is

This is a well-built astronomy engine wrapped in a traditional interpretive framework.
The planetary positions are genuinely accurate. The interpretations follow classical
Jyotisha rules faithfully, but astrology itself is not a predictive science, and nothing
here is medical, legal or financial advice.
