import { claimSources, phenomenonTrail, topicClaims, topicNeighbors } from "../core/atlas-index.js";
import { isRecursionTopic, mountRecursionVisual, recursionVisual } from "./recursion-topic.js?v=0.5.0.1";
import { mathematicsFor, mathematicsMarkup } from "./math-lens.js";
import { isTessellationTopic, mountTessellationVisual, tessellationVisual } from "./tessellation-topic.js?v=0.8.0";
import { isSymmetryTopic, mountSymmetryVisual, symmetryVisual } from "./symmetry-topic.js";
import { afterMarkup, essayMarkup, hookMarkup, mountVideo, narrativeFor, videoMarkup } from "./narrative.js?v=0.17.0";

const labelNames = {
  "mathematical-fact": "Mathematical fact",
  "historical-claim": "Historical claim",
  observation: "Direct observation",
  "artistic-interpretation": "Artistic interpretation",
  "documented-influence-or-creator-intent": "Creator-documented",
  "original-analytical-reconstruction": "Original analytical reconstruction",
  "unresolved-or-contested": "Unresolved · contested"
};

function constructionVisual(topicId) {
  if (topicId === "triforce-analysis") {
    return `<div class="triforce-lab">
      <svg viewBox="0 0 360 300" role="img" aria-labelledby="triforce-title triforce-desc">
        <title id="triforce-title">Geometric analysis of a three-triangle composition</title>
        <desc id="triforce-desc">Three separate equilateral triangles can assemble around a central downward-pointing triangular space.</desc>
        <path class="negative-space" d="M120 138 L240 138 L180 242 Z"></path>
        <g class="tri-piece piece-one"><path d="M180 34 L120 138 L240 138 Z"></path></g>
        <g class="tri-piece piece-two"><path d="M120 138 L60 242 L180 242 Z"></path></g>
        <g class="tri-piece piece-three"><path d="M240 138 L180 242 L300 242 Z"></path></g>
      </svg>
      <div class="visual-actions"><button id="assemble-triangles" type="button" aria-pressed="true">Separate pieces</button><span>Original analysis · not game artwork</span></div>
    </div>`;
  }
  const historical = topicId === "euclid-first-proposition";
  const lensTopic = topicId === "circle-intersections";
  const defaultStep = historical ? 1 : lensTopic ? 2 : 3;
  const caption = historical
    ? "Euclid's recorded construction, redrawn as a live diagram. Step through it."
    : lensTopic
      ? "Two equal circles meet in exactly two points; the shared region is one lens."
      : "Both sloping sides and the base are the same radius.";
  return `<div class="proof-lab" data-step="${defaultStep}"${lensTopic ? ' data-lens="true"' : ""}>
    <svg viewBox="0 0 520 340" role="img" aria-label="Two equal circles constructing an equilateral triangle">
      <line class="proof-base" x1="170" y1="235" x2="350" y2="235"></line>
      <circle class="proof-circle circle-one" cx="170" cy="235" r="180"></circle>
      <circle class="proof-circle circle-two" cx="350" cy="235" r="180"></circle>
      ${lensTopic ? '<path class="proof-lens" d="M260 79.1 A180 180 0 0 1 260 390.9 A180 180 0 0 1 260 79.1 Z"></path>' : ""}
      <path class="proof-triangle" d="M170 235 L260 79.1 L350 235 Z"></path>
      <g class="proof-points"><circle cx="170" cy="235" r="5"></circle><circle cx="350" cy="235" r="5"></circle><circle cx="260" cy="79.1" r="5"></circle></g>
    </svg>
    <div class="proof-steps" aria-label="Construction steps">
      <button type="button" data-step="1"${defaultStep === 1 ? ' class="is-selected"' : ""}>1 · Segment</button>
      <button type="button" data-step="2"${defaultStep === 2 ? ' class="is-selected"' : ""}>2 · Two circles</button>
      <button type="button" data-step="3"${defaultStep === 3 ? ' class="is-selected"' : ""}>3 · Three equal sides</button>
    </div>
    <p class="proof-caption">${caption}</p>
  </div>`;
}

function gameDisclaimer(topicId) {
  if (topicId === "triforce-analysis") {
    return "The Legend of Zelda and Triforce are referenced for criticism and analysis. Geometry Lab is not affiliated with or endorsed by Nintendo.";
  }
  if (topicId === "tetris-tetrominoes") {
    return "Tetris is referenced for criticism and analysis. This original grid study is not game imagery, and Geometry Lab is not affiliated with or endorsed by The Tetris Company.";
  }
  return "Rescue on Fractalus! is referenced for criticism and analysis. This original terrain study is not game imagery or historical source code, and Geometry Lab is not affiliated with Lucasfilm Games.";
}

// The essay names the claims it rests on; this supplies the human label for each,
// so a paragraph's ground is visible without opening the evidence drawer.
function claimTypesFor(topic, index) {
  return Object.fromEntries(topicClaims(topic, index)
    .map((claim) => [claim.id, labelNames[claim.type] || claim.type]));
}

// Only media that names this topic can appear on it, so a record cannot leak
// onto a page its rights review never covered.
function mediaFor(topic, atlas) {
  const records = Array.isArray(atlas?.media) ? atlas.media : [];
  return Object.fromEntries(records
    .filter((record) => record.topic_ids?.includes(topic.id))
    .map((record) => [record.id, record]));
}

function renderClaims(topic, index) {
  return topicClaims(topic, index).map((claim) => {
    const sources = claimSources(claim, index);
    return `<article class="claim" id="${claim.id}">
      <span class="claim-label">${labelNames[claim.type] || claim.type.replaceAll("-", " ")}</span>
      <p>${claim.text}</p>
      ${sources.length ? `<ul class="source-list">${sources.map((source) => `<li><a href="${source.url}" target="_blank" rel="noreferrer">${source.title}</a><span>${source.creator} · ${source.publication_date} · reviewed ${source.reviewed_at}</span></li>`).join("")}</ul>` : ""}
    </article>`;
  }).join("");
}

export function mountTopic(root, { topic, atlas, index, recursionConfig, mathematicsConfig, narrative }) {
  const neighbors = topicNeighbors(topic.id, atlas, index);
  const story = narrativeFor(topic.id, narrative);
  const visual = isRecursionTopic(topic.id) ? recursionVisual(topic.id, recursionConfig) : isTessellationTopic(topic.id) ? tessellationVisual(topic.id) : isSymmetryTopic(topic.id) ? symmetryVisual(topic.id) : constructionVisual(topic.id);
  const math = mathematicsFor(topic.id, mathematicsConfig);
  const trail = phenomenonTrail(topic, atlas, index);
  const trailMarkup = trail ? `
      <nav class="orientation-trail" aria-label="Where this topic sits in the collection">
        <a class="trail-place" href="#/">All topics</a>
        <span class="trail-separator" aria-hidden="true">→</span>
        <span class="trail-place">${trail.phenomenon.title}</span>
        <span class="trail-position">${trail.position} of ${trail.total}</span>
        <span class="trail-moves">
          ${trail.previous ? `<a href="#/topic/${trail.previous.slug}" rel="prev">← ${trail.previous.title}</a>` : ""}
          ${trail.next ? `<a href="#/topic/${trail.next.slug}" rel="next">${trail.next.title} →</a>` : ""}
        </span>
      </nav>` : "";
  const kind = topic.kind.replaceAll("-", " ");
  const introMarkup = story
    ? hookMarkup(story, `${kind} · ${topic.title}`)
    : `<header class="page-intro topic-intro">
        <p class="eyebrow">${kind}</p>
        <h1>${topic.title}</h1>
        <p>${topic.summary}</p>
      </header>`;
  root.innerHTML = `
    <article class="topic-page">${trailMarkup}
      ${introMarkup}
      <section class="topic-visual" aria-label="Interactive visual explanation">
        ${visual}
      </section>
      ${afterMarkup(story)}
      ${essayMarkup(story, claimTypesFor(topic, index), mediaFor(topic, atlas))}
      ${videoMarkup(story)}
      ${topic.phenomenon_ids.includes("tessellation-and-packing") ? `<a class="chamber-door" href="#/chamber/tessellation-and-packing"><span>Go deeper</span><strong>Five tiling questions on one page</strong><small>Angle budget · duality · density · rotation limits · Penrose inflation</small></a>` : ""}
      ${topic.game_context ? `<section class="game-context"><span>Game study</span><dl><div><dt>Subject</dt><dd>${topic.game_context.game_title}</dd></div><div><dt>Creator</dt><dd>${topic.game_context.credited_creator}</dd></div><div><dt>Context</dt><dd>${topic.game_context.platform_context}</dd></div><div><dt>Evidence level</dt><dd>${topic.game_context.analysis_status.replaceAll("-", " ")}</dd></div></dl><p>${gameDisclaimer(topic.id)}</p></section>` : ""}
      <details class="research-depth" open>
        <summary>Evidence, proof & sources</summary>
        <div class="claims">${renderClaims(topic, index)}</div>
      </details>
      ${neighbors.length ? `<nav class="related" aria-label="Related geometry"><h2>Follow the relationship</h2><div>${neighbors.map(({ relationship, topic: neighbor }) => `<a href="#/topic/${neighbor.slug}"><span>${relationship.type.replaceAll("-", " ")}</span><strong>${neighbor.title}</strong><small>${relationship.summary}</small></a>`).join("")}</div></nav>` : ""}
    </article>`;

  // The lens still follows the visual, but the narrative close and its video card
  // sit between them when a narrative record exists.
  const lensAnchor = root.querySelector(".video-card") || root.querySelector(".topic-after") || root.querySelector(".topic-visual");
  lensAnchor.insertAdjacentHTML("afterend", mathematicsMarkup(math));
  mountVideo(root);
  const recursionCleanup = isRecursionTopic(topic.id) ? mountRecursionVisual(root, topic.id, recursionConfig) : null;
  if (isTessellationTopic(topic.id)) mountTessellationVisual(root, topic.id);
  if (isSymmetryTopic(topic.id)) mountSymmetryVisual(root, topic.id);

  root.querySelectorAll("[data-step]").forEach((button) => {
    if (button.tagName !== "BUTTON") return;
    button.addEventListener("click", () => {
      const lab = root.querySelector(".proof-lab");
      lab.dataset.step = button.dataset.step;
      root.querySelectorAll(".proof-steps button").forEach((item) =>
        item.classList.toggle("is-selected", item === button)
      );
    });
  });

  const assemble = root.querySelector("#assemble-triangles");
  if (assemble) {
    assemble.addEventListener("click", () => {
      const lab = root.querySelector(".triforce-lab");
      const separated = lab.classList.toggle("is-separated");
      assemble.textContent = separated ? "Assemble structure" : "Separate pieces";
      assemble.setAttribute("aria-pressed", String(!separated));
    });
  }
  return recursionCleanup || null;
}
