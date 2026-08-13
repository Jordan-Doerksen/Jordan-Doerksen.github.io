const DIRECTIONS = Array.from({ length: 5 }, (_, index) => ({
  x: Math.cos(index * Math.PI * 2 / 5),
  y: Math.sin(index * Math.PI * 2 / 5)
}));
const PHASES = [0.113, -0.071, 0.047, 0.181, -0.270];

function intersection(first, firstLevel, second, secondLevel) {
  const determinant = first.x * second.y - first.y * second.x;
  return {
    x: (firstLevel * second.y - first.y * secondLevel) / determinant,
    y: (first.x * secondLevel - firstLevel * second.x) / determinant
  };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function projectedVertex(indices) {
  return indices.reduce((point, value, index) => ({
    x: point.x + value * DIRECTIONS[index].x,
    y: point.y + value * DIRECTIONS[index].y
  }), { x: 0, y: 0 });
}

function tileKey(points) {
  const center = points.reduce((sum, point) => add(sum, point), { x: 0, y: 0 });
  return `${(center.x / 4).toFixed(7)}:${(center.y / 4).toFixed(7)}`;
}

export function penroseRhombs(range = 10) {
  const tiles = new Map();
  for (let firstIndex = 0; firstIndex < 5; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < 5; secondIndex += 1) {
      const first = DIRECTIONS[firstIndex];
      const second = DIRECTIONS[secondIndex];
      for (let firstGrid = -range; firstGrid <= range; firstGrid += 1) {
        for (let secondGrid = -range; secondGrid <= range; secondGrid += 1) {
          const crossing = intersection(
            first, firstGrid - PHASES[firstIndex],
            second, secondGrid - PHASES[secondIndex]
          );
          const indices = DIRECTIONS.map((direction, index) => {
            if (index === firstIndex) return firstGrid;
            if (index === secondIndex) return secondGrid;
            return Math.ceil(crossing.x * direction.x + crossing.y * direction.y + PHASES[index] - 1e-10);
          });
          const base = projectedVertex(indices);
          const points = [base, add(base, first), add(add(base, first), second), add(base, second)];
          const separation = secondIndex - firstIndex;
          const kind = separation === 1 || separation === 4 ? "thick" : "thin";
          tiles.set(tileKey(points), { points, kind, directions: [firstIndex, secondIndex] });
        }
      }
    }
  }
  return [...tiles.values()];
}

function transform(point, scale, width, height) {
  return { x: width / 2 + point.x * scale, y: height / 2 + point.y * scale };
}

function path(points) {
  return points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(3)} ${point.y.toFixed(3)}`).join(" ") + " Z";
}

export function penrosePatch(width = 640, height = 340, scale = 34) {
  const margin = scale * 2;
  return penroseRhombs(12).map((tile) => ({
    ...tile,
    points: tile.points.map((point) => transform(point, scale, width, height))
  })).filter((tile) => tile.points.some((point) =>
    point.x > -margin && point.x < width + margin && point.y > -margin && point.y < height + margin
  ));
}

export function penroseMarkup(width = 640, height = 340) {
  return penrosePatch(width, height).map((tile) =>
    `<path class="penrose-${tile.kind}${tile.kind === "thick" ? " tile-accent" : ""}" data-rhomb="${tile.kind}" d="${path(tile.points)}"></path>`
  ).join("");
}
