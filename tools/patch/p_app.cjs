/* Patch app.js for the immersive journey: drop the old star field and view
   switching, wire the scroll engine, add Today, the alignment wheel, the
   landing verse, the farewell and the live hero preview. */
const fs = require('fs');
const f = 'site/assets/js/app.js';
let s = fs.readFileSync(f, 'utf8');
function rep(a, b, label) {
  if (s.indexOf(a) < 0) throw new Error('missing: ' + (label || a.slice(0, 70)));
  if (s.indexOf(a) !== s.lastIndexOf(a)) throw new Error('ambiguous: ' + (label || a.slice(0, 70)));
  s = s.replace(a, b);
}
function cut(from, to, replacement, label) {
  const i = s.indexOf(from), j = s.indexOf(to, i);
  if (i < 0 || j < 0) throw new Error('cut missing: ' + label);
  s = s.slice(0, i) + replacement + s.slice(j);
}

/* 1. header comment + remove the star field (now in immersive.js) */
rep(`   app.js - interface: the star field, the gate, the chart, the three
   questions, the monthly reading and the rashi sky.`,
`   app.js - interface: the birth form, the chart, today, the alignment
   wheel, the three questions, the month, the other systems, the verse of
   the day and the farewell. The sky itself lives in immersive.js.`);

cut(`  /* =========================================================================
     1. star field`,
`  /* =========================================================================
     2. the gate`,
`  var IM = window.Immersive, Q = window.Quotes;

`, 'star field');

/* 2. edit button scrolls back to the form */
rep(`  $('btnEdit').addEventListener('click', function () {
    $('shell').hidden = true;
    $('gate').hidden = false;
    $('gate').style.opacity = '1';
    document.body.style.overflow = '';
  });`,
`  $('btnEdit').addEventListener('click', function () {
    IM.goTo('chBirth');
    setTimeout(function () { try { $('fFullName').focus({ preventScroll: true }); } catch (e) {} }, 700);
  });`);

/* 3. motion permission on the submit gesture */
rep(`  $('birthForm').addEventListener('submit', function (e) {
    e.preventDefault();
`,
`  $('birthForm').addEventListener('submit', function (e) {
    e.preventDefault();
    IM.requestMotion();
`);

/* 4. the place picker feeds the live preview */
rep(`    else $('fTz').value = (c.tz >= 0 ? '+' : '') + c.tz;
    suggest.hidden = true;
  }`,
`    else $('fTz').value = (c.tz >= 0 ? '+' : '') + c.tz;
    suggest.hidden = true;
    heroPreview();
  }`);

/* 5. launch */
rep(`  function launch(birth) {
    var chart = K.attachDeep(K.buildChart(birth), nowJD());
    state.chart = chart;
    state.answers = [null, null, null];
    state.month = null;

    $('gate').style.opacity = '0';
    setTimeout(function () { $('gate').hidden = true; }, 500);
    $('shell').hidden = false;
`,
`  function launch(birth, opts) {
    var chart = K.attachDeep(K.buildChart(birth), nowJD());
    state.chart = chart;
    state.answers = [null, null, null];
    state.month = null;
    IM.unlock();
`);

rep(`    renderSystems(chart);
    renderOverview(chart);
    show('viewOverview');
    setTimeout(function () { renderMonth(chart); }, 60);
  }

  function show(id) {
    ['viewOverview','viewChart','viewAsk','viewMonth','viewSystems','viewSky'].forEach(function (v) {
      $(v).hidden = (v !== id);
    });
    Array.prototype.forEach.call($('nav').children, function (b) {
      b.classList.toggle('on', b.dataset.view === id);
    });
  }
  Array.prototype.forEach.call($('nav').children, function (b) {
    b.addEventListener('click', function () { show(b.dataset.view); });
  });
  $('btnSky').addEventListener('click', function () { show('viewSky'); });
  $('btnSkyClose').addEventListener('click', function () { show('viewOverview'); });`,
`    renderSystems(chart);
    renderOverview(chart);
    renderWheel(chart);
    renderHeroSummary(chart);
    renderFarewell();
    IM.setSky(chart.planets.map(function (p) { return { lon: p.lon, color: D.GRAHAS[p.name].color }; }));
    IM.refresh();
    IM.goTo('chOverview', !!(opts && opts.instant));
    setTimeout(function () { renderMonth(chart); IM.refresh(); }, 60);
  }`);

/* 6. an answer updates the farewell */
rep(`    slot.querySelector('[data-go]').textContent = 'Ask this one differently';
    updateCount();`,
`    slot.querySelector('[data-go]').textContent = 'Ask this one differently';
    updateCount();
    renderFarewell();`);

/* the ask button uses data-go, which the scroll engine treats as a jump: rename it */
s = s.split("'[data-go]'").join("'[data-ask]'");
s = s.split('<button type="button" class="btn" data-go>Reveal the reading</button>')
     .join('<button type="button" class="btn" data-ask>Reveal the reading</button>');

/* 7. month renders today and the farewell recap */
rep(`    $('monthHost').innerHTML = h.join('');
    renderMuhurtas(chart);`,
`    $('monthHost').innerHTML = h.join('');
    renderMuhurtas(chart);
    renderToday(chart, m);
    renderFarewell();`);

/* 8. the sky map: no more drag, the container is local */
rep(`  function renderSky(chart) {
    cwrap.innerHTML = '';`,
`  function renderSky(chart) {
    var cwrap = $('constellations');
    cwrap.innerHTML = '';`);
cut(`  // drag only inside the sky view`,
`  function openRashi(i) {`,
``, 'drag block');

/* 9. save from either button */
rep(`  $('btnPrint').addEventListener('click', function () {
    var c = state.chart;
    if (!c) return;`,
`  function saveReading() {
    var c = state.chart;
    if (!c) return;`);
rep(`    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  });`,
`    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  $('btnPrint').addEventListener('click', saveReading);
  $('btnSaveEnd').addEventListener('click', saveReading);`);

/* 10. restore lands on the overview without animation */
rep(`      pickedIsIndia = !!b.india;
      launch(b);`,
`      pickedIsIndia = !!b.india;
      heroPreview();
      launch(b, { instant: true });`);

/* 11. new code, before the restore block */
const NEW = fs.readFileSync('tools/patch/app_new.js', 'utf8');
rep(`  /* =========================================================================
     9. restore`,
NEW + `
  /* =========================================================================
     9. restore`);

fs.writeFileSync(f, s);
console.log('patched', s.length);
