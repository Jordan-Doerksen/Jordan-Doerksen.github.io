export function mathematicsFor(topicId, config) {
  return config.topics.find((entry) => entry.topic_id === topicId);
}

export function mathematicsMarkup(record) {
  if (!record) return "";
  return `<section class="math-lens" aria-labelledby="math-title">
    <header><p class="eyebrow">Mathematics lens</p><h2 id="math-title">${record.question}</h2></header>
    <div class="math-pulse">
      ${record.relations.map((relation) => `<div><code>${relation.expression}</code><span>${relation.plain}</span></div>`).join("")}
    </div>
    <div class="math-invariant"><span>What stays true</span><strong>${record.invariant}</strong></div>
    <details><summary>Reveal the derivation</summary>
      <div class="math-depth"><dl>${record.variables.map((item) => `<div><dt>${item.symbol}</dt><dd>${item.meaning}</dd></div>`).join("")}</dl>
      <ol>${record.steps.map((step) => `<li>${step}</li>`).join("")}</ol></div>
    </details>
  </section>`;
}
