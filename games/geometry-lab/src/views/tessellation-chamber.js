import { claimSources } from "../core/atlas-index.js";
import { curvatureClass, dualitySvg, packingDensity, packingSvg, penroseCountSvg, rotationSvg, vertexAngleSum, vertexFanSvg } from "../renderers/tessellation-chamber.js";

function evidenceMarkup(config, index) {
  return config.claim_ids.map((id) => index.claimsById.get(id)).filter(Boolean).map((claim) => {
    const sources = claimSources(claim, index);
    return `<article><span>${claim.type.replaceAll("-", " ")}</span><p>${claim.text}</p>${sources.map((source) => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.title}<small>${source.creator} · ${source.publication_date}</small></a>`).join("")}</article>`;
  }).join("");
}

function chamberMarkup(config, index) {
  const first = config.vertex_presets[0];
  return `<article class="chamber-page">
    <header class="chamber-hero"><p class="eyebrow">Tessellation &amp; packing · five figures</p><h1>How does a local rule take over a plane?</h1><p>Start at one crowded point. Follow its angle budget outward until it covers a plane, then meet the ordered patterns that never repeat.</p><a href="#/">Back to all topics</a></header>
    <nav class="chamber-jump" aria-label="Jump to a figure"><button type="button" data-jump="angle-budget">Angle budget</button><button type="button" data-jump="dual-world">Dual world</button><button type="button" data-jump="packing-microscope">Packing</button><button type="button" data-jump="forbidden-turn">Forbidden turn</button><button type="button" data-jump="penrose-inflation">Inflation</button></nav>

    <section id="angle-budget" class="chamber-instrument"><div class="chamber-copy"><p class="eyebrow">Instrument 01 · local to global</p><h2>Spend exactly 360°</h2><p>Each number names a regular polygon by its sides. Choose a documented vertex type and watch different angles close around one point.</p><div class="vertex-readout"><strong data-vertex-sum>360°</strong><span data-curvature>flat · Euclidean locally</span></div><details><summary>Why this equation works</summary><p>A regular n-gon contributes 180°(n−2)/n at the vertex. Add every contribution. Below 360° the neighborhood bends positively; exactly 360° is flat; above 360° belongs to negative-curvature geometry.</p><code>Σ 180°(nᵢ−2)/nᵢ</code></details></div><div class="chamber-stage"><div data-vertex-stage>${vertexFanSvg(first.polygons)}</div><div class="vertex-presets" aria-label="Eleven convex uniform vertex types">${config.vertex_presets.map((preset) => `<button type="button" data-vertex="${preset.id}">${preset.label}<small>${preset.family}</small></button>`).join("")}</div></div></section>

    <section id="dual-world" class="chamber-instrument chamber-reverse"><div class="chamber-copy"><p class="eyebrow">Instrument 02 · duality</p><h2>Turn points into territories</h2><p>Every luminous site receives the region closer to it than to any other site. A triangular lattice of sites therefore grows hexagonal cells.</p><div class="segmented" aria-label="Duality layers"><button data-dual="sites">Sites</button><button data-dual="cells">Cells</button><button data-dual="both">Both</button></div><details><summary>What survives the transformation?</summary><p>Neighbouring sites share a cell boundary. Triangular faces become hexagonal vertices: adjacency remains, while vertices and faces exchange roles.</p></details></div><div class="chamber-stage" data-dual-stage>${dualitySvg("both")}</div></section>

    <section id="packing-microscope" class="chamber-instrument"><div class="chamber-copy"><p class="eyebrow">Instrument 03 · packing microscope</p><h2>Shear the grid until six neighbours appear</h2><p>The circles never change size. Only the angle between the two lattice directions changes.</p><label class="chamber-range"><span>Lattice angle <output data-pack-angle>${config.packing.default_angle}°</output></span><input data-pack-input type="range" min="${config.packing.minimum_angle}" max="${config.packing.maximum_angle}" step="${config.packing.step}" value="${config.packing.default_angle}"></label><div class="density-readout"><span>covered fraction</span><strong data-density>${packingDensity(config.packing.default_angle).toFixed(4)}</strong></div><code>η(θ) = π / (4 sin θ)</code></div><div class="chamber-stage" data-packing-stage>${packingSvg(config.packing.default_angle)}</div></section>

    <section id="forbidden-turn" class="chamber-instrument chamber-reverse"><div class="chamber-copy"><p class="eyebrow">Instrument 04 · periodicity</p><h2>Why does fivefold order break the lattice?</h2><p>A periodic planar lattice can return to itself under only certain rotation orders. Fivefold order becomes possible when Penrose abandons translational repetition.</p><div class="rotation-buttons">${[2,3,4,5,6].map((order) => `<button type="button" data-order="${order}">${order}-fold</button>`).join("")}</div><p class="rotation-status" data-rotation-status></p></div><div class="chamber-stage" data-rotation-stage>${rotationSvg(5)}</div></section>

    <section id="penrose-inflation" class="chamber-instrument"><div class="chamber-copy"><p class="eyebrow">Instrument 05 · aperiodic hierarchy</p><h2>Inflate by φ; count what survives</h2><p>One substitution changes thick and thin rhomb counts. Repetition makes their ratio approach the golden ratio while the pattern remains non-periodic.</p><label class="chamber-range"><span>Inflation generation <output data-generation>${config.penrose.default_generation}</output></span><input data-generation-input type="range" min="${config.penrose.minimum_generation}" max="${config.penrose.maximum_generation}" value="${config.penrose.default_generation}"></label><code>φ² = φ + 1</code></div><div class="chamber-stage" data-penrose-stage>${penroseCountSvg(config.penrose.default_generation, config.penrose.initial_thick, config.penrose.initial_thin)}</div></section>

    <details class="chamber-evidence"><summary>Proof notes, historical record & sources</summary><div>${evidenceMarkup(config, index)}</div></details>
    <nav class="chamber-topics" aria-label="Continue into individual studies"><h2>Follow one of these further</h2><div>${["regular-plane-tilings","hexagonal-circle-packing","kashan-star-cross","penrose-rhombs","escher-plane-division","tetris-tetrominoes"].map((slug) => `<a href="#/topic/${slug}">${index.topicsBySlug.get(slug)?.title}</a>`).join("")}</div></nav>
  </article>`;
}

export function mountTessellationChamber(root, { config, index }) {
  root.innerHTML = chamberMarkup(config, index);
  const presetById = new Map(config.vertex_presets.map((preset) => [preset.id, preset]));
  root.querySelectorAll("[data-jump]").forEach((button) => button.addEventListener("click", () => {
    root.querySelector(`#${button.dataset.jump}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  root.querySelectorAll("[data-vertex]").forEach((button) => button.addEventListener("click", () => {
    const preset = presetById.get(button.dataset.vertex);
    const sum = vertexAngleSum(preset.polygons);
    root.querySelector("[data-vertex-stage]").innerHTML = vertexFanSvg(preset.polygons);
    root.querySelector("[data-vertex-sum]").textContent = `${sum.toFixed(0)}°`;
    root.querySelector("[data-curvature]").textContent = `${curvatureClass(sum)} · ${sum === 360 ? "Euclidean locally" : "curved locally"}`;
    root.querySelectorAll("[data-vertex]").forEach((item) => item.classList.toggle("is-selected", item === button));
  }));
  root.querySelectorAll("[data-dual]").forEach((button) => button.addEventListener("click", () => {
    root.querySelector("[data-dual-stage]").innerHTML = dualitySvg(button.dataset.dual);
    root.querySelectorAll("[data-dual]").forEach((item) => item.classList.toggle("is-selected", item === button));
  }));
  const packing = root.querySelector("[data-pack-input]");
  packing.addEventListener("input", () => { const angle = Number(packing.value); root.querySelector("[data-pack-angle]").value = `${angle}°`; root.querySelector("[data-density]").textContent = packingDensity(angle).toFixed(4); root.querySelector("[data-packing-stage]").innerHTML = packingSvg(angle); });
  root.querySelectorAll("[data-order]").forEach((button) => button.addEventListener("click", () => { const order = Number(button.dataset.order); const allowed = [2,3,4,6].includes(order); root.querySelector("[data-rotation-stage]").innerHTML = rotationSvg(order); root.querySelector("[data-rotation-status]").textContent = allowed ? `${order}-fold rotation is compatible with a periodic planar lattice.` : "Fivefold rotation cannot preserve a periodic planar lattice; aperiodic order changes the bargain."; root.querySelectorAll("[data-order]").forEach((item) => item.classList.toggle("is-selected", item === button)); }));
  const generation = root.querySelector("[data-generation-input]");
  generation.addEventListener("input", () => { const value = Number(generation.value); root.querySelector("[data-generation]").value = value; root.querySelector("[data-penrose-stage]").innerHTML = penroseCountSvg(value, config.penrose.initial_thick, config.penrose.initial_thin); });
  root.querySelector('[data-vertex="triangular"]').click(); root.querySelector('[data-dual="both"]').click(); root.querySelector('[data-order="5"]').click();
}
