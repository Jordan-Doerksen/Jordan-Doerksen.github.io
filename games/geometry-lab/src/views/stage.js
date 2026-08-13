import {
  createGeometryState,
  describeGeometry,
  geometryMetrics,
  moveCircle,
  moveCircleBy
} from "../core/geometry-state.js";
import {
  createRelationshipState,
  exactSnapPoint,
  updateRelationship
} from "../core/relationships.js";
import {
  createDiscoveryState,
  dismissDiscovery,
  updateDiscovery
} from "../core/discovery-state.js";
import { drawCircles } from "../renderers/circles.js";

function paletteFrom(root) {
  const style = getComputedStyle(root);
  const value = (name) => style.getPropertyValue(name).trim();
  return {
    stageBackground: value("--stage-background"),
    stageGlow: value("--stage-glow"),
    circle: value("--circle"),
    circleSelected: value("--circle-selected"),
    circleFill: value("--circle-fill"),
    lens: value("--lens"),
    lensActive: value("--lens-active"),
    active: value("--active"),
    point: value("--point"),
    intersection: value("--intersection"),
    triangleFill: value("--triangle-fill"),
    measure: value("--measure")
  };
}

export function mountStage(root, { config, navigate }) {
  root.innerHTML = `
    <section class="living-stage" aria-labelledby="stage-title">
      <div class="stage-copy">
        <h1 id="stage-title">Move a circle.</h1>
        <p>Bring the two centers close together and watch what appears.</p>
      </div>
      <div class="canvas-wrap">
        <canvas id="geometry-canvas" aria-label="Two movable equal circles"></canvas>
        <div class="stage-tools" aria-label="Geometry controls">
          <button class="circle-select" data-circle="0" type="button">Circle A</button>
          <button class="circle-select is-selected" data-circle="1" type="button">Circle B</button>
          <label class="precision-toggle"><input id="precision" type="checkbox"> Precision</label>
          <button id="reset-stage" type="button">Reset</button>
        </div>
        <div id="discovery" class="discovery" hidden>
          <button id="open-discovery" type="button">
            <span class="discovery-kicker">You made a relationship</span>
            <strong>An equilateral triangle appears</strong>
          </button>
          <button id="dismiss-discovery" class="dismiss" type="button" aria-label="Dismiss discovery">×</button>
        </div>
      </div>
      <p id="geometry-status" class="geometry-status" aria-live="polite"></p>
      <p class="keyboard-note">Select a circle, then use arrow keys. Hold Shift for fine movement.</p>
    </section>`;

  const canvas = root.querySelector("#geometry-canvas");
  const ctx = canvas.getContext("2d");
  const status = root.querySelector("#geometry-status");
  const discoveryElement = root.querySelector("#discovery");
  const relationshipSpec = config.relationships[0];
  let geometry = createGeometryState(config.stage);
  let initializedForViewport = false;
  let relationship = createRelationshipState();
  let discovery = createDiscoveryState();
  let viewport = { width: 1, height: 1 };
  let metrics;
  let pointerId = null;
  let movingIndex = 1;
  let lastPointer = null;
  let velocity = 0;
  let animationFrame = null;

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    viewport = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
    const width = Math.round(viewport.width * ratio);
    const height = Math.round(viewport.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function updateSelection() {
    root.querySelectorAll("[data-circle]").forEach((button) => {
      const selected = Number(button.dataset.circle) === geometry.selectedCircle;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function render(now = performance.now()) {
    sizeCanvas();
    if (!initializedForViewport) {
      const base = createGeometryState(config.stage);
      const baseMetrics = geometryMetrics(base, viewport, config.stage);
      const halfDistance = config.stage.initial_distance_in_radii * baseMetrics.radius /
        (2 * viewport.width);
      geometry = {
        ...base,
        centers: [
          { x: 0.5 - halfDistance, y: 0.5 },
          { x: 0.5 + halfDistance, y: 0.5 }
        ]
      };
      initializedForViewport = true;
    }
    metrics = geometryMetrics(geometry, viewport, config.stage);
    const oldPhase = relationship.phase;
    relationship = updateRelationship(
      relationship,
      metrics.distanceInRadii,
      velocity,
      relationshipSpec,
      now
    );

    if (relationship.phase === "active" && oldPhase !== "active") {
      const fixedIndex = movingIndex === 0 ? 1 : 0;
      const point = exactSnapPoint(
        metrics.centers[movingIndex],
        metrics.centers[fixedIndex],
        metrics.radius,
        relationshipSpec.target_distance_in_radii
      );
      geometry = moveCircle(geometry, movingIndex, {
        x: point.x / viewport.width,
        y: point.y / viewport.height
      });
      metrics = geometryMetrics(geometry, viewport, config.stage);
    }

    discovery = updateDiscovery(discovery, oldPhase, relationship.phase);
    discoveryElement.hidden = !discovery.visible;
    drawCircles(
      ctx,
      viewport,
      geometry,
      metrics,
      relationship.phase,
      paletteFrom(root)
    );
    status.textContent = describeGeometry(geometry, metrics, relationship.phase);
    updateSelection();
    animationFrame = null;
    if (relationship.phase === "approaching") animationFrame = requestAnimationFrame(render);
  }

  function requestRender() {
    if (!animationFrame) animationFrame = requestAnimationFrame(render);
  }

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    const point = localPoint(event);
    metrics = geometryMetrics(geometry, viewport, config.stage);
    const padding = event.pointerType === "touch"
      ? config.inputs.touch.hit_padding_px
      : config.inputs.pointer.hit_padding_px;
    const candidates = metrics.centers
      .map((center, index) => ({ index, distance: Math.hypot(point.x - center.x, point.y - center.y) }))
      .filter((candidate) => candidate.distance <= metrics.radius + padding)
      .sort((a, b) => a.distance - b.distance);
    if (!candidates.length) return;
    event.preventDefault();
    movingIndex = candidates[0].index;
    geometry = { ...geometry, selectedCircle: movingIndex };
    pointerId = event.pointerId;
    lastPointer = { ...point, time: performance.now() };
    canvas.setPointerCapture(pointerId);
    requestRender();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    const point = localPoint(event);
    const now = performance.now();
    const elapsed = Math.max(1, now - lastPointer.time);
    velocity = Math.hypot(point.x - lastPointer.x, point.y - lastPointer.y) /
      elapsed * 1000 / metrics.radius;
    lastPointer = { ...point, time: now };
    geometry = moveCircle(geometry, movingIndex, {
      x: point.x / viewport.width,
      y: point.y / viewport.height
    });
    render(now);
    velocity = 0;
    requestRender();
  });

  function releasePointer(event) {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    lastPointer = null;
    velocity = 0;
    requestRender();
  }
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);

  root.querySelectorAll("[data-circle]").forEach((button) => {
    button.addEventListener("click", () => {
      movingIndex = Number(button.dataset.circle);
      geometry = { ...geometry, selectedCircle: movingIndex };
      requestRender();
    });
    button.addEventListener("keydown", (event) => {
      const directions = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
      };
      if (!directions[event.key]) return;
      event.preventDefault();
      const step = event.shiftKey
        ? config.inputs.keyboard.fine_step_in_radii
        : config.inputs.keyboard.step_in_radii;
      const [x, y] = directions[event.key];
      movingIndex = Number(button.dataset.circle);
      metrics = geometryMetrics(geometry, viewport, config.stage);
      geometry = moveCircleBy(geometry, movingIndex, {
        x: x * step * metrics.radius / viewport.width,
        y: y * step * metrics.radius / viewport.height
      });
      velocity = 0;
      render(performance.now());
    });
  });

  root.querySelector("#precision").addEventListener("change", (event) => {
    geometry = { ...geometry, precision: event.target.checked };
    requestRender();
  });
  root.querySelector("#reset-stage").addEventListener("click", () => {
    geometry = createGeometryState(config.stage);
    relationship = createRelationshipState();
    initializedForViewport = false;
    discovery = createDiscoveryState();
    movingIndex = 1;
    requestRender();
  });
  root.querySelector("#open-discovery").addEventListener("click", () =>
    navigate("#/topic/equilateral-triangle")
  );
  root.querySelector("#dismiss-discovery").addEventListener("click", () => {
    discovery = dismissDiscovery(discovery);
    discoveryElement.hidden = true;
  });

  const observer = new ResizeObserver(requestRender);
  observer.observe(canvas);
  render();
  return () => {
    observer.disconnect();
    if (animationFrame) cancelAnimationFrame(animationFrame);
  };
}
