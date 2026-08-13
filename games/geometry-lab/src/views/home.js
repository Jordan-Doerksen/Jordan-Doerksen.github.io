// Same specifier string as main.js so the browser keeps one module instance.
import { mountStage } from "./stage.js?v=0.14.0";
import { markFor } from "./topic-marks.js";

// The chamber is a route, not an atlas topic, so the corpus does not contain it.
// It belongs with the tiling topics it draws from, named in plain words.
const CHAMBER_ROW = {
  phenomenonId: "tessellation-and-packing",
  href: "#/chamber/tessellation-and-packing",
  markId: "penrose-rhombs",
  title: "Five tiling questions on one page",
  summary: "Angle budget, duality, packing density, rotation limits, and Penrose inflation, side by side."
};

function rowMarkup({ href, markId, title, summary }) {
  return `
    <li class="index-row">
      <a href="${href}">
        <span class="index-mark">${markFor(markId)}</span>
        <span class="index-title">${title}</span>
        <span class="index-summary">${summary}</span>
      </a>
    </li>`;
}

// Pure so the front door is testable without a browser (validation/test-home.mjs).
export function indexMarkup(atlas) {
  const phenomena = atlas.phenomena.filter((entry) => entry.published);
  const topics = atlas.topics.filter((topic) => topic.published);

  return phenomena.map((entry) => {
    const rows = topics
      .filter((topic) => topic.phenomenon_ids[0] === entry.id)
      .map((topic) => rowMarkup({
        href: `#/topic/${topic.slug}`,
        markId: topic.id,
        title: topic.title,
        summary: topic.summary
      }));
    if (entry.id === CHAMBER_ROW.phenomenonId) rows.push(rowMarkup(CHAMBER_ROW));
    if (!rows.length) return "";
    return `
      <section class="index-group" aria-labelledby="group-${entry.id}">
        <h3 id="group-${entry.id}">${entry.title}</h3>
        <ul class="index-rows">${rows.join("")}</ul>
      </section>`;
  }).join("");
}

export function homeMarkup(atlas) {
  return `
    <div class="home">
      <div id="stage-host"></div>
      <section class="home-index" aria-labelledby="index-title">
        <header class="index-intro">
          <h2 id="index-title">The whole collection</h2>
          <p>Each link opens one topic: the figure first, then the evidence behind it.</p>
        </header>
        ${indexMarkup(atlas)}
      </section>
    </div>`;
}

export function mountHome(root, { atlas, config, navigate }) {
  root.innerHTML = homeMarkup(atlas);
  // The stage owns its host element outright; the index is its sibling, so the
  // stage's own innerHTML write cannot destroy the list.
  return mountStage(root.querySelector("#stage-host"), { config, navigate });
}
