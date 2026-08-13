export const FRIEZE_PERIOD = 80;
export const FRIEZE_MIDLINE = 32;

// One asymmetric flag: pole, pennant, notch. It has no mirror and no rotational
// self-symmetry, so every group operation produces a visibly distinct copy.
export const friezeMotif = [
  { x: 12, y: 26 },
  { x: 12, y: 8 },
  { x: 30, y: 13 },
  { x: 16, y: 18 }
];

export function applyIsometry(point, op) {
  if (!op || op.kind === "identity") return { x: point.x, y: point.y };
  if (op.kind === "translation") return { x: point.x + op.dx, y: point.y + (op.dy || 0) };
  if (op.kind === "reflection") {
    if (op.axis === "vertical") return { x: 2 * op.x - point.x, y: point.y };
    return { x: point.x, y: 2 * op.y - point.y };
  }
  if (op.kind === "glide") return { x: point.x + op.dx, y: 2 * op.y - point.y };
  if (op.kind === "rotation") {
    const turns = ((op.degrees % 360) + 360) % 360;
    const dx = point.x - op.cx;
    const dy = point.y - op.cy;
    if (turns === 0) return { x: point.x, y: point.y };
    if (turns === 180) return { x: op.cx - dx, y: op.cy - dy };
    if (turns === 90) return { x: op.cx - dy, y: op.cy + dx };
    if (turns === 270) return { x: op.cx + dy, y: op.cy - dx };
    const radians = turns * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return { x: op.cx + dx * cos - dy * sin, y: op.cy + dx * sin + dy * cos };
  }
  throw new Error(`Unknown isometry kind: ${op && op.kind}`);
}

export const applyIsometries = (point, ops) => ops.reduce((moved, op) => applyIsometry(moved, op), point);

const T = FRIEZE_PERIOD;
const M = FRIEZE_MIDLINE;

// Cell operations are a transversal of the translation subgroup: the orbit of
// the motif under { cell ops } x { translations by kT } is the full group orbit.
export const friezeGroups = [
  { name: "p1", label: "hop", detail: "translation only", ops: [
    [{ kind: "identity" }]
  ] },
  { name: "p11g", label: "step", detail: "a glide: reflect across the midline, then slide half a period", ops: [
    [{ kind: "identity" }],
    [{ kind: "glide", axis: "horizontal", y: M, dx: T / 2 }]
  ] },
  { name: "p1m1", label: "sidle", detail: "vertical mirrors", ops: [
    [{ kind: "identity" }],
    [{ kind: "reflection", axis: "vertical", x: T / 2 }]
  ] },
  { name: "p2", label: "spinning hop", detail: "half-turns about points on the midline", ops: [
    [{ kind: "identity" }],
    [{ kind: "rotation", cx: T / 2, cy: M, degrees: 180 }]
  ] },
  { name: "p2mg", label: "spinning sidle", detail: "vertical mirrors with half-turns and a glide", ops: [
    [{ kind: "identity" }],
    [{ kind: "reflection", axis: "vertical", x: T / 2 }],
    [{ kind: "glide", axis: "horizontal", y: M, dx: T / 2 }],
    [{ kind: "rotation", cx: 3 * T / 4, cy: M, degrees: 180 }]
  ] },
  { name: "p11m", label: "jump", detail: "one horizontal mirror along the midline", ops: [
    [{ kind: "identity" }],
    [{ kind: "reflection", axis: "horizontal", y: M }]
  ] },
  { name: "p2mm", label: "spinning jump", detail: "both mirrors, and the half-turns they force", ops: [
    [{ kind: "identity" }],
    [{ kind: "reflection", axis: "vertical", x: T / 2 }],
    [{ kind: "reflection", axis: "horizontal", y: M }],
    [{ kind: "rotation", cx: T / 2, cy: M, degrees: 180 }]
  ] }
];

export function friezeGroupCells(groupName, copies = 8) {
  const group = friezeGroups.find((entry) => entry.name === groupName);
  if (!group) throw new Error(`Unknown frieze group: ${groupName}`);
  const cells = [];
  for (let cell = 0; cell < copies; cell += 1) {
    const shift = { kind: "translation", dx: cell * T, dy: 0 };
    group.ops.forEach((ops, opIndex) => {
      cells.push({
        cell,
        opIndex,
        base: opIndex === 0,
        points: friezeMotif.map((point) => applyIsometry(applyIsometries(point, ops), shift))
      });
    });
  }
  return cells;
}

const fmt = (value) => Number(value.toFixed(2));
const pathFor = (points, className) =>
  `<path class="${className}" d="M${points.map((point) => `${fmt(point.x)} ${fmt(point.y)}`).join(" L")} Z"></path>`;

function friezeStripBody(groupName) {
  const copies = friezeGroupCells(groupName, 8)
    .map((copy) => pathFor(copy.points, copy.base ? "motif" : "motif-image"))
    .join("");
  return `<line class="frieze-midline" x1="0" y1="${M}" x2="640" y2="${M}"></line>${copies}`;
}

export function friezeStripSvg(groupName) {
  const group = friezeGroups.find((entry) => entry.name === groupName);
  return `<svg viewBox="0 0 640 64" role="img" aria-label="Frieze group ${group.name} — the ${group.label}">${friezeStripBody(groupName)}</svg>`;
}

export function friezeAllSvg() {
  const rows = friezeGroups.map((group, index) => {
    const top = index * 84;
    return `<text class="frieze-label" x="4" y="${top + 12}">${group.name} · ${group.label}</text><g transform="translate(0 ${top + 18})">${friezeStripBody(group.name)}</g>`;
  }).join("");
  return `<svg viewBox="0 0 640 ${friezeGroups.length * 84}" role="img" aria-label="All seven frieze groups generated from one asymmetric motif">${rows}</svg>`;
}

// The flag sits inside the open 90-degree sector to the right of the centre,
// so every rotation orbit up to order four stays free of overlap.
const CENTRE = { x: 320, y: 170 };
const CENTRE_FLAG = [
  { x: 360, y: 188 },
  { x: 360, y: 140 },
  { x: 450, y: 162 },
  { x: 386, y: 174 }
];

const mirrorLabels = {
  identity: "One asymmetric flag with no operation applied",
  mirror: "A flag and its exact mirror image across a vertical axis",
  rotate2: "A flag and its half-turn copy about the marked centre",
  rotate3: "Three flags 120 degrees apart about the marked centre",
  rotate4: "Four flags 90 degrees apart about the marked centre"
};

export function mirrorRotationSvg(state = "identity") {
  const copies = [pathFor(CENTRE_FLAG, "motif")];
  let extras = "";
  if (state === "mirror") {
    copies.push(pathFor(
      CENTRE_FLAG.map((point) => applyIsometry(point, { kind: "reflection", axis: "vertical", x: CENTRE.x })),
      "motif-image"
    ));
    extras = `<line class="symmetry-axis" x1="${CENTRE.x}" y1="26" x2="${CENTRE.x}" y2="314"></line>`;
  } else if (state.startsWith("rotate")) {
    const order = Number(state.slice(6));
    for (let step = 1; step < order; step += 1) {
      copies.push(pathFor(
        CENTRE_FLAG.map((point) => applyIsometry(point, { kind: "rotation", cx: CENTRE.x, cy: CENTRE.y, degrees: 360 * step / order })),
        "motif-image"
      ));
    }
    extras = `<circle class="symmetry-center" cx="${CENTRE.x}" cy="${CENTRE.y}" r="4"></circle>`;
  }
  return `<svg viewBox="0 0 640 340" role="img" aria-label="${mirrorLabels[state] || mirrorLabels.identity}">${extras}${copies.join("")}</svg>`;
}

export const wallpaperGroups = [
  { name: "p1", label: "translations only" },
  { name: "p2", label: "half-turns" },
  { name: "p4m", label: "quarter-turns and mirrors" },
  { name: "p3", label: "third-turns" }
];

export const wallpaperNote = () => "4 of 17 groups shown";

// Local motif inside one square cell, kept strictly inside the D4 wedge
// 0 < y < x < 45 so all eight p4m copies stay disjoint.
const CELL_MOTIF = [
  { x: 20, y: 16 },
  { x: 44, y: 8 },
  { x: 34, y: 22 },
  { x: 26, y: 20 }
];

function squareLatticeCopies(cellOps, columns, rows, origin, size) {
  const copies = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const shift = { kind: "translation", dx: origin.x + column * size, dy: origin.y + row * size };
      cellOps.forEach((ops, opIndex) => {
        copies.push({
          base: opIndex === 0,
          points: CELL_MOTIF.map((point) => applyIsometry(applyIsometries(point, ops), shift))
        });
      });
    }
  }
  return copies;
}

export function wallpaperSample(groupName) {
  const group = wallpaperGroups.find((entry) => entry.name === groupName);
  if (!group) throw new Error(`Unknown wallpaper sample: ${groupName}`);
  if (groupName === "p1") {
    return { ...group, center: null, copies: squareLatticeCopies([[{ kind: "identity" }]], 5, 3, { x: 95, y: 35 }, 90) };
  }
  if (groupName === "p2") {
    const cellOps = [
      [{ kind: "identity" }],
      [{ kind: "rotation", cx: 45, cy: 45, degrees: 180 }]
    ];
    return { ...group, center: null, copies: squareLatticeCopies(cellOps, 5, 3, { x: 95, y: 35 }, 90) };
  }
  if (groupName === "p4m") {
    const cellOps = [];
    for (const degrees of [0, 90, 180, 270]) {
      cellOps.push([{ kind: "rotation", cx: 45, cy: 45, degrees }]);
      cellOps.push([{ kind: "reflection", axis: "vertical", x: 45 }, { kind: "rotation", cx: 45, cy: 45, degrees }]);
    }
    return { ...group, center: { x: 320, y: 170 }, copies: squareLatticeCopies(cellOps, 3, 3, { x: 185, y: 35 }, 90) };
  }
  // p3: hexagonal lattice, third-turns about every lattice point.
  const relative = [
    { x: 6, y: -26 },
    { x: 24, y: -32 },
    { x: 17, y: -20 },
    { x: 10, y: -22 }
  ];
  const copies = [];
  const step = 84;
  const rise = 42 * Math.sqrt(3);
  for (let row = 0; row < 4; row += 1) {
    for (let column = -2; column < 7; column += 1) {
      const centre = { x: 68 + column * step + row * step / 2, y: 52 + row * rise };
      if (centre.x < 60 || centre.x > 580) continue;
      [0, 120, 240].forEach((degrees, opIndex) => {
        copies.push({
          base: opIndex === 0,
          points: relative.map((point) => applyIsometry(
            { x: centre.x + point.x, y: centre.y + point.y },
            { kind: "rotation", cx: centre.x, cy: centre.y, degrees }
          ))
        });
      });
    }
  }
  return { ...group, center: null, copies };
}

export function wallpaperSampleSvg(groupName) {
  const sample = wallpaperSample(groupName);
  const body = sample.copies.map((copy) => pathFor(copy.points, copy.base ? "motif" : "motif-image")).join("");
  return `<svg viewBox="0 0 640 340" role="img" aria-label="Wallpaper group ${sample.name} — ${sample.label} — generated patch">${body}</svg>`;
}
