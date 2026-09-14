const fs=require('fs');const f='site/index.html';let s=fs.readFileSync(f,'utf8');
function rep(a,b){ if(s.indexOf(a)<0) throw new Error('missing: '+a.slice(0,60)); s=s.replace(a,b); }

rep(`<main id="journey" class="locked">

  <!-- ---- 00 · the birth moment ---- -->
  <section class="chapter hero" id="chBirth" data-title="Begin" data-glyph="✦" data-desc="Your birth moment">`,
`<main id="journey" class="locked">

  <!-- ---- landing: the verse of the day ---- -->
  <section class="chapter landing" id="chLanding" data-title="Verse" data-glyph="ॐ" data-desc="A verse for today" data-nav="no">
    <div class="landing-inner">
      <div class="eyebrow">Jyotish Darpan · the mirror of the sky</div>
      <h1 class="grad landing-title">Jyotish<br>Darpan</h1>
      <div class="verse-card" id="verseCard">
        <div class="verse-eyebrow"><span id="verseLabel">A verse for today</span><span class="verse-trad" id="verseTrad"></span></div>
        <blockquote class="verse" id="verseText"></blockquote>
        <div class="verse-src" id="verseSrc"></div>
        <div class="verse-acts">
          <button type="button" class="btn ghost sm" id="btnVerse">Another verse</button>
        </div>
      </div>
      <p class="landing-sub">One birth moment, read through every tradition that has ever looked up:
        the Vedic chart, the Western sky, the Chinese pillars, the numbers in your name.</p>
      <button type="button" class="btn landing-cta" id="btnBegin">Begin your journey ↓</button>
      <p class="landing-note">Everything is computed in your browser. Nothing you enter leaves this device.</p>
    </div>
  </section>

  <!-- ---- 00 · the birth moment ---- -->
  <section class="chapter hero" id="chBirth" data-title="Begin" data-glyph="✦" data-desc="Your birth moment">`);

rep(`        <div class="eyebrow">Vedic · Western · Chinese · Numerology · Tarot — one birth moment</div>
        <h1 class="grad">Jyotish<br>Darpan</h1>
        <p class="sub">The mirror of the sky. Give the moment you arrived and every system is computed
          from scratch, in your browser, and explained in plain words.</p>`,
`        <div class="eyebrow">Vedic · Western · Chinese · Numerology · Tarot — one birth moment</div>
        <h2 class="grad hero-title">The moment<br>you arrived</h2>
        <p class="sub">Give the date, the time and the place, and every system is computed from
          scratch — and explained in plain words.</p>`);

rep(`      <p class="foot">Each of these reads the same birth moment through a different tradition.<br>
        Where they agree, take it seriously. Where they differ, that is information too.</p>
      <div class="journey-end">
        <div class="eyebrow">End of the journey</div>
        <p>Vedic positions are sidereal (Lahiri). Western positions are tropical. Both come from the same
          computed sky; they differ by the ayanāṁśa, about 24°.</p>
        <p>This is an astronomy engine wrapped in traditional interpretation. Nothing here is medical,
          legal or financial advice.</p>
        <button type="button" class="btn ghost sm" id="btnTop">↑ &nbsp;Back to the top</button>
      </div>
    </div>
  </section>
`,
`      <p class="foot">Each of these reads the same birth moment through a different tradition.<br>
        Where they agree, take it seriously. Where they differ, that is information too.</p>
    </div>
  </section>

  <!-- ---- 11 · farewell ---- -->
  <section class="chapter farewell" id="chFarewell" data-title="Farewell" data-glyph="☽" data-desc="A word for the road, chosen from what you asked">
    <div class="ch-head reveal">
      <div class="ch-num"></div>
      <h2 class="ch-title grad">A word for the road</h2>
      <p class="ch-lede">Chosen from what you asked and what the sky answered.</p>
      <i class="ch-line"></i>
    </div>
    <div class="ch-glyph">☽</div>
    <div class="ch-body">
      <div id="recapHost" data-stagger></div>
      <div class="verse-card farewell-card" id="byeCard">
        <div class="verse-eyebrow"><span id="byeLabel">To carry with you</span><span class="verse-trad" id="byeTrad"></span></div>
        <blockquote class="verse" id="byeText"></blockquote>
        <div class="verse-src" id="byeSrc"></div>
        <p class="bye-why" id="byeWhy"></p>
      </div>
      <div class="journey-end">
        <p>Vedic positions are sidereal (Lahiri). Western positions are tropical. Both come from the same
          computed sky; they differ by the ayanāṁśa, about 24°.</p>
        <p>This is an astronomy engine wrapped in traditional interpretation. Nothing here is medical,
          legal or financial advice.</p>
        <div class="end-acts">
          <button type="button" class="btn ghost sm" id="btnSaveEnd">Save this reading</button>
          <button type="button" class="btn ghost sm" id="btnTop">↑ &nbsp;Back to the top</button>
        </div>
      </div>
    </div>
  </section>
`);

rep(`<script src="assets/js/immersive.js"></script>`, `<script src="assets/js/quotes.js"></script>\n<script src="assets/js/immersive.js"></script>`);
fs.writeFileSync(f,s);console.log('ok');
