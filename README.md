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
  assets/js/astro.js      ephemeris
  assets/js/data.js       rashis, nakshatras, dignities, panchang names, cities
  assets/js/kundli.js     chart, dasha, panchang, Chinese pillars
  assets/js/reading.js    question engine and monthly reading
  assets/js/app.js        interface
```

## A note on what this is

This is a well-built astronomy engine wrapped in a traditional interpretive framework.
The planetary positions are genuinely accurate. The interpretations follow classical
Jyotisha rules faithfully, but astrology itself is not a predictive science, and nothing
here is medical, legal or financial advice.
