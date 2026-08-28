# Jyotish Darpan

A single-page Vedic astrology site that computes a real kundli in the browser, answers up to
three questions from that chart, and gives a monthly reading built from the Hindu panchang,
the Chinese sexagenary cycle and the Western calendar together.

No backend, no API keys, no tracking. Every number on the page is calculated from the
visitor's birth details in their own browser, and nothing leaves the device.

## What it actually computes

**Ephemeris** (`assets/js/astro.js`)
- Sun and Moon from Meeus, *Astronomical Algorithms* (ch. 25 and the 35 leading terms of ch. 47)
- Mercury–Saturn from JPL's approximate Keplerian elements, solved with Newton–Raphson
- Rahu/Ketu from the mean lunar node
- Sidereal (nirayana) positions via the Lahiri / Chitrapaksha ayanamsa
- Ascendant from local sidereal time, obliquity and geographic latitude
- Bisection solvers for new moon, full moon and the December solstice

**Chart** (`assets/js/kundli.js`)
- Whole-sign houses from the lagna, North Indian D-1 rasi chart
- Dignity: exaltation, debilitation, moolatrikona, own sign, and natural friendship
- Graha drishti including the special aspects of Mars, Jupiter, Saturn and the nodes
- Vimshottari dasha with mahadasha and antardasha, from the Moon's nakshatra balance
- Panchang: tithi, paksha, nakshatra, yoga, karana, vara, lunar month, ritu, Vikram and Shaka samvat
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
| New and full moon times (1999–2025) | within 1 minute |
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
  assets/js/app.js        interface
  geo/                    generated: 4,436 gazetteer shards + manifest
tools/
  build-geo.cjs           rebuilds both gazetteer tiers from a GeoNames dump
```

## A note on what this is

This is a well-built astronomy engine wrapped in a traditional interpretive framework.
The planetary positions are genuinely accurate. The interpretations follow classical
Jyotisha rules faithfully, but astrology itself is not a predictive science, and nothing
here is medical, legal or financial advice.
