// ==========================================================================
// QUIZGEN — question generation + the distractor engine. The whole pitch is
// correctness, so wrong answers must be *plausible*: the genuinely confusable
// indications, not random noise. Ranking: explicit `confusedWith` hints first,
// then same family, then minimal lamp-stack distance. Shared by quiz/drill/exam.
// ==========================================================================

import { drawn, get, byFamily, familyOf, formsOf } from './data.js';
import { drawSignal } from './signal.js';

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// how different two aspects *look* — lower = more confusable = better distractor
function distance(a, b) {
  const A = a.aspect, B = b.aspect; let d = 0;
  d += Math.abs(A.heads.length - B.heads.length) * 2;
  const n = Math.min(A.heads.length, B.heads.length);
  for (let i = 0; i < n; i++) if (A.heads[i] !== B.heads[i]) d++;
  if ((A.type || 'mast') !== (B.type || 'mast')) d++;
  if ((A.plaque || '') !== (B.plaque || '')) d++;
  if (!!A.stagger !== !!B.stagger) d++;
  return d;
}

// the n most plausible wrong answers for `answer`
export function distractorsFor(answer, n = 3) {
  const picks = [];
  const push = (a) => { if (a && a.id !== answer.id && !picks.find((p) => p.id === a.id)) picks.push(a); };
  // 1) curated traps (just id links into the verified set — no invented content)
  (answer.confusedWith || []).map(get).forEach(push);
  // 2) same family, closest-looking first
  byFamily(familyOf(answer)).slice().sort((a, b) => distance(answer, a) - distance(answer, b)).forEach(push);
  // 3) anything else, closest-looking first
  drawn().slice().sort((a, b) => distance(answer, a) - distance(answer, b)).forEach(push);
  return picks.slice(0, n);
}

// one MCQ: a drawn signal (a RANDOM form of the answer, so you learn every
// hardware variant) + 4 shuffled options (the answer + 3 distractors)
export function makeQuestion(answer) {
  const options = shuffle([answer, ...distractorsFor(answer, 3)]);
  const forms = formsOf(answer);
  const spec = forms[(Math.random() * forms.length) | 0];
  return { answerId: answer.id, options, svg: drawSignal(spec), ref: answer.ref };
}

// a session of questions. family 'all' or a family key; optional weighting fn
// (e.g. progress.box → favour weaker aspects). count caps the length.
export function buildQuiz({ family = 'all', count = 10, weight = null } = {}) {
  let pool = byFamily(family).slice();
  if (weight) {
    // weighted sample without replacement: lower weight = picked sooner
    pool = pool.map((a) => ({ a, k: Math.random() ** (1 / Math.max(0.001, weight(a))) }))
      .sort((x, y) => y.k - x.k).map((x) => x.a);
  } else {
    pool = shuffle(pool);
  }
  return pool.slice(0, Math.min(count, pool.length)).map(makeQuestion);
}
