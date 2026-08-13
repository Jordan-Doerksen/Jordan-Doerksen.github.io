// Editorial narrative layer for topic pages: question-led opener, "what you just
// saw" close, and a click-to-load video card. Every entry is optional; every
// function returns "" or null when its data is absent, so a topic without a
// narrative record renders exactly the page it rendered before this layer existed.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const attribute = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function narrativeFor(topicId, narrative) {
  const topics = narrative?.topics;
  if (!topicId || !Array.isArray(topics)) return null;
  return topics.find((entry) => entry?.topic_id === topicId) || null;
}

// The hook becomes the page's dominant line. The formal title moves into the
// eyebrow so the viewport still carries exactly one dominant idea and one h1.
export function hookMarkup(entry, eyebrow = "") {
  if (!entry?.hook) return "";
  return `<header class="page-intro topic-intro topic-narrative-intro">
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}
      <h1 class="topic-hook">${entry.hook}</h1>
      ${entry.stakes ? `<p class="topic-stakes">${entry.stakes}</p>` : ""}
    </header>
    ${entry.invitation ? `<p class="topic-invitation">${entry.invitation}</p>` : ""}`;
}

export function afterMarkup(entry) {
  const paragraphs = Array.isArray(entry?.after) ? entry.after.filter(Boolean) : [];
  if (!paragraphs.length) return "";
  return `<section class="topic-after" aria-labelledby="topic-after-label">
      <h2 class="eyebrow" id="topic-after-label">What you just saw</h2>
      ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
    </section>`;
}

// The signed interpretive essay (D-036 / CR-2). Interpretation leads and evidence
// follows, but the two never merge: each section states which typed claims carry
// it, by name, so the reader can see the ground under any paragraph. A topic with
// no essay block renders exactly as it did before this layer existed.
export function essayMarkup(entry, claimTypeById = {}, mediaById = {}) {
  const essay = entry?.essay;
  const sections = Array.isArray(essay?.sections) ? essay.sections.filter(Boolean) : [];
  if (!essay || !sections.length) return "";

  // An image ships only when its record says "bundle" and carries a path and an
  // attribution. A record missing any of those renders nothing rather than a
  // broken image or an uncredited one.
  const figure = (mediaId) => {
    const media = mediaById[mediaId];
    if (!media || media.publication_decision !== "bundle" || !media.path || !media.attribution) return "";
    const credit = media.source_url
      ? `${media.attribution} · <a href="${attribute(media.source_url)}" target="_blank" rel="noreferrer">source</a>`
      : media.attribution;
    // Intrinsic width/height let the browser reserve the right box before the
    // image decodes, so the prose under a figure never jumps.
    const size = media.width && media.height
      ? ` width="${media.width}" height="${media.height}"`
      : "";
    return `<figure class="essay-figure">
        <img src="${attribute(media.path)}" alt="${attribute(media.alt || "")}"${size} loading="lazy" decoding="async">
        <figcaption>${credit}</figcaption>
      </figure>`;
  };

  const restsOn = (claimIds) => {
    const cited = (Array.isArray(claimIds) ? claimIds : []).filter((id) => claimTypeById[id]);
    if (!cited.length) return "";
    return `<p class="essay-rests">Rests on ${cited
      .map((id) => `<a href="#${attribute(id)}">${claimTypeById[id].replaceAll("-", " ")}</a>`)
      .join(", ")}</p>`;
  };

  return `<article class="topic-essay" aria-labelledby="essay-thesis">
      <p class="eyebrow">An argument, not a finding</p>
      <p class="essay-thesis" id="essay-thesis">${essay.thesis || ""}</p>
      ${essay.byline ? `<p class="essay-byline">${essay.byline}</p>` : ""}
      ${sections.map((section) => `
        <section class="essay-section">
          <h2>${section.heading || ""}</h2>
          ${(Array.isArray(section.paragraphs) ? section.paragraphs : [])
            .filter(Boolean).map((paragraph) => `<p>${paragraph}</p>`).join("")}
          ${figure(section.media_id)}
          ${restsOn(section.claim_ids)}
        </section>`).join("")}
      ${essay.closing ? `<p class="essay-closing">${essay.closing}</p>` : ""}
    </article>`;
}

// A local poster in the house idiom — two overlapping circles, one play glyph.
// No remote thumbnail, so no request reaches any YouTube host before the click.
const posterSvg = `<svg class="video-poster" viewBox="0 0 320 180" aria-hidden="true" focusable="false">
        <circle cx="132" cy="90" r="58"></circle><circle cx="188" cy="90" r="58"></circle>
        <path class="video-glyph" d="M146 64 L194 90 L146 116 Z"></path>
      </svg>`;

export function videoMarkup(entry) {
  const video = entry?.video;
  if (!video || !YOUTUBE_ID.test(video.youtube_id || "")) return "";
  const credit = [video.creator, video.published_year, video.duration].filter(Boolean).join(" · ");
  const watch = `https://www.youtube.com/watch?v=${video.youtube_id}`;
  return `<figure class="video-card" data-video="${attribute(video.youtube_id)}" data-video-title="${attribute(video.title || "")}">
      <div class="video-body" data-video-body>
        <button class="video-play" type="button" data-video-play>
          ${posterSvg}
          <span class="eyebrow">Video</span>
          <strong class="video-title">${video.title || "Watch this"}</strong>
          ${credit ? `<span class="video-credit">${credit}</span>` : ""}
          ${video.why ? `<span class="video-why">${video.why}</span>` : ""}
        </button>
      </div>
      <figcaption class="video-fallback"><a href="${attribute(watch)}" rel="noreferrer">Watch on YouTube</a></figcaption>
    </figure>`;
}

// Kept pure and exported so the privacy guarantee is testable without a DOM:
// the embed URL exists only here, never in the markup videoMarkup() ships.
export function videoEmbedMarkup(youtubeId, title = "") {
  if (!YOUTUBE_ID.test(youtubeId || "")) return "";
  return `<div class="video-frame" tabindex="-1">
      <iframe src="https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&amp;rel=0" title="${attribute(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>`;
}

export function mountVideo(root) {
  const card = root?.querySelector?.(".video-card");
  const button = card?.querySelector("[data-video-play]");
  const body = card?.querySelector("[data-video-body]");
  if (!button || !body) return;
  button.addEventListener("click", () => {
    const embed = videoEmbedMarkup(card.dataset.video, card.dataset.videoTitle);
    if (!embed) return;
    body.innerHTML = embed;
    card.classList.add("is-playing");
    body.querySelector(".video-frame")?.focus();
  });
}
