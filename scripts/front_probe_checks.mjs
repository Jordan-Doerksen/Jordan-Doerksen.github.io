// In-page checks for scripts/front_probe.mjs. Each function is self-contained, because Playwright
// serialises it and runs it inside the page: it cannot see imports or outer variables.
// Every check returns an array of strings; an empty array is a pass. Each has a broken fixture in
// scripts/front_probe_fixtures/ and `front_probe.mjs --selftest` fails unless the fixture is caught.

export const inPage = {
  // No sideways scroll anywhere: the document, or a rendered element that is a scroll box and scrolls.
  // A closed <details> keeps its content out of layout, so unrendered elements are skipped.
  overflow() {
    const issues = [];
    const d = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
    const de = document.documentElement;
    if (de.scrollWidth > innerWidth + 1) issues.push('the document scrolls sideways: ' + de.scrollWidth + 'px in a ' + innerWidth + 'px window');
    for (const el of document.querySelectorAll('body *')) {
      if (el.checkVisibility && !el.checkVisibility()) continue;
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) issues.push('a scroll box that scrolls sideways: ' + d(el));
    }
    return issues;
  },

  // A small margin between content and the window edges (WEB-14, 2026-09-26): text and controls that
  // are on screen at rest stay `px` away from the left, right and top edge. The bottom edge counts
  // only when the page fits the window (a screen that sizes itself to the window's height, like the
  // drill that ended 9px above the edge) or the element is fixed. On a page that scrolls, content that
  // happens to end just above the fold is not flush to anything. Full-bleed backgrounds may touch an
  // edge; the text on them may not.
  gutter(px) {
    const issues = [];
    const fits = document.documentElement.scrollHeight <= innerHeight + 1;
    const d = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
    for (const el of document.querySelectorAll('body *')) {
      if (el.checkVisibility && !el.checkVisibility()) continue;
      if (el.closest('.fp-skip, script, style')) continue;
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!hasText && !el.matches('button, input, select, summary')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      const near = [];
      if (r.left < px) near.push('left ' + Math.round(r.left) + 'px');
      if (innerWidth - r.right < px) near.push('right ' + Math.round(innerWidth - r.right) + 'px');
      if (r.top >= 0 && r.top < px) near.push('top ' + Math.round(r.top) + 'px');
      if ((fits || getComputedStyle(el).position === 'fixed') && r.bottom <= innerHeight && innerHeight - r.bottom < px) near.push('bottom ' + Math.round(innerHeight - r.bottom) + 'px');
      if (near.length) issues.push(d(el) + ' is too close to the window edge: ' + near.join(', '));
    }
    return issues.slice(0, 12);
  },

  // The chrome budget: at most three clusters, and anything fixed or sticky sits inside one.
  // An open popover or the phone sheet is transient and is not a cluster.
  chrome() {
    const issues = [];
    const clusters = [...document.querySelectorAll('[data-chrome]')].map(e => e.dataset.chrome);
    if (clusters.length > 3) issues.push('more than three chrome clusters: ' + clusters.join(', '));
    for (const el of document.querySelectorAll('body *')) {
      const p = getComputedStyle(el).position;
      if (p !== 'fixed' && p !== 'sticky') continue;
      if (el.checkVisibility && !el.checkVisibility()) continue;
      if (el.closest('[data-chrome], .fp-pop')) continue;
      issues.push(p + ' element outside every chrome cluster: ' + el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]);
    }
    return issues;
  },

  // WCAG 2.1: text 4.5:1 (3:1 for large text) on its effective ground; the edge of a control 3:1
  // against what is around it. Colours are read from computed styles and composited through
  // every ancestor, so a translucent layer is measured, not assumed. A ground that is an image or
  // gradient cannot be measured, and is reported as unmeasurable instead of passing.
  contrast(opts) {
    const issues = [];
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const rgba = c => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const x = g.getImageData(0, 0, 1, 1).data; return [x[0], x[1], x[2], x[3] / 255]; };
    const over = (f, b) => [f[0] * f[3] + b[0] * (1 - f[3]), f[1] * f[3] + b[1] * (1 - f[3]), f[2] * f[3] + b[2] * (1 - f[3]), 1];
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const ground = el => {
      const layers = []; let unknown = false;
      for (let a = el; a; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.backgroundImage !== 'none') unknown = true;
        const c = rgba(cs.backgroundColor);
        if (c[3] > 0) layers.push(c);
        if (c[3] >= 1) break;
      }
      let base = [255, 255, 255, 1];
      for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
      return { base, unknown };
    };
    const name = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
    let unmeasurable = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      if (el.closest('[aria-hidden="true"], script, style, noscript') || el.matches(':disabled, [aria-disabled="true"]')) continue;
      const cs = getComputedStyle(el);
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (hasText) {
        const gr = ground(el);
        if (gr.unknown) { unmeasurable++; continue; }
        const fg = over(rgba(cs.color), gr.base);
        const px = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight, 10) || 400;
        const need = (px >= 24 || (px >= 18.66 && w >= 700)) ? opts.large : opts.text;
        const r = ratio(fg, gr.base);
        if (r < need) issues.push('text ' + r.toFixed(2) + ':1, needs ' + need + ': ' + name(el) + ' "' + el.textContent.trim().slice(0, 28) + '"');
      }
      if (el.matches('button, input:not([type=checkbox]):not([type=radio]), select, summary') && parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') {
        const around = ground(el.parentElement);
        if (!around.unknown) {
          const r = ratio(over(rgba(cs.borderTopColor), around.base), around.base);
          if (r < opts.edge) issues.push('control edge ' + r.toFixed(2) + ':1, needs ' + opts.edge + ': ' + name(el));
        }
      }
    }
    if (unmeasurable > 40) issues.push(unmeasurable + ' text elements sit on an image or gradient and could not be measured');
    return issues.slice(0, 14);
  },

  // A status is a shape and a word. A marker with no drawn shape leaves colour as the only channel.
  markers() {
    const issues = [];
    for (const el of document.querySelectorAll('.fp-st')) {
      if (el.checkVisibility && !el.checkVisibility()) continue;
      const b = getComputedStyle(el, '::before');
      if (!(parseFloat(b.width) > 0 && parseFloat(b.height) > 0)) { issues.push('status marker has no drawn shape: ' + el.textContent.trim()); break; }
    }
    return issues;
  },

  // With no script: the controls that need a script must not be visible, because they would do nothing.
  deadControls(selectors) {
    const issues = [];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        // checkVisibility() also sees a hidden ancestor; the element's own display does not.
        const shown = el.checkVisibility ? el.checkVisibility() : getComputedStyle(el).display !== 'none';
        if (shown) issues.push(sel + ' is visible and cannot work without a script');
      }
    }
    return issues;
  },

  // With no script: the page still has its content, and nothing that carries text is invisible.
  contentPresent() {
    const issues = [];
    const h1 = document.querySelector('h1');
    if (!h1 || !h1.textContent.trim()) issues.push('no h1 with text');
    if (document.querySelectorAll('#fp-nav a, nav a').length < 3) issues.push('fewer than three navigation links');
    const main = document.querySelector('main') || document.body;
    if (main.innerText.trim().length < 200) issues.push('the page has almost no text without a script');
    for (const el of document.querySelectorAll('main *, body > *')) {
      if (el.closest('[hidden], [aria-hidden="true"], script, style')) continue;
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const cs = getComputedStyle(el);
      if (cs.opacity === '0' || cs.visibility === 'hidden') issues.push('text is invisible without a script: ' + el.tagName.toLowerCase() + ' "' + el.textContent.trim().slice(0, 24) + '"');
    }
    return issues.slice(0, 8);
  },

  // Under reduced motion, nothing may still be animating forever.
  runningLoops() {
    return document.getAnimations()
      .filter(a => { const t = a.effect && a.effect.getComputedTiming(); return a.playState === 'running' && t && t.iterations === Infinity; })
      .map(a => 'an animation is still looping under reduced motion: ' + (a.animationName || a.transitionProperty || 'unnamed'));
  },

  // What the focused element looks like: used by the keyboard walk.
  focusState() {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return {
      name: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''),
      text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24),
      href: el.getAttribute('href'),
      ring: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none',
      inView: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
    };
  },
};
