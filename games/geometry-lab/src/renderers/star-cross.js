const POINTS = 8;

function pathFrom(points) {
  return points.map((point, index) =>
    `${index ? "L" : "M"}${point.x.toFixed(3)} ${point.y.toFixed(3)}`
  ).join(" ") + " Z";
}

export function starInnerRadius(outerRadius) {
  return outerRadius / (Math.SQRT2 * Math.cos(Math.PI / 8));
}

export function starVertices(cx, cy, outerRadius) {
  const innerRadius = starInnerRadius(outerRadius);
  return Array.from({ length: POINTS * 2 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / POINTS;
    const radius = index % 2 ? innerRadius : outerRadius;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    };
  });
}

function starSector(cx, cy, outerRadius, indices) {
  const vertices = starVertices(cx, cy, outerRadius);
  return indices.map((index) => vertices[index % vertices.length]);
}

export function crossVertices(cx, cy, outerRadius) {
  const topLeft = starSector(cx - outerRadius, cy - outerRadius, outerRadius, [4, 5, 6, 7, 8]);
  const bottomLeft = starSector(cx - outerRadius, cy + outerRadius, outerRadius, [0, 1, 2, 3, 4]);
  const bottomRight = starSector(cx + outerRadius, cy + outerRadius, outerRadius, [12, 13, 14, 15, 0]);
  const topRight = starSector(cx + outerRadius, cy - outerRadius, outerRadius, [8, 9, 10, 11, 12]);
  return [...topLeft, ...bottomLeft.slice(1), ...bottomRight.slice(1), ...topRight.slice(1, -1)];
}

export function starCrossGeometry(width = 640, height = 340, outerRadius = 46) {
  const spacing = outerRadius * 2;
  const stars = [];
  const crosses = [];
  for (let y = 0; y <= height + outerRadius; y += spacing) {
    for (let x = 0; x <= width + outerRadius; x += spacing) {
      stars.push(starVertices(x, y, outerRadius));
    }
  }
  for (let y = outerRadius; y <= height + outerRadius; y += spacing) {
    for (let x = outerRadius; x <= width + outerRadius; x += spacing) {
      crosses.push(crossVertices(x, y, outerRadius));
    }
  }
  return { stars, crosses, spacing, outerRadius };
}

export function starCrossSvg(mode = "pattern") {
  const geometry = starCrossGeometry();
  const starPaths = geometry.stars.map((points, index) =>
    `<path class="star-tile${index === 27 ? " focus-tile" : ""}" data-tile="star" d="${pathFrom(points)}"></path>`
  ).join("");
  const crossPaths = geometry.crosses.map((points, index) =>
    `<path class="cross-tile${index === 20 ? " focus-tile" : ""}" data-tile="cross" d="${pathFrom(points)}"></path>`
  ).join("");
  return `<svg class="star-cross star-cross-${mode}" viewBox="0 0 640 340" role="img" aria-label="Exact edge-to-edge reconstruction of eight-pointed star tiles and their interstitial cross tiles"><g class="cross-tiles">${crossPaths}</g><g class="star-tiles">${starPaths}</g></svg>`;
}
