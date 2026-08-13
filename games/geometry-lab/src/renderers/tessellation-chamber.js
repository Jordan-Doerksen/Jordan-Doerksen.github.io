export function interiorAngle(sides) {
  return 180 * (sides - 2) / sides;
}

export function vertexAngleSum(polygons) {
  return polygons.reduce((sum, sides) => sum + interiorAngle(sides), 0);
}

export function curvatureClass(sum, tolerance = 1e-8) {
  if (Math.abs(sum - 360) <= tolerance) return "flat";
  return sum < 360 ? "positive" : "negative";
}

export function packingDensity(angleDegrees) {
  return Math.PI / (4 * Math.sin(angleDegrees * Math.PI / 180));
}

export function penroseCounts(generation, thick = 1, thin = 1) {
  let counts = { thick, thin };
  for (let step = 0; step < generation; step += 1) {
    counts = { thick: counts.thick * 2 + counts.thin, thin: counts.thick + counts.thin };
  }
  return counts;
}

function regularPolygonAtVertex(sides, startAngle, side, center) {
  const points = [{ ...center }];
  let point = { ...center };
  let direction = startAngle;
  const turn = Math.PI * 2 / sides;
  for (let edge = 0; edge < sides; edge += 1) {
    point = { x: point.x + Math.cos(direction) * side, y: point.y + Math.sin(direction) * side };
    points.push(point);
    direction += turn;
  }
  return points.map((item, index) => `${index ? "L" : "M"}${item.x.toFixed(2)} ${item.y.toFixed(2)}`).join(" ") + " Z";
}

export function vertexFanSvg(polygons) {
  const center = { x: 320, y: 190 };
  let angle = -Math.PI / 2;
  const paths = polygons.map((sides, index) => {
    const path = regularPolygonAtVertex(sides, angle, 72, center);
    angle += interiorAngle(sides) * Math.PI / 180;
    return `<path class="fan-${index % 3}" d="${path}"></path>`;
  }).join("");
  const sum = vertexAngleSum(polygons);
  return `<svg viewBox="0 0 640 380" role="img" aria-label="Regular polygons meeting at one vertex with angle sum ${sum} degrees"><g>${paths}</g><circle class="chamber-origin" cx="320" cy="190" r="5"></circle></svg>`;
}

function hexPath(cx, cy, radius) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + index * Math.PI / 3;
    return `${index ? "L" : "M"}${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(" ") + " Z";
}

export function dualitySvg(mode = "both") {
  const sites = [];
  const cells = [];
  const spacing = 76;
  for (let row = -1; row < 6; row += 1) {
    for (let column = -1; column < 10; column += 1) {
      const x = 40 + column * spacing + (row % 2 ? spacing / 2 : 0);
      const y = 25 + row * spacing * Math.sqrt(3) / 2;
      sites.push(`<circle cx="${x}" cy="${y}" r="4"></circle>`);
      cells.push(`<path d="${hexPath(x, y, spacing / Math.sqrt(3))}"></path>`);
    }
  }
  return `<svg class="duality-${mode}" viewBox="0 0 640 340" role="img" aria-label="Triangular lattice sites and their hexagonal nearest-site cells"><g class="dual-cells">${cells.join("")}</g><g class="dual-sites">${sites.join("")}</g></svg>`;
}

export function packingSvg(angleDegrees) {
  const radius = 27;
  const theta = angleDegrees * Math.PI / 180;
  const first = { x: radius * 2, y: 0 };
  const second = { x: Math.cos(theta) * radius * 2, y: Math.sin(theta) * radius * 2 };
  const circles = [];
  for (let row = -2; row < 9; row += 1) {
    for (let column = -2; column < 13; column += 1) {
      const x = 110 + column * first.x + row * second.x;
      const y = 25 + row * second.y;
      circles.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius}"></circle>`);
    }
  }
  const unit = `M110 120 l${first.x} ${first.y} l${second.x.toFixed(2)} ${second.y.toFixed(2)} l${-first.x} 0 Z`;
  return `<svg viewBox="0 0 640 340" role="img" aria-label="Equal circles on a ${angleDegrees} degree rhombic lattice"><g class="packing-circles">${circles.join("")}</g><path class="unit-cell" d="${unit}"></path></svg>`;
}

export function rotationSvg(order) {
  const allowed = new Set([1, 2, 3, 4, 6]).has(order);
  const arms = Array.from({ length: order }, (_, index) => {
    const angle = index * Math.PI * 2 / order - Math.PI / 2;
    return `<line x1="320" y1="170" x2="${320 + Math.cos(angle) * 120}" y2="${170 + Math.sin(angle) * 120}"></line>`;
  }).join("");
  return `<svg viewBox="0 0 640 340" role="img" aria-label="${order}-fold rotational study, ${allowed ? "compatible" : "incompatible"} with a periodic planar lattice"><g>${arms}</g><circle class="rotation-disc${allowed ? "" : " rotation-forbidden"}" cx="320" cy="170" r="70"></circle><text class="rotation-order" x="320" y="178">${order}</text></svg>`;
}

export function penroseCountSvg(generation, initialThick, initialThin) {
  const counts = penroseCounts(generation, initialThick, initialThin);
  const total = counts.thick + counts.thin;
  const ratio = counts.thick / Math.max(1, counts.thin);
  const thickWidth = 500 * counts.thick / total;
  return `<svg viewBox="0 0 640 240" role="img" aria-label="Penrose substitution counts after generation ${generation}"><rect class="thick-bar" x="70" y="82" width="${thickWidth}" height="54"></rect><rect class="thin-bar" x="${70 + thickWidth}" y="82" width="${500 - thickWidth}" height="54"></rect><text x="70" y="60">thick ${counts.thick.toLocaleString()}</text><text x="570" y="170">thin ${counts.thin.toLocaleString()}</text><text class="ratio-label" x="320" y="215">ratio ${ratio.toFixed(6)} → φ</text></svg>`;
}
