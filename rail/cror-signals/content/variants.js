// ==========================================================================
// CONTENT · VARIANTS — the alternate hardware FORMS each indication can take,
// read from the 136 CROR Verbal Quiz shots (the deck Jordan passed his 2025
// CROR test on). The CANONICAL form lives in content/aspects.js (`.aspect`);
// these are the OTHER legal forms the same indication appears as — a different
// head count, a dwarf, a single lamp, or with a plate. Same renderer (signal.js).
//
// Keyed by aspect id. Each form: { heads top→bottom, type "mast"|"dwarf",
// stagger?, plaque? }. 'f' suffix on a head = that lamp flashes. No "A" plate.
// Together with the 38 canonicals this is the full ~68 distinct-form set.
// ==========================================================================

export const VARIANTS = {
  'sig-405': [ { heads: ['G', 'R', 'R'], type: 'mast' } ],
  'sig-406': [ { heads: ['Y', 'G'], type: 'mast', plaque: 'L' }, { heads: ['G', 'R', 'Gf'], type: 'mast' } ],
  'sig-407': [ { heads: ['Y', 'G'], type: 'dwarf' } ],
  'sig-408': [ { heads: ['Y', 'Y'], type: 'mast', plaque: 'DV' } ],
  'sig-409': [ { heads: ['Y', 'Y'], type: 'mast' }, { heads: ['Y', 'Y', 'R'], type: 'mast' } ],
  'sig-411': [ { heads: ['Y', 'R', 'R'], type: 'mast' } ],
  'sig-412': [ { heads: ['Yf', 'Gf', 'R'], type: 'mast' } ],
  'sig-413': [ { heads: ['Yf', 'G', 'R'], type: 'mast' }, { heads: ['Yf', 'G'], type: 'mast', stagger: true } ],
  'sig-414': [ { heads: ['Yf', 'Y', 'R'], type: 'mast' } ],
  'sig-416': [ { heads: ['Gf', 'R'], type: 'dwarf' } ],
  'sig-419': [ { heads: ['Gf', 'Yf'], type: 'dwarf' } ],
  'sig-419a': [ { heads: ['R', 'Gf', 'Yf'], type: 'mast', plaque: 'DV' } ],
  'sig-420': [ { heads: ['R', 'Y', 'Rf'], type: 'mast', plaque: 'L' } ],
  'sig-421': [ { heads: ['Yf', 'R'], type: 'dwarf' } ],
  'sig-423': [ { heads: ['R', 'G', 'Gf'], type: 'mast' } ],
  'sig-425': [ { heads: ['G', 'Yf'], type: 'dwarf' } ],
  'sig-426': [ { heads: ['R', 'Y', 'Rf'], type: 'mast' } ],
  'sig-428': [ { heads: ['R', 'G'], type: 'mast', plaque: 'DV' } ],
  'sig-431': [ { heads: ['G'], type: 'dwarf' }, { heads: ['R', 'G'], type: 'dwarf' } ],
  'sig-435': [ { heads: ['Yf'], type: 'dwarf' } ],
  'sig-436': [ { heads: ['R', 'R', 'Y'], type: 'mast' }, { heads: ['Y'], type: 'dwarf' } ],
  'sig-438': [ { heads: ['R', 'R', 'Rf'], type: 'mast' }, { heads: ['Rf'], type: 'dwarf' } ],
  'sig-439': [ { heads: ['R', 'R'], type: 'mast' }, { heads: ['R', 'R', 'R'], type: 'mast' } ]
};
