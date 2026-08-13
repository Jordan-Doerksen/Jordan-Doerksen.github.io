export function circlePackingGeometry(width = 640, height = 340, radius = 32) {
  const circles = [];
  const rowStep = Math.sqrt(3) * radius;
  for (let row = -2; row <= Math.ceil(height / rowStep) + 1; row += 1) {
    for (let column = -2; column <= Math.ceil(width / (2 * radius)) + 1; column += 1) {
      circles.push({
        x: column * 2 * radius + (((row % 2) + 2) % 2 ? radius : 0),
        y: row * rowStep,
        radius
      });
    }
  }
  return circles;
}

export function circlePackingMarkup(width = 640, height = 340) {
  return circlePackingGeometry(width, height)
    .map((circle) => `<circle cx="${circle.x.toFixed(3)}" cy="${circle.y.toFixed(3)}" r="${circle.radius}"></circle>`)
    .join("");
}
