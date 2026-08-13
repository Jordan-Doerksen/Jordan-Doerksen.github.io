const ROOT_THREE = Math.sqrt(3);

function path(points) {
  return points.map((point, index) =>
    `${index ? "L" : "M"}${point.x.toFixed(3)} ${point.y.toFixed(3)}`
  ).join(" ") + " Z";
}

function squareTiles(width, height, side) {
  const tiles = [];
  for (let y = -side; y < height + side; y += side) {
    for (let x = -side; x < width + side; x += side) {
      tiles.push([{ x, y }, { x: x + side, y }, { x: x + side, y: y + side }, { x, y: y + side }]);
    }
  }
  return tiles;
}

function triangleTiles(width, height, side) {
  const tiles = [];
  const altitude = side * ROOT_THREE / 2;
  const rows = Math.ceil(height / altitude) + 3;
  const columns = Math.ceil(width / side) + 3;
  for (let row = -2; row < rows; row += 1) {
    const y = row * altitude;
    const shift = ((row % 2) + 2) % 2 ? side / 2 : 0;
    const nextShift = ((((row + 1) % 2) + 2) % 2) ? side / 2 : 0;
    for (let column = -2; column < columns; column += 1) {
      const left = { x: column * side + shift, y };
      const right = { x: (column + 1) * side + shift, y };
      const nextLeft = { x: column * side + nextShift, y: y + altitude };
      const nextRight = { x: (column + 1) * side + nextShift, y: y + altitude };
      if (nextShift > shift) {
        tiles.push([left, right, nextLeft], [right, nextRight, nextLeft]);
      } else {
        tiles.push([left, right, nextRight], [left, nextRight, nextLeft]);
      }
    }
  }
  return tiles;
}

function hexagon(cx, cy, radius) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = index * Math.PI / 3;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function hexagonTiles(width, height, side) {
  const tiles = [];
  const columnStep = side * 1.5;
  const rowStep = side * ROOT_THREE;
  const columns = Math.ceil(width / columnStep) + 3;
  const rows = Math.ceil(height / rowStep) + 3;
  for (let column = -2; column < columns; column += 1) {
    const offset = ((column % 2) + 2) % 2 ? rowStep / 2 : 0;
    for (let row = -2; row < rows; row += 1) {
      tiles.push(hexagon(column * columnStep, row * rowStep + offset, side));
    }
  }
  return tiles;
}

export function regularTilingPolygons(sides, width = 640, height = 340, side = 52) {
  if (sides === 3) return triangleTiles(width, height, side);
  if (sides === 4) return squareTiles(width, height, side);
  if (sides === 6) return hexagonTiles(width, height, side);
  throw new Error(`Unsupported regular tiling: ${sides}`);
}

export function regularTilingMarkup(sides, width = 640, height = 340) {
  return regularTilingPolygons(sides, width, height)
    .map((points, index) => `<path class="${index % 2 ? "tile-accent" : ""}" d="${path(points)}"></path>`)
    .join("");
}
