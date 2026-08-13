export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createGeometryState(stageConfig) {
  return {
    centers: stageConfig.initial_centers.map((center) => ({ ...center })),
    selectedCircle: 1,
    precision: false
  };
}

export function moveCircle(state, index, center) {
  const centers = state.centers.map((value, current) =>
    current === index
      ? { x: clamp(center.x, 0, 1), y: clamp(center.y, 0, 1) }
      : value
  );
  return { ...state, centers, selectedCircle: index };
}

export function moveCircleBy(state, index, delta) {
  const center = state.centers[index];
  return moveCircle(state, index, {
    x: center.x + delta.x,
    y: center.y + delta.y
  });
}

export function geometryMetrics(state, viewport, stageConfig) {
  const minimumDimension = Math.min(viewport.width, viewport.height);
  const radius = Math.max(
    stageConfig.minimum_circle_radius_px,
    minimumDimension * stageConfig.circle_radius_viewport_ratio
  );
  const centers = state.centers.map((center) => ({
    x: center.x * viewport.width,
    y: center.y * viewport.height
  }));
  const dx = centers[1].x - centers[0].x;
  const dy = centers[1].y - centers[0].y;
  const distance = Math.hypot(dx, dy);
  return {
    centers,
    radius,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    distance,
    distanceInRadii: radius ? distance / radius : 0,
    intersections: equalCircleIntersections(centers[0], centers[1], radius)
  };
}

export function equalCircleIntersections(first, second, radius) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0 || distance > radius * 2) return [];

  const midpoint = {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2
  };
  const height = Math.sqrt(Math.max(0, radius ** 2 - (distance / 2) ** 2));
  const perpendicular = { x: -dy / distance, y: dx / distance };
  if (height === 0) return [midpoint];
  return [
    {
      x: midpoint.x + perpendicular.x * height,
      y: midpoint.y + perpendicular.y * height
    },
    {
      x: midpoint.x - perpendicular.x * height,
      y: midpoint.y - perpendicular.y * height
    }
  ];
}

export function snapMovingCenter(state, movingIndex, metrics, targetInRadii) {
  const fixedIndex = movingIndex === 0 ? 1 : 0;
  const moving = metrics.centers[movingIndex];
  const fixed = metrics.centers[fixedIndex];
  let dx = moving.x - fixed.x;
  let dy = moving.y - fixed.y;
  const length = Math.hypot(dx, dy);
  if (!length) {
    dx = 1;
    dy = 0;
  }
  const target = metrics.radius * targetInRadii;
  const snapped = {
    x: fixed.x + (dx / (length || 1)) * target,
    y: fixed.y + (dy / (length || 1)) * target
  };
  return moveCircle(state, movingIndex, {
    x: snapped.x / metrics.viewportWidth,
    y: snapped.y / metrics.viewportHeight
  });
}

export function describeGeometry(state, metrics, relationshipPhase) {
  const selected = state.selectedCircle === 0 ? "A" : "B";
  const distance = metrics.distanceInRadii.toFixed(2);
  if (relationshipPhase === "active") {
    return `Circle ${selected} selected. Centers are exactly one radius apart. Two intersections form equilateral triangles with the centers.`;
  }
  if (metrics.intersections.length === 2) {
    return `Circle ${selected} selected. Centers are ${distance} radii apart. The circles cross at two points.`;
  }
  if (metrics.intersections.length === 1) {
    return `Circle ${selected} selected. Centers are ${distance} radii apart. The circles are tangent.`;
  }
  return `Circle ${selected} selected. Centers are ${distance} radii apart. The circles do not cross.`;
}
