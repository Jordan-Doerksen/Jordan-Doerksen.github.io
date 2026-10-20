// build.mjs: writes t1/index.html, t2/index.html and t3/index.html for the chapter 3 beat.
// The four gates are read from method/index.html at build time (generated, never copied by hand).
// Run: node docs/skin-lab/method-24/build.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', '..', '..', 'method', 'index.html');
const src = fs.readFileSync(SRC, 'utf8');

// ---- read the real content
const sec = src.match(/<section id="md-gates"[\s\S]*?<\/section>/)[0];
const kicker = sec.match(/<span class="md-kicker">[^<]*<\/span>/)[0].replace('2. Four gates', '3. Four gates'); // chapter 3 in the storyboard
const h2 = sec.match(/<h2 class="md-h2">([^<]*)<\/h2>/)[1];
const lead = sec.match(/<p class="md-p">([^<]*)<\/p>/)[1];
const nodes = [...sec.matchAll(/<li class="md-node md-rv">([\s\S]*?)<\/li>/g)].map(m => m[1]);
if (nodes.length !== 4) throw new Error('expected 4 gates, found ' + nodes.length);
const gates = nodes.map(n => ({
  html: n.trim(),
  num: n.match(/<span class="md-n">([^<]*)<\/span>/)[1],
  title: n.match(/<h3 class="md-h3">([^<]*)<\/h3>/)[1],
  leaves: n.match(/<dt>Leaves<\/dt><dd>([^<]*)<\/dd>/)[1],
}));

const WIRE = '<li class="md-wire" aria-hidden="true"><svg viewBox="0 0 40 24" preserveAspectRatio="xMidYMid meet"><path pathLength="1" d="M2 12 H30 M24 5 L31 12 L24 19" /></svg></li>';
const LINE = '<li class="md-wire" aria-hidden="true"><svg viewBox="0 0 40 24" preserveAspectRatio="xMidYMid meet"><path pathLength="1" d="M2 12 H38" /></svg></li>';

const stageRow = gates.map((g, i) => `      <li class="md-gate" data-i="${i}">\n        ${g.html.replace(/\n\s*/g, '\n        ')}\n      </li>`).join('\n' + '      ' + WIRE + '\n');
const spineRow = gates.map((g, i) => `      <li class="md-mark" data-i="${i}"><span class="md-n">${g.num}</span><p class="md-h4">${g.title}</p><p class="md-small">${g.leaves}</p></li>`).join('\n      ' + LINE + '\n');

const STATUS = {
  t1: ['The four gates arrive in order. Press Play, or wait.', 'Gate {n} of 4: {title}.', 'Filed. Each gate left one record on disk.'],
  t2: ['Scroll down. Each gate arrives at its own point.', 'Gate {n} of 4: {title}.', 'Filed. Each gate left one record on disk.'],
  t3: ['The four gates arrive in order. The film starts when this scene is in view.', 'Gate {n} of 4: {title}.', 'Filed. Each gate left one record on disk.'],
};
const statusP = t => `<p class="md-status" role="status" aria-live="polite" data-idle="${STATUS[t][0]}" data-gate="${STATUS[t][1]}" data-done="${STATUS[t][2]}">${STATUS[t][2]}</p>`;

const NAMES = { t1: 'T1 · Stage and file-down', t2: 'T2 · Scroll as the film', t3: 'T3 · The trailer' };
const head = t => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Four gates, ${NAMES[t].split(' · ')[1]}</title>
<meta name="description" content="Lab render of chapter 3 of the method page: the four gates. ${NAMES[t]}.">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="../shared/tokens.css">
<link rel="stylesheet" href="../shared/lab-tokens.css">
<link rel="stylesheet" href="../shared/method.css">
<link rel="stylesheet" href="../shared/lab.css">
<link rel="stylesheet" href="t.css">
</head>
<body class="md-skin md-skin-c md-lab md-${t}" data-variant="c" data-treatment="${t}">
<a class="md-skip" href="#md-main">Skip to the content</a>
<div class="md-bar" data-chrome="identity_navigation"><div class="md-bar-in">
  <a class="md-brand" href="../index.html">Jordan Doerksen</a>
  <nav class="md-nav" aria-label="Lab"><span class="md-lab-tag">${NAMES[t]}</span><a class="md-home" href="../index.html">All three</a></nav>
</div></div>
`;

const headBlock = `    <div class="md-head">
      ${kicker}
      <h2 class="md-h2" id="md-gates-h">${h2}</h2>
      <p class="md-p">${lead}</p>
    </div>`;

const stage = `    <div class="md-stage">
      <ol class="md-chain md-gatechain" aria-label="The four gates in order">
${stageRow}
      </ol>
    </div>
    <div class="md-spine">
      <span class="md-n">The record on disk</span>
      <ol class="md-chain md-spinechain" aria-label="What the four gates leave on disk">
${spineRow}
      </ol>
    </div>`;

const foot = t => `<footer class="md-foot"><div class="md-foot-in">
  <p class="md-small">Lab render of one beat for the owner's pick. Chapter 3 of the method page. Timings are in motion.json. Motion stops when the system asks for reduced motion. The page reads the same with scripts off.</p>
</div></footer>
<script src="t.js"></script>
</body>
</html>
`;

const T1 = head('t1') + `
<main id="md-main" class="md-main">
  <section id="md-gates" class="md-band md-chapter" aria-labelledby="md-gates-h">
    <div class="md-top">
${headBlock}
      <div class="md-ctlbox">
        <div class="md-ctls" role="group" aria-label="Playback">
          <button class="md-btn" type="button" data-act="play">Play</button>
          <button class="md-btn" type="button" data-act="step">Step</button>
          <button class="md-btn" type="button" data-act="reset">Reset</button>
        </div>
        ${statusP('t1')}
      </div>
    </div>
${stage}
  </section>
</main>
` + foot('t1');

const T2 = head('t2') + `<div class="md-rail" data-chrome="narrative_rail" aria-label="Chapter progress">
  <div class="md-rail-in"><span class="md-n md-rail-n">Chapter 3 of 9</span><span class="md-small md-rail-t">Four gates</span></div>
  <div class="md-meter" aria-hidden="true"><div class="md-meter-fill"></div></div>
</div>
<main id="md-main" class="md-main">
  <section id="md-gates" class="md-band md-chapter" aria-labelledby="md-gates-h">
    <div class="md-track">
      <div class="md-pin">
        <div class="md-top">
${headBlock.replace(/^/gm, '        ')}
          <div class="md-ctlbox">${statusP('t2')}</div>
        </div>
${stage.replace(/^/gm, '    ')}
      </div>
    </div>
  </section>
</main>
` + foot('t2');

const T3 = head('t3') + `
<main id="md-main" class="md-main">
  <section id="md-gates" class="md-band md-chapter md-bleed" aria-labelledby="md-gates-h">
    <div class="md-ground" aria-hidden="true"></div>
    <div class="md-bleed-in">
      <div class="md-top">
${headBlock.replace(/^/gm, '  ')}
        <div class="md-ctlbox">
          <div class="md-ctls" role="group" aria-label="Playback">
            <button class="md-btn" type="button" data-act="play">Play</button>
            <div class="md-scrub">
              <label class="md-small md-scrub-l" for="md-scrub-r">Chapter</label>
              <input class="md-scrub-r" id="md-scrub-r" type="range" min="0" max="5" step="1" value="5" aria-valuetext="Filed">
              <div class="md-ticks" aria-hidden="true"><span>Start</span><span>Gate 1</span><span>Gate 2</span><span>Gate 3</span><span>Gate 4</span><span>Filed</span></div>
            </div>
          </div>
          ${statusP('t3')}
        </div>
      </div>
      <div class="md-cam">
${stage.replace(/^/gm, '    ')}
      </div>
    </div>
  </section>
</main>
` + foot('t3');

fs.writeFileSync(path.join(HERE, 't1', 'index.html'), T1);
fs.writeFileSync(path.join(HERE, 't2', 'index.html'), T2);
fs.writeFileSync(path.join(HERE, 't3', 'index.html'), T3);
console.log('built t1, t2, t3 from method/index.html: ' + gates.map(g => g.num + ' ' + g.title).join(' | '));
