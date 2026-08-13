export function branchSegmentCount(depth) {
  return (2 ** depth) - 1;
}

export function drawBranching(context, viewport, parameters, palette) {
  const { width, height } = viewport;
  context.clearRect(0, 0, width, height);
  const baseLength = Math.min(width, height) * 0.235;
  const angle = parameters.angle_degrees * Math.PI / 180;
  const stack = [{
    x: width / 2,
    y: height * 0.92,
    length: baseLength,
    direction: -Math.PI / 2,
    level: 0
  }];

  context.lineCap = "round";
  while (stack.length) {
    const branch = stack.pop();
    const endX = branch.x + Math.cos(branch.direction) * branch.length;
    const endY = branch.y + Math.sin(branch.direction) * branch.length;
    const progress = branch.level / Math.max(1, parameters.depth - 1);
    context.beginPath();
    context.moveTo(branch.x, branch.y);
    context.lineTo(endX, endY);
    context.strokeStyle = progress > 0.72 ? palette.tip : palette.branch;
    context.globalAlpha = 0.48 + progress * 0.52;
    context.lineWidth = Math.max(0.65, 5 * (1 - progress * 0.84));
    context.stroke();

    if (branch.level + 1 < parameters.depth) {
      const nextLength = branch.length * parameters.length_ratio;
      stack.push({
        x: endX, y: endY, length: nextLength,
        direction: branch.direction + angle, level: branch.level + 1
      });
      stack.push({
        x: endX, y: endY, length: nextLength,
        direction: branch.direction - angle, level: branch.level + 1
      });
    }
  }
  context.globalAlpha = 1;
}

export function kochPath(iterations, width = 640, height = 240) {
  // Baseline sits at 0.79 of the height: the apex rises (width - 56) * sqrt(3)/6
  // above it (168.6 at the default width), which needs 0.703 of a 240-unit box.
  let points = [{ x: 28, y: height * 0.79 }, { x: width - 28, y: height * 0.79 }];
  for (let step = 0; step < iterations; step += 1) {
    const next = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const first = points[index];
      const last = points[index + 1];
      const dx = (last.x - first.x) / 3;
      const dy = (last.y - first.y) / 3;
      const one = { x: first.x + dx, y: first.y + dy };
      const two = { x: first.x + dx * 2, y: first.y + dy * 2 };
      const peak = {
        x: one.x + dx * 0.5 + dy * Math.sqrt(3) / 2,
        y: one.y + dy * 0.5 - dx * Math.sqrt(3) / 2
      };
      next.push(first, one, peak, two);
    }
    next.push(points.at(-1));
    points = next;
  }
  return points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

function seededNoise(index) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

export function terrainPath(iterations, width = 640, height = 280) {
  let heights = [0.16, 0.1];
  for (let step = 0; step < iterations; step += 1) {
    const next = [];
    const amplitude = 0.3 * (0.56 ** step);
    for (let index = 0; index < heights.length - 1; index += 1) {
      next.push(heights[index]);
      next.push((heights[index] + heights[index + 1]) / 2 + seededNoise(index + step * 97) * amplitude);
    }
    next.push(heights.at(-1));
    heights = next;
  }
  const top = heights.map((value, index) => {
    const x = index / (heights.length - 1) * width;
    const y = height * (0.68 - Math.max(-0.18, Math.min(0.62, value)));
    return `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  return `${top} L${width} ${height} L0 ${height} Z`;
}

export function waveEchoPaths(levels) {
  return Array.from({ length: levels }, (_, index) => {
    // Each curl starts inside the previous curl's span and stays near the
    // baseline, so the set reads as one nested crest at every level count.
    const scale = (1 - index * 0.13) * 1.6;
    const x = 100 + index * 62;
    const y = 228 - index * 15;
    return `M${x} ${y} C${x + 20 * scale} ${y - 92 * scale}, ${x + 122 * scale} ${y - 115 * scale}, ${x + 144 * scale} ${y - 34 * scale} C${x + 154 * scale} ${y + 9 * scale}, ${x + 108 * scale} ${y + 20 * scale}, ${x + 90 * scale} ${y - 13 * scale}`;
  });
}
