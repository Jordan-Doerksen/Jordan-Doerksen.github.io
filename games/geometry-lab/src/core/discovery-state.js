export function createDiscoveryState() {
  return { eligible: true, visible: false, count: 0 };
}

export function updateDiscovery(previous, oldPhase, newPhase) {
  if (newPhase === "exited") {
    return { ...previous, eligible: true };
  }
  if (newPhase === "active" && oldPhase !== "active" && previous.eligible) {
    return {
      eligible: false,
      visible: true,
      count: previous.count + 1
    };
  }
  return previous;
}

export function dismissDiscovery(previous) {
  return { ...previous, visible: false };
}
