export function createRelationshipState() {
  return { phase: "eligible", approachedAt: null };
}

export function updateRelationship(previous, distanceInRadii, velocity, spec, now) {
  const error = Math.abs(distanceInRadii - spec.target_distance_in_radii);

  if (previous.phase === "active") {
    return error <= spec.release_tolerance_in_radii
      ? previous
      : { phase: "exited", approachedAt: null };
  }

  if (previous.phase === "exited") {
    if (error <= spec.release_tolerance_in_radii) return previous;
    return { phase: "eligible", approachedAt: null };
  }

  if (error > spec.approach_tolerance_in_radii) {
    return { phase: "eligible", approachedAt: null };
  }
  if (velocity > spec.maximum_capture_velocity_radii_per_second) {
    return { phase: "eligible", approachedAt: null };
  }

  const approachedAt = previous.approachedAt ?? now;
  if (now - approachedAt < spec.dwell_ms) {
    return { phase: "approaching", approachedAt };
  }
  return { phase: "active", approachedAt };
}

export function exactSnapPoint(moving, fixed, radius, targetInRadii) {
  let dx = moving.x - fixed.x;
  let dy = moving.y - fixed.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) {
    dx = 1;
    dy = 0;
  }
  const target = radius * targetInRadii;
  return {
    x: fixed.x + (dx / (distance || 1)) * target,
    y: fixed.y + (dy / (distance || 1)) * target
  };
}
