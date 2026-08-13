import {
  branchSegmentCount,
  drawBranching,
  kochPath,
  terrainPath,
  waveEchoPaths
} from "../renderers/recursion.js";

const recursionIds = new Set([
  "recursive-branching", "koch-curve", "great-wave-echoes", "rescue-fractalus-terrain"
]);

export function isRecursionTopic(topicId) {
  return recursionIds.has(topicId);
}

function range(name, label, limits, value, unit = "") {
  return `<label><span>${label} <output data-output="${name}">${value}${unit}</output></span>
    <input type="range" data-parameter="${name}" min="${limits.minimum}" max="${limits.maximum}" step="${limits.step}" value="${value}"></label>`;
}

function branchingMarkup(config) {
  const defaults = config.defaults;
  return `<div class="recursion-lab branching-lab">
    <canvas id="branching-canvas" role="img" aria-label="A recursively branching tree generated from one repeated rule"></canvas>
    <div class="recursion-controls">
      ${range("angle_degrees", "Fork angle", config.limits.angle_degrees, defaults.angle_degrees, "°")}
      ${range("length_ratio", "Next length", config.limits.length_ratio, defaults.length_ratio)}
      ${range("depth", "Depth", config.limits.depth, defaults.depth)}
    </div>
    <div class="preset-row" aria-label="Named branching states">${config.presets.map((preset) => `<button type="button" data-preset="${preset.id}">${preset.label}</button>`).join("")}</div>
    <p class="recursion-status" aria-live="polite"></p>
  </div>`;
}

function steppedMarkup(kind, maximum, label) {
  const isTerrain = kind === "terrain";
  return `<div class="recursion-lab ${kind}-lab" data-iteration="0">
    <svg viewBox="0 0 640 ${isTerrain ? 280 : 240}" role="img" aria-label="${label}">
      <path class="recursive-path" data-recursive-path></path>
      ${isTerrain ? '<line class="terrain-horizon" x1="0" y1="232" x2="640" y2="232"></line>' : ""}
    </svg>
    <div class="iteration-row" aria-label="Recursion depth">${Array.from({ length: maximum + 1 }, (_, value) => `<button type="button" data-iteration-value="${value}"${value === 0 ? ' class="is-selected"' : ""}>${value}</button>`).join("")}</div>
    <p class="recursion-status" aria-live="polite"></p>
  </div>`;
}

function waveMarkup() {
  return `<div class="recursion-lab wave-lab">
    <svg viewBox="0 0 640 280" role="img" aria-label="Original abstract study of successively smaller curling wave shapes"><g data-wave-paths></g><line class="wave-baseline" x1="50" y1="232" x2="590" y2="232"></line></svg>
    <label class="echo-control"><span>Repeated curls <output data-echo-output>4</output></span><input type="range" min="1" max="6" step="1" value="4" data-echo-level></label>
    <p class="recursion-status">Original visual comparison · not a reconstruction of Hokusai's print</p>
  </div>`;
}

export function recursionVisual(topicId, config) {
  if (topicId === "recursive-branching") return branchingMarkup(config);
  if (topicId === "koch-curve") return steppedMarkup("koch", 4, "Koch curve growing through recursive segment replacement");
  if (topicId === "rescue-fractalus-terrain") return steppedMarkup("terrain", 7, "Original terrain profile gaining detail through recursive subdivision");
  return waveMarkup();
}

function mountBranching(root, config) {
  const canvas = root.querySelector("#branching-canvas");
  const context = canvas.getContext("2d");
  let parameters = { ...config.defaults };

  function render() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const styles = getComputedStyle(root);
    drawBranching(context, rect, parameters, {
      branch: styles.getPropertyValue("--cyan").trim(),
      tip: styles.getPropertyValue("--active").trim()
    });
    root.querySelector(".recursion-status").textContent = `Depth ${parameters.depth} repeats one fork into ${branchSegmentCount(parameters.depth).toLocaleString()} segments.`;
  }

  function sync() {
    root.querySelectorAll("[data-parameter]").forEach((input) => {
      input.value = parameters[input.dataset.parameter];
      const output = root.querySelector(`[data-output="${input.dataset.parameter}"]`);
      output.value = `${input.value}${input.dataset.parameter === "angle_degrees" ? "°" : ""}`;
    });
    render();
  }
  root.querySelectorAll("[data-parameter]").forEach((input) => input.addEventListener("input", () => {
    parameters = { ...parameters, [input.dataset.parameter]: Number(input.value) };
    sync();
  }));
  root.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => {
    parameters = { ...config.presets.find((preset) => preset.id === button.dataset.preset).parameters };
    sync();
  }));
  const observer = new ResizeObserver(render);
  observer.observe(canvas);
  sync();
  return () => observer.disconnect();
}

function mountStepped(root, topicId) {
  const terrain = topicId === "rescue-fractalus-terrain";
  const lab = root.querySelector(terrain ? ".terrain-lab" : ".koch-lab");
  function select(iteration) {
    lab.dataset.iteration = iteration;
    lab.querySelector("[data-recursive-path]").setAttribute("d", terrain ? terrainPath(iteration) : kochPath(iteration));
    lab.querySelectorAll("[data-iteration-value]").forEach((button) => button.classList.toggle("is-selected", Number(button.dataset.iterationValue) === iteration));
    const count = terrain ? (2 ** iteration) + 1 : 4 ** iteration;
    lab.querySelector(".recursion-status").textContent = terrain ? `${count} sampled heights after ${iteration} subdivisions · original model, not historical game code` : `${count.toLocaleString()} equal segments after ${iteration} replacements`;
  }
  lab.querySelectorAll("[data-iteration-value]").forEach((button) => button.addEventListener("click", () => select(Number(button.dataset.iterationValue))));
  select(terrain ? 5 : 2);
}

function mountWave(root) {
  const input = root.querySelector("[data-echo-level]");
  function render() {
    const paths = waveEchoPaths(Number(input.value));
    root.querySelector("[data-wave-paths]").innerHTML = paths.map((path, index) => `<path class="wave-echo" d="${path}" style="opacity:${1 - index * 0.1}"></path>`).join("");
    root.querySelector("[data-echo-output]").value = input.value;
  }
  input.addEventListener("input", render);
  render();
}

export function mountRecursionVisual(root, topicId, config) {
  if (topicId === "recursive-branching") return mountBranching(root, config);
  if (topicId === "koch-curve" || topicId === "rescue-fractalus-terrain") mountStepped(root, topicId);
  if (topicId === "great-wave-echoes") mountWave(root);
  return null;
}
