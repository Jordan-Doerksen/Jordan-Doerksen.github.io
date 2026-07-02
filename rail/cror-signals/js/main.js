// ==========================================================================
// MAIN — boot. Registers the service worker, runs the first-run onboarding
// gate, wires the routes, and starts the hash router. Each mode lives in its
// own module; everything reads the one audited aspect dataset through data.js.
// ==========================================================================

import * as router from './router.js';
import * as store from './store.js';
import * as onboarding from './onboarding.js';
import * as home from './home.js';
import * as learn from './learn.js';
import * as quiz from './quiz.js';
import * as build from './build.js';
import * as drill from './drill.js';
import * as exam from './exam.js';
import * as progressview from './progressview.js';
import * as about from './about.js';

function registerRoutes() {
  router.route('', home.show);
  router.route('learn', learn.show);
  router.route('quiz', quiz.show);
  router.route('build', build.show);
  router.route('drill', drill.show);
  router.route('exam', exam.show);
  router.route('progress', progressview.show);
  router.route('about', about.show);
}

function boot() {
  const view = document.getElementById('view');
  const start = () => { registerRoutes(); router.start(view, ''); };

  if (!store.get('settings').onboardingDone) onboarding.show(view, start);
  else start();

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
