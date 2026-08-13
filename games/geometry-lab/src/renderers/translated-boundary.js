const TILE_WIDTH = 112;
const TILE_HEIGHT = 78;

function quadratic(start, control, end, t) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y
  };
}

export function translatedBoundaryProfile(deformation = 0, samplesPerCurve = 12) {
  const amount = Number(deformation) || 0;
  const anchors = [
    { x: 0, y: 0 },
    { x: TILE_WIDTH / 2, y: 0 },
    { x: TILE_WIDTH, y: 0 }
  ];
  const controls = [
    { x: TILE_WIDTH / 4, y: -18 - amount },
    { x: TILE_WIDTH * 3 / 4, y: 18 + amount }
  ];
  const points = [];
  for (let curve = 0; curve < 2; curve += 1) {
    for (let step = curve ? 1 : 0; step <= samplesPerCurve; step += 1) {
      points.push(quadratic(anchors[curve], controls[curve], anchors[curve + 1], step / samplesPerCurve));
    }
  }
  return points;
}

export function translatedTilePath(x, y, deformation = 0) {
  const amount = Number(deformation) || 0;
  return `M${x} ${y} Q${x + 28} ${y - 18 - amount} ${x + 56} ${y} Q${x + 84} ${y + 18 + amount} ${x + 112} ${y} L${x + 112} ${y + 78} Q${x + 84} ${y + 60 - amount} ${x + 56} ${y + 78} Q${x + 28} ${y + 96 + amount} ${x} ${y + 78}Z`;
}

export function translatedBoundaryMarkup(deformation = 0) {
  return Array.from({ length: 36 }, (_, index) => {
    const x = (index % 6) * TILE_WIDTH - 10;
    const y = Math.floor(index / 6) * TILE_HEIGHT - 64;
    return `<path d="${translatedTilePath(x, y, deformation)}"></path>`;
  }).join("");
}

export const translatedTileSize = () => ({ width: TILE_WIDTH, height: TILE_HEIGHT });
