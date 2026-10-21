// Stage checks for Home's kind containers (CR-32, item 43). Called by scripts/front_probe.mjs; every issue is
// { check: 'stage', msg }. An empty list is a pass. Each rule has a broken fixture, scripts/front_probe_fixtures/stage-*.html,
// and `front_probe.mjs --selftest` fails unless the fixture is caught.
//
// Normal motion runs on a fake clock (Playwright page.clock), paused, so "one dwell later" is exact and the check never
// waits for a real timer. Reduced motion runs on the real clock with the timer functions wrapped: a timer of a second
// or more is what the stepping would create, so there must be none.
//
// Rules, per width (the real page is probed at 1280 and 390):
//   normal motion  * one container steps at a time, the one most in view; the others hold still
//                  * a stepping container's highlight moves one row per dwell and its panel follows
//                  * Pause holds the container; the button's label changes
//                  * a row click shows that project and stops that container's stepping
//                  * hover on a row takes over (widths with a mouse, 768 and up)
//                  * a container marked data-steps="no" never steps
//   reduced motion * no timer of a second or more, no container stepping, the first project of each container shown,
//                    no visible Pause button, a click and the arrow keys select
//   both           * no sideways scroll, no script error

const FIRST = 100;       // real ms to let the IntersectionObserver report after a scroll
const SLACK = 100;       // fake ms past the dwell, so the step has surely fired

const snap = () => [...document.querySelectorAll('.fp-ks')].map((k) => ({
  id: k.dataset.kind || k.id,
  stepping: k.getAttribute('data-stepping'),
  steps: k.dataset.steps,
  cur: ((k.querySelector('.fp-ks-link[aria-current="true"]') || {}).dataset || {}).slug || null,
  shown: [...k.querySelectorAll('.fp-ks-panel')].filter((p) => !p.hidden).map((p) => p.dataset.slug),
  rows: [...k.querySelectorAll('.fp-ks-link')].map((r) => r.dataset.slug),
  pauseVisible: !!(k.querySelector('.fp-ks-pause') && k.querySelector('.fp-ks-pause').checkVisibility()),
  pauseText: (k.querySelector('.fp-ks-pause') || {}).textContent || null,
}));

async function view(page, i) {
  await page.evaluate((n) => document.querySelectorAll('.fp-ks')[n].scrollIntoView({ block: 'center' }), i);
  await page.waitForTimeout(FIRST);
}

// The observer reports on the browser's own schedule, so wait (in real time, up to ~1 s) until some container is stepping.
// The page's own timers are on the fake clock here, so this polls from the outside. A page where none ever steps just
// falls through, and the checks that follow report it.
async function waitStepping(page) {
  for (let i = 0; i < 10; i++) {
    if (await page.evaluate(() => !!document.querySelector('.fp-ks[data-stepping="on"]'))) return;
    await page.waitForTimeout(100);
  }
}

export async function probeStage(browser, url, { width }) {
  const issues = [];
  const add = (msg) => issues.push({ check: 'stage', msg: '@' + width + ' ' + msg });
  const errs = [];
  const watch = (page) => {
    page.on('pageerror', (e) => errs.push('script error: ' + String(e).split('\n')[0]));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console error: ' + m.text().slice(0, 100)); });
  };
  const noSideways = async (page, when) => {
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    if (w[0] > w[1] + 1) add('the document scrolls sideways ' + when + ': ' + w[0] + 'px in a ' + w[1] + 'px window');
  };

  // ---- normal motion, fake clock ----
  let ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
  let page = await ctx.newPage();
  watch(page);
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(url);
  await page.clock.pauseAt(new Date('2026-01-01T00:00:05Z'));
  await page.waitForTimeout(150);
  const dwell = await page.evaluate(() => parseInt((document.querySelector('.fp-ksx') || {}).dataset?.dwell, 10));
  if (!(dwell >= 2200)) {
    add('the wrapper carries no dwell of 2200 ms or more (got ' + dwell + ')');
    await ctx.close();
    return issues;
  }
  const n = (await page.evaluate(snap)).length;
  if (n < 2) { add('fewer than two containers on the page'); await ctx.close(); return issues; }

  // 1. one container steps: the one most in view
  await view(page, 0);
  await waitStepping(page);
  let s = await page.evaluate(snap);
  const on =s.filter((k) => k.stepping === 'on');
  if (on.length !== 1) add('' + on.length + ' containers are stepping at once (one expected): ' + on.map((k) => k.id).join(', '));
  const first = on[0] ? on[0].id : s[0].id;
  const before = Object.fromEntries(s.map((k) => [k.id, k.cur]));
  await page.clock.runFor(dwell + SLACK);
  s = await page.evaluate(snap);
  for (const k of s) {
    const moved = k.cur !== before[k.id];
    if (k.id === first && !moved) add('the container in view ("' + k.id + '") did not step after one dwell');
    if (k.id !== first && moved) add('"' + k.id + '" stepped although "' + first + '" is the container in view');
    if (k.cur && (k.shown.length !== 1 || k.shown[0] !== k.cur)) add('"' + k.id + '" stage shows ' + JSON.stringify(k.shown) + ' but the highlight is on ' + k.cur);
  }
  const cont = (id) => page.locator('.fp-ks[data-kind="' + id + '"]');

  // 2. Pause holds, and its label changes
  const pb = cont(first).locator('.fp-ks-pause');
  const label0 = s.find((k) => k.id === first).pauseText;
  if (!(await pb.isVisible())) add('the Pause button of "' + first + '" is not visible');
  else {
    await pb.click();
    s = await page.evaluate(snap);
    const held = s.find((k) => k.id === first);
    await page.clock.runFor(dwell * 2 + SLACK);
    const after = (await page.evaluate(snap)).find((k) => k.id === first);
    if (after.cur !== held.cur) add('Pause did not hold "' + first + '": the highlight moved from ' + held.cur + ' to ' + after.cur);
    if (held.pauseText === label0) add('the Pause button did not change its label after a press');
    await pb.click(); // Play again
  }

  // 3. scroll to another container: it steps, the first one does not
  const second = s[1].id;
  await view(page, 1);
  await waitStepping(page);
  await page.waitForTimeout(150);   // the first container's timer is cleared by the same observer report
  s = await page.evaluate(snap);
  const on2 = s.filter((k) => k.stepping === 'on').map((k) => k.id);
  if (on2.length !== 1 || on2[0] !== second) add('with "' + second + '" in view the stepping containers are [' + on2.join(', ') + ']');

  // 4. a row click takes over and stops that container
  const rows = cont(second).locator('.fp-ks-link');
  const rowCount = await rows.count();
  if (rowCount >= 3) {
    const slug = await rows.nth(2).getAttribute('data-slug');
    await rows.nth(2).click();
    s = await page.evaluate(snap);
    const k = s.find((x) => x.id === second);
    if (k.cur !== slug || k.shown[0] !== slug || k.shown.length !== 1) add('a click on row 3 of "' + second + '" did not show ' + slug + ' (highlight ' + k.cur + ', shown ' + JSON.stringify(k.shown) + ')');
    if (k.stepping === 'on') add('"' + second + '" kept stepping after a click took over');
    await page.clock.runFor(dwell * 2 + SLACK);
    const later = (await page.evaluate(snap)).find((x) => x.id === second);
    if (later.cur !== slug) add('"' + second + '" moved off the clicked project after a click took over');
  }

  // 5. hover takes over (a mouse exists from 768 up)
  if (width >= 768 && n >= 3) {
    const third = s[2].id;
    await view(page, 2);
    const hr = cont(third).locator('.fp-ks-link');
    if ((await hr.count()) >= 3) {
      const slug = await hr.nth(1).getAttribute('data-slug');
      await hr.nth(1).hover();
      const k = (await page.evaluate(snap)).find((x) => x.id === third);
      if (k.cur !== slug) add('hovering row 2 of "' + third + '" did not select it (highlight ' + k.cur + ')');
      if (k.stepping === 'on') add('"' + third + '" kept stepping after a hover took over');
    }
  }

  // 6. a container marked data-steps="no" never steps
  for (const k of s) if (k.steps === 'no' && k.stepping === 'on') add('"' + k.id + '" is marked data-steps="no" and steps');
  await noSideways(page, 'in normal motion');
  await ctx.close();

  // ---- reduced motion, real clock, timers wrapped ----
  ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => {
    window.__timers = [];
    const st = window.setTimeout, si = window.setInterval;
    // A timer of a second or more is what stepping would create; shorter ones are interface chatter and are not counted.
    window.setTimeout = function (f, d, ...a) { if ((d | 0) >= 1000) window.__timers.push('timeout ' + d); return st.call(this, f, d, ...a); };
    window.setInterval = function (f, d, ...a) { if ((d | 0) >= 1000) window.__timers.push('interval ' + d); return si.call(this, f, d, ...a); };
  });
  page = await ctx.newPage();
  watch(page);
  await page.goto(url);
  for (let i = 0; i < n; i++) await view(page, i);
  await page.waitForTimeout(300);
  const timers = await page.evaluate(() => window.__timers);
  if (timers.length) add('under reduced motion the page created ' + timers.length + ' timer(s): ' + timers.slice(0, 3).join(', '));
  s = await page.evaluate(snap);
  for (const k of s) {
    if (k.stepping === 'on') add('under reduced motion "' + k.id + '" is stepping');
    if (k.cur !== k.rows[0] || k.shown.length !== 1 || k.shown[0] !== k.rows[0]) add('under reduced motion "' + k.id + '" does not show its first project (highlight ' + k.cur + ', shown ' + JSON.stringify(k.shown) + ')');
    if (k.pauseVisible) add('under reduced motion "' + k.id + '" shows a Pause button for nothing');
  }
  const sel = page.locator('.fp-ks').first().locator('.fp-ks-link');
  if ((await sel.count()) >= 3) {
    await view(page, 0);
    await sel.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    let k = (await page.evaluate(snap))[0];
    if (k.cur !== k.rows[1] || k.shown[0] !== k.rows[1]) add('under reduced motion ArrowDown did not select the second project (highlight ' + k.cur + ')');
    await sel.nth(2).click();
    k = (await page.evaluate(snap))[0];
    if (k.cur !== k.rows[2] || k.shown[0] !== k.rows[2]) add('under reduced motion a click did not select the third project (highlight ' + k.cur + ')');
  }
  await noSideways(page, 'under reduced motion');
  await ctx.close();
  for (const e of errs.slice(0, 4)) add(e);
  return issues;
}
